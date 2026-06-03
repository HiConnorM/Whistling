import { NextResponse } from 'next/server'
import { db } from '@whistling/db'
import { getSession } from '@/lib/session'
import { addCompetitorSchema } from '@whistling/domain'

export async function POST(req: Request, { params }: { params: Promise<{ businessId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessId } = await params
  const business = await db.business.findUnique({ where: { id: businessId } })
  if (!business) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await db.orgMembership.findFirst({ where: { userId: session.user.id, organizationId: business.organizationId } })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = addCompetitorSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

  const competitor = await db.competitor.create({
    data: { businessId, ...body.data },
  })

  return NextResponse.json(competitor, { status: 201 })
}
