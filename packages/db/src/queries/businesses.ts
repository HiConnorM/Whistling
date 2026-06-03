import type { PrismaClient } from '../generated/client/index.js'

export async function getBusinessWithSources(db: PrismaClient, businessId: string) {
  return db.business.findUnique({
    where: { id: businessId },
    include: {
      sources: true,
      competitors: { where: { isActive: true } },
      _count: {
        select: { mentions: true, recommendations: true },
      },
    },
  })
}

export async function getBusinessesForOrg(db: PrismaClient, organizationId: string) {
  return db.business.findMany({
    where: { organizationId, isActive: true },
    include: {
      _count: {
        select: { mentions: true, sources: true, competitors: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getSourcesDueForScan(db: PrismaClient) {
  return db.businessSource.findMany({
    where: {
      status: 'CONNECTED',
      OR: [{ nextScanAt: null }, { nextScanAt: { lte: new Date() } }],
    },
    include: { business: true },
    orderBy: { nextScanAt: 'asc' },
    take: 50,
  })
}
