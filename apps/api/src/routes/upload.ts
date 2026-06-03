import type { FastifyInstance } from 'fastify'
import Papa from 'papaparse'
import { CsvConnector } from '@whistling/connectors'

export async function uploadRoutes(app: FastifyInstance) {
  // CSV upload for a business
  app.post<{ Params: { businessId: string } }>(
    '/csv/:businessId',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const business = await app.db.business.findUnique({
        where: { id: req.params.businessId },
      })

      if (!business || business.organizationId !== req.user.organizationId) {
        return reply.status(404).send({ error: 'Not found' })
      }

      const data = await req.file()
      if (!data) return reply.status(400).send({ error: 'No file uploaded' })
      if (!data.mimetype.includes('csv') && !data.filename.endsWith('.csv')) {
        return reply.status(400).send({ error: 'Only CSV files are accepted' })
      }

      const csvText = await data.toBuffer().then((b) => b.toString('utf-8'))

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

      // Batch create raw items, skip duplicates
      let imported = 0
      for (const row of rows) {
        const existing = await app.db.rawItem.findUnique({
          where: { sourceId_externalId: { sourceId: source.id, externalId: row.externalId } },
        })
        if (existing) continue

        await app.db.rawItem.create({
          data: {
            sourceId: source.id,
            externalId: row.externalId,
            rawJson: row.rawJson as object,
            checksum: row.checksum,
          },
        })

        await app.queues.ingestion.add('normalize-raw-item', {
          rawItemId: 'pending',
          sourceId: source.id,
          businessId: req.params.businessId,
        })

        imported++
      }

      await app.db.businessSource.update({
        where: { id: source.id },
        data: { totalItemsCollected: { increment: imported } },
      })

      return { imported, total: rows.length }
    },
  )
}
