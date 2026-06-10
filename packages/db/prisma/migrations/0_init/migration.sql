-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'PRO', 'GROWTH', 'AGENCY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'PAUSED');

-- CreateEnum
CREATE TYPE "BusinessCategory" AS ENUM ('RESTAURANT', 'CAFE', 'BAR', 'COFFEE_SHOP', 'BAKERY', 'FOOD_TRUCK', 'CATERING', 'GYM_FITNESS', 'YOGA_STUDIO', 'MARTIAL_ARTS', 'HAIR_SALON', 'BARBER_SHOP', 'SPA', 'MED_SPA', 'NAIL_SALON', 'TATTOO_SHOP', 'VETERINARIAN', 'PET_GROOMING', 'PET_BOARDING', 'AUTO_REPAIR', 'CAR_WASH', 'AUTO_DEALERSHIP', 'PLUMBING', 'ELECTRICAL', 'HVAC', 'ROOFING', 'LANDSCAPING', 'CLEANING_SERVICES', 'MOVING_COMPANY', 'GENERAL_CONTRACTOR', 'DENTAL', 'CHIROPRACTIC', 'PHYSICAL_THERAPY', 'MENTAL_HEALTH', 'PRIMARY_CARE', 'URGENT_CARE', 'DERMATOLOGY', 'VISION_CARE', 'WELLNESS_CLINIC', 'HOTEL', 'EVENT_VENUE', 'GOLF_COUNTRY_CLUB', 'ENTERTAINMENT_ATTRACTION', 'TOUR_TRAVEL', 'BOUTIQUE', 'SPECIALTY_RETAIL', 'JEWELRY_STORE', 'FURNITURE_HOME', 'FLORIST', 'SPORTING_GOODS', 'BOOKSTORE', 'LAW_FIRM', 'ACCOUNTING_TAX', 'REAL_ESTATE', 'INSURANCE_AGENCY', 'MARKETING_AGENCY', 'CONSULTING', 'ARCHITECTURE_DESIGN', 'DAYCARE_PRESCHOOL', 'TUTORING_CENTER', 'MUSIC_DANCE_ARTS', 'TRADE_VOCATIONAL_SCHOOL', 'ECOMMERCE', 'SAAS_SOFTWARE', 'MOBILE_APP', 'ONLINE_COURSE_COMMUNITY', 'CREATOR_BRAND', 'RETAIL', 'HEALTH_WELLNESS', 'BEAUTY_SALON', 'MEDICAL_DENTAL', 'HOME_SERVICES', 'FITNESS_GYM', 'HOSPITALITY', 'PROFESSIONAL_SERVICES', 'AUTO_SERVICES', 'PET_SERVICES', 'EDUCATION', 'ENTERTAINMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('GOOGLE', 'INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'TIKTOK', 'YELP', 'TRIPADVISOR', 'TRUSTPILOT', 'G2', 'CAPTERRA', 'AMAZON', 'SHOPIFY', 'APP_STORE', 'GOOGLE_PLAY', 'REDDIT', 'DISCORD', 'CSV', 'WEBSITE_FORM', 'EMAIL_INBOX', 'SUPPORT_TICKET', 'MANUAL');

-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('CONNECTED', 'NEEDS_AUTH', 'ERROR', 'PAUSED', 'PENDING');

-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED');

-- CreateEnum
CREATE TYPE "TrendDirection" AS ENUM ('UP', 'DOWN', 'FLAT');

-- CreateEnum
CREATE TYPE "RecommendationCategory" AS ENUM ('OPERATIONS', 'MARKETING', 'SERVICE', 'WEBSITE', 'PRODUCT', 'PRICING', 'STAFFING', 'COMPETITOR_RESPONSE');

