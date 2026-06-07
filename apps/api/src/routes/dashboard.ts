import type { FastifyInstance } from 'fastify'
import { getLatestPulseScore, getPulseHistory, getTopTopics, getLatestReport, getMentionStats } from '@whistling/db'
import { getPlanLimits } from '@whistling/domain'

export async function dashboardRoutes(app: FastifyInstance) {
  app.get<{ Params: { businessId: string } }>(
    '/:businessId',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { businessId } = req.params
      const { organizationId } = req.user

      const business = await app.db.business.findUnique({
        where: { id: businessId },
        select: { id: true, name: true, organizationId: true, category: true },
      })

      if (!business || business.organizationId !== organizationId) {
        return reply.status(404).send({ error: 'Not found' })
      }

      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

      const sub = await app.db.subscription.findUnique({
        where: { organizationId },
        select: { plan: true, status: true, currentPeriodStart: true, currentPeriodEnd: true },
      })

      const [
        pulseScore,
        pulseHistory,
        currentStats,
        previousStats,
        topTopics,
        latestReport,
        pendingRecommendations,
        sourceHealth,
        recentProviderRuns,
        usageLedger,
      ] = await Promise.all([
        getLatestPulseScore(app.db, businessId),
        getPulseHistory(app.db, businessId, 30),
        getMentionStats(app.db, businessId, weekAgo, now),
        getMentionStats(app.db, businessId, twoWeeksAgo, weekAgo),
        getTopTopics(app.db, businessId, weekAgo, 10),
        getLatestReport(app.db, businessId),
        app.db.recommendation.findMany({
          where: { businessId, status: { in: ['NEW', 'ACCEPTED'] } },
          orderBy: [{ priority: 'asc' }, { generatedAt: 'desc' }],
          take: 5,
        }),
        app.db.businessSource.findMany({
          where: { business: { id: businessId } },
          select: {
            id: true,
            type: true,
            status: true,
            lastScannedAt: true,
            nextScanAt: true,
            totalItemsCollected: true,
            errorMessage: true,
          },
        }),
        app.db.providerRun.findMany({
          where: { businessId, startedAt: { gte: weekAgo } },
          orderBy: { startedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            actorId: true,
            status: true,
            collectedItems: true,
            startedAt: true,
            finishedAt: true,
            errorMessage: true,
          },
        }),
        sub?.currentPeriodStart
          ? app.db.usageLedger.findUnique({
              where: {
                organizationId_periodStart: {
                  organizationId,
                  periodStart: sub.currentPeriodStart,
                },
              },
            })
          : Promise.resolve(null),
      ])

      const limits = sub ? getPlanLimits(sub.plan) : null

      // Derive scan state for empty-state UX
      const hasAnySources = sourceHealth.length > 0
      const hasAnyMentions = (currentStats?.total ?? 0) > 0
      const activeRun = recentProviderRuns.find((r) => r.status === 'RUNNING' || r.status === 'PENDING')
      const lastFailedRun = recentProviderRuns.find((r) => r.status === 'FAILED')

      const scanState = !hasAnySources
        ? 'no_sources'
        : activeRun
          ? 'scanning'
          : !hasAnyMentions
            ? lastFailedRun
              ? 'scan_failed'
              : 'scan_queued'
            : 'ready'

      return {
        business,
        pulseScore,
        pulseHistory,
        stats: {
          current: currentStats,
          previous: previousStats,
        },
        topTopics,
        latestReport: latestReport
          ? {
              id: latestReport.id,
              periodStart: latestReport.periodStart,
              periodEnd: latestReport.periodEnd,
              biggestWin: latestReport.biggestWin,
              biggestRisk: latestReport.biggestRisk,
              bestAction: latestReport.bestAction,
            }
          : null,
        recommendations: pendingRecommendations,
        sourceHealth,
        scanState,
        recentProviderRuns,
        usage: usageLedger && limits
          ? {
              signalsUsed: usageLedger.collectedSignals,
              signalsLimit: limits.signalsPerMonth,
              apifyRunsUsed: usageLedger.apifyRuns,
              apifyRunsLimit: limits.apifyRunsPerMonth,
              responderDraftsUsed: usageLedger.responderDrafts,
              responderDraftsLimit: limits.responderDraftsPerMonth,
              estimatedCostCents: usageLedger.estimatedTotalCostCents,
              hardStopCents: limits.hardStopCents,
              periodStart: usageLedger.periodStart,
              periodEnd: usageLedger.periodEnd,
            }
          : null,
      }
    },
  )

  // Overview for all businesses in org
  app.get(
    '/overview',
    { preHandler: [app.authenticate] },
    async (req) => {
      const { organizationId } = req.user

      const businesses = await app.db.business.findMany({
        where: { organizationId, isActive: true },
        include: {
          _count: { select: { mentions: true, recommendations: true } },
        },
      })

      const scores = await Promise.all(
        businesses.map(async (b) => ({
          business: b,
          pulse: await getLatestPulseScore(app.db, b.id),
        })),
      )

      return scores
    },
  )
}
