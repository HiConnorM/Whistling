import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { generateResponderDraft, estimateResponderTokens, type ResponderTone } from '@whistling/ai'
import { getPlanLimits } from '@whistling/domain'
import { enforceUsageLimit, recordAiUsage, getOrCreateLedger } from '../services/enforcement.js'
import { writeAuditLog } from '../services/audit.js'

const VALID_TONES: ResponderTone[] = ['professional', 'warm', 'playful', 'direct', 'hospitality']

const createDraftSchema = z.object({
  mentionId: z.string(),
  businessId: z.string(),
  tone: z.enum(['professional', 'warm', 'playful', 'direct', 'hospitality']).default('professional'),
  brandVoice: z.string().max(500).optional(),
})

const approveDraftSchema = z.object({
  approvedText: z.string().max(1000).optional(),
})

export async function responderRoutes(app: FastifyInstance) {
  // ── Create a draft ────────────────────────────────────────────────────────
  app.post(
    '/',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const body = createDraftSchema.parse(req.body)
      const { organizationId, userId } = req.user

      // Check plan entitlement + usage cap
      const check = await enforceUsageLimit(app.db, { organizationId }, 'responder_draft')
      if (!check.allowed) {
        return reply.status(402).send({ error: check.reason, upgradeRequired: check.upgradeRequired })
      }

      // Load the mention to get review text
      const mention = await app.db.mention.findUnique({
        where: { id: body.mentionId },
        include: { business: { select: { name: true, category: true, organizationId: true } } },
      })

      if (!mention || mention.business.organizationId !== organizationId) {
        return reply.status(404).send({ error: 'Mention not found' })
      }

      if (mention.businessId !== body.businessId) {
        return reply.status(400).send({ error: 'Mention does not belong to this business' })
      }

      const sub = await app.db.subscription.findUnique({ where: { organizationId } })
      const limits = getPlanLimits(sub?.plan ?? 'STARTER')

      // Brand voice only on Growth+
      const brandVoice = limits.brandVoice ? body.brandVoice : undefined

      const result = await generateResponderDraft({
        reviewText: mention.text,
        rating: mention.rating,
        sourceType: mention.sourceType,
        businessName: mention.business.name,
        businessCategory: mention.business.category.toLowerCase().replace(/_/g, ' '),
        tone: body.tone,
        brandVoice,
      })

      const draft = await app.db.responderDraft.create({
        data: {
          organizationId,
          businessId: body.businessId,
          mentionId: body.mentionId,
          sourceType: mention.sourceType,
          reviewText: mention.text,
          tone: body.tone,
          generatedText: result.draft,
          safetyFlags: result.safetyFlags,
          brandVoice: brandVoice ?? null,
          createdById: userId,
          status: result.safetyFlags.length > 0 ? 'PENDING' : 'PENDING',
        },
      })

      // Track AI cost
      if (sub?.currentPeriodStart) {
        const { inputTokens, outputTokens } = estimateResponderTokens(mention.text)
        await getOrCreateLedger(
          app.db,
          organizationId,
          sub.currentPeriodStart,
          sub.currentPeriodEnd ?? new Date(),
          limits.hardStopCents,
        )
        await recordAiUsage(app.db, organizationId, sub.currentPeriodStart, {
          inputTokens,
          outputTokens,
          eventType: 'responder_draft',
        })
      }

      await writeAuditLog(app.db, {
        organizationId,
        userId,
        action: 'responder.draft_created',
        resourceType: 'responder_draft',
        resourceId: draft.id,
        metadata: { mentionId: body.mentionId, safetyFlags: result.safetyFlags },
        req,
      })

      return reply.status(201).send({
        ...draft,
        hasSafetyFlags: result.safetyFlags.length > 0,
      })
    },
  )

  // ── List drafts ───────────────────────────────────────────────────────────
  app.get<{ Querystring: { businessId?: string; status?: string } }>(
    '/',
    { preHandler: [app.authenticate] },
    async (req) => {
      const { organizationId } = req.user
      const { businessId, status } = req.query

      return app.db.responderDraft.findMany({
        where: {
          organizationId,
          ...(businessId ? { businessId } : {}),
          ...(status ? { status } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
    },
  )

  // ── Approve or reject a draft ─────────────────────────────────────────────
  app.patch<{ Params: { id: string }; Body: { action: 'approve' | 'reject'; approvedText?: string } }>(
    '/:id',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { organizationId, userId } = req.user
      const { action, approvedText } = req.body

      const draft = await app.db.responderDraft.findUnique({
        where: { id: req.params.id },
      })

      if (!draft || draft.organizationId !== organizationId) {
        return reply.status(404).send({ error: 'Draft not found' })
      }

      if (draft.status !== 'PENDING') {
        return reply.status(400).send({ error: `Draft is already ${draft.status.toLowerCase()}` })
      }

      const updated = await app.db.responderDraft.update({
        where: { id: req.params.id },
        data: {
          status: action === 'approve' ? 'APPROVED' : 'REJECTED',
          approvedText: action === 'approve' ? (approvedText ?? draft.generatedText) : undefined,
          approvedById: action === 'approve' ? userId : undefined,
          approvedAt: action === 'approve' ? new Date() : undefined,
        },
      })

      await writeAuditLog(app.db, {
        organizationId,
        userId,
        action: action === 'approve' ? 'responder.approved' : 'responder.rejected',
        resourceType: 'responder_draft',
        resourceId: draft.id,
        req,
      })

      return updated
    },
  )
}
