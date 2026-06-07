import type { PrismaClient } from '@whistling/db'

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
 * Increment usage ledger after a completed Apify scan run.
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
      eventType: 'scan_completed',
      quantity: opts.signals,
      estimatedCostCents: opts.apifyCostCents,
    },
  })
}
