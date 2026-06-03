import { Worker, type ConnectionOptions } from 'bullmq'
import type { PrismaClient } from '@whistling/db'
import type { ClusterBusinessTopicsPayload } from '@whistling/jobs'

export function startClusteringWorker(
  db: PrismaClient,
  connection: ConnectionOptions,
  concurrency: number,
) {
  const worker = new Worker(
    'clustering',
    async (job) => {
      if (job.name === 'cluster-business-topics') {
        return clusterTopics(db, job.data as ClusterBusinessTopicsPayload)
      }
      throw new Error(`Unknown job: ${job.name}`)
    },
    { connection, concurrency },
  )

  worker.on('failed', (job, err) => {
    console.error(`[clustering] Job ${job?.id} failed:`, err.message)
  })

  return worker
}

async function clusterTopics(db: PrismaClient, payload: ClusterBusinessTopicsPayload) {
  const periodStart = new Date(payload.periodStart)
  const periodEnd = new Date(payload.periodEnd)

  const analyses = await db.mentionAnalysis.findMany({
    where: {
      mention: {
        businessId: payload.businessId,
        publishedAt: { gte: periodStart, lte: periodEnd },
        isSpam: false,
        isDuplicate: false,
        isCompetitor: false,
      },
    },
    include: {
      mention: {
        select: {
          id: true,
          text: true,
          rating: true,
          publishedAt: true,
        },
      },
    },
  })

  if (analyses.length === 0) return { clusters: 0 }

  // Group mentions by topic
  const topicMap = new Map<string, {
    sentiment: Record<string, number>
    mentionIds: string[]
    severities: number[]
    ratings: number[]
  }>()

  for (const analysis of analyses) {
    for (const topic of analysis.topics) {
      const norm = topic.toLowerCase().trim()
      if (!topicMap.has(norm)) {
        topicMap.set(norm, {
          sentiment: { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0, MIXED: 0 },
          mentionIds: [],
          severities: [],
          ratings: [],
        })
      }
      const entry = topicMap.get(norm)!
      entry.sentiment[analysis.sentiment] = (entry.sentiment[analysis.sentiment] ?? 0) + 1
      entry.mentionIds.push(analysis.mentionId)
      entry.severities.push(analysis.severity)
      if (analysis.mention.rating !== null) {
        entry.ratings.push(analysis.mention.rating ?? 0)
      }
    }
  }

  // Get previous period for trend calculation
  const periodLength = periodEnd.getTime() - periodStart.getTime()
  const prevStart = new Date(periodStart.getTime() - periodLength)
  const prevEnd = periodStart

  const prevAnalyses = await db.mentionAnalysis.groupBy({
    by: ['sentiment'],
    where: {
      mention: {
        businessId: payload.businessId,
        publishedAt: { gte: prevStart, lte: prevEnd },
        isSpam: false,
        isCompetitor: false,
      },
    },
    _count: true,
  })

  const prevTopics = new Map<string, number>()
  // Simplified: count by topic from prev period
  const prevTopicData = await db.mentionAnalysis.findMany({
    where: {
      mention: {
        businessId: payload.businessId,
        publishedAt: { gte: prevStart, lte: prevEnd },
        isSpam: false,
      },
    },
    select: { topics: true },
  })
  for (const a of prevTopicData) {
    for (const topic of a.topics) {
      const norm = topic.toLowerCase().trim()
      prevTopics.set(norm, (prevTopics.get(norm) ?? 0) + 1)
    }
  }

  let clustersCreated = 0

  for (const [topic, data] of topicMap.entries()) {
    if (data.mentionIds.length < 2) continue

    const dominantSentiment = Object.entries(data.sentiment)
      .sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'NEUTRAL'

    const prevCount = prevTopics.get(topic) ?? 0
    const changePercent =
      prevCount > 0
        ? ((data.mentionIds.length - prevCount) / prevCount) * 100
        : 0

    const trendDirection =
      changePercent > 10 ? 'UP' : changePercent < -10 ? 'DOWN' : 'FLAT'

    const avgSeverity =
      data.severities.length > 0
        ? data.severities.reduce((a, b) => a + b, 0) / data.severities.length
        : null

    const avgRating =
      data.ratings.length > 0
        ? data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length
        : null

    await db.topicCluster.upsert({
      where: {
        id: `${payload.businessId}-${topic}-${periodEnd.toISOString().slice(0, 10)}`,
      },
      create: {
        id: `${payload.businessId}-${topic}-${periodEnd.toISOString().slice(0, 10)}`,
        businessId: payload.businessId,
        label: topic.charAt(0).toUpperCase() + topic.slice(1),
        topic,
        sentiment: dominantSentiment as Parameters<typeof db.topicCluster.upsert>[0]['create']['sentiment'],
        isCompetitor: false,
        mentionCount: data.mentionIds.length,
        periodStart,
        periodEnd,
        trendDirection: trendDirection as Parameters<typeof db.topicCluster.upsert>[0]['create']['trendDirection'],
        changePercent,
        representativeMentionIds: data.mentionIds.slice(0, 3),
        avgSeverity,
        avgRating,
      },
      update: {
        mentionCount: data.mentionIds.length,
        sentiment: dominantSentiment as Parameters<typeof db.topicCluster.upsert>[0]['update']['sentiment'],
        trendDirection: trendDirection as Parameters<typeof db.topicCluster.upsert>[0]['update']['trendDirection'],
        changePercent,
        avgSeverity,
        avgRating,
        representativeMentionIds: data.mentionIds.slice(0, 3),
      },
    })

    clustersCreated++
  }

  return { clusters: clustersCreated }
}
