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

      // Idempotency: use ProcessedWebhookEvent keyed by Stripe event ID
      const existing = await app.db.processedWebhookEvent.findUnique({
        where: { id: event.id },
      })
      if (existing) return { received: true, skipped: true }

      // Mark as processed before handling (prevents duplicate processing on retry)
      await app.db.processedWebhookEvent.create({
        data: { id: event.id, provider: 'stripe', eventType: event.type },
      })

      try {
        await handleStripeEvent(app, event)
      } catch (err) {
        app.log.error({ err, eventId: event.id, eventType: event.type }, 'Stripe webhook handler error')
        return { received: true, error: true }
      }

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

      const stripeFields = {
        stripeCustomerId: customerId,
        stripeSubscriptionId: sub.id,
        stripePriceId: priceId,
        plan,
        status: stripeStatus,
        trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      }

      // Check by organizationId first — handles trial rows that have no stripeCustomerId yet
      let updatedOrgId = organizationId
      const existingByOrg = organizationId
        ? await app.db.subscription.findUnique({ where: { organizationId } })
        : null

      if (existingByOrg) {
        await app.db.subscription.update({
          where: { organizationId },
          data: stripeFields,
        })
      } else {
        // Try by stripeCustomerId (handles re-subscription scenarios)
        const existingByCust = await app.db.subscription.findUnique({
          where: { stripeCustomerId: customerId },
        })
        if (existingByCust) {
          await app.db.subscription.update({
            where: { stripeCustomerId: customerId },
            data: stripeFields,
          })
          updatedOrgId = existingByCust.organizationId
        } else {
          // Net-new subscription — create it
          if (!organizationId) {
            app.log.error({ subId: sub.id }, 'Stripe subscription missing organizationId metadata')
            break
          }
          await app.db.subscription.create({
            data: { organizationId, ...stripeFields },
          })
        }
      }

      await writeAuditLog(app.db, {
        organizationId: updatedOrgId,
        action: 'billing.plan_changed',
        metadata: { plan, status: stripeStatus, stripeSubscriptionId: sub.id },
      })
      break
    }

    case 'invoice.paid': {
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

      await app.db.usageLedger.upsert({
        where: {
          organizationId_periodStart: { organizationId: dbSub.organizationId, periodStart },
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
