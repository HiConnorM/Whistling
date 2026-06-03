import crypto from 'crypto'

export function hashText(text: string): string {
  return crypto
    .createHash('sha256')
    .update(normalizeText(text))
    .digest('hex')
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()
}

export function isSimilarText(a: string, b: string, threshold = 0.85): boolean {
  if (a === b) return true

  const normA = normalizeText(a)
  const normB = normalizeText(b)

  if (normA === normB) return true

  return jaccardSimilarity(normA, normB) >= threshold
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(nGrams(a, 3))
  const setB = new Set(nGrams(b, 3))

  if (setA.size === 0 && setB.size === 0) return 1
  if (setA.size === 0 || setB.size === 0) return 0

  let intersection = 0
  for (const gram of setA) {
    if (setB.has(gram)) intersection++
  }

  return intersection / (setA.size + setB.size - intersection)
}

function nGrams(text: string, n: number): string[] {
  const grams: string[] = []
  for (let i = 0; i <= text.length - n; i++) {
    grams.push(text.slice(i, i + n))
  }
  return grams
}

export function isSpamText(text: string): boolean {
  const normalized = text.toLowerCase()

  const spamPatterns = [
    /\b(buy now|click here|free money|guaranteed)\b/,
    /\b(http|www\.)\S+\b/,
    /(.)(\1{5,})/,
    /^[A-Z\s!]+$/,
  ]

  return spamPatterns.some((p) => p.test(normalized))
}
