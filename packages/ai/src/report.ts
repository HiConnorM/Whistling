import { z } from 'zod'
import { getOpenAIClient, MODELS } from './client.js'

export interface ReportInput {
  businessName: string
  businessCategory: string
  city: string
  periodLabel: string
  pulseScore: number
  pulsePrevious?: number
  topPraises: Array<{ topic: string; count: number; change?: number }>
  topComplaints: Array<{ topic: string; count: number; severity: number; change?: number }>
  customerRequests: Array<{ request: string; count: number }>
  competitorInsights: Array<{
    competitorName: string
    theyWinAt: string[]
    theyLoseAt: string[]
  }>
  marketGaps: string[]
  representativeQuotes: Array<{ topic: string; sentiment: string; quote: string }>
}

export interface GeneratedReport {
  biggestWin: string
  biggestRisk: string
  bestAction: string
  emailSubject: string
  emailPreview: string
  sections: Array<{
    key: string
    title: string
    content: string
    order: number
  }>
}

const reportSchema = z.object({
  biggestWin: z.string(),
  biggestRisk: z.string(),
  bestAction: z.string(),
  emailSubject: z.string().max(150),
  emailPreview: z.string().max(200),
  sections: z.array(
    z.object({
      key: z.string(),
      title: z.string(),
      content: z.string(),
      order: z.number(),
    }),
  ),
})

const REPORT_SYSTEM_PROMPT = `You are a customer intelligence analyst writing a weekly brief for a local business owner.
Your job is to write clear, specific, actionable insights — not generic advice.

Rules:
- Be specific. Name topics, quote numbers, reference evidence.
- Be direct. Owners are busy. No fluff.
- Be actionable. Every insight should point to something they can actually do.
- Never say "consider improving" — say exactly what to improve and why.
- Write like a trusted advisor who has read all their reviews, not a dashboard.
- Keep email subject lines urgent and specific (under 80 chars).

Return valid JSON only.`

export async function generateWeeklyReport(input: ReportInput): Promise<GeneratedReport> {
  const client = getOpenAIClient()

  const userContent = `
Business: ${input.businessName} (${input.businessCategory}, ${input.city})
Period: ${input.periodLabel}
Pulse Score: ${input.pulseScore}/100${input.pulsePrevious ? ` (was ${input.pulsePrevious})` : ''}

TOP PRAISES:
${input.topPraises.map((p) => `- ${p.topic}: ${p.count} mentions${p.change ? ` (${p.change > 0 ? '+' : ''}${p.change}% vs last period)` : ''}`).join('\n')}

TOP COMPLAINTS:
${input.topComplaints.map((c) => `- ${c.topic}: ${c.count} mentions, severity ${c.severity}/5${c.change ? ` (${c.change > 0 ? '+' : ''}${c.change}% vs last period)` : ''}`).join('\n')}

CUSTOMER REQUESTS:
${input.customerRequests.map((r) => `- ${r.request}: ${r.count} mentions`).join('\n')}

COMPETITOR INTELLIGENCE:
${input.competitorInsights.map((c) => `${c.competitorName}:\n  Winning at: ${c.theyWinAt.join(', ')}\n  Losing at: ${c.theyLoseAt.join(', ')}`).join('\n')}

MARKET GAPS:
${input.marketGaps.join(', ')}

REPRESENTATIVE QUOTES:
${input.representativeQuotes.map((q) => `[${q.sentiment}] "${q.quote}" (about: ${q.topic})`).join('\n')}

Generate sections: pulse_summary, biggest_win, biggest_risk, top_complaints, top_praises, customer_requests, competitor_moves, recommended_actions, marketing_angle.
`

  const response = await client.chat.completions.create({
    model: MODELS.REPORT,
    messages: [
      { role: 'system', content: REPORT_SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 3000,
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('Empty report response')

  return reportSchema.parse(JSON.parse(content))
}

export async function generateClusterSummary(
  topic: string,
  sentiment: string,
  representativeQuotes: string[],
  mentionCount: number,
  businessName: string,
): Promise<string> {
  const client = getOpenAIClient()

  const response = await client.chat.completions.create({
    model: MODELS.SUMMARY,
    messages: [
      {
        role: 'system',
        content: 'Summarize customer feedback about a specific topic in 2-3 sentences. Be specific and actionable. No fluff.',
      },
      {
        role: 'user',
        content: `Business: ${businessName}
Topic: ${topic}
Overall sentiment: ${sentiment}
Mention count: ${mentionCount}
Representative quotes:
${representativeQuotes.map((q) => `- "${q}"`).join('\n')}

Write a 2-3 sentence summary of what customers are saying about this topic.`,
      },
    ],
    temperature: 0.2,
    max_tokens: 200,
  })

  return response.choices[0]?.message?.content ?? `${mentionCount} mentions about ${topic}.`
}

export async function generateRecommendationExplanation(
  title: string,
  evidence: string[],
  businessName: string,
  businessCategory: string,
): Promise<{ why: string; estimatedImpact: string; suggestedTimeline: string }> {
  const client = getOpenAIClient()

  const response = await client.chat.completions.create({
    model: MODELS.SUMMARY,
    messages: [
      {
        role: 'system',
        content: 'You write specific, practical business recommendations. Return JSON with why, estimatedImpact, suggestedTimeline fields.',
      },
      {
        role: 'user',
        content: `Business: ${businessName} (${businessCategory})
Recommendation: ${title}
Evidence:
${evidence.map((e) => `- ${e}`).join('\n')}

Write the "why" explanation (2-3 sentences, specific to the evidence), estimated impact, and a concrete timeline.`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 400,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    return {
      why: `Customer data indicates this is a priority action for ${businessName}.`,
      estimatedImpact: 'Expected to reduce negative mentions and improve customer satisfaction.',
      suggestedTimeline: 'Test for 2 weeks',
    }
  }

  const parsed = JSON.parse(content) as Record<string, string>
  return {
    why: parsed['why'] ?? '',
    estimatedImpact: parsed['estimatedImpact'] ?? '',
    suggestedTimeline: parsed['suggestedTimeline'] ?? 'Test for 2 weeks',
  }
}
