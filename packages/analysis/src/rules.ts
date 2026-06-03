import type { RecommendationCategory, RecommendationPriority } from '@whistling/domain'

export interface TopicStats {
  topic: string
  complaintTypes: string[]
  praiseTypes: string[]
  mentionCount: number
  negativeMentions: number
  positiveMentions: number
  avgSeverity: number
  previousMentionCount?: number
  trendDirection?: 'up' | 'down' | 'flat'
  changePercent?: number
}

export interface CompetitorStat {
  topic: string
  competitorMentionCount: number
  ownMentionCount: number
  competitorSentiment: 'positive' | 'negative' | 'mixed' | 'neutral'
}

export interface RuleTriggeredRecommendation {
  title: string
  category: RecommendationCategory
  priority: RecommendationPriority
  evidencePoints: string[]
  relatedTopics: string[]
  difficulty: 'easy' | 'medium' | 'hard'
}

export function applyRecommendationRules(
  topics: TopicStats[],
  competitorStats: CompetitorStat[],
  totalMentions: number,
): RuleTriggeredRecommendation[] {
  const recommendations: RuleTriggeredRecommendation[] = []

  for (const topic of topics) {
    const changePercent = topic.changePercent ?? 0
    const isRising = changePercent > 15

    // Wait time / service speed complaints rising
    if (
      (topic.complaintTypes.includes('wait_time') || topic.topic.toLowerCase().includes('wait')) &&
      topic.negativeMentions > Math.max(totalMentions * 0.05, 3) &&
      topic.avgSeverity >= 3
    ) {
      recommendations.push({
        title: `Reduce wait-time complaints${isRising ? ' (rising trend)' : ''}`,
        category: 'operations',
        priority: isRising ? 'high' : 'medium',
        evidencePoints: [
          `${topic.negativeMentions} complaints about wait/service speed`,
          `Average severity: ${topic.avgSeverity.toFixed(1)}/5`,
          ...(isRising ? [`Complaints increased ${changePercent.toFixed(0)}% vs last period`] : []),
        ],
        relatedTopics: [topic.topic],
        difficulty: 'medium',
      })
    }

    // Pricing / value confusion
    if (
      topic.complaintTypes.includes('pricing') &&
      topic.negativeMentions > Math.max(totalMentions * 0.04, 3)
    ) {
      recommendations.push({
        title: 'Clarify pricing or value messaging',
        category: 'marketing',
        priority: topic.avgSeverity >= 4 ? 'high' : 'medium',
        evidencePoints: [
          `${topic.negativeMentions} mentions of pricing confusion or complaints`,
          'Customers may not see the value relative to cost',
        ],
        relatedTopics: [topic.topic],
        difficulty: 'easy',
      })
    }

    // Strong praise area — leverage it
    if (
      topic.positiveMentions > Math.max(totalMentions * 0.1, 5) &&
      (topic.changePercent ?? 0) > 0
    ) {
      recommendations.push({
        title: `Amplify your ${topic.topic} advantage in marketing`,
        category: 'marketing',
        priority: 'medium',
        evidencePoints: [
          `${topic.positiveMentions} positive mentions of ${topic.topic}`,
          'This is your strongest differentiator',
        ],
        relatedTopics: [topic.topic],
        difficulty: 'easy',
      })
    }

    // Staff issues
    if (
      topic.complaintTypes.includes('staff_attitude') &&
      topic.negativeMentions > Math.max(totalMentions * 0.05, 3)
    ) {
      recommendations.push({
        title: 'Address staff experience patterns',
        category: 'staffing',
        priority: topic.avgSeverity >= 4 ? 'critical' : 'high',
        evidencePoints: [
          `${topic.negativeMentions} complaints about staff`,
          `Average severity: ${topic.avgSeverity.toFixed(1)}/5`,
        ],
        relatedTopics: [topic.topic],
        difficulty: 'hard',
      })
    }

    // Cleanliness complaints
    if (
      topic.complaintTypes.includes('cleanliness') &&
      topic.negativeMentions >= 3
    ) {
      recommendations.push({
        title: 'Improve cleanliness standards',
        category: 'operations',
        priority: topic.avgSeverity >= 4 ? 'critical' : 'high',
        evidencePoints: [
          `${topic.negativeMentions} cleanliness complaints`,
          'Health/hygiene issues can rapidly damage reputation',
        ],
        relatedTopics: [topic.topic],
        difficulty: 'easy',
      })
    }
  }

  // Competitor gap rules
  for (const stat of competitorStats) {
    const ratio = stat.competitorMentionCount / Math.max(stat.ownMentionCount, 1)

    if (
      stat.competitorSentiment === 'positive' &&
      ratio >= 2 &&
      stat.topic.toLowerCase().includes('online ordering')
    ) {
      recommendations.push({
        title: 'Add or promote online ordering — competitors are winning here',
        category: 'website',
        priority: 'high',
        evidencePoints: [
          `Competitors receive ${stat.competitorMentionCount} positive mentions for online ordering`,
          `You have only ${stat.ownMentionCount} mentions of this feature`,
          'This is a clear competitive gap',
        ],
        relatedTopics: [stat.topic],
        difficulty: 'medium',
      })
    }

    if (stat.competitorSentiment === 'positive' && ratio >= 2) {
      recommendations.push({
        title: `Bridge the gap on: ${stat.topic}`,
        category: 'competitor_response',
        priority: 'medium',
        evidencePoints: [
          `Competitors are praised ${stat.competitorMentionCount}x for ${stat.topic}`,
          `You have ${stat.ownMentionCount} mentions — ${ratio.toFixed(1)}x less`,
        ],
        relatedTopics: [stat.topic],
        difficulty: 'medium',
      })
    }
  }

  // Deduplicate by title
  const seen = new Set<string>()
  return recommendations.filter((r) => {
    if (seen.has(r.title)) return false
    seen.add(r.title)
    return true
  })
}
