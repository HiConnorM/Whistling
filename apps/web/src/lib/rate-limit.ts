/**
 * Lightweight in-process sliding-window rate limiter.
 *
 * Each key (e.g. IP + route) gets a fixed request quota within a rolling
 * window. State lives in memory per-instance; for multi-instance deployments
 * swap the store for a Redis-backed implementation (e.g. @upstash/ratelimit).
 *
 * Usage:
 *   const allowed = rateLimit(`auth:${ip}`, { limit: 10, windowMs: 60_000 })
 *   if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 */

interface WindowRecord {
  count: number
  /** Unix ms when this window expires */
  resetAt: number
}

// Module-level store — lives for the lifetime of the Node process
const store = new Map<string, WindowRecord>()

// Periodically evict expired entries to avoid unbounded memory growth
let cleanupScheduled = false
function scheduleCleanup() {
  if (cleanupScheduled) return
  cleanupScheduled = true
  setTimeout(() => {
    const now = Date.now()
    for (const [key, record] of store) {
      if (record.resetAt <= now) store.delete(key)
    }
    cleanupScheduled = false
  }, 60_000)
}

export interface RateLimitOptions {
  /** Max requests allowed per window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
}

/**
 * Returns `true` if the request is within quota, `false` if it should be
 * rejected. Side-effects: increments the counter for `key`.
 */
export function rateLimit(key: string, { limit, windowMs }: RateLimitOptions): boolean {
  scheduleCleanup()
  const now = Date.now()
  const record = store.get(key)

  if (!record || record.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (record.count >= limit) return false
  record.count++
  return true
}

/**
 * Returns how many ms until the current window resets for `key`,
 * or 0 if no active window exists.
 */
export function rateLimitReset(key: string): number {
  const record = store.get(key)
  if (!record) return 0
  return Math.max(0, record.resetAt - Date.now())
}
