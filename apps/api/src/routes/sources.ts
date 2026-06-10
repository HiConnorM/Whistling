import type { FastifyInstance } from 'fastify'
import { connectSourceSchema } from '@whistling/domain'
import { actorKeyForSource, APIFY_ACTORS } from '@whistling/connectors'
import { enforceUsageLimit, createScanBudget } from '../services/enforcement.js'
import { isSafeUrl, assertHostForSourceType } from '../services/ssrf.js'
import { writeAuditLog } from '../services/audit.js'
import { checkOrgRateLimit } from '../services/rateLimitOrg.js'
import type { Prisma } from '@whistling/db'

// Source types that go through Apify (public URL scraping, no OAuth needed)
const APIFY_SOURCE_TYPES = new Set(['google', 'yelp', 'tripadvisor', 'facebook', 'instagram', 'tiktok'])

// Source types that require OAuth flow
const OAUTH_SOURCE_TYPES = new Set(['youtube', 'reddit', 'discord'])

// Source types that are always ready (file upload or manual entry)
const MANUAL_SOURCE_TYPES = new Set(['csv', 'manual', 'support_ticket', 'email_inbox', 'website_form'])

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
          // Owner-visible scan config (mediaType, ingestionPlan, scanDepth) — no secrets live here
          metadata: true,
        },
        orderBy: { createdAt: 'asc' },
      })

      return sources
    },
  )

  app.post<{ Params: { businessId: string } }>(
    '/:businessId',
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 20, timeWindow: '1 hour' } },
    },
    async (req, reply) => {
      const { organizationId, userId } = req.user

      // Per-org hourly cap
      const orgCheck = await checkOrgRateLimit(app.redis, organizationId, 'source_create')
      if (!orgCheck.allowed) {
        return reply.status(429).send({ error: orgCheck.reason })
      }

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

      if (body.url) {
        if (!isSafeUrl(body.url)) {
          return reply.status(400).send({ error: 'Invalid source URL' })
        }
        // Enforce per-source-type platform domain allowlist
        const allowlistError = assertHostForSourceType(body.url, body.type)
        if (allowlistError) {
          return reply.status(400).send({ error: allowlistError })
        }
      }

      // Determine initial status and metadata based on source strategy
      const sourceType = body.type
      let initialStatus: 'CONNECTED' | 'NEEDS_AUTH' | 'PENDING' = 'PENDING'
      let metadata: Record<string, unknown> | undefined

      if (APIFY_SOURCE_TYPES.has(sourceType)) {
        if (!body.url) {
          return reply.status(400).send({ error: `A URL is required for ${sourceType} sources` })
        }

        // Instagram and TikTok have no review product — their only ingestible
        // media is comments, so default them to the multi-step comment plan.
        const mediaType =
          body.mediaType ??
          (sourceType === 'instagram' || sourceType === 'tiktok' ? 'comment' : 'review')
        const actorKey = actorKeyForSource(sourceType, mediaType)
        if (!actorKey) {
          return reply.status(400).send({ error: `No actor configured for ${sourceType}` })
        }

        const sub = await app.db.subscription.findUnique({
          where: { organizationId },
          select: { plan: true },
        })
        const { scanDepth, maxItems } = createScanBudget(sub?.plan ?? 'STARTER')

        // Multi-step social comment sources: page/profile URL → discover posts → scrape comments
        const ingestionPlan: string | undefined =
          sourceType === 'facebook' && mediaType === 'comment' ? 'facebookPageComments' :
          sourceType === 'instagram' && mediaType === 'comment' ? 'instagramProfileComments' :
          sourceType === 'tiktok' && mediaType === 'comment' ? 'tiktokProfileComments' :
          undefined

        metadata = {
          strategy: 'apify',
          actorKey,
          actorId: APIFY_ACTORS[actorKey].actorId,
          mediaType,
          scanDepth,
          maxItems,
          ...(ingestionPlan ? { ingestionPlan } : {}),
        }
        initialStatus = 'CONNECTED'
      } else if (MANUAL_SOURCE_TYPES.has(sourceType)) {
        initialStatus = 'CONNECTED'
      } else if (OAUTH_SOURCE_TYPES.has(sourceType)) {
        initialStatus = 'NEEDS_AUTH'
      }

      const source = await app.db.businessSource.create({
        data: {
          businessId: req.params.businessId,
          type: sourceType.toUpperCase() as Parameters<typeof app.db.businessSource.create>[0]['data']['type'],
          url: body.url,
          externalId: body.externalId,
          status: initialStatus,
          metadata: metadata as Prisma.InputJsonValue | undefined,
        },
      })

      await writeAuditLog(app.db, {
        organizationId,
        userId,
        action: 'source.connected',
        resourceType: 'business_source',
        resourceId: source.id,
        metadata: { sourceType: body.type, strategy: metadata?.['strategy'] ?? 'connector' },
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
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
    },
    async (req, reply) => {
      const { organizationId, userId } = req.user

      const source = await app.db.businessSource.findUnique({
        where: { id: req.params.id },
        include: { business: true },
      })

      if (!source || source.business.organizationId !== organizationId) {
        return reply.status(404).send({ error: 'Not found' })
      }

      // Per-org daily scan cap (per-plan)
      const sub = await app.db.subscription.findUnique({
        where: { organizationId },
        select: { plan: true },
      })
      const orgCheck = await checkOrgRateLimit(app.redis, organizationId, 'manual_scan', sub?.plan)
      if (!orgCheck.allowed) {
        return reply.status(429).send({ error: orgCheck.reason })
      }

      const check = await enforceUsageLimit(
        app.db,
        { organizationId, businessId: source.businessId },
        'run_scan',
      )
      if (!check.allowed) {
        return reply.status(402).send({ error: check.reason, upgradeRequired: check.upgradeRequired })
      }

      const sourceMeta = source.metadata as Record<string, unknown> | null
      await app.queues.ingestion.add('scan-source', {
        sourceId: source.id,
        businessId: source.businessId,
        maxItems: check.maxItemsAllowed,
        scanDepth: (sourceMeta?.['scanDepth'] as 'light' | 'standard' | 'deep' | undefined),
        scanMode: 'manual_refresh',
        freshnessMode: 'latest_first',
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
