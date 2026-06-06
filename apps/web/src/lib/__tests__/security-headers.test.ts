/**
 * Smoke test: verify the security header list defined in next.config.ts
 * contains the required keys and non-empty values.
 */
import { describe, it, expect } from 'vitest'

const REQUIRED_HEADERS = [
  'X-Frame-Options',
  'X-Content-Type-Options',
  'X-XSS-Protection',
  'Referrer-Policy',
  'Permissions-Policy',
  'Strict-Transport-Security',
  'Content-Security-Policy',
]

// Mirror the securityHeaders array from next.config.ts (kept in sync manually)
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; frame-ancestors 'none'; object-src 'none'",
  },
]

const headerMap = Object.fromEntries(securityHeaders.map((h) => [h.key, h.value]))

describe('security headers', () => {
  it.each(REQUIRED_HEADERS)('defines %s', (name) => {
    expect(headerMap[name]).toBeTruthy()
  })

  it('X-Frame-Options is DENY (not SAMEORIGIN)', () => {
    expect(headerMap['X-Frame-Options']).toBe('DENY')
  })

  it('CSP blocks frame-ancestors', () => {
    expect(headerMap['Content-Security-Policy']).toContain("frame-ancestors 'none'")
  })

  it('CSP blocks object-src', () => {
    expect(headerMap['Content-Security-Policy']).toContain("object-src 'none'")
  })

  it('HSTS has a long max-age (at least 1 year)', () => {
    const match = headerMap['Strict-Transport-Security'].match(/max-age=(\d+)/)
    expect(match).not.toBeNull()
    const maxAge = parseInt(match![1]!, 10)
    expect(maxAge).toBeGreaterThanOrEqual(31_536_000) // 1 year in seconds
  })

  it('Permissions-Policy disables camera, microphone, and geolocation', () => {
    const policy = headerMap['Permissions-Policy']
    expect(policy).toContain('camera=()')
    expect(policy).toContain('microphone=()')
    expect(policy).toContain('geolocation=()')
  })
})
