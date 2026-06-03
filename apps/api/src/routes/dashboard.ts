import type { FastifyInstance } from 'fastify'
import { getLatestPulseScore, getPulseHistory, getTopTopics, getLatestReport } from '@whistling/db'
import { getMentionStats } from '@whistling/db'

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

      const [
        pulseScore,
        pulseHistory,
        currentStats,
        previousStats,
        topTopics,
        latestReport,
        pendingRecommendations,
        sourceHealth,
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
      ])

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
