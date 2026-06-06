import { NextResponse } from 'next/server'
import { db } from '@whistling/db'
import { getSession } from '@/lib/session'
import { apiHandler, ApiError } from '@/lib/api-error'
import { createBusinessSchema } from '@whistling/domain'

export const GET = apiHandler(async () => {
  const session = await getSession()
  if (!session) throw new ApiError(401, 'Unauthorized')

  const membership = await db.orgMembership.findFirst({ where: { userId: session.user.id } })
  if (!membership) throw new ApiError(404, 'No organization found')

  const businesses = await db.business.findMany({
    where: { organizationId: membership.organizationId, isActive: true },
    include: { sources: { select: { id: true, type: true, status: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(businesses)
})

export const POST = apiHandler(async (req: Request) => {
  const session = await getSession()
  if (!session) throw new ApiError(401, 'Unauthorized')

  const membership = await db.orgMembership.findFirst({ where: { userId: session.user.id } })
  if (!membership) throw new ApiError(404, 'No organization found')

  const body = createBusinessSchema.safeParse(await req.json())
  if (!body.success) throw new ApiError(400, JSON.stringify(body.error.flatten()))

  const count = await db.business.count({
    where: { organizationId: membership.organizationId, isActive: true },
  })

  const sub = await db.subscription.findUnique({
    where: { organizationId: membership.organizationId },
  })
  const limits: Record<string, number> = { STARTER: 1, PRO: 1, GROWTH: 3, AGENCY: 50 }
  const max = limits[sub?.plan ?? 'STARTER'] ?? 1

  if (count >= max) {
    throw new ApiError(
      402,
      `Your plan allows ${max} business${max > 1 ? 'es' : ''}. Upgrade to add more.`,
    )
  }

  const business = await db.business.create({
    data: {
      ...body.data,
      category: body.data.category.toUpperCase() as Parameters<
        typeof db.business.create
      >[0]['data']['category'],
      organizationId: membership.organizationId,
    },
  })

  return NextResponse.json(business, { status: 201 })
})
