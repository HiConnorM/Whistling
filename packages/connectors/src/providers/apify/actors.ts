import type { SourceType } from '@whistling/domain'

export type ActorKey =
  | 'googleMapsReviews'
  | 'yelpReviews'
  | 'tripadvisorReviews'
  | 'facebookReviews'
  | 'facebookComments'
  | 'instagramComments'
  | 'tiktokComments'
  // ── Discovery actors (step 1 of social multi-step plans) ──────────────────
  | 'facebookPostsDiscovery'
  | 'instagramPostsDiscovery'
  | 'tiktokVideosDiscovery'

export type MediaType = 'review' | 'comment' | 'post'

export interface ActorConfig {
  actorId: string
  sourceType: SourceType
  mediaType: MediaType
  // Approximate cost per 1,000 items in USD cents (conservative estimate)
  costPer1kCents: number
}

export const APIFY_ACTORS: Record<ActorKey, ActorConfig> = {
  googleMapsReviews: {
    actorId: 'compass/google-maps-reviews-scraper',
    sourceType: 'google',
    mediaType: 'review',
    costPer1kCents: 50,
  },
  yelpReviews: {
    actorId: 'tri_angle/yelp-review-scraper',
    sourceType: 'yelp',
    mediaType: 'review',
    costPer1kCents: 50,
  },
  tripadvisorReviews: {
    actorId: 'maxcopell/tripadvisor-reviews',
    sourceType: 'tripadvisor',
    mediaType: 'review',
    costPer1kCents: 120,
  },
  facebookReviews: {
    actorId: 'apify/facebook-reviews-scraper',
    sourceType: 'facebook',
    mediaType: 'review',
    costPer1kCents: 250,
  },
  facebookComments: {
    actorId: 'apify/facebook-comments-scraper',
    sourceType: 'facebook',
    mediaType: 'comment',
    costPer1kCents: 200,
  },
  instagramComments: {
    actorId: 'apify/instagram-comment-scraper',
    sourceType: 'instagram',
    mediaType: 'comment',
    costPer1kCents: 250,
  },
  tiktokComments: {
    actorId: 'clockworks/tiktok-comments-scraper',
    sourceType: 'tiktok',
    mediaType: 'comment',
    costPer1kCents: 500,
  },
  // ── Discovery actors ────────────────────────────────────────────────────────
  facebookPostsDiscovery: {
    actorId: 'apify/facebook-posts-scraper',
    sourceType: 'facebook',
    mediaType: 'post',
    costPer1kCents: 200,
  },
  instagramPostsDiscovery: {
    actorId: 'apify/instagram-post-scraper',
    sourceType: 'instagram',
    mediaType: 'post',
    costPer1kCents: 150,
  },
  tiktokVideosDiscovery: {
    actorId: 'clockworks/tiktok-scraper',
    sourceType: 'tiktok',
    mediaType: 'post',
    costPer1kCents: 100,
  },
}

// ── Ingestion plans (multi-step social pipelines) ─────────────────────────────

/**
 * A multi-step ingestion plan chains a discovery actor (finds recent
 * posts/videos from a profile URL) with a comment actor (fetches comments
 * from those discovered post URLs).
 *
 * Users paste a single page/profile URL; Whistling handles the rest.
 */
export type IngestionPlan =
  | 'facebookPageComments'
  | 'instagramProfileComments'
  | 'tiktokProfileComments'

export interface IngestionPlanConfig {
  discoveryActorKey: ActorKey
  commentsActorKey: ActorKey
}

export const INGESTION_PLANS: Record<IngestionPlan, IngestionPlanConfig> = {
  facebookPageComments: {
    discoveryActorKey: 'facebookPostsDiscovery',
    commentsActorKey: 'facebookComments',
  },
  instagramProfileComments: {
    discoveryActorKey: 'instagramPostsDiscovery',
    commentsActorKey: 'instagramComments',
  },
  tiktokProfileComments: {
    discoveryActorKey: 'tiktokVideosDiscovery',
    commentsActorKey: 'tiktokComments',
  },
}

export function isIngestionPlan(value: string): value is IngestionPlan {
  return value in INGESTION_PLANS
}

/**
 * Derive the actor key from a BusinessSource's sourceType.
 * Only used for single-step sources — multi-step sources use ingestionPlanForSource.
 */
export function actorKeyForSource(
  sourceType: string,
  mediaType?: string,
): ActorKey | null {
  const t = sourceType.toLowerCase()
  const m = (mediaType ?? 'review').toLowerCase()

  if (t === 'google') return 'googleMapsReviews'
  if (t === 'yelp') return 'yelpReviews'
  if (t === 'tripadvisor') return 'tripadvisorReviews'
  if (t === 'facebook') return m === 'comment' ? 'facebookComments' : 'facebookReviews'
  if (t === 'instagram') return 'instagramComments'
  if (t === 'tiktok') return 'tiktokComments'

  return null
}

export function estimateApifyCostCents(actorKey: ActorKey, itemCount: number): number {
  const config = APIFY_ACTORS[actorKey]
  return Math.ceil((itemCount / 1000) * config.costPer1kCents)
}