-- CreateEnum
CREATE TYPE "RecommendationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('NEW', 'ACCEPTED', 'DISMISSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('WEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('GENERATING', 'READY', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_memberships" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'STARTER',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "BusinessCategory" NOT NULL,
    "websiteUrl" TEXT,
    "googlePlaceId" TEXT,
    "description" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "goals" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_sources" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "url" TEXT,
    "externalId" TEXT,
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "status" "SourceStatus" NOT NULL DEFAULT 'PENDING',
    "lastScannedAt" TIMESTAMP(3),
    "lastSuccessfulScanAt" TIMESTAMP(3),
    "nextScanAt" TIMESTAMP(3),
    "cursor" TEXT,
    "errorMessage" TEXT,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "totalItemsCollected" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitors" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "googlePlaceId" TEXT,
    "googleUrl" TEXT,
    "yelpUrl" TEXT,
    "facebookUrl" TEXT,
    "instagramHandle" TEXT,
    "websiteUrl" TEXT,
    "city" TEXT,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "discoveryScore" DOUBLE PRECISION,
    "isAutoDiscovered" BOOLEAN NOT NULL DEFAULT false,
    "scanDepth" TEXT NOT NULL DEFAULT 'LIGHT',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastScannedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_items" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "rawJsonUrl" TEXT,
    "rawJson" JSONB,
    "rawHtml" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checksum" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,

    CONSTRAINT "raw_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "rawItemId" TEXT,
    "competitorId" TEXT,
    "externalId" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "authorName" TEXT,
    "authorId" TEXT,
    "text" TEXT NOT NULL,
    "textHash" TEXT NOT NULL,
    "rating" DOUBLE PRECISION,
    "url" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "publishedAt" TIMESTAMP(3),
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isCompetitor" BOOLEAN NOT NULL DEFAULT false,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "isSpam" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "mentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mention_analyses" (
    "id" TEXT NOT NULL,
    "mentionId" TEXT NOT NULL,
    "sentiment" "Sentiment" NOT NULL,
    "sentimentScore" DOUBLE PRECISION NOT NULL,
    "topics" TEXT[],
    "complaintTypes" TEXT[],
    "praiseTypes" TEXT[],
    "severity" SMALLINT NOT NULL,
    "urgency" SMALLINT NOT NULL,
    "actionability" SMALLINT NOT NULL,
    "businessArea" TEXT NOT NULL,
    "summary" TEXT,
    "isSpam" BOOLEAN NOT NULL DEFAULT false,
    "containsPII" BOOLEAN NOT NULL DEFAULT false,
    "modelVersion" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mention_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mention_embeddings" (
    "id" TEXT NOT NULL,
    "mentionId" TEXT NOT NULL,
    "embedding" vector(1536),
    "modelVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mention_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_clusters" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "sentiment" "Sentiment" NOT NULL,
    "isCompetitor" BOOLEAN NOT NULL DEFAULT false,
    "mentionCount" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "trendDirection" "TrendDirection" NOT NULL DEFAULT 'FLAT',
    "changePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "representativeMentionIds" TEXT[],
    "avgSeverity" DOUBLE PRECISION,
    "avgRating" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topic_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "reportId" TEXT,
    "title" TEXT NOT NULL,
    "category" "RecommendationCategory" NOT NULL,
    "priority" "RecommendationPriority" NOT NULL DEFAULT 'MEDIUM',
    "evidence" TEXT[],
    "suggestedAction" TEXT NOT NULL,
    "why" TEXT NOT NULL,
    "estimatedImpact" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "suggestedOwner" TEXT,
    "suggestedTimeline" TEXT,
    "relatedTopics" TEXT[],
    "relatedMentionIds" TEXT[],
    "status" "RecommendationStatus" NOT NULL DEFAULT 'NEW',
    "statusNote" TEXT,
    "statusUpdatedAt" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" "ReportType" NOT NULL DEFAULT 'WEEKLY',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "pulseScore" INTEGER,
    "pulsePrevious" INTEGER,
    "biggestWin" TEXT,
    "biggestRisk" TEXT,
    "bestAction" TEXT,
    "topPraises" JSONB,
    "topComplaints" JSONB,
    "customerRequests" JSONB,
    "competitorInsights" JSONB,
    "marketGaps" JSONB,
    "emailSentAt" TIMESTAMP(3),
    "emailSubject" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'GENERATING',
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_sections" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "report_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pulse_scores" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "sentimentScore" INTEGER NOT NULL,
    "reviewVelocityScore" INTEGER NOT NULL,
    "complaintSeverityScore" INTEGER NOT NULL,
    "responseRateScore" INTEGER NOT NULL,
    "competitorScore" INTEGER NOT NULL,
    "trendScore" INTEGER NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pulse_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_jobs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "sourceId" TEXT,
    "type" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "bullJobId" TEXT,
    "itemsCollected" INTEGER NOT NULL DEFAULT 0,
    "itemsProcessed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_ledgers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "collectedSignals" INTEGER NOT NULL DEFAULT 0,
    "apifyRuns" INTEGER NOT NULL DEFAULT 0,
    "competitorScans" INTEGER NOT NULL DEFAULT 0,
    "scheduledScans" INTEGER NOT NULL DEFAULT 0,
    "openaiInputTokens" INTEGER NOT NULL DEFAULT 0,
    "openaiOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "responderDrafts" INTEGER NOT NULL DEFAULT 0,
    "reportsGenerated" INTEGER NOT NULL DEFAULT 0,
    "estimatedApifyCostCents" INTEGER NOT NULL DEFAULT 0,
    "estimatedOpenAICostCents" INTEGER NOT NULL DEFAULT 0,
    "estimatedEmailCostCents" INTEGER NOT NULL DEFAULT 0,
    "estimatedTotalCostCents" INTEGER NOT NULL DEFAULT 0,
    "hardStopCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ledgerId" TEXT,
    "businessId" TEXT,
    "sourceId" TEXT,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "estimatedCostCents" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_runs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "sourceId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'apify',
    "actorId" TEXT NOT NULL,
    "runId" TEXT,
    "datasetId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedMaxItems" INTEGER NOT NULL,
    "collectedItems" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostCents" INTEGER NOT NULL DEFAULT 0,
    "actualCostCents" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "provider_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responder_drafts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "mentionId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "reviewText" TEXT NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'professional',
    "generatedText" TEXT NOT NULL,
    "approvedText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "safetyFlags" TEXT[],
    "brandVoice" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "responder_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_providerId_accountId_key" ON "accounts"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "verifications_identifier_value_key" ON "verifications"("identifier", "value");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "org_memberships_organizationId_userId_key" ON "org_memberships"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_organizationId_key" ON "subscriptions"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeCustomerId_key" ON "subscriptions"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "businesses_organizationId_idx" ON "businesses"("organizationId");

