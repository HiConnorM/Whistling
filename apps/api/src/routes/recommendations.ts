import type { FastifyInstance } from 'fastify'
import type { Prisma } from '@whistling/db'
import { updateRecommendationStatusSchema } from '@whistling/domain'

export async function recommendationRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { businessId: string; status?: string } }>(
    '/',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { businessId, status } = req.query as { businessId: string; status?: string }

      const business = await app.db.business.findUnique({ where: { id: businessId } })
      if (!business || business.organizationId !== req.user.organizationId) {
        return reply.status(404).send({ error: 'Not found' })
      }

      const where: Prisma.RecommendationWhereInput = {
        businessId,
        ...(status && { status: status.toUpperCase() as Prisma.EnumRecommendationStatusFilter }),
      }

      return app.db.recommendation.findMany({
        where,
        orderBy: [{ priority: 'asc' }, { generatedAt: 'desc' }],
        take: 50,
      })
    },
  )

  app.patch<{ Params: { id: string } }>(
    '/:id/status',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const rec = await app.db.recommendation.findUnique({
        where: { id: req.params.id },
        include: { business: true },
      })

      if (!rec || rec.business.organizationId !== req.user.organizationId) {
        return reply.status(404).send({ error: 'Not found' })
      }

      const { status, note } = updateRecommendationStatusSchema.parse(req.body)

      return app.db.recommendation.update({
        where: { id: req.params.id },
        data: {
          status: status.toUpperCase() as Parameters<typeof app.db.recommendation.update>[0]['data']['status'],
          statusNote: note,
          statusUpdatedAt: new Date(),
        },
      })
    },
  )
}
