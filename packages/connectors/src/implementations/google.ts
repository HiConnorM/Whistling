import crypto from 'crypto'
import type { Connector, ConnectorContext, FetchResult, NormalizedMention, RawItemData, SourceCredentials } from '../types.js'

const STAR_RATING_MAP: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
}

interface GoogleReview {
  reviewId: string
  reviewer?: { displayName?: string; profilePhotoUrl?: string }
  starRating: string
  comment?: string
  createTime: string
  updateTime: string
  name: string
  reviewReply?: { comment: string; updateTime: string }
}

interface GoogleReviewsResponse {
  reviews?: GoogleReview[]
  nextPageToken?: string
  totalReviewCount?: number
}

export class GoogleBusinessConnector implements Connector {
  readonly type = 'google' as const

  async validate(credentials: SourceCredentials): Promise<{ valid: boolean; error?: string }> {
    if (!credentials.accessToken) {
      return { valid: false, error: 'Access token required' }
    }
    try {
      const res = await fetch(
        'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
        { headers: { Authorization: `Bearer ${credentials.accessToken}` } },
      )
      if (!res.ok) return { valid: false, error: `Google API returned ${res.status}` }
      return { valid: true }
    } catch (e) {
      return { valid: false, error: String(e) }
    }
  }

  async fetchNew(ctx: ConnectorContext): Promise<FetchResult> {
    const { credentials, cursor } = ctx
    const locationId = credentials.metadata?.['locationId'] as string | undefined

    if (!locationId || !credentials.accessToken) {
      return { items: [], hasMore: false }
    }

    const params = new URLSearchParams({ pageSize: '50' })
    if (cursor) params.set('pageToken', cursor)

    const url = `https://mybusiness.googleapis.com/v4/accounts/-/locations/${locationId}/reviews?${params}`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Google Reviews API error ${res.status}: ${text}`)
    }

    const data = (await res.json()) as GoogleReviewsResponse
    const reviews = data.reviews ?? []

    const items: RawItemData[] = reviews.map((review) => ({
      externalId: review.reviewId,
      rawJson: review,
      collectedAt: new Date(),
      checksum: crypto
        .createHash('sha256')
        .update(JSON.stringify(review))
        .digest('hex'),
    }))

    return {
      items,
      ...(data.nextPageToken !== undefined && { nextCursor: data.nextPageToken }),
      hasMore: !!data.nextPageToken,
    }
  }

  async normalize(raw: RawItemData): Promise<NormalizedMention[]> {
    const review = raw.rawJson as GoogleReview
    const rating = STAR_RATING_MAP[review.starRating]

    const mention: NormalizedMention = {
      externalId: review.reviewId,
      sourceType: 'google',
      text: review.comment ?? '',
      url: review.name,
      publishedAt: new Date(review.createTime),
      metadata: {
        hasReply: !!review.reviewReply,
        ...(review.reviewReply?.comment !== undefined && { replyText: review.reviewReply.comment }),
      },
      ...(review.reviewer?.displayName !== undefined && { authorName: review.reviewer.displayName }),
      ...(rating !== undefined && { rating }),
    }
    return [mention]
  }

  async refreshToken(credentials: SourceCredentials): Promise<SourceCredentials> {
    if (!credentials.refreshToken) throw new Error('No refresh token available')

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: credentials.refreshToken,
        client_id: process.env['GOOGLE_CLIENT_ID'] ?? '',
        client_secret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
      }),
    })

    if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`)
    const data = (await res.json()) as { access_token: string; expires_in: number }

    return {
      ...credentials,
      accessToken: data.access_token,
    }
  }
}
