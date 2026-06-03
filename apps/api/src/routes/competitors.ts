import type { FastifyInstance } from 'fastify'
import { addCompetitorSchema } from '@whistling/domain'

export async function competitorRoutes(app: FastifyInstance) {
  app.get<{ Params: { businessId: string } }>(
    '/:businessId',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const business = await app.db.business.findUnique({
        where: { id: req.params.businessId },
      })
      if (!business || business.organizationId !== req.user.organizationId) {
        return reply.status(404).send({ error: 'Not found' })
      }

      return app.db.competitor.findMany({
        where: { businessId: req.params.businessId, isActive: true },
        include: {
          _count: { select: { mentions: true } },
        },
        orderBy: { createdAt: 'asc' },
      })
    },
  )

  app.post<{ Params: { businessId: string } }>(
    '/:businessId',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const business = await app.db.business.findUnique({
        where: { id: req.params.businessId },
      })
      if (!business || business.organizationId !== req.user.organizationId) {
        return reply.status(404).send({ error: 'Not found' })
      }

      const body = addCompetitorSchema.parse(req.body)

      // Check plan limit
      const existingCount = await app.db.competitor.count({
        where: { businessId: req.params.businessId, isActive: true },
      })
      const sub = await app.db.subscription.findUnique({
        where: { organizationId: req.user.organizationId },
      })
      const maxCompetitors: Record<string, number> = {
        STARTER: 3, PRO: 10, GROWTH: 25, AGENCY: 100,
      }
      const limit = maxCompetitors[sub?.plan ?? 'STARTER'] ?? 3

      if (existingCount >= limit) {
        return reply.status(402).send({
          error: `Your plan allows ${limit} competitors. Upgrade to track more.`,
        })
      }

      const competitor = await app.db.competitor.create({
        data: { ...body, businessId: req.params.businessId },
      })

      return reply.status(201).send(competitor)
    },
  )

  // Get competitor intelligence comparison
  app.get<{ Params: { businessId: string }; Querystring: { since?: string } }>(
    '/:businessId/intelligence',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const business = await app.db.business.findUnique({
        where: { id: req.params.businessId },
      })
      if (!business || business.organizationId !== req.user.organizationId) {
        return reply.status(404).send({ error: 'Not found' })
      }

      const since = req.query.since
        ? new Date(req.query.since)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      const competitors = await app.db.competitor.findMany({
        where: { businessId: req.params.businessId, isActive: true },
      })

      const [ownClusters, competitorClusters] = await Promise.all([
        app.db.topicCluster.findMany({
          where: { businessId: req.params.businessId, isCompetitor: false, periodEnd: { gte: since } },
          orderBy: { mentionCount: 'desc' },
          take: 20,
        }),
        app.db.topicCluster.findMany({
          where: { businessId: req.params.businessId, isCompetitor: true, periodEnd: { gte: since } },
          orderBy: { mentionCount: 'desc' },
          take: 30,
        }),
      ])

      return {
        competitors,
        ownStrengths: ownClusters.filter((c) => c.sentiment === 'POSITIVE').slice(0, 5),
        ownWeaknesses: ownClusters.filter((c) => c.sentiment === 'NEGATIVE').slice(0, 5),
        competitorStrengths: competitorClusters.filter((c) => c.sentiment === 'POSITIVE').slice(0, 10),
        competitorWeaknesses: competitorClusters.filter((c) => c.sentiment === 'NEGATIVE').slice(0, 10),
      }
    },
  )
}
