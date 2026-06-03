import { Worker, type ConnectionOptions } from 'bullmq'
import type { PrismaClient } from '@whistling/db'
import { applyRecommendationRules, calculatePulseScore } from '@whistling/analysis'
import { generateRecommendationExplanation } from '@whistling/ai'
import { getMentionStats } from '@whistling/db'
import type { GenerateRecommendationsPayload, CalculatePulseScorePayload } from '@whistling/jobs'

export function startIntelligenceWorker(
  db: PrismaClient,
  connection: ConnectionOptions,
  concurrency: number,
) {
  const worker = new Worker(
    'intelligence',
    async (job) => {
      switch (job.name) {
        case 'generate-recommendations':
          return generateRecommendations(db, job.data as GenerateRecommendationsPayload)
        case 'calculate-pulse-score':
          return runPulseScore(db, job.data as CalculatePulseScorePayload)
        default:
          throw new Error(`Unknown job: ${job.name}`)
      }
    },
    { connection, concurrency },
  )

  worker.on('failed', (job, err) => {
    console.error(`[intelligence] Job ${job?.id} failed:`, err.message)
  })

  return worker
}

async function generateRecommendations(
  db: PrismaClient,
  payload: GenerateRecommendationsPayload,
) {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const business = await db.business.findUnique({
    where: { id: payload.businessId },
    select: { name: true, category: true },
  })
  if (!business) return { skipped: true }

  const clusters = await db.topicCluster.findMany({
    where: {
      businessId: payload.businessId,
      isCompetitor: false,
      periodEnd: { gte: weekAgo },
    },
  })

  const competitorClusters = await db.topicCluster.findMany({
    where: {
      businessId: payload.businessId,
      isCompetitor: true,
      periodEnd: { gte: weekAgo },
    },
  })

  const totalMentions = clusters.reduce((sum, c) => sum + c.mentionCount, 0)

  const topicStats = clusters.map((c) => ({
    topic: c.topic,
    complaintTypes: [],
    praiseTypes: [],
    mentionCount: c.mentionCount,
    negativeMentions: c.sentiment === 'NEGATIVE' ? c.mentionCount : 0,
    positiveMentions: c.sentiment === 'POSITIVE' ? c.mentionCount : 0,
    avgSeverity: c.avgSeverity ?? 2,
    previousMentionCount: undefined,
    trendDirection: c.trendDirection.toLowerCase() as 'up' | 'down' | 'flat',
    changePercent: c.changePercent,
  }))

  const competitorStats = competitorClusters.map((c) => {
    const own = clusters.find((oc) => oc.topic === c.topic)
    return {
      topic: c.topic,
      competitorMentionCount: c.mentionCount,
      ownMentionCount: own?.mentionCount ?? 0,
      competitorSentiment: c.sentiment.toLowerCase() as 'positive' | 'negative' | 'mixed' | 'neutral',
    }
  })

  const ruleRecs = applyRecommendationRules(topicStats, competitorStats, totalMentions)

  let created = 0
  for (const rec of ruleRecs) {
    const existing = await db.recommendation.findFirst({
      where: {
        businessId: payload.businessId,
        title: rec.title,
        status: { in: ['NEW', 'ACCEPTED'] },
      },
    })
    if (existing) continue

    const explanation = await generateRecommendationExplanation(
      rec.title,
      rec.evidencePoints,
      business.name,
      business.category.toLowerCase(),
    )

    await db.recommendation.create({
      data: {
        businessId: payload.businessId,
        reportId: payload.reportId,
        title: rec.title,
        category: rec.category.toUpperCase() as Parameters<typeof db.recommendation.create>[0]['data']['category'],
        priority: rec.priority.toUpperCase() as Parameters<typeof db.recommendation.create>[0]['data']['priority'],
        evidence: rec.evidencePoints,
        suggestedAction: rec.title,
        why: explanation.why,
        estimatedImpact: explanation.estimatedImpact,
        difficulty: rec.difficulty.toUpperCase() as Parameters<typeof db.recommendation.create>[0]['data']['difficulty'],
        suggestedTimeline: explanation.suggestedTimeline,
        relatedTopics: rec.relatedTopics,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })
    created++
  }

  return { created }
}

async function runPulseScore(db: PrismaClient, payload: CalculatePulseScorePayload) {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const [current, previous] = await Promise.all([
    getMentionStats(db, payload.businessId, weekAgo, now),
    getMentionStats(db, payload.businessId, twoWeeksAgo, weekAgo),
  ])

  const complaints = await db.mentionAnalysis.findMany({
    where: {
      mention: {
        businessId: payload.businessId,
        publishedAt: { gte: weekAgo },
        isSpam: false,
      },
      sentiment: 'NEGATIVE',
    },
    select: { severity: true, urgency: true },
  })

  const score = calculatePulseScore({
    current: {
      totalMentions: current.total,
      sentimentBreakdown: current.sentimentBreakdown,
      avgRating: current.avgRating ?? undefined,
      complaints,
    },
    previous: {
      totalMentions: previous.total,
      sentimentBreakdown: previous.sentimentBreakdown,
      avgRating: previous.avgRating ?? undefined,
    },
  })

  await db.pulseScore.create({
    data: {
      businessId: payload.businessId,
      ...score,
    },
  })

  return score
}
