import { z } from 'zod'
import {
  BUSINESS_CATEGORIES,
  COMPLAINT_TYPES,
  PRAISE_TYPES,
  RECOMMENDATION_CATEGORIES,
  RECOMMENDATION_PRIORITIES,
  RECOMMENDATION_STATUSES,
  SENTIMENTS,
  SOURCE_STATUSES,
  SOURCE_TYPES,
  SUBSCRIPTION_PLANS,
  TREND_DIRECTIONS,
} from './enums.js'

// ─── Pagination ──────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// ─── Business ────────────────────────────────────────────────────────────────

export const createBusinessSchema = z.object({
  name: z.string().min(2).max(200).trim(),
  category: z.enum(BUSINESS_CATEGORIES),
  websiteUrl: z.string().url().optional(),
  googlePlaceId: z.string().optional(),
  city: z.string().min(1).max(100).trim(),
  state: z.string().min(1).max(100).trim(),
  country: z.string().length(2).default('US'),
  description: z.string().max(1000).optional(),
  goals: z.array(z.string().max(200)).max(10).default([]),
})

export const updateBusinessSchema = createBusinessSchema.partial()

// ─── Source ──────────────────────────────────────────────────────────────────

export const connectSourceSchema = z.object({
  type: z.enum(SOURCE_TYPES),
  url: z.string().url().optional(),
  externalId: z.string().optional(),
})

// ─── Competitor ───────────────────────────────────────────────────────────────

export const addCompetitorSchema = z.object({
  name: z.string().min(2).max(200).trim(),
  googlePlaceId: z.string().optional(),
  googleUrl: z.string().url().optional(),
  yelpUrl: z.string().url().optional(),
  facebookUrl: z.string().url().optional(),
  instagramHandle: z.string().optional(),
  websiteUrl: z.string().url().optional(),
  city: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
})

// ─── Mention ─────────────────────────────────────────────────────────────────

export const mentionFilterSchema = z.object({
  businessId: z.string().cuid2(),
  sourceType: z.enum(SOURCE_TYPES).optional(),
  sentiment: z.enum(SENTIMENTS).optional(),
  isCompetitor: z.boolean().optional(),
  topic: z.string().optional(),
  ratingMin: z.coerce.number().min(1).max(5).optional(),
  ratingMax: z.coerce.number().min(1).max(5).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  severityMin: z.coerce.number().min(1).max(5).optional(),
})

// ─── Analysis ────────────────────────────────────────────────────────────────

export const mentionAnalysisSchema = z.object({
  sentiment: z.enum(SENTIMENTS),
  sentimentScore: z.number().min(-1).max(1),
  topics: z.array(z.string()).max(10),
  complaintTypes: z.array(z.enum(COMPLAINT_TYPES)).max(5),
  praiseTypes: z.array(z.enum(PRAISE_TYPES)).max(5),
  severity: z.number().int().min(1).max(5),
  urgency: z.number().int().min(1).max(5),
  actionability: z.number().int().min(1).max(5),
  businessArea: z.string().max(100),
  summary: z.string().max(500).optional(),
  language: z.string().length(2).default('en'),
  isSpam: z.boolean().default(false),
  containsPII: z.boolean().default(false),
  modelVersion: z.string(),
})

// ─── Recommendation ──────────────────────────────────────────────────────────

export const recommendationSchema = z.object({
  title: z.string().max(300),
  category: z.enum(RECOMMENDATION_CATEGORIES),
  priority: z.enum(RECOMMENDATION_PRIORITIES),
  evidence: z.array(z.string().max(500)).max(20),
  suggestedAction: z.string().max(1000),
  why: z.string().max(1000),
  estimatedImpact: z.string().max(500),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  suggestedOwner: z.string().max(100).optional(),
  suggestedTimeline: z.string().max(200).optional(),
  relatedTopics: z.array(z.string()).max(10),
  relatedMentionIds: z.array(z.string()).max(50),
})

export const updateRecommendationStatusSchema = z.object({
  status: z.enum(RECOMMENDATION_STATUSES),
  note: z.string().max(500).optional(),
})

// ─── Report ──────────────────────────────────────────────────────────────────

export const reportPeriodSchema = z.object({
  businessId: z.string().cuid2(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
})

// ─── Topic Cluster ────────────────────────────────────────────────────────────

export const topicClusterSchema = z.object({
  label: z.string().max(200),
  topic: z.string().max(100),
  sentiment: z.enum(SENTIMENTS),
  mentionCount: z.number().int().min(0),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  trendDirection: z.enum(TREND_DIRECTIONS),
  changePercent: z.number(),
  representativeMentionIds: z.array(z.string()).max(5),
  centroidEmbedding: z.array(z.number()).optional(),
})

// ─── Subscription ─────────────────────────────────────────────────────────────

export const planLimitsSchema = z.object({
  businesses: z.number().int(),
  competitors: z.number().int(),
  scanFrequencyHours: z.number().int(),
  dataRetentionDays: z.number().int(),
  teamMembers: z.number().int(),
  weeklyReports: z.boolean(),
  dailyAlerts: z.boolean(),
  whiteLabel: z.boolean(),
  csvExport: z.boolean(),
  apiAccess: z.boolean(),
})

export const PLAN_LIMITS: Record<(typeof SUBSCRIPTION_PLANS)[number], z.infer<typeof planLimitsSchema>> = {
  starter: {
    businesses: 1,
    competitors: 3,
    scanFrequencyHours: 168,
    dataRetentionDays: 90,
    teamMembers: 1,
    weeklyReports: true,
    dailyAlerts: false,
    whiteLabel: false,
    csvExport: false,
    apiAccess: false,
  },
  pro: {
    businesses: 1,
    competitors: 10,
    scanFrequencyHours: 24,
    dataRetentionDays: 365,
    teamMembers: 3,
    weeklyReports: true,
    dailyAlerts: true,
    whiteLabel: false,
    csvExport: true,
    apiAccess: false,
  },
  growth: {
    businesses: 3,
    competitors: 25,
    scanFrequencyHours: 12,
    dataRetentionDays: 730,
    teamMembers: 10,
    weeklyReports: true,
    dailyAlerts: true,
    whiteLabel: false,
    csvExport: true,
    apiAccess: false,
  },
  agency: {
    businesses: 50,
    competitors: 100,
    scanFrequencyHours: 6,
    dataRetentionDays: 1095,
    teamMembers: 50,
    weeklyReports: true,
    dailyAlerts: true,
    whiteLabel: true,
    csvExport: true,
    apiAccess: true,
  },
}

// ─── CSV Upload ───────────────────────────────────────────────────────────────

export const csvReviewRowSchema = z.object({
  text: z.string().min(1).max(10000),
  rating: z.coerce.number().min(1).max(5).optional(),
  author: z.string().max(200).optional(),
  date: z.string().optional(),
  source: z.string().max(100).optional(),
  url: z.string().url().optional(),
})

// ─── Pulse Score ─────────────────────────────────────────────────────────────

export const pulseScoreSchema = z.object({
  total: z.number().int().min(0).max(100),
  sentimentScore: z.number().int().min(0).max(100),
  reviewVelocityScore: z.number().int().min(0).max(100),
  complaintSeverityScore: z.number().int().min(0).max(100),
  responseRateScore: z.number().int().min(0).max(100),
  competitorScore: z.number().int().min(0).max(100),
  trendScore: z.number().int().min(0).max(100),
  previousTotal: z.number().int().min(0).max(100).optional(),
  change: z.number().int().optional(),
})
