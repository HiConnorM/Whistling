import { Worker, type ConnectionOptions } from 'bullmq'
import type { PrismaClient } from '@whistling/db'
import { connectorRegistry, GoogleBusinessConnector, CsvConnector, MetaConnector } from '@whistling/connectors'
import { hashText, isSpamText } from '@whistling/analysis'
import type { ScanSourcePayload, NormalizeRawItemPayload } from '@whistling/jobs'

connectorRegistry.register(new GoogleBusinessConnector())
connectorRegistry.register(new CsvConnector())
connectorRegistry.register(new MetaConnector('facebook'))
connectorRegistry.register(new MetaConnector('instagram'))

export function startIngestionWorker(
  db: PrismaClient,
  connection: ConnectionOptions,
  concurrency: number,
) {
  const worker = new Worker(
    'ingestion',
    async (job) => {
      switch (job.name) {
        case 'scan-source':
          return scanSource(db, job.data as ScanSourcePayload, job)
        case 'normalize-raw-item':
          return normalizeRawItem(db, job.data as NormalizeRawItemPayload, job)
        default:
          throw new Error(`Unknown job: ${job.name}`)
      }
    },
    { connection, concurrency },
  )

  worker.on('failed', (job, err) => {
    console.error(`[ingestion] Job ${job?.id} (${job?.name}) failed:`, err.message)
  })

  return worker
}

async function scanSource(db: PrismaClient, payload: ScanSourcePayload, job: { updateProgress: (n: number) => Promise<void> }) {
  const source = await db.businessSource.findUnique({
    where: { id: payload.sourceId },
    include: { business: true },
  })

  if (!source || source.status !== 'CONNECTED') return { skipped: true }

  const connector = connectorRegistry.get(source.type.toLowerCase() as Parameters<typeof connectorRegistry.get>[0])
  if (!connector) {
    await db.businessSource.update({
      where: { id: source.id },
      data: { errorMessage: `No connector for type ${source.type}`, status: 'ERROR' },
    })
    return { error: 'No connector' }
  }

  const credentials = {
    accessToken: source.accessTokenEncrypted
      ? decrypt(source.accessTokenEncrypted)
      : undefined,
    refreshToken: source.refreshTokenEncrypted
      ? decrypt(source.refreshTokenEncrypted)
      : undefined,
    externalId: source.externalId ?? undefined,
    metadata: source.metadata as Record<string, unknown> | undefined,
  }

  let cursor = payload.fullRescan ? undefined : (source.cursor ?? undefined)
  let totalCollected = 0
  let hasMore = true

  const scanJob = await db.scanJob.create({
    data: {
      businessId: payload.businessId,
      sourceId: source.id,
      type: 'scan-source',
      status: 'RUNNING',
      startedAt: new Date(),
    },
  })

  try {
    while (hasMore) {
      const result = await connector.fetchNew({
        sourceId: source.id,
        businessId: payload.businessId,
        credentials,
        cursor,
      })

      for (const item of result.items) {
        const existing = await db.rawItem.findUnique({
          where: { sourceId_externalId: { sourceId: source.id, externalId: item.externalId } },
        })

        if (existing) continue
        const duplicate = await db.rawItem.findFirst({
          where: { sourceId: source.id, checksum: item.checksum },
        })
        if (duplicate) continue

        const raw = await db.rawItem.create({
          data: {
            sourceId: source.id,
            externalId: item.externalId,
            rawJson: item.rawJson as object,
            checksum: item.checksum,
            collectedAt: item.collectedAt,
          },
        })

        // Normalize inline for small result sets
        const normalized = await connector.normalize(item)
        for (const mention of normalized) {
          if (!mention.text?.trim()) continue

          const textHash = hashText(mention.text)
          const isSpam = isSpamText(mention.text)

          const existingMention = await db.mention.findUnique({
            where: {
              businessId_sourceType_externalId: {
                businessId: payload.businessId,
                sourceType: mention.sourceType.toUpperCase() as Parameters<typeof db.mention.findUnique>[0]['where'] extends { businessId_sourceType_externalId?: infer T } ? T extends { sourceType: infer S } ? S : never : never,
                externalId: mention.externalId,
              },
            },
          })

          if (existingMention) continue

          await db.mention.create({
            data: {
              businessId: payload.businessId,
              sourceId: source.id,
              rawItemId: raw.id,
              externalId: mention.externalId,
              sourceType: mention.sourceType.toUpperCase() as Parameters<typeof db.mention.create>[0]['data']['sourceType'],
              authorName: mention.authorName,
              authorId: mention.authorId,
              text: mention.text,
              textHash,
              rating: mention.rating,
              url: mention.url,
              publishedAt: mention.publishedAt,
              isSpam,
            },
          })
          totalCollected++
        }
      }

      cursor = result.nextCursor
      hasMore = result.hasMore && !!cursor

      await job.updateProgress(Math.min(90, totalCollected))
    }

    await db.businessSource.update({
      where: { id: source.id },
      data: {
        cursor,
        lastScannedAt: new Date(),
        nextScanAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        totalItemsCollected: { increment: totalCollected },
        errorCount: 0,
        errorMessage: null,
      },
    })

    await db.scanJob.update({
      where: { id: scanJob.id },
      data: {
        status: 'COMPLETED',
        itemsCollected: totalCollected,
        completedAt: new Date(),
      },
    })

    return { collected: totalCollected }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)

    await db.businessSource.update({
      where: { id: source.id },
      data: {
        errorMessage: msg,
        errorCount: { increment: 1 },
        status: (source.errorCount ?? 0) >= 4 ? 'ERROR' : 'CONNECTED',
      },
    })

    await db.scanJob.update({
      where: { id: scanJob.id },
      data: { status: 'FAILED', errorMessage: msg, completedAt: new Date() },
    })

    throw err
  }
}

