export const SOURCE_TYPES = [
  'google',
  'instagram',
  'facebook',
  'youtube',
  'tiktok',
  'yelp',
  'tripadvisor',
  'csv',
  'website_form',
  'email_inbox',
  'manual',
] as const

export type SourceType = (typeof SOURCE_TYPES)[number]

export const SOURCE_STATUSES = ['connected', 'needs_auth', 'error', 'paused', 'pending'] as const
export type SourceStatus = (typeof SOURCE_STATUSES)[number]

export const SENTIMENTS = ['positive', 'neutral', 'negative', 'mixed'] as const
export type Sentiment = (typeof SENTIMENTS)[number]

export const RECOMMENDATION_CATEGORIES = [
  'operations',
  'marketing',
  'service',
  'website',
  'product',
  'pricing',
  'staffing',
  'competitor_response',
] as const
export type RecommendationCategory = (typeof RECOMMENDATION_CATEGORIES)[number]

export const RECOMMENDATION_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const
export type RecommendationPriority = (typeof RECOMMENDATION_PRIORITIES)[number]

export const RECOMMENDATION_STATUSES = ['new', 'accepted', 'dismissed', 'completed'] as const
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number]

export const TREND_DIRECTIONS = ['up', 'down', 'flat'] as const
export type TrendDirection = (typeof TREND_DIRECTIONS)[number]

export const BUSINESS_CATEGORIES = [
  'restaurant',
  'cafe',
  'bar',
  'retail',
  'health_wellness',
  'beauty_salon',
  'medical_dental',
  'home_services',
  'fitness_gym',
  'hospitality',
  'professional_services',
  'auto_services',
  'pet_services',
  'education',
  'entertainment',
  'other',
] as const
export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number]

export const COMPLAINT_TYPES = [
  'wait_time',
  'pricing',
  'staff_attitude',
  'quality',
  'cleanliness',
  'website_ux',
  'booking_issue',
  'parking',
  'hours',
  'communication',
  'consistency',
  'value_for_money',
  'other',
] as const
export type ComplaintType = (typeof COMPLAINT_TYPES)[number]

export const PRAISE_TYPES = [
  'service_speed',
  'staff_friendliness',
  'atmosphere',
  'product_quality',
  'value_for_money',
  'location',
  'cleanliness',
  'consistency',
  'communication',
  'experience',
  'other',
] as const
export type PraiseType = (typeof PRAISE_TYPES)[number]

export const JOB_NAMES = [
  'scan-source',
  'normalize-raw-item',
  'deduplicate-mention',
  'classify-mention',
  'embed-mention',
  'cluster-business-topics',
  'compare-competitors',
  'generate-recommendations',
  'generate-weekly-report',
  'send-newsletter',
  'refresh-source-token',
] as const
export type JobName = (typeof JOB_NAMES)[number]

export const SUBSCRIPTION_PLANS = ['starter', 'pro', 'growth', 'agency'] as const
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number]

export const SUBSCRIPTION_STATUSES = [
  'active',
  'trialing',
  'past_due',
  'canceled',
  'paused',
] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

export const CONNECTOR_MODES = ['oauth', 'api_key', 'public_url', 'csv', 'manual', 'provider'] as const
export type ConnectorMode = (typeof CONNECTOR_MODES)[number]
