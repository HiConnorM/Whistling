import type { FastifyInstance } from 'fastify'
import Papa from 'papaparse'
import { CsvConnector } from '@whistling/connectors'
import { getPlanLimits } from '@whistling/domain'
import { checkOrgRateLimit } from '../services/rateLimitOrg.js'

// Per-plan CSV row import limits to prevent CSV bombs / resource abuse
const PLAN_ROW_LIMITS: Record<string, number> = {
  STARTER: 500,
  PRO: 2000,
  GROWTH: 10000,
  AGENCY: 50000,
}

// Allowed MIME types for CSV upload (defence-in-depth, multipart limit is 10MB)
const ALLOWED_MIMETYPES = new Set([
  'text/csv',
  'text/plain',
  'application/csv',
  'application/vnd.ms-excel', // Some browsers send this for .csv
])

export async function uploadRoutes(app: FastifyInstance) {
  // CSV upload for a business
  app.post<{ Params: { businessId: string } }>(
    '/csv/:businessId',
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
    },
    async (req, reply) => {
      const { organizationId } = req.user

      // Per-org hourly upload cap
      const orgCheck = await checkOrgRateLimit(app.redis, organizationId, 'csv_upload')
      if (!orgCheck.allowed) {
        return reply.status(429).send({ error: orgCheck.reason })
      }

      const business = await app.db.business.findUnique({
        where: { id: req.params.businessId },
      })

      if (!business || business.organizationId !== organizationId) {
        return reply.status(404).send({ error: 'Not found' })
      }

      const data = await req.file()
      if (!data) return reply.status(400).send({ error: 'No file uploaded' })

      // Strict MIME + extension check
      const mimeOk = ALLOWED_MIMETYPES.has(data.mimetype.toLowerCase().split(';')[0]?.trim() ?? '')
      const extOk = data.filename.toLowerCase().endsWith('.csv')
      if (!mimeOk && !extOk) {
        return reply.status(400).send({ error: 'Only CSV files are accepted' })
      }

      const csvBuffer = await data.toBuffer()
      const csvText = csvBuffer.toString('utf-8')

      // Basic sanity: reject suspiciously large text blobs after buffering
      if (csvText.length > 10 * 1024 * 1024) {
        return reply.status(400).send({ error: 'File exceeds 10MB limit' })
      }

      const parsed = Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.toLowerCase().trim().replace(/\s+/g, '_'),
      })

      if (parsed.errors.length > 0) {
        return reply.status(400).send({
          error: 'CSV parse error',
          details: parsed.errors.slice(0, 5),
        })
      }

      // Enforce per-plan row cap before processing
      const sub = await app.db.subscription.findUnique({
        where: { organizationId },
        select: { plan: true },
      })
      const planKey = sub?.plan ?? 'STARTER'
      const rowLimit = PLAN_ROW_LIMITS[planKey] ?? PLAN_ROW_LIMITS['STARTER']!

      if (parsed.data.length > rowLimit) {
        return reply.status(400).send({
          error: `CSV exceeds the ${rowLimit.toLocaleString()}-row limit for the ${planKey} plan. Please split the file or upgrade your plan.`,
        })
      }

      const connector = new CsvConnector()
      const rows = connector.processRows(parsed.data)

      if (rows.length === 0) {
        return reply.status(400).send({ error: 'No valid rows found in CSV' })
      }

      // Find or create CSV source for this business
      let source = await app.db.businessSource.findFirst({
        where: { businessId: req.params.businessId, type: 'CSV' },
      })

      if (!source) {
        source = await app.db.businessSource.create({
          data: {
            businessId: req.params.businessId,
            type: 'CSV',
            status: 'CONNECTED',
          },
        })
      }

      // Batch-check for existing IDs to avoid N+1 queries
      const externalIds = rows.map((r) => r.externalId)
      const existingItems = await app.db.rawItem.findMany({
        where: { sourceId: source.id, externalId: { in: externalIds } },
        select: { externalId: true },
      })
      const existingIds = new Set(existingItems.map((e) => e.externalId))

      const newRows = rows.filter((r) => !existingIds.has(r.externalId))
      let imported = 0

      // Batch create raw items in chunks of 100
      const CHUNK = 100
      for (let i = 0; i < newRows.length; i += CHUNK) {
        const chunk = newRows.slice(i, i + CHUNK)
        await app.db.rawItem.createMany({
          data: chunk.map((row) => ({
            sourceId: source!.id,
            externalId: row.externalId,
            rawJson: row.rawJson as object,
            checksum: row.checksum,
          })),
          skipDuplicates: true,
        })

        for (const row of chunk) {
          await app.queues.ingestion.add('normalize-raw-item', {
            rawItemId: 'pending',
            sourceId: source!.id,
            businessId: req.params.businessId,
          })
          imported++
        }
      }

      await app.db.businessSource.update({
        where: { id: source.id },
        data: { totalItemsCollected: { increment: imported } },
      })

      return { imported, skipped: rows.length - imported, total: rows.length }
    },
  )
}
