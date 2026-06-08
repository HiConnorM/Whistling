/**
 * Per-organization rate limiter using Redis INCR + EXPIRE.
 *
 * Provides daily and hourly caps per-org for expensive actions that are not
 * covered by the monthly usage ledger (which handles total signal/run limits).
 *
 * Key schema: `rl:{action}:{orgId}:{YYYY-MM-DD}` or `rl:{action}:{orgId}:{YYYY-MM-DD-HH}`
 */
import type { Redis } from 'ioredis'

export type OrgRateLimitedAction =
  | 'responder_draft'
  | 'manual_scan'
  | 'competitor_discovery'
  | 'report_generate'
  | 'source_create'
  | 'csv_upload'
  | 'billing_checkout'

interface OrgCap {
  /** Maximum allowed per day (per org) */
  daily?: number
  /** Maximum allowed per hour (per org) */
  hourly?: number
}

// Plan-specific caps for actions where tiers differ.
// Monthly caps are already enforced by enforceUsageLimit().
const CAPS: Record<OrgRateLimitedAction, Record<string, OrgCap> | OrgCap> = {
  responder_draft: {
    STARTER: { daily: 0 },         // blocked by plan entitlement anyway
    PRO: { daily: 10 },
    GROWTH: { daily: 50 },
    AGENCY: { daily: 200 },
  },
  manual_scan: {
    STARTER: { daily: 2 },
    PRO: { daily: 5 },
    GROWTH: { daily: 10 },
    AGENCY: { daily: 20 },
  },
  competitor_discovery: { daily: 5 },     // per org, all plans
  report_generate: { daily: 5 },          // per org, all plans
  source_create: { hourly: 10 },          // per org, all plans
  csv_upload: { hourly: 5 },              // per org, all plans
  billing_checkout: { hourly: 10 },       // per org, all plans
}

function dateSuffix(hourly = false): string {
  const now = new Date()
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  if (hourly) {
    const hh = String(now.getUTCHours()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}-${hh}`
  }
  return `${yyyy}-${mm}-${dd}`
}

function getCap(action: OrgRateLimitedAction, plan?: string): OrgCap {
  const entry = CAPS[action]
  if (typeof entry === 'object' && !('daily' in entry) && !('hourly' in entry)) {
    // Plan-keyed map
    const planCaps = (entry as Record<string, OrgCap>)[plan ?? 'STARTER']
    return planCaps ?? (entry as Record<string, OrgCap>)['STARTER'] ?? {}
  }
  return entry as OrgCap
}

export interface OrgRateLimitResult {
  allowed: boolean
  reason?: string
  remaining?: number
}

/**
 * Check and increment the org rate counter for an action.
 * Returns allowed=false and a reason string if the cap is exceeded.
 * Call this BEFORE the expensive operation.
 */
export async function checkOrgRateLimit(
  redis: Redis,
  organizationId: string,
  action: OrgRateLimitedAction,
  plan?: string,
): Promise<OrgRateLimitResult> {
  const cap = getCap(action, plan)

  // Check daily cap
  if (cap.daily !== undefined) {
    const key = `rl:${action}:${organizationId}:${dateSuffix(false)}`
    const count = await incrementWithExpiry(redis, key, 24 * 60 * 60)
    if (count > cap.daily) {
      return {
        allowed: false,
        reason: `Daily limit of ${cap.daily} reached for ${action}. Resets at midnight UTC.`,
        remaining: 0,
      }
    }
    return { allowed: true, remaining: cap.daily - count }
  }

  // Check hourly cap
  if (cap.hourly !== undefined) {
    const key = `rl:${action}:${organizationId}:${dateSuffix(true)}`
    const count = await incrementWithExpiry(redis, key, 60 * 60)
    if (count > cap.hourly) {
      return {
        allowed: false,
        reason: `Hourly limit of ${cap.hourly} reached for ${action}. Resets next hour.`,
        remaining: 0,
      }
    }
    return { allowed: true, remaining: cap.hourly - count }
  }

  return { allowed: true }
}

async function incrementWithExpiry(redis: Redis, key: string, ttlSeconds: number): Promise<number> {
  const count = await redis.incr(key)
  if (count === 1) {
    // Only set expiry on first increment to avoid resetting it on every call
    await redis.expire(key, ttlSeconds)
  }
  return count
}
