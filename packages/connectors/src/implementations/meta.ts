import crypto from 'crypto'
import type { Connector, ConnectorContext, FetchResult, NormalizedMention, RawItemData, SourceCredentials } from '../types.js'
import type { SourceType } from '@whistling/domain'

interface MetaComment {
  id: string
  message?: string
  from?: { name?: string; id?: string }
  created_time: string
  permalink_url?: string
}

interface MetaReview {
  id: string
  reviewer?: { name?: string; id?: string }
  rating?: string
  review_text?: string
  created_time: string
}

interface MetaPaginatedResponse<T> {
  data: T[]
  paging?: {
    cursors?: { before?: string; after?: string }
    next?: string
  }
}

export class MetaConnector implements Connector {
  readonly type: SourceType

  constructor(type: 'instagram' | 'facebook') {
    this.type = type
  }

  async validate(credentials: SourceCredentials): Promise<{ valid: boolean; error?: string }> {
    if (!credentials.accessToken) {
      return { valid: false, error: 'Access token required' }
    }
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/me?access_token=${credentials.accessToken}`,
      )
      if (!res.ok) return { valid: false, error: `Meta API returned ${res.status}` }
      return { valid: true }
    } catch (e) {
      return { valid: false, error: String(e) }
    }
  }

  async fetchNew(ctx: ConnectorContext): Promise<FetchResult> {
    const { credentials, cursor } = ctx
    const pageId = credentials.externalId

    if (!pageId || !credentials.accessToken) {
      return { items: [], hasMore: false }
    }

    const params = new URLSearchParams({
      access_token: credentials.accessToken,
      limit: '50',
      fields: this.type === 'facebook'
        ? 'id,reviewer,rating,review_text,created_time'
        : 'id,message,from,created_time,permalink_url',
    })
    if (cursor) params.set('after', cursor)

    const endpoint = this.type === 'facebook'
      ? `https://graph.facebook.com/v19.0/${pageId}/ratings?${params}`
      : `https://graph.facebook.com/v19.0/${pageId}/comments?${params}`

    const res = await fetch(endpoint)
    if (!res.ok) throw new Error(`Meta API error ${res.status}`)

    const data = (await res.json()) as MetaPaginatedResponse<MetaComment | MetaReview>

    const items: RawItemData[] = data.data.map((item) => ({
      externalId: item.id,
      rawJson: item,
      collectedAt: new Date(),
      checksum: crypto.createHash('sha256').update(JSON.stringify(item)).digest('hex'),
    }))

    const nextCursor = data.paging?.cursors?.after
    return {
      items,
      ...(nextCursor !== undefined && { nextCursor }),
      hasMore: !!data.paging?.next,
    }
  }

  async normalize(raw: RawItemData): Promise<NormalizedMention[]> {
    if (this.type === 'facebook') {
      const review = raw.rawJson as MetaReview
      const text = review.review_text
      if (!text?.trim()) return []

      const ratingMap: Record<string, number> = { like: 5, dislike: 1 }
      const rating = review.rating ? ratingMap[review.rating] : undefined

      const mention: NormalizedMention = {
        externalId: review.id,
        sourceType: 'facebook',
        text,
        publishedAt: new Date(review.created_time),
        ...(review.reviewer?.name !== undefined && { authorName: review.reviewer.name }),
        ...(review.reviewer?.id !== undefined && { authorId: review.reviewer.id }),
        ...(rating !== undefined && { rating }),
      }
      return [mention]
    } else {
      const comment = raw.rawJson as MetaComment
      const text = comment.message
      if (!text?.trim()) return []

      const mention: NormalizedMention = {
        externalId: comment.id,
        sourceType: 'instagram',
        text,
        publishedAt: new Date(comment.created_time),
        ...(comment.from?.name !== undefined && { authorName: comment.from.name }),
        ...(comment.from?.id !== undefined && { authorId: comment.from.id }),
        ...(comment.permalink_url !== undefined && { url: comment.permalink_url }),
      }
      return [mention]
    }
  }
}
