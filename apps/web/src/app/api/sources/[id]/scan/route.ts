import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-error'
import { apiProxy } from '@/lib/api-proxy'

type Params = { params: Promise<{ id: string }> }

/** Queue a scan for a single source via the Fastify API (plan limits enforced there). */
export const POST = apiHandler(async (_req: Request, { params }: Params) => {
  const { id } = await params
  const result = await apiProxy(`/api/sources/${id}/scan`, { method: 'POST' })
  return NextResponse.json(result)
})
