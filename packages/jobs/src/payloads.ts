import { z } from 'zod'

// ─── Ingestion Queue ──────────────────────────────────────────────────────────

export const SCAN_MODES = ['initial_backfill', 'weekly_incremental', 'manual_refresh', 'deep_backfill'] as const
export const FRESHNESS_MODES = ['latest_first', 'since_last_scan', 'full_backfill'] as const
export type ScanMode = typeof SCAN_MODES[number]
export type FreshnessMode = typeof FRESHNESS_MODES[number]

export const scanSourcePayload = z.object({
  sourceId: z.string(),
  businessId: z.string(),
  cursor: z.string().optional(),
  fullRescan: z.boolean().default(false),
  maxItems: z.number().int().positive().optional(),
  scanDepth: z.enum(['light', 'standard', 'deep']).optional(),
  /** Describes the intent of this scan — drives freshness behaviour in the worker. Derived automatically if omitted. */
  scanMode: z.enum(SCAN_MODES).optional(),
  /** How to filter/sort results relative to prior scans. Derived from scanMode if omitted. */
  freshnessMode: z.enum(FRESHNESS_MODES).optional(),
  /** ISO datetime of the last successful scan — passed as the cutoff for since_last_scan mode. */
  lastSuccessfulScanAt: z.string().datetime().optional(),
})

export const normalizeRawItemPayload = z.object({
  rawItemId: z.string(),
  sourceId: z.string(),
  businessId: z.string(),
})

export const collectApifyRunPayload = z.object({
  providerRunId: z.string(),
  apifyRunId: z.string(),
  datasetId: z.string(),
  sourceId: z.string(),
  businessId: z.string(),
  organizationId: z.string(),
  actorKey: z.string(),
  maxItems: z.number().int().positive(),
  periodStart: z.string().datetime(),
  attempt: z.number().int().default(0),
  /** Passed through so the collection loop can early-stop on stale content. */
  freshnessMode: z.enum(FRESHNESS_MODES).optional(),
  /** ISO datetime cutoff — items older than this are skipped in since_last_scan mode. */
  lastSuccessfulScanAt: z.string().datetime().optional(),
  // ── Multi-step social ingestion ──────────────────────────────────────────
  /** Which step of a multi-step ingestion plan this run represents. */
  step: z.enum(['discover', 'comments']).optional(),
  /** The ingestion plan key (e.g. 'facebookPageComments') — carried through both steps. */
  ingestionPlan: z.string().optional(),
  /** Max comments per post — set in the discover step, consumed in the comments step. */
  maxCommentsPerPost: z.number().int().positive().optional(),
})

// ─── Analysis Queue ───────────────────────────────────────────────────────────

export const classifyMentionPayload = z.object({
  mentionId: z.string(),
  businessId: z.string(),
})

export const classifyMentionsBatchPayload = z.object({
  mentionIds: z.array(z.string()).max(50),
  businessId: z.string(),
})

export const embedMentionPayload = z.object({
  mentionId: z.string(),
})

export const embedMentionsBatchPayload = z.object({
  mentionIds: z.array(z.string()).max(100),
})

// ─── Clustering Queue ─────────────────────────────────────────────────────────

export const clusterBusinessTopicsPayload = z.object({
  businessId: z.string(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  includeCompetitors: z.boolean().default(true),
})

// ─── Intelligence Queue ───────────────────────────────────────────────────────

export const compareCompetitorsPayload = z.object({
  businessId: z.string(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
})

export const generateRecommendationsPayload = z.object({
  businessId: z.string(),
  reportId: z.string().optional(),
})

export const calculatePulseScorePayload = z.object({
  businessId: z.string(),
})

// ─── Reporting Queue ──────────────────────────────────────────────────────────

export const generateWeeklyReportPayload = z.object({
  businessId: z.string(),
  reportId: z.string(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
})

// ─── Notifications Queue ──────────────────────────────────────────────────────

export const sendNewsletterPayload = z.object({
  reportId: z.string(),
  businessId: z.string(),
  organizationId: z.string(),
  recipientEmail: z.string().email(),
})

export const sendAlertPayload = z.object({
  businessId: z.string(),
  alertType: z.enum(['spike', 'critical_complaint', 'competitor_move']),
  data: z.record(z.unknown()),
})

export const refreshSourceTokenPayload = z.object({
  sourceId: z.string(),
})

// ─── Type exports ─────────────────────────────────────────────────────────────

export type ScanSourcePayload = z.infer<typeof scanSourcePayload>
export type NormalizeRawItemPayload = z.infer<typeof normalizeRawItemPayload>
export type CollectApifyRunPayload = z.infer<typeof collectApifyRunPayload>
export type ClassifyMentionPayload = z.infer<typeof classifyMentionPayload>
export type ClassifyMentionsBatchPayload = z.infer<typeof classifyMentionsBatchPayload>
export type EmbedMentionPayload = z.infer<typeof embedMentionPayload>
export type EmbedMentionsBatchPayload = z.infer<typeof embedMentionsBatchPayload>
export type ClusterBusinessTopicsPayload = z.infer<typeof clusterBusinessTopicsPayload>
export type CompareCompetitorsPayload = z.infer<typeof compareCompetitorsPayload>
export type GenerateRecommendationsPayload = z.infer<typeof generateRecommendationsPayload>
export type CalculatePulseScorePayload = z.infer<typeof calculatePulseScorePayload>
export type GenerateWeeklyReportPayload = z.infer<typeof generateWeeklyReportPayload>
export type SendNewsletterPayload = z.infer<typeof sendNewsletterPayload>
export type SendAlertPayload = z.infer<typeof sendAlertPayload>
export type RefreshSourceTokenPayload = z.infer<typeof refreshSourceTokenPayload>
