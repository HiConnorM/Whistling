import type { PrismaClient, Prisma } from '@whistling/db'
import type { FastifyRequest } from 'fastify'

export type AuditAction =
  | 'source.connected'
  | 'source.disconnected'
  | 'scan.started'
  | 'scan.completed'
  | 'billing.checkout_started'
  | 'billing.plan_changed'
  | 'billing.portal_opened'
  | 'billing.payment_failed'
  | 'competitor.added'
  | 'competitor.removed'
  | 'responder.draft_created'
  | 'responder.approved'
  | 'responder.rejected'
  | 'data.export_requested'
  | 'data.delete_requested'
  | 'admin.action'

export async function writeAuditLog(
  db: PrismaClient,
  opts: {
    organizationId: string
    userId?: string
    action: AuditAction
    resourceType?: string
    resourceId?: string
    metadata?: Record<string, unknown>
    req?: FastifyRequest
  },
): Promise<void> {
  await db.auditLog.create({
    data: {
      organizationId: opts.organizationId,
      userId: opts.userId,
      action: opts.action,
      resourceType: opts.resourceType,
      resourceId: opts.resourceId,
      metadata: opts.metadata as Prisma.InputJsonValue | undefined,
      ipAddress: opts.req?.ip,
      userAgent: opts.req?.headers['user-agent'],
    },
  })
}
