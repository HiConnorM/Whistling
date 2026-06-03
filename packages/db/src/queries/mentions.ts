import type { PrismaClient } from '../generated/client/index.js'

export async function getMentionStats(
  db: PrismaClient,
  businessId: string,
  since: Date,
  until: Date,
) {
  const [counts, avgRating, sentimentCounts] = await Promise.all([
    db.mention.count({
      where: {
        businessId,
        publishedAt: { gte: since, lte: until },
        isSpam: false,
        isDuplicate: false,
      },
    }),
    db.mention.aggregate({
      where: {
        businessId,
        publishedAt: { gte: since, lte: until },
        isSpam: false,
        rating: { not: null },
      },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    db.mentionAnalysis.groupBy({
      by: ['sentiment'],
      where: {
        mention: {
          businessId,
          publishedAt: { gte: since, lte: until },
          isSpam: false,
          isDuplicate: false,
        },
      },
      _count: { sentiment: true },
    }),
  ])

  return {
    total: counts,
    avgRating: avgRating._avg.rating,
    ratingCount: avgRating._count.rating,
    sentimentBreakdown: Object.fromEntries(
      sentimentCounts.map((s) => [s.sentiment.toLowerCase(), s._count.sentiment]),
    ),
  }
}

export async function getUnclassifiedMentions(db: PrismaClient, limit = 50) {
  return db.mention.findMany({
    where: {
      isSpam: false,
      isDuplicate: false,
      analysis: null,
    },
    take: limit,
    orderBy: { collectedAt: 'asc' },
  })
}

export async function getUnembeddedMentions(db: PrismaClient, limit = 100) {
  return db.mention.findMany({
    where: {
      isSpam: false,
      isDuplicate: false,
      embedding: null,
      analysis: { isNot: null },
    },
    take: limit,
    orderBy: { collectedAt: 'asc' },
  })
}

export async function getTopTopics(
  db: PrismaClient,
  businessId: string,
  since: Date,
  limit = 10,
) {
  const clusters = await db.topicCluster.findMany({
    where: {
      businessId,
      periodEnd: { gte: since },
      isCompetitor: false,
    },
    orderBy: { mentionCount: 'desc' },
    take: limit,
  })
  return clusters
}
