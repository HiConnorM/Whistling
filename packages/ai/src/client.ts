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
  CLASSIFICATION: 'gpt-4o-mini',
  EMBEDDING: 'text-embedding-3-small',
  REPORT: 'gpt-4o',
  SUMMARY: 'gpt-4o-mini',
} as const
