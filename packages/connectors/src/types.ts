import type { SourceType } from '@whistling/domain'

export interface NormalizedMention {
  externalId: string
  sourceType: SourceType
  authorName?: string
  authorId?: string
  text: string
  rating?: number
  url?: string
  publishedAt?: Date
  metadata?: Record<string, unknown>
}

export interface RawItemData {
  externalId: string
  rawJson?: unknown
  rawHtml?: string
  collectedAt: Date
  checksum: string
}

export interface FetchResult {
  items: RawItemData[]
  nextCursor?: string
  hasMore: boolean
  rateLimit?: {
    remaining?: number
    resetAt?: Date
  }
}

export interface SourceCredentials {
  accessToken?: string
  refreshToken?: string
  externalId?: string
  metadata?: Record<string, unknown>
}

export interface ConnectorContext {
  sourceId: string
  businessId: string
  credentials: SourceCredentials
  cursor?: string
  since?: Date
}

export interface Connector {
  readonly type: SourceType

  validate(credentials: SourceCredentials): Promise<{ valid: boolean; error?: string }>

  fetchNew(ctx: ConnectorContext): Promise<FetchResult>

  normalize(raw: RawItemData): Promise<NormalizedMention[]>

  refreshToken?(credentials: SourceCredentials): Promise<SourceCredentials>
}
