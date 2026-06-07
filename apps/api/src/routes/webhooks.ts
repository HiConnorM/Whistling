import type { FastifyInstance, FastifyRequest } from 'fastify'
import Stripe from 'stripe'
import { planFromPriceId, getPlanLimits } from '@whistling/domain'
import { writeAuditLog } from '../services/audit.js'

declare module 'fastify' {
  interface FastifyContextConfig {
    rawBody?: boolean
  }
  interface FastifyRequest {
    rawBody?: Buffer
  }
}

export async function webhookRoutes(app: FastifyInstance) {
  // ── Stripe webhook ────────────────────────────────────────────────────────
  app.post(
    '/stripe',
    { config: { rawBody: true } },
    async (req: FastifyRequest, reply) => {
      const sig = req.headers['stripe-signature']
      if (!sig) return reply.status(400).send({ error: 'Missing signature' })

      const stripeWebhookSecret = process.env['STRIPE_WEBHOOK_SECRET']
      const stripeKey = process.env['STRIPE_SECRET_KEY']
      if (!stripeWebhookSecret || !stripeKey) {
        return reply.status(500).send({ error: 'Stripe not configured' })
      }

      const stripe = new Stripe(stripeKey)
      let event: Stripe.Event

      try {
        event = stripe.webhooks.constructEvent(
          (req as FastifyRequest & { rawBody: Buffer }).rawBody,
          sig as string,
          stripeWebhookSecret,
        )
      } catch {
        return reply.status(400).send({ error: 'Invalid webhook signature' })
      }

      // Idempotency: skip if we've already processed this event
      const eventId = event.id
      const already = await app.db.auditLog.findFirst({
        where: { action: 'admin.action', metadata: { path: ['stripeEventId'], equals: eventId } },
      })
      if (already) return { received: true, skipped: true }

      try {
        await handleStripeEvent(app, event)
      } catch (err) {
        app.log.error({ err, eventId, eventType: event.type }, 'Stripe webhook handler error')
        // Return 200 so Stripe doesn't retry indefinitely for processing errors
        return { received: true, error: true }
      }

      // Record that we processed this event
      await app.db.auditLog.create({
        data: {
          organizationId: 'system',
          action: 'admin.action',
          metadata: { stripeEventId: eventId, eventType: event.type },
        },
      })

      return { received: true }
    },
  )
}

async function handleStripeEvent(app: FastifyInstance, event: Stripe.Event) {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
      const priceId = sub.items.data[0]?.price.id ?? ''
      const plan = planFromPriceId(priceId)
      const stripeStatus = mapStripeStatus(sub.status)

      const periodStart = new Date(sub.current_period_start * 1000)
      const periodEnd = new Date(sub.current_period_end * 1000)
      const organizationId = sub.metadata['organizationId'] ?? ''

      const updated = await app.db.subscription.upsert({
        where: { stripeCustomerId: customerId },
        create: {
          organizationId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: sub.id,
          stripePriceId: priceId,
          plan,
          status: stripeStatus,
          trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
        update: {
          plan,
          status: stripeStatus,
          stripePriceId: priceId,
          trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
      })

      await writeAuditLog(app.db, {
        organizationId: updated.organizationId,
        action: 'billing.plan_changed',
        metadata: { plan, status: stripeStatus, stripeSubscriptionId: sub.id },
      })
      break
    }

    case 'invoice.paid': {
      // New billing period started — create a fresh usage ledger
      const invoice = event.data.object as Stripe.Invoice
      const subId = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id

      if (!subId) break

      const dbSub = await app.db.subscription.findUnique({
        where: { stripeSubscriptionId: subId },
      })
      if (!dbSub) break

      const limits = getPlanLimits(dbSub.plan)
      const periodStart = dbSub.currentPeriodStart ?? new Date()
      const periodEnd = dbSub.currentPeriodEnd ?? new Date()

      // Upsert so re-delivery doesn't create duplicates
      await app.db.usageLedger.upsert({
        where: {
          organizationId_periodStart: {
            organizationId: dbSub.organizationId,
            periodStart,
          },
        },
        create: {
          organizationId: dbSub.organizationId,
          periodStart,
          periodEnd,
          hardStopCents: limits.hardStopCents,
        },
        update: {},
      })
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subId = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id

      if (!subId) break

      await app.db.subscription.updateMany({
        where: { stripeSubscriptionId: subId },
        data: { status: 'PAST_DUE' },
      })

      const dbSub = await app.db.subscription.findFirst({
        where: { stripeSubscriptionId: subId },
      })
      if (dbSub) {
        await writeAuditLog(app.db, {
          organizationId: dbSub.organizationId,
          action: 'billing.payment_failed',
          metadata: { stripeSubscriptionId: subId },
        })
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await app.db.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { status: 'CANCELED', canceledAt: new Date() },
      })
      break
    }
  }
}

function mapStripeStatus(status: Stripe.Subscription.Status): 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'PAUSED' {
  switch (status) {
    case 'active': return 'ACTIVE'
    case 'trialing': return 'TRIALING'
    case 'past_due': return 'PAST_DUE'
    case 'canceled': return 'CANCELED'
    case 'paused': return 'PAUSED'
    default: return 'ACTIVE'
  }
}
