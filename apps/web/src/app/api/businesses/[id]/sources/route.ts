import { NextResponse } from 'next/server'
import { db, SourceType, SourceStatus } from '@whistling/db'
import { getSession } from '@/lib/session'
import { z } from 'zod'

const createSourceSchema = z.object({
  type: z.string().toUpperCase(),
  url: z.string().url().optional(),
  externalId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const business = await db.business.findUnique({ where: { id } })
  if (!business) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await db.orgMembership.findFirst({ where: { userId: session.user.id, organizationId: business.organizationId } })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sources = await db.businessSource.findMany({
    where: { businessId: id },
    select: { id: true, type: true, url: true, status: true, lastScannedAt: true, nextScanAt: true, totalItemsCollected: true, errorMessage: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(sources)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const business = await db.business.findUnique({ where: { id } })
  if (!business) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await db.orgMembership.findFirst({ where: { userId: session.user.id, organizationId: business.organizationId } })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = createSourceSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

  const sourceType = body.data.type as SourceType

  const existing = await db.businessSource.findFirst({
    where: { businessId: id, type: sourceType },
  })
  if (existing) {
    return NextResponse.json(existing)
  }

  const source = await db.businessSource.create({
    data: {
      businessId: id,
      type: sourceType,
      url: body.data.url,
      externalId: body.data.externalId,
      status: SourceStatus.PENDING,
      metadata: body.data.metadata as object ?? {},
    },
  })

  return NextResponse.json(source, { status: 201 })
}
