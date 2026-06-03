import { getOpenAIClient, MODELS } from './client.js'

export async function embedText(text: string): Promise<number[]> {
  const client = getOpenAIClient()

  const response = await client.embeddings.create({
    model: MODELS.EMBEDDING,
    input: text.slice(0, 8000),
    encoding_format: 'float',
  })

  const embedding = response.data[0]?.embedding
  if (!embedding) throw new Error('Empty embedding response')

  return embedding
}

export async function embedTextsBatch(texts: string[]): Promise<number[][]> {
  const client = getOpenAIClient()

  const truncated = texts.map((t) => t.slice(0, 8000))

  const BATCH_SIZE = 100
  const results: number[][] = []

  for (let i = 0; i < truncated.length; i += BATCH_SIZE) {
    const batch = truncated.slice(i, i + BATCH_SIZE)
    const response = await client.embeddings.create({
      model: MODELS.EMBEDDING,
      input: batch,
      encoding_format: 'float',
    })

    const sorted = response.data.sort((a, b) => a.index - b.index)
    results.push(...sorted.map((d) => d.embedding))
  }

  return results
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('Embedding dimension mismatch')

  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0
    const bi = b[i] ?? 0
    dot += ai * bi
    normA += ai * ai
    normB += bi * bi
  }

  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}
