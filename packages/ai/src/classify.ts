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

export interface ClassificationWithUsage {
  result: Classification
  inputTokens: number
  outputTokens: number
}

export interface BatchClassificationResult {
  results: Map<string, Classification>
  totalInputTokens: number
  totalOutputTokens: number
}

const SYSTEM_PROMPT = `You are an expert customer feedback analyst. You work with businesses of all types — restaurants, clinics, salons, gyms, law firms, SaaS products, e-commerce stores, mobile apps, contractors, hotels, and more.
Analyze customer reviews and comments with high precision. Extract structured intelligence.

Key guidelines:
- sentiment: one of POSITIVE, NEUTRAL, NEGATIVE, MIXED
- sentimentScore: float from -1.0 (most negative) to 1.0 (most positive)
- severity: how severe/negative (1=mild, 5=critical business threat)
- urgency: how quickly it needs addressing (1=can wait, 5=immediate action)
- actionability: how actionable for the business owner (1=nothing to do, 5=clear action)
- topics: specific aspects mentioned (e.g., "wait time", "booking process", "product quality", "customer support", "onboarding")
- businessArea: the main operational area for this business type (e.g., "online presence", "customer service", "operations", "product", "staff")
- containsPII: true if review contains real personal names, phone numbers, or identifiable info beyond reviewer name
- isSpam: true if this looks like a fake or spam review

Return ONLY valid JSON. No markdown, no explanation.`

// ── Single classification ─────────────────────────────────────────────────────

export async function classifyMention(
  text: string,
  rating?: number | null,
  businessCategory?: string,
): Promise<ClassificationWithUsage> {
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
  const result = classificationSchema.parse(parsed)

  return {
    result,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  }
}

// ── True batch classification (single API call for up to ~30 items) ───────────
// Formats all items in one prompt; response is a JSON object keyed by item index.
// Falls back to parallel individual calls if batch fails.

const BATCH_RESULT_SCHEMA = z.object({
  items: z.array(
    classificationSchema.extend({ _idx: z.number().int() }),
  ),
})

export async function classifyMentionsBatch(
  mentions: Array<{ id: string; text: string; rating?: number | null }>,
  businessCategory?: string,
): Promise<BatchClassificationResult> {
  if (mentions.length === 0) {
    return { results: new Map(), totalInputTokens: 0, totalOutputTokens: 0 }
  }

  // For very small batches, single call is fine; larger batches still work but
  // we chunk at 25 to keep prompt size under ~8k tokens.
  const CHUNK_SIZE = 25
  const results = new Map<string, Classification>()
  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (let i = 0; i < mentions.length; i += CHUNK_SIZE) {
    const chunk = mentions.slice(i, i + CHUNK_SIZE)
    const { results: chunkResults, inputTokens, outputTokens } =
      await classifyChunk(chunk, businessCategory)

    for (const [id, cls] of chunkResults.entries()) {
      results.set(id, cls)
    }
    totalInputTokens += inputTokens
    totalOutputTokens += outputTokens
  }

  return { results, totalInputTokens, totalOutputTokens }
}

async function classifyChunk(
  mentions: Array<{ id: string; text: string; rating?: number | null }>,
  businessCategory?: string,
): Promise<{ results: Map<string, Classification>; inputTokens: number; outputTokens: number }> {
  const client = getOpenAIClient()

  const lines = mentions.map((m, idx) => {
    const ratingLine = m.rating ? `[Rating: ${m.rating}/5] ` : ''
    return `${idx}: ${ratingLine}${m.text.slice(0, 800)}`
  })

  const userContent = [
    businessCategory ? `Business type: ${businessCategory}` : null,
    `Classify each of the following ${mentions.length} reviews. Return a JSON object with an "items" array. Each element must include "_idx" (the integer index from the list) plus all classification fields.`,
    '',
    ...lines,
  ]
    .filter((l) => l !== null)
    .join('\n')

  try {
    const response = await client.chat.completions.create({
      model: MODELS.CLASSIFICATION,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 500 * mentions.length,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('Empty batch response')

    const parsed = BATCH_RESULT_SCHEMA.parse(JSON.parse(content))
    const results = new Map<string, Classification>()

    for (const item of parsed.items) {
      const { _idx, ...classification } = item
      const mention = mentions[_idx]
      if (mention) {
        results.set(mention.id, classification)
      }
    }

    return {
      results,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    }
  } catch {
    // Fallback: classify individually
    const results = new Map<string, Classification>()
    let inputTokens = 0
    let outputTokens = 0

    await Promise.all(
      mentions.map(async (m) => {
        try {
          const { result, inputTokens: it, outputTokens: ot } =
            await classifyMention(m.text, m.rating, businessCategory)
          results.set(m.id, result)
          inputTokens += it
          outputTokens += ot
        } catch (err) {
          console.error(`[classify] Failed for mention ${m.id}:`, err)
        }
      }),
    )

    return { results, inputTokens, outputTokens }
  }
}

/** Estimate tokens for a batch without calling the API. Used for cost pre-checks. */
export function estimateClassificationTokens(
  textLengths: number[],
): { inputTokens: number; outputTokens: number } {
  const avgCharsPerToken = 4
  const systemTokens = Math.ceil(SYSTEM_PROMPT.length / avgCharsPerToken)
  const inputTokens = textLengths.reduce(
    (sum, len) => sum + Math.ceil(len / avgCharsPerToken),
    systemTokens,
  )
  const outputTokens = textLengths.length * 120 // ~120 tokens per classification output
  return { inputTokens, outputTokens }
}