async function normalizeRawItem(db: PrismaClient, payload: NormalizeRawItemPayload, _job: unknown) {
  const raw = await db.rawItem.findUnique({
    where: { id: payload.rawItemId },
    include: { source: true },
  })
  if (!raw || raw.processedAt) return { skipped: true }

  const connector = connectorRegistry.get(raw.source.type.toLowerCase() as Parameters<typeof connectorRegistry.get>[0])
  if (!connector) return { skipped: true }

  const normalized = await connector.normalize({
    externalId: raw.externalId,
    rawJson: raw.rawJson,
    collectedAt: raw.collectedAt,
    checksum: raw.checksum,
  })

  for (const mention of normalized) {
    if (!mention.text?.trim()) continue

    const textHash = hashText(mention.text)
    const isSpam = isSpamText(mention.text)

    await db.mention.upsert({
      where: {
        businessId_sourceType_externalId: {
          businessId: payload.businessId,
          sourceType: mention.sourceType.toUpperCase() as Parameters<typeof db.mention.upsert>[0]['where'] extends { businessId_sourceType_externalId?: infer T } ? T extends { sourceType: infer S } ? S : never : never,
          externalId: mention.externalId,
        },
      },
      create: {
        businessId: payload.businessId,
        sourceId: payload.sourceId,
        rawItemId: raw.id,
        externalId: mention.externalId,
        sourceType: mention.sourceType.toUpperCase() as Parameters<typeof db.mention.upsert>[0]['create']['sourceType'],
        text: mention.text,
        textHash,
        rating: mention.rating,
        url: mention.url,
        publishedAt: mention.publishedAt,
        isSpam,
      },
      update: {},
    })
  }

  await db.rawItem.update({
    where: { id: raw.id },
    data: { processedAt: new Date() },
  })

  return { normalized: normalized.length }
}

function decrypt(encrypted: string): string {
  // TODO: implement proper AES-256-GCM decryption using ENCRYPTION_KEY
  return encrypted
}
