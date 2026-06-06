import { NextResponse } from 'next/server'
import { db } from '@whistling/db'
import { getSession } from '@/lib/session'
import { apiHandler, ApiError } from '@/lib/api-error'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2).max(80).trim(),
})

export const POST = apiHandler(async (req: Request) => {
  const session = await getSession()
  if (!session) throw new ApiError(401, 'Unauthorized')

  const body = schema.safeParse(await req.json())
  if (!body.success) throw new ApiError(400, body.error.flatten().fieldErrors.name?.[0] ?? 'Invalid name')

  // Return existing org if user already has one
  const existing = await db.orgMembership.findFirst({
    where: { userId: session.user.id },
    include: { organization: true },
  })
  if (existing) {
    return NextResponse.json({
      organizationId: existing.organizationId,
      organization: existing.organization,
    })
  }

  // Build a URL-safe slug; fall back to a UUID fragment if trimming yields empty string
  const baseSlug = body.data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  if (!baseSlug) throw new ApiError(400, 'Organization name must contain at least one letter or digit')

  // Create org + membership + trial subscription in a single transaction
  const result = await db.$transaction(async (tx) => {
    // Resolve slug uniqueness (append -2, -3, … on collision)
    let slug = baseSlug
    let attempt = 1
    while (await tx.organization.findUnique({ where: { slug } })) {
      attempt++
      slug = `${baseSlug}-${attempt}`
    }

    const org = await tx.organization.create({
      data: { name: body.data.name, slug },
    })

    await tx.orgMembership.create({
      data: { userId: session.user.id, organizationId: org.id, role: 'OWNER' },
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
})
