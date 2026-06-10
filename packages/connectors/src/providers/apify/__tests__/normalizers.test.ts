import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { normalizeApifyItem, extractPostUrls } from '../normalizers.js'

// vitest runs with cwd at the package root; guard for repo-root invocations too
const fixturesDir = ['src', 'packages/connectors/src']
  .map((p) => join(process.cwd(), p, 'providers/apify/fixtures'))
  .find(existsSync)!

function loadFixture(name: string): unknown[] {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf8')) as unknown[]
}

/** Discovery fixtures start life as stubs — real actor output replaces them after a live run. */
function isStub(items: unknown[]): boolean {
  return items.some((i) => typeof i === 'object' && i !== null && '_STUB' in i)
}

// ─── Google review normalizer ─────────────────────────────────────────────────
// Fixture field names confirmed against a live compass/google-maps-reviews-scraper
// run (June 2026): name, stars, text, publishedAtDate, reviewUrl, reviewId.

describe('normalizeGoogleReview', () => {
  const items = loadFixture('google-maps-reviews.sample.json')

  it('maps the modern actor output shape (top-level name/stars/publishedAtDate)', () => {
    const result = normalizeApifyItem('googleMapsReviews', items[0])
    expect(result).not.toBeNull()
    expect(result!.externalId).toBe('ChZDSUhNMG9nS0VJQ0FnSURGcXZxbXxnEAE')
    expect(result!.sourceType).toBe('google')
    expect(result!.mediaType).toBe('review')
    expect(result!.rating).toBe(5)
    expect(result!.authorName).toBe('Maria Lopez')
    expect(result!.text).toContain('tasting menu')
    expect(result!.publishedAt).toEqual(new Date('2026-05-28T18:42:11.000Z'))
    // url must be the review URL, never the place URL
    expect(result!.url).toContain('/maps/reviews/')
  })

  it('maps the older nested reviewer/rating/publishedAt shape', () => {
    const result = normalizeApifyItem('googleMapsReviews', items[1])
    expect(result).not.toBeNull()
    expect(result!.authorName).toBe('Dan Okafor')
    expect(result!.authorId).toBe('1029384756')
    expect(result!.rating).toBe(2)
    expect(result!.publishedAt).toEqual(new Date('2026-05-25T01:15:00.000Z'))
  })

  it('drops reviews with no text (rating-only reviews are not signals)', () => {
    expect(normalizeApifyItem('googleMapsReviews', items[2])).toBeNull()
  })

  it('generates a deterministic external ID when the actor omits reviewId', () => {
    const noId = { name: 'Anon', stars: 3, text: 'ok', publishedAtDate: '2026-01-01T00:00:00Z' }
    const a = normalizeApifyItem('googleMapsReviews', noId)
    const b = normalizeApifyItem('googleMapsReviews', { ...noId })
    expect(a!.externalId).toBe(b!.externalId)
    expect(a!.externalId).toHaveLength(32)
  })
})

// ─── Facebook comment normalizer ──────────────────────────────────────────────
// Fixture matches the shape the normalizer targets for apify/facebook-comments-scraper
// (id, text, date, profileName, profileUrl, postUrl). Field names are NOT yet
// confirmed against a live run — when you run the real actor, paste its JSON over
// fixtures/facebook-comments.sample.json and fix any field-name drift here.

describe('normalizeFacebookComment', () => {
  const items = loadFixture('facebook-comments.sample.json')

  it('maps comment text, author, date, and parent post URL', () => {
    const result = normalizeApifyItem('facebookComments', items[0])
    expect(result).not.toBeNull()
    expect(result!.sourceType).toBe('facebook')
    expect(result!.mediaType).toBe('comment')
    expect(result!.authorName).toBe('Jess Whitman')
    expect(result!.publishedAt).toEqual(new Date('2026-06-01T15:22:00.000Z'))
    expect(result!.parentPostUrl).toBe('https://www.facebook.com/lakesidegrill/posts/pfbid0abc123')
    // prefers the comment permalink over the post URL when present
    expect(result!.url).toContain('comment_id=')
  })

  it('generates a stable ID for comments without one', () => {
    const result = normalizeApifyItem('facebookComments', items[1])
    expect(result).not.toBeNull()
    expect(result!.externalId).toHaveLength(32)
    const again = normalizeApifyItem('facebookComments', items[1])
    expect(again!.externalId).toBe(result!.externalId)
  })

  it('drops comments with no text (stickers, photos)', () => {
    expect(normalizeApifyItem('facebookComments', items[2])).toBeNull()
  })
})

