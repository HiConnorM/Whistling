import { NextResponse } from 'next/server'
import { db, SourceType, SourceStatus } from '@whistling/db'
import { getSession } from '@/lib/session'
import { apiHandler, ApiError } from '@/lib/api-error'
import { z } from 'zod'

const createSourceSchema = z.object({
  type: z.string().toUpperCase(),
  url: z.string().url().optional(),
  externalId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

type Params = { params: Promise<{ id: string }> }

export const GET = apiHandler(async (_req: Request, { params }: Params) => {
  const session = await getSession()
  if (!session) throw new ApiError(401, 'Unauthorized')

  const { id } = await params
  const business = await db.business.findUnique({ where: { id } })
  if (!business) throw new ApiError(404, 'Business not found')

  const membership = await db.orgMembership.findFirst({
    where: { userId: session.user.id, organizationId: business.organizationId },
  })
  if (!membership) throw new ApiError(403, 'Forbidden')

  const sources = await db.businessSource.findMany({
    where: { businessId: id },
    select: {
      id: true,
      type: true,
      url: true,
      status: true,
      lastScannedAt: true,
      nextScanAt: true,
      totalItemsCollected: true,
      errorMessage: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(sources)
})

export const POST = apiHandler(async (req: Request, { params }: Params) => {
  const session = await getSession()
  if (!session) throw new ApiError(401, 'Unauthorized')

  const { id } = await params
  const business = await db.business.findUnique({ where: { id } })
  if (!business) throw new ApiError(404, 'Business not found')

  const membership = await db.orgMembership.findFirst({
    where: { userId: session.user.id, organizationId: business.organizationId },
  })
  if (!membership) throw new ApiError(403, 'Forbidden')

  const body = createSourceSchema.safeParse(await req.json())
  if (!body.success) throw new ApiError(400, JSON.stringify(body.error.flatten()))

  const sourceType = body.data.type as SourceType

  // Idempotent: return existing source if already connected
  const existing = await db.businessSource.findFirst({
    where: { businessId: id, type: sourceType },
  })
  if (existing) return NextResponse.json(existing)

  const source = await db.businessSource.create({
    data: {
      businessId: id,
      type: sourceType,
      url: body.data.url,
      externalId: body.data.externalId,
      status: SourceStatus.PENDING,
      metadata: (body.data.metadata as object) ?? {},
    },
  })

  return NextResponse.json(source, { status: 201 })
})
