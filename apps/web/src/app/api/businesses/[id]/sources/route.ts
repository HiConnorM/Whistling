import { NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-error'
import { apiProxy } from '@/lib/api-proxy'
import { z } from 'zod'

/**
 * BFF proxy to the Fastify API, which owns source-creation logic:
 * usage enforcement, SSRF/platform allowlist validation, Apify actor
 * metadata, ingestionPlan assignment, audit logging, and org rate limits.
 */

const createSourceSchema = z.object({
  type: z.string().toLowerCase(),
  url: z.string().url().optional(),
  externalId: z.string().optional(),
  mediaType: z.enum(['review', 'comment']).optional(),
})

type Params = { params: Promise<{ id: string }> }

export const GET = apiHandler(async (_req: Request, { params }: Params) => {
  const { id } = await params
  const sources = await apiProxy(`/api/sources/${id}`)
  return NextResponse.json(sources)
})

export const POST = apiHandler(async (req: Request, { params }: Params) => {
  const { id } = await params

  const body = createSourceSchema.safeParse(await req.json())
  if (!body.success) throw new ApiError(400, 'Invalid source payload')

  const source = await apiProxy(`/api/sources/${id}`, {
    method: 'POST',
    body: body.data,
  })

  return NextResponse.json(source, { status: 201 })
})
