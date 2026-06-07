import type { FastifyInstance } from 'fastify'

// Admin routes require an internal API key — not exposed to regular users.
// Set ADMIN_API_KEY in env; guard all routes with it.

function assertAdmin(req: { headers: Record<string, string | string[] | undefined> }, reply: { status: (n: number) => { send: (v: unknown) => unknown } }): boolean {
  const key = process.env['ADMIN_API_KEY']
  if (!key) return true // not configured = dev mode, allow
  const provided = req.headers['x-admin-key']
  if (provided !== key) {
    reply.status(401).send({ error: 'Unauthorized' })
    return false
  }
  return true
}

export async function adminRoutes(app: FastifyInstance) {
  // ── MRR & plan breakdown ──────────────────────────────────────────────────
  app.get('/mrr', async (req, reply) => {
    if (!assertAdmin(req, reply)) return

    const plans = await app.db.subscription.groupBy({
      by: ['plan', 'status'],
      _count: { id: true },
    })

    const PRICES: Record<string, number> = {
      STARTER: 49, PRO: 129, GROWTH: 299, AGENCY: 599,
    }

    const breakdown = plans.map((p) => ({
      plan: p.plan,
      status: p.status,
      count: p._count.id,
      mrr: (PRICES[p.plan] ?? 0) * p._count.id,
    }))

    const totalMrr = breakdown
      .filter((b) => b.status === 'ACTIVE' || b.status === 'TRIALING')
      .reduce((sum, b) => sum + b.mrr, 0)

    return { totalMrr, breakdown }
  })

  // ── Provider cost by org ──────────────────────────────────────────────────
  app.get('/costs', async (req, reply) => {
    if (!assertAdmin(req, reply)) return

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const ledgers = await app.db.usageLedger.findMany({
      where: { periodStart: { gte: monthStart } },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            subscription: { select: { plan: true, status: true } },
          },
        },
      },
      orderBy: { estimatedTotalCostCents: 'desc' },
      take: 50,
    })

    const PRICES: Record<string, number> = {
      STARTER: 49, PRO: 129, GROWTH: 299, AGENCY: 599,
    }

    return ledgers.map((l) => {
      const plan = l.organization.subscription?.plan ?? 'STARTER'
      const revenue = PRICES[plan] ?? 0
      const cost = l.estimatedTotalCostCents / 100
      return {
        organizationId: l.organizationId,
        orgName: l.organization.name,
        plan,
        status: l.organization.subscription?.status,
        revenueCents: revenue * 100,
        estimatedCostCents: l.estimatedTotalCostCents,
        marginCents: revenue * 100 - l.estimatedTotalCostCents,
        collectedSignals: l.collectedSignals,
        apifyRuns: l.apifyRuns,
        responderDrafts: l.responderDrafts,
        apifyCostCents: l.estimatedApifyCostCents,
        openAiCostCents: l.estimatedOpenAICostCents,
        costToRevenueRatio: revenue > 0 ? +(cost / revenue).toFixed(3) : null,
      }
    })
  })

  // ── High-cost orgs ────────────────────────────────────────────────────────
  app.get('/high-cost', async (req, reply) => {
    if (!assertAdmin(req, reply)) return

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const THRESHOLDS: Record<string, number> = {
      STARTER: 1000,
      PRO: 4500,
      GROWTH: 12500,
      AGENCY: 50000,
    }

    const ledgers = await app.db.usageLedger.findMany({
      where: { periodStart: { gte: monthStart } },
      include: {
        organization: {
          select: {
            name: true,
            subscription: { select: { plan: true } },
          },
        },
      },
    })

    const highCost = ledgers.filter((l) => {
      const plan = l.organization.subscription?.plan ?? 'STARTER'
      const threshold = THRESHOLDS[plan] ?? 1000
      return l.estimatedTotalCostCents >= threshold * 0.8
    })

    return highCost.map((l) => ({
      organizationId: l.organizationId,
      orgName: l.organization.name,
      plan: l.organization.subscription?.plan,
      estimatedCostCents: l.estimatedTotalCostCents,
      hardStopCents: l.hardStopCents,
      pctOfBudget: +((l.estimatedTotalCostCents / l.hardStopCents) * 100).toFixed(1),
    }))
  })

  // ── Past-due customers ────────────────────────────────────────────────────
  app.get('/past-due', async (req, reply) => {
    if (!assertAdmin(req, reply)) return

    return app.db.subscription.findMany({
      where: { status: 'PAST_DUE' },
      include: { organization: { select: { name: true, slug: true } } },
      orderBy: { updatedAt: 'asc' },
    })
  })

  // ── Failed scans ──────────────────────────────────────────────────────────
  app.get('/failed-scans', async (req, reply) => {
    if (!assertAdmin(req, reply)) return

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    return app.db.scanJob.findMany({
      where: { status: 'FAILED', createdAt: { gte: since } },
      include: {
        business: { select: { name: true, organizationId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  })

  // ── Provider run stats ────────────────────────────────────────────────────
  app.get('/provider-runs', async (req, reply) => {
    if (!assertAdmin(req, reply)) return

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const runs = await app.db.providerRun.findMany({
      where: { startedAt: { gte: since } },
      orderBy: { estimatedCostCents: 'desc' },
      take: 100,
    })

    const totalCost = runs.reduce((s, r) => s + r.estimatedCostCents, 0)
    const failedCount = runs.filter((r) => r.status === 'FAILED').length

    return {
      totalRuns: runs.length,
      failedRuns: failedCount,
      totalEstimatedCostCents: totalCost,
      runs,
    }
  })
}
