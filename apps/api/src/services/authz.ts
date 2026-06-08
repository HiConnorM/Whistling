/**
 * Shared authorization helpers for tenant isolation.
 *
 * Every helper fetches the resource and verifies it belongs to the caller's
 * organization. Throws a 404-shaped error on any mismatch — callers should
 * not be able to distinguish "not found" from "belongs to another org."
 */
import type { PrismaClient, Prisma } from '@whistling/db'

export class NotFoundError extends Error {
  statusCode = 404
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

// ── Business ────────────────────────────────────────────────────────────────

export async function requireBusinessAccess(
  db: PrismaClient,
  businessId: string,
  organizationId: string,
) {
  const business = await db.business.findUnique({ where: { id: businessId } })
  if (!business || business.organizationId !== organizationId) {
    throw new NotFoundError('Business not found')
  }
  return business
}

// ── BusinessSource ───────────────────────────────────────────────────────────

export async function requireSourceAccess(
  db: PrismaClient,
  sourceId: string,
  organizationId: string,
): Promise<Prisma.BusinessSourceGetPayload<{ include: { business: true } }>> {
  const source = await db.businessSource.findUnique({
    where: { id: sourceId },
    include: { business: true },
  })
  if (!source || source.business.organizationId !== organizationId) {
    throw new NotFoundError('Source not found')
  }
  return source
}

// ── Competitor ───────────────────────────────────────────────────────────────

export async function requireCompetitorAccess(
  db: PrismaClient,
  competitorId: string,
  organizationId: string,
) {
  const competitor = await db.competitor.findUnique({
    where: { id: competitorId },
    include: { business: true },
  })
  if (!competitor || competitor.business.organizationId !== organizationId) {
    throw new NotFoundError('Competitor not found')
  }
  return competitor
}

// ── Mention ──────────────────────────────────────────────────────────────────

export async function requireMentionAccess(
  db: PrismaClient,
  mentionId: string,
  organizationId: string,
) {
  const mention = await db.mention.findUnique({
    where: { id: mentionId },
    include: { business: { select: { name: true, category: true, organizationId: true } } },
  })
  if (!mention || mention.business.organizationId !== organizationId) {
    throw new NotFoundError('Mention not found')
  }
  return mention
}

// ── Report ───────────────────────────────────────────────────────────────────

export async function requireReportAccess(
  db: PrismaClient,
  reportId: string,
  organizationId: string,
): Promise<Prisma.ReportGetPayload<{ include: { business: true } }>> {
  const report = await db.report.findUnique({
    where: { id: reportId },
    include: { business: true },
  })
  if (!report || report.business.organizationId !== organizationId) {
    throw new NotFoundError('Report not found')
  }
  return report
}

// ── ResponderDraft ────────────────────────────────────────────────────────────

export async function requireDraftAccess(
  db: PrismaClient,
  draftId: string,
  organizationId: string,
) {
  const draft = await db.responderDraft.findUnique({ where: { id: draftId } })
  if (!draft || draft.organizationId !== organizationId) {
    throw new NotFoundError('Draft not found')
  }
  return draft
}