-- CreateIndex
CREATE INDEX "businesses_category_idx" ON "businesses"("category");

-- CreateIndex
CREATE INDEX "business_sources_businessId_idx" ON "business_sources"("businessId");

-- CreateIndex
CREATE INDEX "business_sources_status_idx" ON "business_sources"("status");

-- CreateIndex
CREATE INDEX "business_sources_nextScanAt_idx" ON "business_sources"("nextScanAt");

-- CreateIndex
CREATE INDEX "competitors_businessId_idx" ON "competitors"("businessId");

-- CreateIndex
CREATE INDEX "raw_items_sourceId_idx" ON "raw_items"("sourceId");

-- CreateIndex
CREATE INDEX "raw_items_collectedAt_idx" ON "raw_items"("collectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "raw_items_sourceId_externalId_key" ON "raw_items"("sourceId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "raw_items_sourceId_checksum_key" ON "raw_items"("sourceId", "checksum");

-- CreateIndex
CREATE INDEX "mentions_businessId_idx" ON "mentions"("businessId");

-- CreateIndex
CREATE INDEX "mentions_businessId_publishedAt_idx" ON "mentions"("businessId", "publishedAt");

-- CreateIndex
CREATE INDEX "mentions_businessId_isCompetitor_idx" ON "mentions"("businessId", "isCompetitor");

-- CreateIndex
CREATE INDEX "mentions_businessId_sourceType_idx" ON "mentions"("businessId", "sourceType");

-- CreateIndex
CREATE INDEX "mentions_textHash_idx" ON "mentions"("textHash");

-- CreateIndex
CREATE UNIQUE INDEX "mentions_businessId_sourceType_externalId_key" ON "mentions"("businessId", "sourceType", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "mention_analyses_mentionId_key" ON "mention_analyses"("mentionId");

-- CreateIndex
CREATE INDEX "mention_analyses_mentionId_idx" ON "mention_analyses"("mentionId");

-- CreateIndex
CREATE UNIQUE INDEX "mention_embeddings_mentionId_key" ON "mention_embeddings"("mentionId");

-- CreateIndex
CREATE INDEX "topic_clusters_businessId_periodEnd_idx" ON "topic_clusters"("businessId", "periodEnd");

-- CreateIndex
CREATE INDEX "topic_clusters_businessId_topic_idx" ON "topic_clusters"("businessId", "topic");

-- CreateIndex
CREATE INDEX "recommendations_businessId_status_idx" ON "recommendations"("businessId", "status");

-- CreateIndex
CREATE INDEX "recommendations_businessId_priority_idx" ON "recommendations"("businessId", "priority");

-- CreateIndex
CREATE INDEX "reports_businessId_periodEnd_idx" ON "reports"("businessId", "periodEnd");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "report_sections_reportId_idx" ON "report_sections"("reportId");

-- CreateIndex
CREATE INDEX "pulse_scores_businessId_calculatedAt_idx" ON "pulse_scores"("businessId", "calculatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "scan_jobs_bullJobId_key" ON "scan_jobs"("bullJobId");

-- CreateIndex
CREATE INDEX "scan_jobs_businessId_idx" ON "scan_jobs"("businessId");

-- CreateIndex
CREATE INDEX "scan_jobs_status_idx" ON "scan_jobs"("status");

-- CreateIndex
CREATE INDEX "scan_jobs_createdAt_idx" ON "scan_jobs"("createdAt");

-- CreateIndex
CREATE INDEX "usage_ledgers_organizationId_idx" ON "usage_ledgers"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "usage_ledgers_organizationId_periodStart_key" ON "usage_ledgers"("organizationId", "periodStart");

-- CreateIndex
CREATE INDEX "usage_events_organizationId_createdAt_idx" ON "usage_events"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "usage_events_ledgerId_idx" ON "usage_events"("ledgerId");

-- CreateIndex
CREATE UNIQUE INDEX "provider_runs_runId_key" ON "provider_runs"("runId");

-- CreateIndex
CREATE INDEX "provider_runs_organizationId_idx" ON "provider_runs"("organizationId");

-- CreateIndex
CREATE INDEX "provider_runs_businessId_idx" ON "provider_runs"("businessId");

-- CreateIndex
CREATE INDEX "responder_drafts_organizationId_status_idx" ON "responder_drafts"("organizationId", "status");

-- CreateIndex
CREATE INDEX "responder_drafts_businessId_idx" ON "responder_drafts"("businessId");

-- CreateIndex
CREATE INDEX "responder_drafts_mentionId_idx" ON "responder_drafts"("mentionId");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_createdAt_idx" ON "audit_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "processed_webhook_events_provider_createdAt_idx" ON "processed_webhook_events"("provider", "createdAt");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_sources" ADD CONSTRAINT "business_sources_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_items" ADD CONSTRAINT "raw_items_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "business_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "business_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_rawItemId_fkey" FOREIGN KEY ("rawItemId") REFERENCES "raw_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mention_analyses" ADD CONSTRAINT "mention_analyses_mentionId_fkey" FOREIGN KEY ("mentionId") REFERENCES "mentions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mention_embeddings" ADD CONSTRAINT "mention_embeddings_mentionId_fkey" FOREIGN KEY ("mentionId") REFERENCES "mentions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_clusters" ADD CONSTRAINT "topic_clusters_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_sections" ADD CONSTRAINT "report_sections_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pulse_scores" ADD CONSTRAINT "pulse_scores_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_jobs" ADD CONSTRAINT "scan_jobs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_jobs" ADD CONSTRAINT "scan_jobs_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "business_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_ledgers" ADD CONSTRAINT "usage_ledgers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "usage_ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_runs" ADD CONSTRAINT "provider_runs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responder_drafts" ADD CONSTRAINT "responder_drafts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

