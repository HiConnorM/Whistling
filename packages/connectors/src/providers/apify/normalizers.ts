import crypto from 'crypto'
import type { ActorKey } from './actors.js'
import type { SourceType } from '@whistling/domain'

export interface ApifyNormalizedItem {
  externalId: string
  sourceType: SourceType
  mediaType: 'review' | 'comment'
  text: string
  rating?: number
  authorName?: string
  authorId?: string
  authorHandle?: string
  publishedAt?: Date
  url?: string
  parentPostUrl?: string
  rawJson: unknown
}

// ── Stable ID generation ──────────────────────────────────────────────────────
// When an actor doesn't provide a stable ID, generate one deterministically.

function stableId(...parts: Array<string | undefined | null>): string {
  return crypto
    .createHash('sha256')
    .update(parts.filter(Boolean).join('::'))
    .digest('hex')
    .slice(0, 32)
}

function safeDate(value: string | number | undefined | null): Date | undefined {
  if (!value) return undefined
  const d = typeof value === 'number' ? new Date(value * 1000) : new Date(value)
  return isNaN(d.getTime()) ? undefined : d
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

export function normalizeApifyItem(
  actorKey: ActorKey,
  raw: unknown,
): ApifyNormalizedItem | null {
  try {
    switch (actorKey) {
      case 'googleMapsReviews':  return normalizeGoogleReview(raw)
      case 'yelpReviews':        return normalizeYelpReview(raw)
      case 'tripadvisorReviews': return normalizeTripAdvisorReview(raw)
      case 'facebookReviews':    return normalizeFacebookReview(raw)
      case 'facebookComments':   return normalizeFacebookComment(raw)
      case 'instagramComments':  return normalizeInstagramComment(raw)
      case 'tiktokComments':     return normalizeTikTokComment(raw)
    }
  } catch {
    return null
  }
}

// ── Google Maps Reviews ───────────────────────────────────────────────────────
// compass/google-maps-reviews-scraper output shape

interface GoogleReviewItem {
  reviewId?: string
  reviewUrl?: string
  text?: string
  stars?: number
  rating?: number
  publishedAtDate?: string
  reviewerName?: string
  reviewerId?: string
  reviewer?: { name?: string; id?: string }
  placeId?: string
  placeName?: string
}

function normalizeGoogleReview(raw: unknown): ApifyNormalizedItem | null {
  const item = raw as GoogleReviewItem
  const text = item.text?.trim()
  if (!text) return null

  const id = item.reviewId ?? stableId('google', item.reviewerName, item.publishedAtDate, text)

  return {
    externalId: id,
    sourceType: 'google',
    mediaType: 'review',
    text,
    rating: item.stars ?? item.rating,
    authorName: item.reviewerName ?? item.reviewer?.name,
    authorId: item.reviewerId ?? item.reviewer?.id,
    publishedAt: safeDate(item.publishedAtDate),
    url: item.reviewUrl,
    rawJson: raw,
  }
}

// ── Yelp Reviews ──────────────────────────────────────────────────────────────
// delicious_zebu/yelp-reviews-scraper output shape

interface YelpReviewItem {
  id?: string
  text?: string
  rating?: number
  date?: string
  user?: { name?: string; id?: string; userUrl?: string }
  url?: string
}

function normalizeYelpReview(raw: unknown): ApifyNormalizedItem | null {
  const item = raw as YelpReviewItem
  const text = item.text?.trim()
  if (!text) return null

  const id = item.id ?? stableId('yelp', item.user?.id, item.date, text)

  return {
    externalId: id,
    sourceType: 'yelp',
    mediaType: 'review',
    text,
    rating: item.rating,
    authorName: item.user?.name,
    authorId: item.user?.id,
    publishedAt: safeDate(item.date),
    url: item.url,
    rawJson: raw,
  }
}

// ── TripAdvisor Reviews ───────────────────────────────────────────────────────
// maxcopell/tripadvisor-reviews output shape

interface TripAdvisorReviewItem {
  id?: string | number
  text?: string
  title?: string
  rating?: number
  publishedDate?: string
  username?: string
  userId?: string | number
  url?: string
  reviewUrl?: string
}

function normalizeTripAdvisorReview(raw: unknown): ApifyNormalizedItem | null {
  const item = raw as TripAdvisorReviewItem
  const text = [item.title, item.text].filter(Boolean).join(' — ').trim()
  if (!text) return null

  const id = item.id
    ? String(item.id)
    : stableId('tripadvisor', String(item.userId ?? ''), item.publishedDate, text)

  return {
    externalId: id,
    sourceType: 'tripadvisor',
    mediaType: 'review',
    text,
    rating: item.rating,
    authorName: item.username,
    authorId: item.userId !== undefined ? String(item.userId) : undefined,
    publishedAt: safeDate(item.publishedDate),
    url: item.reviewUrl ?? item.url,
    rawJson: raw,
  }
}

// ── Facebook Reviews ──────────────────────────────────────────────────────────
// apify/facebook-reviews-scraper output shape

interface FacebookReviewItem {
  id?: string
  text?: string
  rating?: number
  date?: string
  user?: { name?: string; url?: string; id?: string }
  url?: string
}

function normalizeFacebookReview(raw: unknown): ApifyNormalizedItem | null {
  const item = raw as FacebookReviewItem
  const text = item.text?.trim()
  if (!text) return null

  const id = item.id ?? stableId('fb_review', item.user?.id, item.date, text)

  return {
    externalId: id,
    sourceType: 'facebook',
    mediaType: 'review',
    text,
    rating: item.rating,
    authorName: item.user?.name,
    authorId: item.user?.id,
    publishedAt: safeDate(item.date),
    url: item.url,
    rawJson: raw,
  }
}

// ── Facebook Comments ─────────────────────────────────────────────────────────
// apify/facebook-comments-scraper output shape

interface FacebookCommentItem {
  id?: string
  text?: string | null
  date?: string
  profileName?: string
  profileUrl?: string
  postUrl?: string
  url?: string
}

function normalizeFacebookComment(raw: unknown): ApifyNormalizedItem | null {
  const item = raw as FacebookCommentItem
  const text = item.text?.trim()
  if (!text) return null

  const id = item.id ?? stableId('fb_comment', item.profileUrl, item.date, text)

  return {
    externalId: id,
    sourceType: 'facebook',
    mediaType: 'comment',
    text,
    authorName: item.profileName,
    publishedAt: safeDate(item.date),
    url: item.url ?? item.postUrl,
    parentPostUrl: item.postUrl,
    rawJson: raw,
  }
}

// ── Instagram Comments ────────────────────────────────────────────────────────
// apify/instagram-comment-scraper output shape

interface InstagramCommentItem {
  id?: string
  text?: string
  timestamp?: string
  ownerUsername?: string
  ownerId?: string
  postUrl?: string
  url?: string
}

function normalizeInstagramComment(raw: unknown): ApifyNormalizedItem | null {
  const item = raw as InstagramCommentItem
  const text = item.text?.trim()
  if (!text) return null

  const id = item.id ?? stableId('ig_comment', item.ownerId, item.timestamp, text)

  return {
    externalId: id,
    sourceType: 'instagram',
    mediaType: 'comment',
    text,
    authorHandle: item.ownerUsername,
    authorName: item.ownerUsername,
    authorId: item.ownerId,
    publishedAt: safeDate(item.timestamp),
    url: item.postUrl ?? item.url,
    parentPostUrl: item.postUrl,
    rawJson: raw,
  }
}

// ── TikTok Comments ───────────────────────────────────────────────────────────
// clockworks/tiktok-comments-scraper output shape

interface TikTokCommentItem {
  id?: string
  text?: string
  createTime?: number
  authorMeta?: { name?: string; id?: string; handle?: string }
  videoMeta?: { webVideoUrl?: string }
}

function normalizeTikTokComment(raw: unknown): ApifyNormalizedItem | null {
  const item = raw as TikTokCommentItem
  const text = item.text?.trim()
  if (!text) return null

  const id = item.id ?? stableId('tiktok', item.authorMeta?.id, String(item.createTime ?? ''), text)
  const videoUrl = item.videoMeta?.webVideoUrl

  return {
    externalId: id,
    sourceType: 'tiktok',
    mediaType: 'comment',
    text,
    authorName: item.authorMeta?.name,
    authorHandle: item.authorMeta?.handle ?? item.authorMeta?.name,
    authorId: item.authorMeta?.id,
    publishedAt: safeDate(item.createTime),
    url: videoUrl,
    parentPostUrl: videoUrl,
    rawJson: raw,
  }
}
