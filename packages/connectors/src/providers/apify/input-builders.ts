import type { ActorKey } from './actors.js'
import type { ScanMode, FreshnessMode } from '@whistling/jobs'

export type ScanDepth = 'light' | 'standard' | 'deep'

export interface ScanBudget {
  scanDepth: ScanDepth
  maxReviews: number
  maxPosts: number
  maxCommentsPerPost: number
}

export interface FreshnessContext {
  scanMode: ScanMode
  freshnessMode: FreshnessMode
  /** The last successful scan timestamp — used as the date cutoff for since_last_scan mode. */
  since?: Date
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

/**
 * How many items to request for incremental (since_last_scan) and light-refresh
 * (latest_first) scans. Full backfills use the full budget.
 *
 * These are intentionally small: incremental scans should only pick up new
 * content since the last run; if the business is getting >50 new reviews/week
 * they need a Growth plan with deeper budgets.
 */
const INCREMENTAL_CAPS: Record<ScanDepth, { since_last_scan: number; latest_first: number }> = {
  light:    { since_last_scan: 50,  latest_first: 50  },
  standard: { since_last_scan: 100, latest_first: 150 },
  deep:     { since_last_scan: 300, latest_first: 500 },
}

export function getScanBudget(depth: ScanDepth): ScanBudget {
  return DEPTH_LIMITS[depth]
}

/**
 * Resolve the effective maxReviews given the freshness mode.
 * Full backfill → use the full budget.
 * Incremental → use the much smaller recent-window cap.
 */
function resolveReviewCap(budget: ScanBudget, freshness: FreshnessContext): number {
  const caps = INCREMENTAL_CAPS[budget.scanDepth]
  switch (freshness.freshnessMode) {
    case 'full_backfill':    return budget.maxReviews
    case 'since_last_scan':  return caps.since_last_scan
    case 'latest_first':     return caps.latest_first
  }
}

function resolvePostCap(budget: ScanBudget, freshness: FreshnessContext): number {
  switch (freshness.freshnessMode) {
    case 'full_backfill':   return budget.maxPosts
    case 'since_last_scan': return Math.max(2, Math.ceil(budget.maxPosts / 4))
    case 'latest_first':    return Math.max(3, Math.ceil(budget.maxPosts / 2))
  }
}

/** Format a Date as YYYY-MM-DD for actor inputs that accept ISO date strings. */
function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function buildActorInput(
  actorKey: ActorKey,
  sourceUrl: string,
  budget: ScanBudget,
  opts: { isCompetitor?: boolean; freshness?: FreshnessContext } = {},
): Record<string, unknown> {
  // Default to a full backfill if no freshness context is given
  const freshness: FreshnessContext = opts.freshness ?? {
    scanMode: 'initial_backfill',
    freshnessMode: 'full_backfill',
  }

  // Competitor scans always use light depth + very small cap regardless of plan
  const effectiveBudget: ScanBudget = opts.isCompetitor
    ? { ...DEPTH_LIMITS.light, maxReviews: Math.min(resolveReviewCap(budget, freshness), 25) }
    : budget

  switch (actorKey) {
    case 'googleMapsReviews':
      return buildGoogleInput(sourceUrl, effectiveBudget, freshness)
    case 'yelpReviews':
      return buildYelpInput(sourceUrl, effectiveBudget, freshness)
    case 'tripadvisorReviews':
      return buildTripAdvisorInput(sourceUrl, effectiveBudget, freshness)
    case 'facebookReviews':
      return buildFacebookReviewsInput(sourceUrl, effectiveBudget, freshness)
    case 'facebookComments':
      return buildFacebookCommentsInput(sourceUrl, effectiveBudget, freshness)
    case 'instagramComments':
      return buildInstagramCommentsInput(sourceUrl, effectiveBudget, freshness)
    case 'tiktokComments':
      return buildTikTokCommentsInput(sourceUrl, effectiveBudget, freshness)
  }
}

// ── Per-actor input builders ──────────────────────────────────────────────────

function buildGoogleInput(url: string, budget: ScanBudget, freshness: FreshnessContext) {
  const maxReviews = resolveReviewCap(budget, freshness)
  return {
    startUrls: [{ url }],
    maxReviews,
    reviewsSort: 'newest',        // always newest-first so incremental stops early
    language: 'en',
    personalData: false,
    // compass/google-maps-reviews-scraper supports reviewsStartDate (YYYY-MM-DD)
    // Only add it for since_last_scan — avoids accidentally skipping reviews on first run
    ...(freshness.freshnessMode === 'since_last_scan' && freshness.since
      ? { reviewsStartDate: toDateString(freshness.since) }
      : {}),
  }
}

function buildYelpInput(url: string, budget: ScanBudget, freshness: FreshnessContext) {
  const maxItems = resolveReviewCap(budget, freshness)
  return {
    startUrls: [{ url }],
    maxItems,
    sortBy: 'date_desc',          // newest first so incremental early-stop works
  }
}

function buildTripAdvisorInput(url: string, budget: ScanBudget, freshness: FreshnessContext) {
  const maxReviews = resolveReviewCap(budget, freshness)
  return {
    startUrls: [{ url }],
    maxReviews,
    language: 'en',
    // maxcopell/tripadvisor-reviews supports lastReviewDate as a date cutoff
    ...(freshness.freshnessMode === 'since_last_scan' && freshness.since
      ? { lastReviewDate: toDateString(freshness.since) }
      : {}),
  }
}

function buildFacebookReviewsInput(url: string, budget: ScanBudget, freshness: FreshnessContext) {
  return {
    startUrls: [{ url }],
    maxItems: resolveReviewCap(budget, freshness),
  }
}

function buildFacebookCommentsInput(url: string, budget: ScanBudget, freshness: FreshnessContext) {
  return {
    startUrls: [{ url }],
    maxPosts: resolvePostCap(budget, freshness),
    maxComments: budget.maxCommentsPerPost,
    includeNestedComments: false,
  }
}

function buildInstagramCommentsInput(url: string, budget: ScanBudget, freshness: FreshnessContext) {
  return {
    directUrls: [url],
    maxPosts: resolvePostCap(budget, freshness),
    maxComments: budget.maxCommentsPerPost,
    // RECENT_COMMENTS for incremental, RANKED_BY_MOST_RELEVANT for backfill
    commentsMode: freshness.freshnessMode === 'full_backfill'
      ? 'RANKED_BY_MOST_RELEVANT'
      : 'RECENT_COMMENTS',
  }
}

function buildTikTokCommentsInput(url: string, budget: ScanBudget, freshness: FreshnessContext) {
  const effectivePosts = resolvePostCap(budget, freshness)
  return {
    postURLs: [url],
    maxComments: effectivePosts * budget.maxCommentsPerPost,
    maxReplies: 0,
  }
}
