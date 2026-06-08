import type { FastifyInstance } from 'fastify'
import { getLatestReport, getReportHistory } from '@whistling/db'
import { requireBusinessAccess, requireReportAccess } from '../services/authz.js'

export async function reportRoutes(app: FastifyInstance) {
  // List reports for a business
  app.get<{ Querystring: { businessId: string } }>(
    '/',
    { preHandler: [app.authenticate] },
    async (req) => {
      const { businessId } = req.query as { businessId: string }
      await requireBusinessAccess(app.db, businessId, req.user.organizationId)
      return getReportHistory(app.db, businessId)
    },
  )

  // Get latest report
  app.get<{ Params: { businessId: string } }>(
    '/:businessId/latest',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      await requireBusinessAccess(app.db, req.params.businessId, req.user.organizationId)
      const report = await getLatestReport(app.db, req.params.businessId)
      if (!report) return reply.status(404).send({ error: 'No report available yet' })
      return report
    },
  )

  // Get specific report
  app.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [app.authenticate] },
    async (req) => {
      // requireReportAccess checks org ownership and includes sections + business
      const report = await requireReportAccess(app.db, req.params.id, req.user.organizationId)
      // Re-fetch with sections for the full view
      return app.db.report.findUnique({
        where: { id: req.params.id },
        include: {
          sections: { orderBy: { order: 'asc' } },
          recommendations: { orderBy: [{ priority: 'asc' }] },
          business: { select: { id: true, name: true, organizationId: true } },
        },
      })
    },
  )

  // Trigger report generation
  app.post<{ Params: { businessId: string } }>(
    '/:businessId/generate',
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 5, timeWindow: '1 day' } },
    },
    async (req, reply) => {
      const business = await requireBusinessAccess(app.db, req.params.businessId, req.user.organizationId)

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
