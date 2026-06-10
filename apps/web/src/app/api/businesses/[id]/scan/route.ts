import { NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-error'
import { apiProxy, getApiAuthContext } from '@/lib/api-proxy'

type Params = { params: Promise<{ id: string }> }

interface SourceSummary {
  id: string
  type: string
  status: string
}

/**
 * Queue a scan for every connected source of a business, going through the
 * Fastify API so plan limits, org rate limits, and audit logging all apply.
 */
export const POST = apiHandler(async (_req: Request, { params }: Params) => {
  const { id } = await params
  const auth = await getApiAuthContext()

  const sources = await apiProxy<SourceSummary[]>(`/api/sources/${id}`, { auth })
  const connected = sources.filter((s) => s.status === 'CONNECTED')

  if (connected.length === 0) {
    throw new ApiError(422, 'No connected sources to scan')
  }

  let queued = 0
  let firstError: ApiError | null = null

  for (const source of connected) {
    try {
      await apiProxy(`/api/sources/${source.id}/scan`, { method: 'POST', auth })
      queued++
    } catch (err) {
      if (err instanceof ApiError && !firstError) firstError = err
    }
  }

  if (queued === 0 && firstError) throw firstError

  return NextResponse.json({ queued })
})
