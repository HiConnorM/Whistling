import type { PrismaClient } from '../generated/client/index.js'

export async function getLatestReport(db: PrismaClient, businessId: string) {
  return db.report.findFirst({
    where: { businessId, status: 'READY' },
    orderBy: { periodEnd: 'desc' },
    include: {
      sections: { orderBy: { order: 'asc' } },
      recommendations: { where: { status: { in: ['NEW', 'ACCEPTED'] } }, orderBy: { priority: 'asc' } },
    },
  })
}

export async function getReportHistory(db: PrismaClient, businessId: string, limit = 12) {
  return db.report.findMany({
    where: { businessId, status: 'READY' },
    orderBy: { periodEnd: 'desc' },
    take: limit,
    select: {
      id: true,
      periodStart: true,
      periodEnd: true,
      pulseScore: true,
      pulsePrevious: true,
      biggestWin: true,
      biggestRisk: true,
      emailSentAt: true,
      createdAt: true,
    },
  })
}

export async function getPendingReportGeneration(db: PrismaClient) {
  return db.report.findMany({
    where: { status: 'GENERATING' },
    include: { business: true },
    orderBy: { createdAt: 'asc' },
  })
}
