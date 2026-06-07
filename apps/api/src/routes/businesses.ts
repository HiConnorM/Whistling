import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createBusinessSchema, updateBusinessSchema } from '@whistling/domain'
import { getBusinessesForOrg, getBusinessWithSources } from '@whistling/db'
import { enforceUsageLimit } from '../services/enforcement.js'
import { writeAuditLog } from '../services/audit.js'

export async function businessRoutes(app: FastifyInstance) {
  // List businesses for org
  app.get(
    '/',
    { preHandler: [app.authenticate] },
    async (req) => {
      const { organizationId } = req.user
      return getBusinessesForOrg(app.db, organizationId)
    },
  )

  // Get single business
  app.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const business = await getBusinessWithSources(app.db, req.params.id)
      if (!business || business.organizationId !== req.user.organizationId) {
        return reply.status(404).send({ error: 'Not found' })
      }
      return business
    },
  )

  // Create business
  app.post(
    '/',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const body = createBusinessSchema.parse(req.body)
      const { organizationId, userId } = req.user

      const check = await enforceUsageLimit(app.db, { organizationId }, 'add_business')
      if (!check.allowed) {
        return reply.status(402).send({ error: check.reason, upgradeRequired: check.upgradeRequired })
      }

      const business = await app.db.business.create({
        data: {
          ...body,
          category: body.category.toUpperCase() as Parameters<typeof app.db.business.create>[0]['data']['category'],
          organizationId,
        },
      })

      return reply.status(201).send(business)
    },
  )

  // Update business
  app.patch<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const body = updateBusinessSchema.parse(req.body)
      const existing = await app.db.business.findUnique({ where: { id: req.params.id } })

      if (!existing || existing.organizationId !== req.user.organizationId) {
        return reply.status(404).send({ error: 'Not found' })
      }

      const updated = await app.db.business.update({
        where: { id: req.params.id },
        data: body as Parameters<typeof app.db.business.update>[0]['data'],
      })

      return updated
    },
  )

  // Delete (soft)
  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const existing = await app.db.business.findUnique({ where: { id: req.params.id } })

      if (!existing || existing.organizationId !== req.user.organizationId) {
        return reply.status(404).send({ error: 'Not found' })
      }

      await app.db.business.update({
        where: { id: req.params.id },
        data: { isActive: false },
      })

      return reply.status(204).send()
    },
  )

  // Trigger a scan for a business
  app.post<{ Params: { id: string } }>(
    '/:id/scan',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const business = await app.db.business.findUnique({
        where: { id: req.params.id },
        include: { sources: { where: { status: 'CONNECTED' } } },
      })

      if (!business || business.organizationId !== req.user.organizationId) {
        return reply.status(404).send({ error: 'Not found' })
      }

      // Enforce usage limits before queuing scan
      const check = await enforceUsageLimit(
        app.db,
        { organizationId: req.user.organizationId, businessId: business.id },
        'run_scan',
      )
      if (!check.allowed) {
        return reply.status(402).send({ error: check.reason, upgradeRequired: check.upgradeRequired })
      }

      const jobs = await Promise.all(
        business.sources.map((source) =>
          app.queues.ingestion.add('scan-source', {
            sourceId: source.id,
            businessId: business.id,
            maxItems: check.maxItemsAllowed,
          }),
        ),
      )

      await writeAuditLog(app.db, {
        organizationId: req.user.organizationId,
        userId: req.user.userId,
        action: 'scan.started',
        resourceType: 'business',
        resourceId: business.id,
        metadata: { sourceCount: jobs.length },
        req,
      })

      return { queued: jobs.length }
    },
  )
}
