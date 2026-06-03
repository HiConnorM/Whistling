import type { Sentiment } from '@whistling/domain'

export interface PulseInput {
  current: {
    totalMentions: number
    sentimentBreakdown: Record<string, number>
    avgRating?: number
    avgSeverity?: number
    complaints: Array<{ severity: number; urgency: number }>
    responseRate?: number
  }
  previous?: {
    totalMentions: number
    sentimentBreakdown: Record<string, number>
    avgRating?: number
  }
  competitor?: {
    avgRating?: number
    sentimentScore?: number
  }
}

export interface PulseScore {
  total: number
  sentimentScore: number
  reviewVelocityScore: number
  complaintSeverityScore: number
  responseRateScore: number
  competitorScore: number
  trendScore: number
}

export function calculatePulseScore(input: PulseInput): PulseScore {
  const sentimentScore = computeSentimentScore(input.current.sentimentBreakdown)
  const reviewVelocityScore = computeVelocityScore(input.current.totalMentions, input.previous?.totalMentions)
  const complaintSeverityScore = computeComplaintSeverityScore(input.current.complaints)
  const responseRateScore = computeResponseRateScore(input.current.responseRate)
  const competitorScore = computeCompetitorScore(input.current.avgRating, input.competitor?.avgRating)
  const trendScore = computeTrendScore(input.current.sentimentBreakdown, input.previous?.sentimentBreakdown)

  const weights = {
    sentiment: 0.30,
    complaints: 0.20,
    velocity: 0.15,
    response: 0.15,
    competitor: 0.10,
    trend: 0.10,
  }

  const total = Math.round(
    sentimentScore * weights.sentiment +
    complaintSeverityScore * weights.complaints +
    reviewVelocityScore * weights.velocity +
    responseRateScore * weights.response +
    competitorScore * weights.competitor +
    trendScore * weights.trend,
  )

  return {
    total: Math.max(0, Math.min(100, total)),
    sentimentScore,
    reviewVelocityScore,
    complaintSeverityScore,
    responseRateScore,
    competitorScore,
    trendScore,
  }
}

function computeSentimentScore(breakdown: Record<string, number>): number {
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0)
  if (total === 0) return 50

  const positive = (breakdown['positive'] ?? 0) + (breakdown['mixed'] ?? 0) * 0.5
  const negative = (breakdown['negative'] ?? 0) + (breakdown['mixed'] ?? 0) * 0.5

  const ratio = positive / total
  return Math.round(ratio * 100)
}

function computeVelocityScore(current: number, previous?: number): number {
  if (!previous) return 50

  const change = (current - previous) / Math.max(previous, 1)

  if (change > 0.5) return 90
  if (change > 0.2) return 75
  if (change > 0) return 60
  if (change > -0.2) return 50
  if (change > -0.4) return 35
  return 20
}

function computeComplaintSeverityScore(complaints: Array<{ severity: number; urgency: number }>): number {
  if (complaints.length === 0) return 90

  const avgSeverity =
    complaints.reduce((sum, c) => sum + c.severity, 0) / complaints.length
  const criticalCount = complaints.filter((c) => c.severity >= 4 || c.urgency >= 4).length

  let score = 100
  score -= avgSeverity * 8
  score -= criticalCount * 5

  return Math.max(0, Math.min(100, Math.round(score)))
}

function computeResponseRateScore(responseRate?: number): number {
  if (responseRate === undefined) return 40
  if (responseRate >= 0.9) return 100
  if (responseRate >= 0.7) return 80
  if (responseRate >= 0.5) return 60
  if (responseRate >= 0.3) return 40
  return 20
}

function computeCompetitorScore(ownRating?: number, competitorRating?: number): number {
  if (!ownRating || !competitorRating) return 50

  const diff = ownRating - competitorRating

  if (diff >= 0.5) return 90
  if (diff >= 0.2) return 70
  if (diff >= -0.2) return 55
  if (diff >= -0.5) return 40
  return 25
}

function computeTrendScore(
  current: Record<string, number>,
  previous?: Record<string, number>,
): number {
  if (!previous) return 50

  const currentPos = current['positive'] ?? 0
  const currentTotal = Object.values(current).reduce((a, b) => a + b, 0)
  const prevPos = previous['positive'] ?? 0
  const prevTotal = Object.values(previous).reduce((a, b) => a + b, 0)

  if (currentTotal === 0 || prevTotal === 0) return 50

  const currentRatio = currentPos / currentTotal
  const prevRatio = prevPos / prevTotal
  const change = currentRatio - prevRatio

  if (change > 0.1) return 85
  if (change > 0.05) return 70
  if (change > -0.05) return 55
  if (change > -0.1) return 40
  return 25
}

export function interpretPulseScore(score: number): {
  label: string
  color: string
  message: string
} {
  if (score >= 85) {
    return { label: 'Excellent', color: 'green', message: 'Your business is performing exceptionally well.' }
  }
  if (score >= 70) {
    return { label: 'Good', color: 'blue', message: 'Solid performance with room to grow.' }
  }
  if (score >= 55) {
    return { label: 'Fair', color: 'yellow', message: 'Some areas need attention.' }
  }
  if (score >= 40) {
    return { label: 'Needs Work', color: 'orange', message: 'Customer feedback shows clear issues to address.' }
  }
  return { label: 'Critical', color: 'red', message: 'Urgent action needed to address customer concerns.' }
}
