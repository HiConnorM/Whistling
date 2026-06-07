import { z } from 'zod'
import { getOpenAIClient, MODELS } from './client.js'

export type ResponderTone =
  | 'professional'
  | 'warm'
  | 'playful'
  | 'direct'
  | 'hospitality'

export interface ResponderInput {
  reviewText: string
  rating?: number | null
  sourceType: string
  businessName: string
  businessCategory: string
  tone: ResponderTone
  brandVoice?: string // optional custom brand voice instructions
}

export interface ResponderOutput {
  draft: string
  safetyFlags: string[]
}

// ── Safety rules ─────────────────────────────────────────────────────────────

const SAFETY_RULES = [
  { flag: 'legal_fault', pattern: /\b(our fault|we are (responsible|liable)|we admit|we're sorry (we|that we))\b/i },
  { flag: 'medical_claim', pattern: /\b(cure|treat|diagnose|prescribe|medical advice)\b/i },
  { flag: 'refund_promise', pattern: /\b(refund|compensat|reimburse|money back)\b/i },
  { flag: 'insult', pattern: /\b(rude|wrong|liar|lying|ridiculous|absurd)\b/i },
  { flag: 'pii_leak', pattern: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/ },
  { flag: 'invented_detail', pattern: /\b(the server was|your table|your order was)\b/i },
]

function auditDraft(text: string): string[] {
  return SAFETY_RULES.filter((r) => r.pattern.test(text)).map((r) => r.flag)
}

// ── Prompt ────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a professional brand response writer helping business owners reply to customer reviews.

Your replies must ALWAYS:
- Be concise (2–4 sentences)
- Sound like the business owner, not a corporate PR team
- Acknowledge the specific feedback
- End with a forward-looking or appreciative note

Your replies must NEVER:
- Admit legal fault or liability
- Make medical, legal, or financial claims or promises
- Offer refunds unless explicitly configured
- Argue with or insult the customer
- Reveal internal analytics, costs, or business strategies
- Invent details that weren't in the review
- Include personal info (phone, email, full names)
- Make promises of action that haven't been approved

Return ONLY the response text. No quotes, no labels, no markdown.`

const TONE_INSTRUCTIONS: Record<ResponderTone, string> = {
  professional: 'Write in a polished, professional tone — composed and credible.',
  warm: 'Write in a warm, caring tone — personal and empathetic.',
  playful: 'Write in a friendly, slightly playful tone — keep it light but still respectful.',
  direct: 'Write in a short, direct tone — efficient and no-nonsense.',
  hospitality: 'Write in a gracious hospitality tone — appreciative, welcoming, like a great hotel.',
}

export async function generateResponderDraft(input: ResponderInput): Promise<ResponderOutput> {
  const client = getOpenAIClient()

  const toneInstruction = TONE_INSTRUCTIONS[input.tone]
  const brandVoiceSection = input.brandVoice
    ? `\nBrand voice instructions: ${input.brandVoice}`
    : ''

  const userContent = [
    `Business: ${input.businessName} (${input.businessCategory})`,
    `Platform: ${input.sourceType}`,
    `Tone: ${toneInstruction}${brandVoiceSection}`,
    input.rating ? `Star rating: ${input.rating}/5` : null,
    `\nCustomer review:\n"${input.reviewText}"`,
    '\nWrite the owner response:',
  ]
    .filter(Boolean)
    .join('\n')

  const response = await client.chat.completions.create({
    model: MODELS.CLASSIFICATION, // gpt-4o-mini: cheap and good enough for response drafts
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    temperature: 0.5,
    max_tokens: 200,
  })

  const draft = response.choices[0]?.message?.content?.trim() ?? ''
  const safetyFlags = auditDraft(draft)

  return { draft, safetyFlags }
}

// ── Token estimation ──────────────────────────────────────────────────────────

export function estimateResponderTokens(reviewText: string): {
  inputTokens: number
  outputTokens: number
} {
  // Rough approximation: 1 token ≈ 4 chars
  const inputTokens = Math.ceil((SYSTEM_PROMPT.length + reviewText.length + 300) / 4)
  const outputTokens = 150 // typical response draft
  return { inputTokens, outputTokens }
}
