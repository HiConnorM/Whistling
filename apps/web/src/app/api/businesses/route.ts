import { NextResponse } from 'next/server'
import { db } from '@whistling/db'
import { getSession } from '@/lib/session'
import { createBusinessSchema } from '@whistling/domain'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await db.orgMembership.findFirst({ where: { userId: session.user.id } })
  if (!membership) return NextResponse.json({ error: 'No organization' }, { status: 404 })

  const businesses = await db.business.findMany({
    where: { organizationId: membership.organizationId, isActive: true },
    include: { sources: { select: { id: true, type: true, status: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(businesses)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await db.orgMembership.findFirst({ where: { userId: session.user.id } })
  if (!membership) return NextResponse.json({ error: 'No organization' }, { status: 404 })

  const body = createBusinessSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

  const count = await db.business.count({
    where: { organizationId: membership.organizationId, isActive: true },
  })

  const sub = await db.subscription.findUnique({ where: { organizationId: membership.organizationId } })
  const limits: Record<string, number> = { STARTER: 1, PRO: 1, GROWTH: 3, AGENCY: 50 }
  const max = limits[sub?.plan ?? 'STARTER'] ?? 1
  if (count >= max) {
    return NextResponse.json({ error: `Your plan allows ${max} business${max > 1 ? 'es' : ''}. Upgrade to add more.` }, { status: 402 })
  }

  const business = await db.business.create({
    data: {
      ...body.data,
      category: body.data.category.toUpperCase() as Parameters<typeof db.business.create>[0]['data']['category'],
      organizationId: membership.organizationId,
    },
  })

  return NextResponse.json(business, { status: 201 })
}
