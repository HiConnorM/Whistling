import OpenAI from 'openai'

let _client: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env['OPENAI_API_KEY'],
    })
  }
  return _client
}

export const MODELS = {
  CLASSIFICATION: process.env['OPENAI_CLASSIFICATION_MODEL'] ?? 'gpt-4o-mini',
  EMBEDDING: process.env['OPENAI_EMBEDDING_MODEL'] ?? 'text-embedding-3-small',
  REPORT: process.env['OPENAI_REPORT_MODEL'] ?? 'gpt-4o-mini',
  SUMMARY: process.env['OPENAI_CHAT_MODEL'] ?? 'gpt-4o-mini',
  RESPONDER: process.env['OPENAI_RESPONDER_MODEL'] ?? 'gpt-4o-mini',
} as const
