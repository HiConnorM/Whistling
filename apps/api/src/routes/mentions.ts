import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { Prisma } from '@whistling/db'
import { mentionFilterSchema, paginationSchema } from '@whistling/domain'

export async function mentionRoutes(app: FastifyInstance) {
  app.get<{ Querystring: Record<string, string> }>(
    '/',
    { preHandler: [app.authenticate] },
    async (req) => {
      const filter = mentionFilterSchema.parse(req.query)
      const { page, limit } = paginationSchema.parse(req.query)
      const skip = (page - 1) * limit

      const where: Prisma.MentionWhereInput = {
        businessId: filter.businessId,
        isSpam: false,
        isDuplicate: false,
        ...(filter.sourceType && { sourceType: filter.sourceType.toUpperCase() as Prisma.EnumSourceTypeFilter }),
        ...(filter.isCompetitor !== undefined && { isCompetitor: filter.isCompetitor }),
        ...(filter.dateFrom || filter.dateTo
          ? {
              publishedAt: {
                ...(filter.dateFrom && { gte: filter.dateFrom }),
                ...(filter.dateTo && { lte: filter.dateTo }),
              },
            }
          : {}),
        ...(filter.ratingMin || filter.ratingMax
          ? {
              rating: {
                ...(filter.ratingMin && { gte: filter.ratingMin }),
                ...(filter.ratingMax && { lte: filter.ratingMax }),
              },
            }
          : {}),
        ...(filter.sentiment || filter.topic
          ? {
              analysis: {
                ...(filter.sentiment && { sentiment: filter.sentiment.toUpperCase() as Prisma.EnumSentimentFilter }),
                ...(filter.topic && { topics: { has: filter.topic } }),
              },
            }
          : {}),
      }

      const [mentions, total] = await Promise.all([
        app.db.mention.findMany({
          where,
          include: { analysis: true },
          orderBy: { publishedAt: 'desc' },
          skip,
          take: limit,
        }),
        app.db.mention.count({ where }),
      ])

      return {
        data: mentions,
        meta: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      }
    },
  )
}
