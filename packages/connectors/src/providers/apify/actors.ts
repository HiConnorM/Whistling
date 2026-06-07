import type { SourceType } from '@whistling/domain'

export type ActorKey =
  | 'googleMapsReviews'
  | 'yelpReviews'
  | 'tripadvisorReviews'
  | 'facebookReviews'
  | 'facebookComments'
  | 'instagramComments'
  | 'tiktokComments'

export type MediaType = 'review' | 'comment'

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
    costPer1kCents: 50, // ~$0.50 / 1k conservative
  },
  yelpReviews: {
    actorId: 'delicious_zebu/yelp-reviews-scraper',
    sourceType: 'yelp',
    mediaType: 'review',
    costPer1kCents: 60,
  },
  tripadvisorReviews: {
    actorId: 'maxcopell/tripadvisor-reviews',
    sourceType: 'tripadvisor',
    mediaType: 'review',
    costPer1kCents: 120, // $0.90+ / 1k
  },
  facebookReviews: {
    actorId: 'apify/facebook-reviews-scraper',
    sourceType: 'facebook',
    mediaType: 'review',
    costPer1kCents: 250, // $2.50 / 1k conservative
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
    costPer1kCents: 250, // $1.90+ / 1k
  },
  tiktokComments: {
    actorId: 'clockworks/tiktok-comments-scraper',
    sourceType: 'tiktok',
    mediaType: 'comment',
    costPer1kCents: 500, // up to $5 / 1k per FAQ
  },
}

/**
 * Derive the actor key from a BusinessSource's sourceType.
 * A source may have a mediaType preference in metadata (e.g. 'comment' vs 'review' for Facebook).
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
