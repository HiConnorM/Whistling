/**
 * Prisma enums are uppercase (RESTAURANT, GOOGLE, POSITIVE).
 * Domain types are lowercase (restaurant, google, positive).
 * These mappers handle the conversion at the API boundary.
 */

import type { SourceType, SourceStatus, BusinessCategory, Sentiment, RecommendationStatus, RecommendationPriority, SubscriptionPlan } from './enums.js'

export function toDbSourceType(type: SourceType): string {
  return type.toUpperCase()
}

export function toDbSourceStatus(status: SourceStatus): string {
  const map: Record<SourceStatus, string> = {
    connected: 'CONNECTED',
    needs_auth: 'NEEDS_AUTH',
    error: 'ERROR',
    paused: 'PAUSED',
    pending: 'PENDING',
  }
  return map[status]
}

export function toDbBusinessCategory(category: BusinessCategory): string {
  return category.toUpperCase()
}

export function toDbSentiment(sentiment: Sentiment): string {
  return sentiment.toUpperCase()
}

export function toDbRecommendationStatus(status: RecommendationStatus): string {
  return status.toUpperCase()
}

export function toDbRecommendationPriority(priority: RecommendationPriority): string {
  return priority.toUpperCase()
}

export function toDbSubscriptionPlan(plan: SubscriptionPlan): string {
  return plan.toUpperCase()
}

export function fromDbSourceStatus(status: string): SourceStatus {
  return status.toLowerCase() as SourceStatus
}

export function fromDbSentiment(sentiment: string): Sentiment {
  return sentiment.toLowerCase() as Sentiment
}
