import type { FastifyInstance, FastifyRequest } from 'fastify'
import Stripe from 'stripe'

declare module 'fastify' {
  interface FastifyContextConfig {
    rawBody?: boolean
  }
  interface FastifyRequest {
    rawBody?: Buffer
  }
}

export async function webhookRoutes(app: FastifyInstance) {
  // Stripe webhook — must receive raw body
  app.post(
    '/stripe',
    {
      config: { rawBody: true },
    },
    async (req: FastifyRequest, reply) => {
      const sig = req.headers['stripe-signature']
      if (!sig) return reply.status(400).send({ error: 'Missing signature' })

      const stripeWebhookSecret = process.env['STRIPE_WEBHOOK_SECRET']
      if (!stripeWebhookSecret) {
        return reply.status(500).send({ error: 'Stripe not configured' })
      }

      const stripe = new Stripe(process.env['STRIPE_SECRET_KEY'] ?? '')

      let event: Stripe.Event
      try {
        event = stripe.webhooks.constructEvent(
          (req as FastifyRequest & { rawBody: Buffer }).rawBody,
          sig as string,
          stripeWebhookSecret,
        )
      } catch {
        return reply.status(400).send({ error: 'Invalid signature' })
      }

      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const sub = event.data.object as Stripe.Subscription
          const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
          const priceId = sub.items.data[0]?.price.id

          const planMap: Record<string, string> = {
            [process.env['STRIPE_STARTER_PRICE_ID'] ?? '']: 'STARTER',
            [process.env['STRIPE_PRO_PRICE_ID'] ?? '']: 'PRO',
            [process.env['STRIPE_GROWTH_PRICE_ID'] ?? '']: 'GROWTH',
            [process.env['STRIPE_AGENCY_PRICE_ID'] ?? '']: 'AGENCY',
          }

          const plan = priceId ? (planMap[priceId] ?? 'STARTER') : 'STARTER'

          await app.db.subscription.upsert({
            where: { stripeCustomerId: customerId },
            create: {
              organizationId: sub.metadata['organizationId'] ?? '',
              stripeCustomerId: customerId,
              stripeSubscriptionId: sub.id,
              stripePriceId: priceId,
              plan: plan as Parameters<typeof app.db.subscription.upsert>[0]['create']['plan'],
              status: sub.status.toUpperCase() as Parameters<typeof app.db.subscription.upsert>[0]['create']['status'],
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            },
            update: {
              plan: plan as Parameters<typeof app.db.subscription.upsert>[0]['update']['plan'],
              status: sub.status.toUpperCase() as Parameters<typeof app.db.subscription.upsert>[0]['update']['status'],
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            },
          })
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

      return { received: true }
    },
  )
}
