import type { PrismaClient } from '@whistling/db'
import { getPlanLimits, MAX_ITEMS_PER_RUN, PLAN_LIMITS } from '@whistling/domain'

export type EnforceableAction =
  | 'add_business'
  | 'connect_source'
  | 'add_competitor'
  | 'run_scan'
  | 'responder_draft'
  | 'generate_report'
  | 'generate_monthly_report'
  | 'trend_check'

export interface EnforcementContext {
  organizationId: string
  businessId?: string
}

export interface EnforcementResult {
  allowed: boolean
  reason?: string
  upgradeRequired?: boolean
  maxItemsAllowed?: number // for scan jobs: how many signals this run may collect
}

/**
 * The single gate that every expensive operation must pass.
 * No scan, AI call, or responder draft runs unless this approves it.
 */
export async function enforceUsageLimit(
  db: PrismaClient,
  ctx: EnforcementContext,
  action: EnforceableAction,
): Promise<EnforcementResult> {
  const sub = await db.subscription.findUnique({
    where: { organizationId: ctx.organizationId },
  })

  // No subscription = treat as free/expired
  if (!sub) {
    return blocked('No active subscription. Please set up billing to continue.', true)
  }

  // Block expensive actions on past_due or canceled subscriptions
  if (sub.status === 'PAST_DUE') {
    const readOnlyActions: EnforceableAction[] = []
    if (!readOnlyActions.includes(action)) {
      return blocked(
        'Your payment is past due. Please update your billing information to resume scans and AI features.',
        false,
      )
    }
  }

  if (sub.status === 'CANCELED') {
    return blocked('Your subscription has been canceled. Resubscribe to continue.', true)
  }

  const limits = getPlanLimits(sub.plan)

  // ── Entitlement checks ────────────────────────────────────────────────────

  if (action === 'add_business') {
    const count = await db.business.count({
      where: { organizationId: ctx.organizationId, isActive: true },
    })
    if (count >= limits.businesses) {
      return blocked(
        `Your ${sub.plan} plan allows ${limits.businesses} business${limits.businesses > 1 ? 'es' : ''}. Upgrade to add more.`,
        true,
      )
    }
    return allowed()
  }

  if (action === 'connect_source') {
    if (!ctx.businessId) return blocked('Business ID required.', false)
    const count = await db.businessSource.count({
      where: { businessId: ctx.businessId, status: { not: 'PAUSED' } },
    })
    if (count >= limits.activeSources) {
      return blocked(
        `Your ${sub.plan} plan allows ${limits.activeSources} active sources. Upgrade or pause an existing source.`,
        true,
      )
    }
    return allowed()
  }

  if (action === 'add_competitor') {
    if (!ctx.businessId) return blocked('Business ID required.', false)
    const count = await db.competitor.count({
      where: { businessId: ctx.businessId, isActive: true },
    })
    if (count >= limits.competitors) {
      return blocked(
        `Your ${sub.plan} plan allows ${limits.competitors} competitors. Upgrade to track more.`,
        true,
      )
    }
    return allowed()
  }

  if (action === 'responder_draft') {
    if (limits.responderDraftsPerMonth === 0) {
      return blocked('AI response drafts are not available on your plan. Upgrade to Pro or higher.', true)
    }
    const ledger = await currentLedger(db, ctx.organizationId, sub)
    if (!ledger) return allowed() // no ledger yet = first scan this period
    if (ledger.responderDrafts >= limits.responderDraftsPerMonth) {
      return blocked(
        `You've used all ${limits.responderDraftsPerMonth} response drafts for this billing period. Upgrade for more.`,
        true,
      )
    }
    return allowed()
  }

  if (action === 'trend_check') {
    if (!limits.trendDetection) {
      return blocked('Trend detection is available on Pro and higher plans.', true)
    }
    return allowed()
  }

  if (action === 'generate_monthly_report') {
    if (!limits.monthlyStrategyReport) {
      return blocked('Monthly strategy reports are available on Growth and higher plans.', true)
    }
    return allowed()
  }

  if (action === 'run_scan') {
    const ledger = await currentLedger(db, ctx.organizationId, sub)
    const usedSignals = ledger?.collectedSignals ?? 0
    const usedRuns = ledger?.apifyRuns ?? 0
    const usedCostCents = ledger?.estimatedTotalCostCents ?? 0

    if (usedSignals >= limits.signalsPerMonth) {
      return blocked(
        `You've reached your ${limits.signalsPerMonth.toLocaleString()} monthly signal limit. Your dashboard stays available, and scanning resumes next billing cycle. Upgrade for more signals.`,
        true,
      )
    }

    if (usedRuns >= limits.apifyRunsPerMonth) {
      return blocked(
        `You've used all ${limits.apifyRunsPerMonth} scan runs for this billing period.`,
        true,
      )
    }

    if (usedCostCents >= limits.hardStopCents) {
      return blocked(
        'Your plan\'s service budget for this billing period has been reached. Scanning will resume next billing cycle.',
        false,
      )
    }

    const signalsRemaining = limits.signalsPerMonth - usedSignals
    const maxItemsAllowed = Math.min(
      MAX_ITEMS_PER_RUN[sub.plan as keyof typeof MAX_ITEMS_PER_RUN] ?? 150,
      signalsRemaining,
    )

    return { allowed: true, maxItemsAllowed }
  }

  // generate_report: always allowed if subscription is active
  return allowed()
}

