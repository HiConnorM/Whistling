import type { FastifyInstance } from 'fastify'
import { connectSourceSchema } from '@whistling/domain'
import { enforceUsageLimit } from '../services/enforcement.js'
import { isSafeUrl } from '../services/ssrf.js'
import { writeAuditLog } from '../services/audit.js'

export async function sourceRoutes(app: FastifyInstance) {
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

      const sources = await app.db.businessSource.findMany({
        where: { businessId: req.params.businessId },
        select: {
          id: true,
          type: true,
          url: true,
          status: true,
          lastScannedAt: true,
          nextScanAt: true,
          totalItemsCollected: true,
          errorMessage: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      })

      return sources
    },
  )

  app.post<{ Params: { businessId: string } }>(
    '/:businessId',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { organizationId, userId } = req.user
      const business = await app.db.business.findUnique({
        where: { id: req.params.businessId },
      })
      if (!business || business.organizationId !== organizationId) {
        return reply.status(404).send({ error: 'Not found' })
      }

      const check = await enforceUsageLimit(
        app.db,
        { organizationId, businessId: req.params.businessId },
        'connect_source',
      )
      if (!check.allowed) {
        return reply.status(402).send({ error: check.reason, upgradeRequired: check.upgradeRequired })
      }

      const body = connectSourceSchema.parse(req.body)

      // Validate URLs to prevent SSRF
      if (body.url && !isSafeUrl(body.url)) {
        return reply.status(400).send({ error: 'Invalid source URL' })
      }

      const source = await app.db.businessSource.create({
        data: {
          businessId: req.params.businessId,
          type: body.type.toUpperCase() as Parameters<typeof app.db.businessSource.create>[0]['data']['type'],
          url: body.url,
          externalId: body.externalId,
          status: 'PENDING',
        },
      })

      await writeAuditLog(app.db, {
        organizationId,
        userId,
        action: 'source.connected',
        resourceType: 'business_source',
        resourceId: source.id,
        metadata: { sourceType: body.type },
        req,
      })

      return reply.status(201).send(source)
    },
  )

  // Disconnect / pause a source
  app.patch<{ Params: { id: string }; Body: { status: string } }>(
    '/:id/status',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const source = await app.db.businessSource.findUnique({
        where: { id: req.params.id },
        include: { business: true },
      })

      if (!source || source.business.organizationId !== req.user.organizationId) {
        return reply.status(404).send({ error: 'Not found' })
      }

      const updated = await app.db.businessSource.update({
        where: { id: req.params.id },
        data: { status: req.body.status.toUpperCase() as Parameters<typeof app.db.businessSource.update>[0]['data']['status'] },
      })

      return updated
    },
  )

  // Trigger manual scan for one source
  app.post<{ Params: { id: string } }>(
    '/:id/scan',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { organizationId, userId } = req.user
      const source = await app.db.businessSource.findUnique({
        where: { id: req.params.id },
        include: { business: true },
      })

      if (!source || source.business.organizationId !== organizationId) {
        return reply.status(404).send({ error: 'Not found' })
      }

      const check = await enforceUsageLimit(
        app.db,
        { organizationId, businessId: source.businessId },
        'run_scan',
      )
      if (!check.allowed) {
        return reply.status(402).send({ error: check.reason, upgradeRequired: check.upgradeRequired })
      }

      await app.queues.ingestion.add('scan-source', {
        sourceId: source.id,
        businessId: source.businessId,
        maxItems: check.maxItemsAllowed,
      })

      await writeAuditLog(app.db, {
        organizationId,
        userId,
        action: 'scan.started',
        resourceType: 'business_source',
        resourceId: source.id,
        req,
      })

      return { queued: true }
    },
  )
}
