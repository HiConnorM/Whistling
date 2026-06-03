import type { PrismaClient } from '../generated/client/index.js'

export async function getLatestPulseScore(db: PrismaClient, businessId: string) {
  return db.pulseScore.findFirst({
    where: { businessId },
    orderBy: { calculatedAt: 'desc' },
  })
}

export async function getPulseHistory(db: PrismaClient, businessId: string, days = 90) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  return db.pulseScore.findMany({
    where: { businessId, calculatedAt: { gte: since } },
    orderBy: { calculatedAt: 'asc' },
    select: { total: true, calculatedAt: true },
  })
}
