import { z } from 'zod'
import { COMPLAINT_TYPES, PRAISE_TYPES, SENTIMENTS } from '@whistling/domain'
import { getOpenAIClient, MODELS } from './client.js'

const classificationSchema = z.object({
  sentiment: z.enum(SENTIMENTS),
  sentimentScore: z.number().min(-1).max(1),
  topics: z.array(z.string()).max(8),
  complaintTypes: z.array(z.enum(COMPLAINT_TYPES)).max(5),
  praiseTypes: z.array(z.enum(PRAISE_TYPES)).max(5),
  severity: z.number().int().min(1).max(5),
  urgency: z.number().int().min(1).max(5),
  actionability: z.number().int().min(1).max(5),
  businessArea: z.string().max(100),
  summary: z.string().max(300).optional(),
  isSpam: z.boolean(),
  containsPII: z.boolean(),
})

export type Classification = z.infer<typeof classificationSchema>

const SYSTEM_PROMPT = `You are an expert customer feedback analyst for local businesses.
Analyze customer reviews and comments with high precision. Extract structured intelligence.

Key guidelines:
- severity: how severe/negative (1=mild, 5=critical business threat)
- urgency: how quickly it needs addressing (1=can wait, 5=immediate action)
- actionability: how actionable for the business owner (1=nothing to do, 5=clear action)
- topics: specific aspects mentioned (e.g., "wait time", "parking", "patio", "margaritas")
- businessArea: the main operational area (e.g., "kitchen", "front-of-house", "online presence")
- containsPII: true if review contains real personal names, phone numbers, or identifiable info beyond reviewer name
- isSpam: true if this looks like a fake or spam review

Return ONLY valid JSON matching the schema. No markdown, no explanation.`

export async function classifyMention(
  text: string,
  rating?: number | null,
  businessCategory?: string,
): Promise<Classification> {
  const client = getOpenAIClient()

  const userContent = [
    rating ? `Rating: ${rating}/5` : null,
    businessCategory ? `Business type: ${businessCategory}` : null,
    `Review: ${text}`,
  ]
    .filter(Boolean)
    .join('\n')

  const response = await client.chat.completions.create({
    model: MODELS.CLASSIFICATION,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 500,
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('Empty classification response')

  const parsed = JSON.parse(content) as unknown
  return classificationSchema.parse(parsed)
}

export async function classifyMentionsBatch(
  mentions: Array<{ id: string; text: string; rating?: number | null }>,
  businessCategory?: string,
): Promise<Map<string, Classification>> {
  const results = new Map<string, Classification>()

  await Promise.all(
    mentions.map(async ({ id, text, rating }) => {
      try {
        const result = await classifyMention(text, rating, businessCategory)
        results.set(id, result)
      } catch (err) {
        console.error(`Failed to classify mention ${id}:`, err)
      }
    }),
  )

  return results
}
