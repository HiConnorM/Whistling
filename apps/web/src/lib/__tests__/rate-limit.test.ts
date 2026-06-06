import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// We import the module fresh each test by resetting the module registry so the
// module-level Map is cleared between test groups.
let rateLimit: (key: string, opts: { limit: number; windowMs: number }) => boolean
let rateLimitReset: (key: string) => number

beforeEach(async () => {
  vi.resetModules()
  const mod = await import('../rate-limit')
  rateLimit = mod.rateLimit
  rateLimitReset = mod.rateLimitReset
})

afterEach(() => {
  vi.useRealTimers()
})

describe('rateLimit', () => {
  it('allows requests up to the limit', () => {
    for (let i = 0; i < 5; i++) {
      expect(rateLimit('test:allow', { limit: 5, windowMs: 10_000 })).toBe(true)
    }
  })

  it('blocks the request that exceeds the limit', () => {
    for (let i = 0; i < 3; i++) rateLimit('test:block', { limit: 3, windowMs: 10_000 })
    expect(rateLimit('test:block', { limit: 3, windowMs: 10_000 })).toBe(false)
  })

  it('resets the counter after the window expires', () => {
    vi.useFakeTimers()

    rateLimit('test:reset', { limit: 1, windowMs: 1_000 })
    expect(rateLimit('test:reset', { limit: 1, windowMs: 1_000 })).toBe(false)

    // Advance past the window
    vi.advanceTimersByTime(1_001)
    expect(rateLimit('test:reset', { limit: 1, windowMs: 1_000 })).toBe(true)
  })

  it('tracks different keys independently', () => {
    rateLimit('key:a', { limit: 1, windowMs: 10_000 })
    expect(rateLimit('key:a', { limit: 1, windowMs: 10_000 })).toBe(false)
    expect(rateLimit('key:b', { limit: 1, windowMs: 10_000 })).toBe(true)
  })

  it('allows a burst equal to limit then blocks exactly', () => {
    const limit = 10
    const results: boolean[] = []
    for (let i = 0; i < limit + 3; i++) {
      results.push(rateLimit('burst', { limit, windowMs: 60_000 }))
    }
    expect(results.slice(0, limit).every(Boolean)).toBe(true)
    expect(results.slice(limit).every((r) => r === false)).toBe(true)
  })
})

describe('rateLimitReset', () => {
  it('returns 0 for unknown key', () => {
    expect(rateLimitReset('unknown:key')).toBe(0)
  })

  it('returns a positive number for an active window', () => {
    rateLimit('active:key', { limit: 5, windowMs: 5_000 })
    expect(rateLimitReset('active:key')).toBeGreaterThan(0)
    expect(rateLimitReset('active:key')).toBeLessThanOrEqual(5_000)
  })
})
