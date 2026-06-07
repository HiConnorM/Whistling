export const SOURCE_TYPES = [
  // Social & owned channels
  'google',
  'instagram',
  'facebook',
  'youtube',
  'tiktok',
  // Local & hospitality review platforms
  'yelp',
  'tripadvisor',
  // Universal review platforms
  'trustpilot',
  // B2B review platforms
  'g2',
  'capterra',
  // Ecommerce
  'amazon',
  'shopify',
  // App stores
  'app_store',
  'google_play',
  // Community
  'reddit',
  'discord',
  // Internal / manual
  'csv',
  'website_form',
  'email_inbox',
  'support_ticket',
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
  // Food & Beverage
  'restaurant', 'cafe', 'bar', 'coffee_shop', 'bakery', 'food_truck', 'catering',
  // Fitness & Wellness
  'gym_fitness', 'yoga_studio', 'martial_arts',
  // Beauty & Personal Care
  'hair_salon', 'barber_shop', 'spa', 'med_spa', 'nail_salon', 'tattoo_shop',
  // Pet Services
  'veterinarian', 'pet_grooming', 'pet_boarding',
  // Auto Services
  'auto_repair', 'car_wash', 'auto_dealership',
  // Home & Trade Services
  'plumbing', 'electrical', 'hvac', 'roofing', 'landscaping', 'cleaning_services',
  'moving_company', 'general_contractor',
  // Healthcare
  'dental', 'chiropractic', 'physical_therapy', 'mental_health', 'primary_care',
  'urgent_care', 'dermatology', 'vision_care', 'wellness_clinic',
  // Hospitality & Experiences
  'hotel', 'event_venue', 'golf_country_club', 'entertainment_attraction', 'tour_travel',
  // Retail
  'boutique', 'specialty_retail', 'jewelry_store', 'furniture_home', 'florist',
  'sporting_goods', 'bookstore',
  // Professional Services
  'law_firm', 'accounting_tax', 'real_estate', 'insurance_agency', 'marketing_agency',
  'consulting', 'architecture_design',
  // Education & Childcare
  'daycare_preschool', 'tutoring_center', 'music_dance_arts', 'trade_vocational_school',
  // Online & Digital
  'ecommerce', 'saas_software', 'mobile_app', 'online_course_community', 'creator_brand',
  // Legacy (kept for existing records)
  'retail', 'health_wellness', 'beauty_salon', 'medical_dental', 'home_services',
  'fitness_gym', 'hospitality', 'professional_services', 'auto_services', 'pet_services',
  'education', 'entertainment',
  'other',
] as const
export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number]

export interface BusinessCategoryGroup {
  label: string
  categories: BusinessCategory[]
}

export const BUSINESS_CATEGORY_GROUPS: BusinessCategoryGroup[] = [
  {
    label: 'Food & Beverage',
    categories: ['restaurant', 'cafe', 'bar', 'coffee_shop', 'bakery', 'food_truck', 'catering'],
  },
  {
    label: 'Fitness & Wellness',
    categories: ['gym_fitness', 'yoga_studio', 'martial_arts'],
  },
  {
    label: 'Beauty & Personal Care',
    categories: ['hair_salon', 'barber_shop', 'spa', 'med_spa', 'nail_salon', 'tattoo_shop'],
  },
  {
    label: 'Pet Services',
    categories: ['veterinarian', 'pet_grooming', 'pet_boarding'],
  },
  {
    label: 'Auto Services',
    categories: ['auto_repair', 'car_wash', 'auto_dealership'],
  },
  {
    label: 'Home & Trade Services',
    categories: ['plumbing', 'electrical', 'hvac', 'roofing', 'landscaping', 'cleaning_services', 'moving_company', 'general_contractor'],
  },
  {
    label: 'Healthcare',
    categories: ['dental', 'chiropractic', 'physical_therapy', 'mental_health', 'primary_care', 'urgent_care', 'dermatology', 'vision_care', 'wellness_clinic'],
  },
  {
    label: 'Hospitality & Experiences',
    categories: ['hotel', 'event_venue', 'golf_country_club', 'entertainment_attraction', 'tour_travel'],
  },
  {
    label: 'Retail',
    categories: ['boutique', 'specialty_retail', 'jewelry_store', 'furniture_home', 'florist', 'sporting_goods', 'bookstore'],
  },
  {
    label: 'Professional Services',
    categories: ['law_firm', 'accounting_tax', 'real_estate', 'insurance_agency', 'marketing_agency', 'consulting', 'architecture_design'],
  },
  {
    label: 'Education & Childcare',
    categories: ['daycare_preschool', 'tutoring_center', 'music_dance_arts', 'trade_vocational_school'],
  },
  {
    label: 'Online & Digital',
    categories: ['ecommerce', 'saas_software', 'mobile_app', 'online_course_community', 'creator_brand'],
  },
  {
    label: 'Other',
    categories: ['other'],
  },
]

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
  'shipping_delivery',
  'onboarding',
  'billing',
  'support_response',
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
  'ease_of_use',
  'results',
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
