import { Worker, type ConnectionOptions } from 'bullmq'
import type { PrismaClient } from '@whistling/db'
import { generateWeeklyReport } from '@whistling/ai'
import type { GenerateWeeklyReportPayload } from '@whistling/jobs'

export function startReportingWorker(
  db: PrismaClient,
  connection: ConnectionOptions,
  concurrency: number,
) {
  const worker = new Worker(
    'reporting',
    async (job) => {
      if (job.name === 'generate-weekly-report') {
        return generateReport(db, job.data as GenerateWeeklyReportPayload)
      }
      throw new Error(`Unknown job: ${job.name}`)
    },
    { connection, concurrency },
  )

  worker.on('failed', (job, err) => {
    console.error(`[reporting] Job ${job?.id} failed:`, err.message)

    if (job) {
      db.report
        .updateMany({
          where: { id: (job.data as GenerateWeeklyReportPayload).reportId },
          data: { status: 'FAILED' },
        })
        .catch(console.error)
    }
  })

  return worker
}

async function generateReport(db: PrismaClient, payload: GenerateWeeklyReportPayload) {
  const periodStart = new Date(payload.periodStart)
  const periodEnd = new Date(payload.periodEnd)

  const business = await db.business.findUnique({
    where: { id: payload.businessId },
    select: { name: true, category: true, city: true },
  })
  if (!business) return { skipped: true }

  const [ownClusters, competitorClusters, recommendations, prevScore] = await Promise.all([
    db.topicCluster.findMany({
      where: {
        businessId: payload.businessId,
        isCompetitor: false,
        periodEnd: { gte: periodStart, lte: periodEnd },
      },
      orderBy: { mentionCount: 'desc' },
      take: 20,
    }),
    db.topicCluster.findMany({
      where: {
        businessId: payload.businessId,
        isCompetitor: true,
        periodEnd: { gte: periodStart, lte: periodEnd },
      },
      orderBy: { mentionCount: 'desc' },
      take: 20,
    }),
    db.recommendation.findMany({
      where: {
        businessId: payload.businessId,
        status: { in: ['NEW', 'ACCEPTED'] },
      },
      orderBy: [{ priority: 'asc' }],
      take: 10,
    }),
    db.pulseScore.findFirst({
      where: { businessId: payload.businessId },
      orderBy: { calculatedAt: 'desc' },
    }),
  ])

  // Get representative quotes
  const representativeQuotes = await Promise.all(
    ownClusters.slice(0, 5).map(async (cluster) => {
      const mention = await db.mention.findFirst({
        where: {
          id: { in: cluster.representativeMentionIds },
          isSpam: false,
        },
        select: { text: true },
      })
      return {
        topic: cluster.topic,
        sentiment: cluster.sentiment.toLowerCase(),
        quote: mention?.text?.slice(0, 150) ?? '',
      }
    }),
  )

  const topPraises = ownClusters
    .filter((c) => c.sentiment === 'POSITIVE')
    .slice(0, 5)
    .map((c) => ({
      topic: c.label,
      count: c.mentionCount,
      change: Math.round(c.changePercent),
    }))

  const topComplaints = ownClusters
    .filter((c) => c.sentiment === 'NEGATIVE' || c.sentiment === 'MIXED')
    .slice(0, 5)
    .map((c) => ({
      topic: c.label,
      count: c.mentionCount,
      severity: Math.round(c.avgSeverity ?? 3),
      change: Math.round(c.changePercent),
    }))

  // Group competitor intelligence
  const competitors = await db.competitor.findMany({
    where: { businessId: payload.businessId, isActive: true },
  })

  const competitorInsights = competitors.slice(0, 3).map((comp) => {
    const compClusters = competitorClusters.filter(
      (c) => c.isCompetitor,
    )
    return {
      competitorName: comp.name,
      theyWinAt: compClusters
        .filter((c) => c.sentiment === 'POSITIVE')
        .slice(0, 3)
        .map((c) => c.label),
      theyLoseAt: compClusters
        .filter((c) => c.sentiment === 'NEGATIVE')
        .slice(0, 3)
        .map((c) => c.label),
    }
  })

  const generated = await generateWeeklyReport({
    businessName: business.name,
    businessCategory: business.category.toLowerCase().replace('_', ' '),
    city: business.city,
    periodLabel: `${periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    pulseScore: prevScore?.total ?? 70,
    pulsePrevious: undefined,
    topPraises,
    topComplaints,
    customerRequests: [],
    competitorInsights,
    marketGaps: [],
    representativeQuotes: representativeQuotes.filter((q) => q.quote),
  })

  // Save report
  await db.report.update({
    where: { id: payload.reportId },
    data: {
      status: 'READY',
      pulseScore: prevScore?.total,
      biggestWin: generated.biggestWin,
      biggestRisk: generated.biggestRisk,
      bestAction: generated.bestAction,
      emailSubject: generated.emailSubject,
      topPraises: topPraises,
      topComplaints: topComplaints,
      generatedAt: new Date(),
    },
  })

  // Save sections
  await db.reportSection.createMany({
    data: generated.sections.map((s) => ({
      reportId: payload.reportId,
      key: s.key,
      title: s.title,
      content: s.content,
      order: s.order,
    })),
  })

  return { reportId: payload.reportId }
}
