export type PlanKey = 'STARTER' | 'PRO' | 'GROWTH' | 'AGENCY'

export interface PlanLimits {
  priceMonthlyUsd: number
  // Entitlements
  businesses: number
  activeSources: number
  competitors: number
  signalsPerMonth: number
  apifyRunsPerMonth: number
  scheduledScansPerMonth: number
  scanDepth: 'light' | 'standard' | 'deep'
  // Features
  trendDetection: boolean
  monthlyStrategyReport: boolean
  competitorBenchmarking: 'basic' | 'standard' | 'advanced'
  // AI responder
  responderDraftsPerMonth: number // 0 = disabled
  brandVoice: boolean
  // Platform
  whiteLabel: boolean
  // Internal cost guardrails (USD cents)
  hardStopCents: number
}

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  STARTER: {
    priceMonthlyUsd: 49,
    businesses: 1,
    activeSources: 2,
    competitors: 3,
    signalsPerMonth: 1200,
    apifyRunsPerMonth: 10,
    scheduledScansPerMonth: 4,
    scanDepth: 'light',
    trendDetection: false,
    monthlyStrategyReport: false,
    competitorBenchmarking: 'basic',
    responderDraftsPerMonth: 0,
    brandVoice: false,
    whiteLabel: false,
    hardStopCents: 1000,
  },
  PRO: {
    priceMonthlyUsd: 129,
    businesses: 1,
    activeSources: 5,
    competitors: 8,
    signalsPerMonth: 5000,
    apifyRunsPerMonth: 40,
    scheduledScansPerMonth: 4,
    scanDepth: 'standard',
    trendDetection: true,
    monthlyStrategyReport: false,
    competitorBenchmarking: 'standard',
    responderDraftsPerMonth: 25,
    brandVoice: false,
    whiteLabel: false,
    hardStopCents: 4500,
  },
  GROWTH: {
    priceMonthlyUsd: 299,
    businesses: 3,
    activeSources: 12,
    competitors: 20,
    signalsPerMonth: 15000,
    apifyRunsPerMonth: 120,
    scheduledScansPerMonth: 4,
    scanDepth: 'standard',
    trendDetection: true,
    monthlyStrategyReport: true,
    competitorBenchmarking: 'advanced',
    responderDraftsPerMonth: 200,
    brandVoice: true,
    whiteLabel: false,
    hardStopCents: 12500,
  },
  AGENCY: {
    priceMonthlyUsd: 599,
    businesses: 10,
    activeSources: 30,
    competitors: 50,
    signalsPerMonth: 50000,
    apifyRunsPerMonth: 400,
    scheduledScansPerMonth: 0, // configurable
    scanDepth: 'deep',
    trendDetection: true,
    monthlyStrategyReport: true,
    competitorBenchmarking: 'advanced',
    responderDraftsPerMonth: 1000,
    brandVoice: true,
    whiteLabel: true,
    hardStopCents: 50000,
  },
}

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan as PlanKey] ?? PLAN_LIMITS.STARTER
}

// Max signals that can be collected in a single Apify run by plan
export const MAX_ITEMS_PER_RUN: Record<PlanKey, number> = {
  STARTER: 150,
  PRO: 500,
  GROWTH: 1500,
  AGENCY: 5000,
}

// Competitor scan depth config: max reviews fetched per competitor per month
export const COMPETITOR_SCAN_DEPTH: Record<PlanKey, number> = {
  STARTER: 10,
  PRO: 25,
  GROWTH: 50,
  AGENCY: 200,
}

// Stripe price IDs — loaded from env, exposed here for type-safe plan lookup
export const STRIPE_PRICE_IDS = {
  STARTER: process.env['STRIPE_STARTER_PRICE_ID'] ?? '',
  PRO: process.env['STRIPE_PRO_PRICE_ID'] ?? '',
  GROWTH: process.env['STRIPE_GROWTH_PRICE_ID'] ?? '',
  AGENCY: process.env['STRIPE_AGENCY_PRICE_ID'] ?? '',
} as const

export function planFromPriceId(priceId: string): PlanKey {
  for (const [plan, id] of Object.entries(STRIPE_PRICE_IDS)) {
    if (id && id === priceId) return plan as PlanKey
  }
  return 'STARTER'
}
