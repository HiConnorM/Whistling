import { NextResponse } from 'next/server'
import { db } from '@whistling/db'
import { getSession } from '@/lib/session'
import { getQueue } from '@whistling/jobs'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const business = await db.business.findUnique({
    where: { id },
    include: { sources: { where: { status: 'CONNECTED' } } },
  })
  if (!business) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await db.orgMembership.findFirst({ where: { userId: session.user.id, organizationId: business.organizationId } })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const connection = { url: process.env['REDIS_URL'] ?? 'redis://localhost:6379' }
  const queue = getQueue('ingestion', connection)

  const jobs = await Promise.all(
    business.sources.map((source) =>
      queue.add('scan-source', { sourceId: source.id, businessId: id })
    )
  )

  return NextResponse.json({ queued: jobs.length })
}
