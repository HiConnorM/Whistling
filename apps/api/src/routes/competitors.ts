import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { addCompetitorSchema } from '@whistling/domain'
import { enforceUsageLimit } from '../services/enforcement.js'
import { isSafeUrl } from '../services/ssrf.js'
import { writeAuditLog } from '../services/audit.js'

const discoverSchema = z.object({
  businessId: z.string(),
  businessName: z.string().max(200),
  category: z.string().max(100),
  city: z.string().max(100),
  state: z.string().max(50),
})

export async function competitorRoutes(app: FastifyInstance) {
  // ── List competitors for a business ──────────────────────────────────────
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
        include: { _count: { select: { mentions: true } } },
        orderBy: [{ discoveryScore: 'desc' }, { createdAt: 'asc' }],
      })
    },
  )

  // ── Add a competitor manually ─────────────────────────────────────────────
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
        'add_competitor',
      )
      if (!check.allowed) {
        return reply.status(402).send({ error: check.reason, upgradeRequired: check.upgradeRequired })
      }

      const body = addCompetitorSchema.parse(req.body)

      // Sanitize URLs
      if (body.googleUrl && !isSafeUrl(body.googleUrl)) {
        return reply.status(400).send({ error: 'Invalid Google URL' })
      }
      if (body.websiteUrl && !isSafeUrl(body.websiteUrl)) {
        return reply.status(400).send({ error: 'Invalid website URL' })
      }

      const competitor = await app.db.competitor.create({
        data: { ...body, businessId: req.params.businessId, isAutoDiscovered: false },
      })

      await writeAuditLog(app.db, {
        organizationId,
        userId,
        action: 'competitor.added',
        resourceType: 'competitor',
        resourceId: competitor.id,
        req,
      })

      return reply.status(201).send(competitor)
    },
  )

  // ── Remove (soft-delete) a competitor ────────────────────────────────────
  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { organizationId, userId } = req.user
      const competitor = await app.db.competitor.findUnique({
        where: { id: req.params.id },
        include: { business: { select: { organizationId: true } } },
      })

      if (!competitor || competitor.business.organizationId !== organizationId) {
        return reply.status(404).send({ error: 'Not found' })
      }

      await app.db.competitor.update({
        where: { id: req.params.id },
        data: { isActive: false },
      })

      await writeAuditLog(app.db, {
        organizationId,
        userId,
        action: 'competitor.removed',
        resourceType: 'competitor',
        resourceId: req.params.id,
        req,
      })

      return reply.status(204).send()
    },
  )

  // ── Onboarding competitor discovery ──────────────────────────────────────
  // Lightweight: calls Google Places text search to find nearby competitors.
  // Returns ranked suggestions — user confirms which to track.
  app.post(
    '/discover',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const body = discoverSchema.parse(req.body)
      const { organizationId } = req.user

      // Check subscription status
      const sub = await app.db.subscription.findUnique({ where: { organizationId } })
      if (sub && (sub.status === 'CANCELED' || sub.status === 'PAST_DUE')) {
        return reply.status(402).send({ error: 'Active subscription required for competitor discovery.' })
      }

      const business = await app.db.business.findUnique({
        where: { id: body.businessId },
      })
      if (!business || business.organizationId !== organizationId) {
        return reply.status(404).send({ error: 'Business not found' })
      }

      const existing = await app.db.competitor.findMany({
        where: { businessId: body.businessId, isActive: true },
        select: { name: true, googlePlaceId: true },
      })
      const existingNames = new Set(existing.map((c) => c.name.toLowerCase()))
      const existingPlaceIds = new Set(existing.map((c) => c.googlePlaceId).filter(Boolean))

      const candidates = await discoverLocalCompetitors({
        businessName: body.businessName,
        category: body.category,
        city: body.city,
        state: body.state,
      })

      // Filter out already-tracked competitors
      const suggestions = candidates
        .filter(
          (c) =>
            !existingNames.has(c.name.toLowerCase()) &&
            !(c.googlePlaceId && existingPlaceIds.has(c.googlePlaceId)),
        )
        .slice(0, 10) // Return up to 10 suggestions; user picks which to add

      return { suggestions }
    },
  )

  // ── Bulk-confirm discovered competitors ───────────────────────────────────
  app.post<{ Params: { businessId: string } }>(
    '/:businessId/confirm-discovery',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { organizationId, userId } = req.user
      const business = await app.db.business.findUnique({
        where: { id: req.params.businessId },
      })
      if (!business || business.organizationId !== organizationId) {
        return reply.status(404).send({ error: 'Not found' })
      }

      const bodySchema = z.object({
        competitors: z.array(
          z.object({
            name: z.string().max(200),
            googlePlaceId: z.string().optional(),
            googleUrl: z.string().url().optional(),
            websiteUrl: z.string().url().optional(),
            city: z.string().optional(),
            rating: z.number().optional(),
            reviewCount: z.number().int().optional(),
            discoveryScore: z.number().optional(),
          }),
        ).max(50),
      })

      const { competitors } = bodySchema.parse(req.body)

      // Enforce plan cap against how many are already tracked
      const planCheck = await enforceUsageLimit(
        app.db,
        { organizationId, businessId: req.params.businessId },
        'add_competitor',
      )
      // We'll add them one by one stopping when the cap is hit
      const added: string[] = []

      for (const comp of competitors) {
        const check = await enforceUsageLimit(
          app.db,
          { organizationId, businessId: req.params.businessId },
          'add_competitor',
        )
        if (!check.allowed) break

        // Safety: validate URLs
        if (comp.googleUrl && !isSafeUrl(comp.googleUrl)) continue
        if (comp.websiteUrl && !isSafeUrl(comp.websiteUrl)) continue

        const created = await app.db.competitor.create({
          data: {
            businessId: req.params.businessId,
            name: comp.name,
            googlePlaceId: comp.googlePlaceId,
            googleUrl: comp.googleUrl,
            websiteUrl: comp.websiteUrl,
            city: comp.city,
            rating: comp.rating,
            reviewCount: comp.reviewCount,
            discoveryScore: comp.discoveryScore,
            isAutoDiscovered: true,
          },
        })
        added.push(created.id)
      }

      if (added.length > 0) {
        await writeAuditLog(app.db, {
          organizationId,
          userId,
          action: 'competitor.added',
          resourceType: 'business',
          resourceId: req.params.businessId,
          metadata: { count: added.length, source: 'discovery' },
          req,
        })
      }

      return { added: added.length }
    },
  )

  // ── Competitor intelligence comparison ────────────────────────────────────
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

