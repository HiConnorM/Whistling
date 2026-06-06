import { NextResponse } from 'next/server'
import { db } from '@whistling/db'
import { getSession } from '@/lib/session'
import { apiHandler, ApiError } from '@/lib/api-error'
import { addCompetitorSchema } from '@whistling/domain'

type Params = { params: Promise<{ businessId: string }> }

export const POST = apiHandler(async (req: Request, { params }: Params) => {
  const session = await getSession()
  if (!session) throw new ApiError(401, 'Unauthorized')

  const { businessId } = await params
  const business = await db.business.findUnique({ where: { id: businessId } })
  if (!business) throw new ApiError(404, 'Business not found')

  const membership = await db.orgMembership.findFirst({
    where: { userId: session.user.id, organizationId: business.organizationId },
  })
  if (!membership) throw new ApiError(403, 'Forbidden')

  const body = addCompetitorSchema.safeParse(await req.json())
  if (!body.success) throw new ApiError(400, JSON.stringify(body.error.flatten()))

  const competitor = await db.competitor.create({
    data: { businessId, ...body.data },
  })

  return NextResponse.json(competitor, { status: 201 })
})