// ─── Discovery URL extractors ─────────────────────────────────────────────────
// Inline samples prove the extraction logic against every field-name variant the
// extractors defend against. The fixture-driven tests below run once real actor
// output is pasted into the stub fixtures.

describe('extractPostUrls — facebook posts discovery', () => {
  it('extracts post URLs across known field-name variants', () => {
    const urls = extractPostUrls('facebookPostsDiscovery', [
      { url: 'https://www.facebook.com/lakesidegrill/posts/pfbid0abc' },
      { postUrl: 'https://www.facebook.com/lakesidegrill/posts/pfbid0def' },
      { link: 'https://www.facebook.com/lakesidegrill/videos/123456' },
    ])
    expect(urls).toEqual([
      'https://www.facebook.com/lakesidegrill/posts/pfbid0abc',
      'https://www.facebook.com/lakesidegrill/posts/pfbid0def',
      'https://www.facebook.com/lakesidegrill/videos/123456',
    ])
  })

  it('drops items with no URL or with non-facebook URLs', () => {
    const urls = extractPostUrls('facebookPostsDiscovery', [
      { text: 'a post with no url field' },
      { url: 'https://evil.example.com/phish' },
      {},
    ])
    expect(urls).toEqual([])
  })
})

describe('extractPostUrls — instagram posts discovery', () => {
  it('uses the url field when present and builds a URL from shortCode otherwise', () => {
    const urls = extractPostUrls('instagramPostsDiscovery', [
      { url: 'https://www.instagram.com/p/Cabc123/' },
      { shortCode: 'Cdef456' },
    ])
    expect(urls).toEqual([
      'https://www.instagram.com/p/Cabc123/',
      'https://www.instagram.com/p/Cdef456/',
    ])
  })

  it('drops items with neither a valid url nor a shortCode', () => {
    expect(
      extractPostUrls('instagramPostsDiscovery', [{ url: 'https://example.com/x' }, {}]),
    ).toEqual([])
  })
})

describe('extractPostUrls — tiktok videos discovery', () => {
  it('extracts webVideoUrl from top level and from videoMeta', () => {
    const urls = extractPostUrls('tiktokVideosDiscovery', [
      { webVideoUrl: 'https://www.tiktok.com/@biz/video/711111' },
      { videoMeta: { webVideoUrl: 'https://www.tiktok.com/@biz/video/722222' } },
    ])
    expect(urls).toEqual([
      'https://www.tiktok.com/@biz/video/711111',
      'https://www.tiktok.com/@biz/video/722222',
    ])
  })

  it('drops items without a tiktok.com video URL', () => {
    expect(
      extractPostUrls('tiktokVideosDiscovery', [{ webVideoUrl: 'https://example.com' }, { id: '1' }]),
    ).toEqual([])
  })
})

// ─── Fixture-driven discovery tests (activate after live Apify runs) ──────────
// To activate each test below:
//   1. In the Apify console, run the actor against a real public page/profile.
//   2. Storage → Dataset → Export → JSON.
//   3. Paste the JSON array over the matching fixtures/*.sample.json stub.
// The test detects the stub marker and skips until real data is present.

const discoveryFixtures = [
  {
    fixture: 'facebook-posts-discovery.sample.json',
    actorKey: 'facebookPostsDiscovery' as const,
    actor: 'apify/facebook-posts-scraper',
    host: 'facebook.com',
  },
  {
    fixture: 'instagram-posts-discovery.sample.json',
    actorKey: 'instagramPostsDiscovery' as const,
    actor: 'apify/instagram-post-scraper',
    host: 'instagram.com',
  },
  {
    fixture: 'tiktok-videos-discovery.sample.json',
    actorKey: 'tiktokVideosDiscovery' as const,
    actor: 'clockworks/tiktok-scraper',
    host: 'tiktok.com',
  },
]

describe('extractPostUrls — real actor output fixtures', () => {
  for (const { fixture, actorKey, actor, host } of discoveryFixtures) {
    const items = loadFixture(fixture)

    if (isStub(items)) {
      it.todo(
        `${actorKey}: paste real ${actor} dataset JSON into fixtures/${fixture} (run the actor on a public ${host} page, Export → JSON)`,
      )
      continue
    }

    it(`${actorKey}: extracts usable ${host} URLs from real output`, () => {
      const urls = extractPostUrls(actorKey, items)
      expect(urls.length).toBeGreaterThan(0)
      for (const url of urls) {
        expect(url).toMatch(/^https?:\/\//)
        expect(url).toContain(host)
      }
    })
  }
})
