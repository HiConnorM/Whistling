const APIFY_BASE = 'https://api.apify.com/v2'

export interface ApifyRunResponse {
  data: {
    id: string
    status: string
    defaultDatasetId: string
    defaultKeyValueStoreId: string
    stats?: { netIncomeSizeBytes?: number }
  }
}

export interface ApifyRunStatus {
  data: {
    id: string
    status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ABORTING' | 'ABORTED' | 'TIMING-OUT' | 'TIMED-OUT'
    startedAt?: string
    finishedAt?: string
    defaultDatasetId: string
    stats?: {
      netIncomeSizeBytes?: number
      computeUnits?: number
    }
  }
}

export interface ApifyDatasetResponse<T> {
  items: T[]
  total: number
  offset: number
  count: number
  limit: number
}

export type ApifyTerminalStatus = 'SUCCEEDED' | 'FAILED' | 'ABORTED' | 'TIMED-OUT'
export const APIFY_TERMINAL_STATUSES = new Set<string>(['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'])
export const APIFY_FAILED_STATUSES = new Set<string>(['FAILED', 'ABORTED', 'TIMED-OUT'])

export class ApifyClient {
  private readonly token: string

  constructor(token: string) {
    this.token = token
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    }
  }

  async runActor(actorId: string, input: unknown): Promise<ApifyRunResponse> {
    const res = await fetch(`${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/runs`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(input),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Apify actor run failed (${res.status}): ${text}`)
    }

    return res.json() as Promise<ApifyRunResponse>
  }

  async getRun(runId: string): Promise<ApifyRunStatus> {
    const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}`, {
      headers: this.headers(),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to fetch Apify run ${runId} (${res.status}): ${text}`)
    }

    return res.json() as Promise<ApifyRunStatus>
  }

  async getDatasetItems<T = unknown>(
    datasetId: string,
    limit = 1000,
    offset = 0,
  ): Promise<T[]> {
    const params = new URLSearchParams({
      clean: 'true',
      limit: String(Math.min(limit, 5000)),
      offset: String(offset),
    })

    const res = await fetch(`${APIFY_BASE}/datasets/${datasetId}/items?${params}`, {
      headers: this.headers(),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to fetch Apify dataset ${datasetId} (${res.status}): ${text}`)
    }

    // Apify dataset items endpoint returns a JSON array directly
    const data = await res.json() as T[] | ApifyDatasetResponse<T>

    // Handle both array and paginated-object responses
    if (Array.isArray(data)) return data
    if ('items' in (data as object)) return (data as ApifyDatasetResponse<T>).items
    return data as unknown as T[]
  }

  async abortRun(runId: string): Promise<void> {
    await fetch(`${APIFY_BASE}/actor-runs/${runId}/abort`, {
      method: 'POST',
      headers: this.headers(),
    })
  }
}

let _client: ApifyClient | null = null

export function getApifyClient(): ApifyClient {
  const token = process.env['APIFY_API_TOKEN']
  if (!token) throw new Error('APIFY_API_TOKEN is not configured')
  if (!_client) _client = new ApifyClient(token)
  return _client
}
