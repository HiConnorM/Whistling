import type { FastifyInstance } from 'fastify'
import { getLatestReport, getReportHistory } from '@whistling/db'

export async function reportRoutes(app: FastifyInstance) {
  // List reports for a business
  app.get<{ Querystring: { businessId: string } }>(
    '/',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { businessId } = req.query as { businessId: string }
      const business = await app.db.business.findUnique({ where: { id: businessId } })

      if (!business || business.organizationId !== req.user.organizationId) {
        return reply.status(404).send({ error: 'Not found' })
      }

      return getReportHistory(app.db, businessId)
    },
  )

  // Get latest report
  app.get<{ Params: { businessId: string } }>(
    '/:businessId/latest',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const business = await app.db.business.findUnique({
        where: { id: req.params.businessId },
      })

      if (!business || business.organizationId !== req.user.organizationId) {
        return reply.status(404).send({ error: 'Not found' })
      }

      const report = await getLatestReport(app.db, req.params.businessId)
      if (!report) return reply.status(404).send({ error: 'No report available yet' })

      return report
    },
  )

  // Get specific report
  app.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const report = await app.db.report.findUnique({
        where: { id: req.params.id },
        include: {
          sections: { orderBy: { order: 'asc' } },
          recommendations: { orderBy: [{ priority: 'asc' }] },
          business: { select: { id: true, name: true, organizationId: true } },
        },
      })

      if (!report || report.business.organizationId !== req.user.organizationId) {
        return reply.status(404).send({ error: 'Not found' })
      }

      return report
    },
  )

  // Trigger report generation
  app.post<{ Params: { businessId: string } }>(
    '/:businessId/generate',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const business = await app.db.business.findUnique({
        where: { id: req.params.businessId },
      })

      if (!business || business.organizationId !== req.user.organizationId) {
        return reply.status(404).send({ error: 'Not found' })
      }

      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const report = await app.db.report.create({
        data: {
          businessId: business.id,
          periodStart: weekAgo,
          periodEnd: now,
          status: 'GENERATING',
        },
      })

      await app.queues.reporting.add('generate-weekly-report', {
        businessId: business.id,
        reportId: report.id,
        periodStart: weekAgo.toISOString(),
        periodEnd: now.toISOString(),
      })

      return reply.status(202).send({ reportId: report.id, status: 'GENERATING' })
    },
  )
}
