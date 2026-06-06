/**
 * Unit tests for the org-name → slug transformation used in the onboarding
 * organization route.  The logic is extracted and tested in isolation so we
 * don't need a database.
 */
import { describe, it, expect } from 'vitest'

// Extracted from apps/web/src/app/api/onboarding/organization/route.ts
function buildSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

describe('buildSlug', () => {
  it('converts spaces to hyphens', () => {
    expect(buildSlug('My Great Cafe')).toBe('my-great-cafe')
  })

  it('lowercases input', () => {
    expect(buildSlug('UPPERCASE LLC')).toBe('uppercase-llc')
  })

  it('strips leading and trailing hyphens', () => {
    expect(buildSlug('  hello  ')).toBe('hello')
  })

  it('collapses multiple consecutive special chars to one hyphen', () => {
    expect(buildSlug('A & B — Partners')).toBe('a-b-partners')
  })

  it('keeps digits', () => {
    expect(buildSlug('Route 66 Diner')).toBe('route-66-diner')
  })

  it('returns empty string for all-symbol input', () => {
    expect(buildSlug('---')).toBe('')
    expect(buildSlug('&&&')).toBe('')
  })

  it('handles single character names', () => {
    expect(buildSlug('A')).toBe('a')
  })

  it('handles names with apostrophes and ampersands', () => {
    expect(buildSlug("O'Brien's Pub & Grill")).toBe('o-brien-s-pub-grill')
  })

  it('does not produce double hyphens', () => {
    const slug = buildSlug('Hello   World')
    expect(slug).not.toContain('--')
    expect(slug).toBe('hello-world')
  })
})