// ── Local competitor discovery via Google Places ──────────────────────────────
// Uses the Google Places Text Search API. Falls back to empty list if not configured.

interface CompetitorCandidate {
  name: string
  googlePlaceId?: string
  googleUrl?: string
  rating?: number
  reviewCount?: number
  discoveryScore: number
  city?: string
  websiteUrl?: string
}

async function discoverLocalCompetitors(opts: {
  businessName: string
  category: string
  city: string
  state: string
}): Promise<CompetitorCandidate[]> {
  const apiKey = process.env['GOOGLE_PLACES_API_KEY']
  if (!apiKey) {
    // Return empty list — discovery needs Google Places configured
    return []
  }

  const query = `${opts.category} near ${opts.city}, ${opts.state}`
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
  url.searchParams.set('query', query)
  url.searchParams.set('key', apiKey)

  const res = await fetch(url.toString())
  if (!res.ok) return []

  const data = await res.json() as {
    results?: Array<{
      place_id?: string
      name?: string
      rating?: number
      user_ratings_total?: number
      formatted_address?: string
      website?: string
    }>
  }

  if (!data.results) return []

  return data.results
    .filter((r) => r.name && r.name.toLowerCase() !== opts.businessName.toLowerCase())
    .slice(0, 15)
    .map((r, i) => {
      // Score: higher rating + more reviews = more relevant competitor
      const ratingScore = (r.rating ?? 3) / 5
      const reviewScore = Math.min((r.user_ratings_total ?? 0) / 1000, 1)
      const positionScore = 1 - i / 15

      return {
        name: r.name ?? '',
        googlePlaceId: r.place_id,
        googleUrl: r.place_id
          ? `https://www.google.com/maps/place/?q=place_id:${r.place_id}`
          : undefined,
        rating: r.rating,
        reviewCount: r.user_ratings_total,
        city: opts.city,
        websiteUrl: r.website,
        discoveryScore: +(ratingScore * 0.4 + reviewScore * 0.3 + positionScore * 0.3).toFixed(3),
      }
    })
    .sort((a, b) => b.discoveryScore - a.discoveryScore)
}
