import type { FastifyInstance } from 'fastify'
import Stripe from 'stripe'
import { getPlanLimits, STRIPE_PRICE_IDS } from '@whistling/domain'
import { writeAuditLog } from '../services/audit.js'

function getStripe() {
  const key = process.env['STRIPE_SECRET_KEY']
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Stripe(key)
}

export async function billingRoutes(app: FastifyInstance) {
  // ── Create Stripe Checkout session ────────────────────────────────────────
  app.post<{ Body: { plan: string; successUrl: string; cancelUrl: string } }>(
    '/checkout',
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
    },
    async (req, reply) => {
      const { plan, successUrl, cancelUrl } = req.body
      const { organizationId, userId } = req.user

      const priceId = STRIPE_PRICE_IDS[plan as keyof typeof STRIPE_PRICE_IDS]
      if (!priceId) {
        return reply.status(400).send({ error: 'Invalid plan' })
      }

      const stripe = getStripe()
      const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'

      // Look up existing customer or let Stripe create one
      const sub = await app.db.subscription.findUnique({
        where: { organizationId },
      })

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        customer: sub?.stripeCustomerId ?? undefined,
        success_url: successUrl || `${appUrl}/dashboard?billing=success`,
        cancel_url: cancelUrl || `${appUrl}/settings/billing`,
        subscription_data: {
          metadata: { organizationId },
          trial_period_days: plan === 'STARTER' ? 14 : undefined,
        },
        allow_promotion_codes: true,
      })

      await writeAuditLog(app.db, {
        organizationId,
        userId,
        action: 'billing.checkout_started',
        metadata: { plan, sessionId: session.id },
        req,
      })

      return { url: session.url }
    },
  )

  // ── Stripe Customer Portal ────────────────────────────────────────────────
  app.post<{ Body: { returnUrl?: string } }>(
    '/portal',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { organizationId, userId } = req.user

      const sub = await app.db.subscription.findUnique({
        where: { organizationId },
      })

      if (!sub?.stripeCustomerId) {
        return reply.status(400).send({ error: 'No billing account found. Please subscribe first.' })
      }

      const stripe = getStripe()
      const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'

      const session = await stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: req.body.returnUrl || `${appUrl}/settings/billing`,
      })

      await writeAuditLog(app.db, {
        organizationId,
        userId,
        action: 'billing.portal_opened',
        req,
      })

      return { url: session.url }
    },
  )

  // ── Current usage & subscription info ────────────────────────────────────
  app.get(
    '/usage',
    { preHandler: [app.authenticate] },
    async (req) => {
      const { organizationId } = req.user

      const sub = await app.db.subscription.findUnique({
        where: { organizationId },
      })

      const limits = getPlanLimits(sub?.plan ?? 'STARTER')

      const ledger = sub?.currentPeriodStart
        ? await app.db.usageLedger.findUnique({
            where: {
              organizationId_periodStart: {
                organizationId,
                periodStart: sub.currentPeriodStart,
              },
            },
          })
        : null

      return {
        plan: sub?.plan ?? 'STARTER',
        status: sub?.status ?? 'TRIALING',
        currentPeriodEnd: sub?.currentPeriodEnd,
        cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
        limits: {
          businesses: limits.businesses,
          activeSources: limits.activeSources,
          competitors: limits.competitors,
          signalsPerMonth: limits.signalsPerMonth,
          responderDraftsPerMonth: limits.responderDraftsPerMonth,
        },
        usage: {
          collectedSignals: ledger?.collectedSignals ?? 0,
          apifyRuns: ledger?.apifyRuns ?? 0,
          responderDrafts: ledger?.responderDrafts ?? 0,
          reportsGenerated: ledger?.reportsGenerated ?? 0,
          estimatedCostCents: ledger?.estimatedTotalCostCents ?? 0,
        },
      }
    },
  )
}
