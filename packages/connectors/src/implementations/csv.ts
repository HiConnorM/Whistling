import crypto from 'crypto'
import { z } from 'zod'
import type { Connector, ConnectorContext, FetchResult, NormalizedMention, RawItemData, SourceCredentials } from '../types.js'

const csvRowSchema = z.object({
  text: z.string().min(1),
  rating: z.coerce.number().min(1).max(5).optional(),
  author: z.string().optional(),
  date: z.string().optional(),
  url: z.string().url().optional(),
  source: z.string().optional(),
})

export interface CsvConnectorOptions {
  rows: Array<Record<string, string>>
}

export class CsvConnector implements Connector {
  readonly type = 'csv' as const

  async validate(_credentials: SourceCredentials): Promise<{ valid: boolean }> {
    return { valid: true }
  }

  async fetchNew(_ctx: ConnectorContext): Promise<FetchResult> {
    return { items: [], hasMore: false }
  }

  async normalize(raw: RawItemData): Promise<NormalizedMention[]> {
    const row = raw.rawJson as Record<string, string>
    const parsed = csvRowSchema.safeParse(row)
    if (!parsed.success) return []

    const { text, rating, author, date, url } = parsed.data

    const mention: NormalizedMention = {
      externalId: raw.externalId,
      sourceType: 'csv',
      text,
      ...(author !== undefined && { authorName: author }),
      ...(rating !== undefined && { rating }),
      ...(url !== undefined && { url }),
      ...(date !== undefined && { publishedAt: new Date(date) }),
    }
    return [mention]
  }

  processRows(rows: Array<Record<string, string>>): RawItemData[] {
    const results: RawItemData[] = []

    rows.forEach((row, idx) => {
      const text = row['text'] ?? row['review'] ?? row['comment'] ?? row['feedback'] ?? ''
      if (!text.trim()) return

      const normalized: Record<string, string | undefined> = {
        text: text.trim(),
        rating: row['rating'] ?? row['stars'],
        author: row['author'] ?? row['reviewer'] ?? row['name'],
        date: row['date'] ?? row['created_at'] ?? row['published_at'],
        url: row['url'] ?? row['link'],
        source: row['source'],
      }

      const checksum = crypto
        .createHash('sha256')
        .update(JSON.stringify(normalized))
        .digest('hex')

      results.push({
        externalId: `csv-${checksum}-${idx}`,
        rawJson: normalized,
        collectedAt: new Date(),
        checksum,
      })
    })

    return results
  }
}
