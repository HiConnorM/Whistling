import { NextResponse } from 'next/server'
import { db } from '@whistling/db'
import { getSession } from '@/lib/session'
import { apiHandler, ApiError } from '@/lib/api-error'
import { getQueue } from '@whistling/jobs'

type Params = { params: Promise<{ id: string }> }

export const POST = apiHandler(async (_req: Request, { params }: Params) => {
  const session = await getSession()
  if (!session) throw new ApiError(401, 'Unauthorized')

  const { id } = await params
  const business = await db.business.findUnique({
    where: { id },
    include: { sources: { where: { status: 'CONNECTED' } } },
  })
  if (!business) throw new ApiError(404, 'Business not found')

  const membership = await db.orgMembership.findFirst({
    where: { userId: session.user.id, organizationId: business.organizationId },
  })
  if (!membership) throw new ApiError(403, 'Forbidden')

  if (business.sources.length === 0) {
    throw new ApiError(422, 'No connected sources to scan')
  }

  const connection = { url: process.env['REDIS_URL'] ?? 'redis://localhost:6379' }

  let queue: ReturnType<typeof getQueue>
  try {
    queue = getQueue('ingestion', connection)
  } catch {
    throw new ApiError(503, 'Job queue unavailable')
  }

  const jobs = await Promise.all(
    business.sources.map((source) =>
      queue.add('scan-source', { sourceId: source.id, businessId: id }),
    ),
  )

  return NextResponse.json({ queued: jobs.length })
})
