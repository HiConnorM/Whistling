import { NextResponse } from 'next/server'
import { db } from '@whistling/db'
import { getSession } from '@/lib/session'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2),
})

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = schema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }

  // Check if user already has an org
  const existing = await db.orgMembership.findFirst({
    where: { userId: session.user.id },
    include: { organization: true },
  })
  if (existing) {
    return NextResponse.json({ organizationId: existing.organizationId, organization: existing.organization })
  }

  // Create org + membership + trial subscription in a transaction
  const result = await db.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: body.data.name,
        slug: body.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      },
    })

    await tx.orgMembership.create({
      data: {
        userId: session.user.id,
        organizationId: org.id,
        role: 'OWNER',
      },
    })

    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + 14)

    await tx.subscription.create({
      data: {
        organizationId: org.id,
        plan: 'STARTER',
        status: 'TRIALING',
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEnd,
        cancelAtPeriodEnd: false,
      },
    })

    return org
  })

  return NextResponse.json({ organizationId: result.id, organization: result }, { status: 201 })
}