async function currentLedger(
  db: PrismaClient,
  organizationId: string,
  sub: { currentPeriodStart: Date | null; currentPeriodEnd: Date | null },
) {
  if (!sub.currentPeriodStart) return null
  return db.usageLedger.findUnique({
    where: { organizationId_periodStart: { organizationId, periodStart: sub.currentPeriodStart } },
  })
}

function allowed(extra?: Partial<EnforcementResult>): EnforcementResult {
  return { allowed: true, ...extra }
}

function blocked(reason: string, upgradeRequired: boolean): EnforcementResult {
  return { allowed: false, reason, upgradeRequired }
}

/**
 * Get or create the usage ledger for the current billing period.
 * Call this after confirming the scan is allowed.
 */
export async function getOrCreateLedger(
  db: PrismaClient,
  organizationId: string,
  periodStart: Date,
  periodEnd: Date,
  hardStopCents: number,
) {
  return db.usageLedger.upsert({
    where: { organizationId_periodStart: { organizationId, periodStart } },
    create: { organizationId, periodStart, periodEnd, hardStopCents },
    update: {},
  })
}

/**
 * Increment the ledger after a completed scan run.
 * estimatedApifyCostCents: roughly $0.30–$2.50 per 1,000 items depending on actor.
 */
export async function recordScanUsage(
  db: PrismaClient,
  organizationId: string,
  periodStart: Date,
  opts: {
    signals: number
    apifyCostCents: number
  },
) {
  await db.usageLedger.updateMany({
    where: { organizationId, periodStart },
    data: {
      collectedSignals: { increment: opts.signals },
      apifyRuns: { increment: 1 },
      estimatedApifyCostCents: { increment: opts.apifyCostCents },
      estimatedTotalCostCents: { increment: opts.apifyCostCents },
    },
  })

  await db.usageEvent.create({
    data: {
      organizationId,
      provider: 'apify',
      eventType: 'scan_start',
      quantity: opts.signals,
      estimatedCostCents: opts.apifyCostCents,
    },
  })
}

/**
 * Record AI token usage (classification, embeddings, reports).
 * Pricing: gpt-4o-mini $0.75/1M input, $4.50/1M output (batch: $0.375/$2.25).
 */
export async function recordAiUsage(
  db: PrismaClient,
  organizationId: string,
  periodStart: Date,
  opts: {
    inputTokens: number
    outputTokens: number
    eventType: 'ai_classify' | 'ai_embed' | 'ai_report' | 'ai_trend' | 'responder_draft'
    batch?: boolean
  },
) {
  const inputCostCents = Math.ceil(
    (opts.inputTokens / 1_000_000) * (opts.batch ? 37.5 : 75),
  )
  const outputCostCents = Math.ceil(
    (opts.outputTokens / 1_000_000) * (opts.batch ? 225 : 450),
  )
  const totalCents = inputCostCents + outputCostCents

  await db.usageLedger.updateMany({
    where: { organizationId, periodStart },
    data: {
      openaiInputTokens: { increment: opts.inputTokens },
      openaiOutputTokens: { increment: opts.outputTokens },
      estimatedOpenAICostCents: { increment: totalCents },
      estimatedTotalCostCents: { increment: totalCents },
      ...(opts.eventType === 'responder_draft' ? { responderDrafts: { increment: 1 } } : {}),
      ...(opts.eventType === 'ai_report' ? { reportsGenerated: { increment: 1 } } : {}),
    },
  })

  await db.usageEvent.create({
    data: {
      organizationId,
      provider: 'openai',
      eventType: opts.eventType,
      quantity: opts.inputTokens + opts.outputTokens,
      estimatedCostCents: totalCents,
    },
  })
}

/**
 * Returns the scan depth and max items for a given plan.
 * Used by routes/businesses.ts when queuing a scan-source job.
 */
export function createScanBudget(plan: string): {
  scanDepth: 'light' | 'standard' | 'deep'
  maxItems: number
} {
  const limits = getPlanLimits(plan)
  const maxItems = MAX_ITEMS_PER_RUN[plan as keyof typeof MAX_ITEMS_PER_RUN]
    ?? MAX_ITEMS_PER_RUN.STARTER
  return { scanDepth: limits.scanDepth, maxItems }
}
