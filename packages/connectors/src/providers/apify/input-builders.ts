import type { ActorKey } from './actors.js'

export type ScanDepth = 'light' | 'standard' | 'deep'

export interface ScanBudget {
  scanDepth: ScanDepth
  maxReviews: number
  maxPosts: number
  maxCommentsPerPost: number
}

const DEPTH_LIMITS: Record<ScanDepth, ScanBudget> = {
  light: {
    scanDepth: 'light',
    maxReviews: 100,
    maxPosts: 5,
    maxCommentsPerPost: 25,
  },
  standard: {
    scanDepth: 'standard',
    maxReviews: 300,
    maxPosts: 15,
    maxCommentsPerPost: 75,
  },
  deep: {
    scanDepth: 'deep',
    maxReviews: 1000,
    maxPosts: 30,
    maxCommentsPerPost: 150,
  },
}

export function getScanBudget(depth: ScanDepth): ScanBudget {
  return DEPTH_LIMITS[depth]
}

export function buildActorInput(
  actorKey: ActorKey,
  sourceUrl: string,
  budget: ScanBudget,
  opts: { isCompetitor?: boolean } = {},
): Record<string, unknown> {
  // Competitor scans always use light depth regardless of plan
  const effectiveBudget = opts.isCompetitor
    ? { ...DEPTH_LIMITS.light, maxReviews: Math.min(budget.maxReviews, 25) }
    : budget

  switch (actorKey) {
    case 'googleMapsReviews':
      return buildGoogleInput(sourceUrl, effectiveBudget)
    case 'yelpReviews':
      return buildYelpInput(sourceUrl, effectiveBudget)
    case 'tripadvisorReviews':
      return buildTripAdvisorInput(sourceUrl, effectiveBudget)
    case 'facebookReviews':
      return buildFacebookReviewsInput(sourceUrl, effectiveBudget)
    case 'facebookComments':
      return buildFacebookCommentsInput(sourceUrl, effectiveBudget)
    case 'instagramComments':
      return buildInstagramCommentsInput(sourceUrl, effectiveBudget)
    case 'tiktokComments':
      return buildTikTokCommentsInput(sourceUrl, effectiveBudget)
  }
}

// ── Per-actor input builders ──────────────────────────────────────────────────
// Inputs are shaped to each actor's documented schema. maxItems caps are the
// primary cost control — we also rely on scan budget enforcement upstream.

function buildGoogleInput(url: string, budget: ScanBudget) {
  return {
    startUrls: [{ url }],
    maxReviews: budget.maxReviews,
    reviewsSort: 'newest',
    language: 'en',
    personalData: false, // minimize PII collection
  }
}

function buildYelpInput(url: string, budget: ScanBudget) {
  return {
    startUrls: [{ url }],
    maxItems: budget.maxReviews,
    sortBy: 'date_desc',
  }
}

function buildTripAdvisorInput(url: string, budget: ScanBudget) {
  return {
    startUrls: [{ url }],
    maxReviews: budget.maxReviews,
    language: 'en',
  }
}

function buildFacebookReviewsInput(url: string, budget: ScanBudget) {
  return {
    startUrls: [{ url }],
    maxItems: budget.maxReviews,
  }
}

function buildFacebookCommentsInput(url: string, budget: ScanBudget) {
  return {
    startUrls: [{ url }],
    maxPosts: budget.maxPosts,
    maxComments: budget.maxCommentsPerPost,
    includeNestedComments: false,
  }
}

function buildInstagramCommentsInput(url: string, budget: ScanBudget) {
  return {
    directUrls: [url],
    maxPosts: budget.maxPosts,
    maxComments: budget.maxCommentsPerPost,
    commentsMode: 'RANKED_BY_MOST_RELEVANT',
  }
}

function buildTikTokCommentsInput(url: string, budget: ScanBudget) {
  return {
    postURLs: [url],
    maxComments: budget.maxPosts * budget.maxCommentsPerPost,
    maxReplies: 0, // skip reply threads to control cost
  }
}
