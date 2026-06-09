import { Worker, type ConnectionOptions, type Job } from 'bullmq'
import { type PrismaClient, SourceType } from '@whistling/db'
import { connectorRegistry, GoogleBusinessConnector, CsvConnector, MetaConnector } from '@whistling/connectors'
import {
  getApifyClient,
  actorKeyForSource,
  buildActorInput,
  getScanBudget,
  normalizeApifyItem,
  estimateApifyCostCents,
  APIFY_TERMINAL_STATUSES,
  APIFY_FAILED_STATUSES,
  APIFY_ACTORS,
  type ActorKey,
  type FreshnessContext,
} from '@whistling/connectors'
import { hashText, isSpamText } from '@whistling/analysis'
import { getQueue } from '@whistling/jobs'
import type {
  ScanSourcePayload,
  NormalizeRawItemPayload,
  CollectApifyRunPayload,
  ScanMode,
  FreshnessMode,
} from '@whistling/jobs'
import { decrypt } from '../services/encryption.js'
import { recordScanUsage } from '../services/enforcement.js'

connectorRegistry.register(new GoogleBusinessConnector())
connectorRegistry.register(new CsvConnector())
connectorRegistry.register(new MetaConnector('facebook'))
connectorRegistry.register(new MetaConnector('instagram'))

// Max polling attempts before giving up (~2.5 hours at 60s delay)
const MAX_COLLECT_ATTEMPTS = 150

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
          return scanSource(db, job.data as ScanSourcePayload, job, connection)
        case 'normalize-raw-item':
          return normalizeRawItem(db, job.data as NormalizeRawItemPayload, job)
        case 'collect-apify-run':
          return collectApifyRun(db, job.data as CollectApifyRunPayload, connection)
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

// ── scan-source ───────────────────────────────────────────────────────────────

async function scanSource(
  db: PrismaClient,
  payload: ScanSourcePayload,
  job: Job,
  connection: ConnectionOptions,
) {
  const source = await db.businessSource.findUnique({
    where: { id: payload.sourceId },
    include: {
      business: {
        include: {
          organization: { include: { subscription: true } },
        },
      },
    },
  })

  if (!source || source.status !== 'CONNECTED') return { skipped: true }

  const meta = source.metadata as Record<string, unknown> | null
  const strategy = (meta?.['strategy'] as string | undefined) ?? 'connector'
  // payload.maxItems (from enforceUsageLimit) takes priority over stored metadata default
  const maxItems = payload.maxItems ?? (meta?.['maxItems'] as number | undefined) ?? 150

  if (strategy === 'apify') {
    return scanSourceViaApify(db, source, payload, maxItems, connection)
  }

  return scanSourceViaConnector(db, source, payload, job)
}

// ── Freshness helpers ─────────────────────────────────────────────────────────

/**
 * Derive the scan mode from source history and payload flags.
 * Callers can override by passing scanMode explicitly in the payload.
 */
function deriveScanMode(
  source: { lastSuccessfulScanAt?: Date | null },
  payload: { fullRescan?: boolean },
): ScanMode {
  if (payload.fullRescan) return 'deep_backfill'
  if (!source.lastSuccessfulScanAt) return 'initial_backfill'
  return 'weekly_incremental'
}

/**
 * Derive the freshness mode from the scan mode.
 * - Backfills fetch everything up to the budget.
 * - Weekly incremental fetches only new content since the last success.
 * - Manual refresh fetches the latest window regardless of history.
 */
function deriveFreshnessMode(scanMode: ScanMode): FreshnessMode {
  switch (scanMode) {
    case 'initial_backfill': return 'full_backfill'
    case 'deep_backfill':    return 'full_backfill'
    case 'weekly_incremental': return 'since_last_scan'
    case 'manual_refresh':   return 'latest_first'
  }
}

// ── Apify scan path ───────────────────────────────────────────────────────────

async function scanSourceViaApify(
  db: PrismaClient,
  source: Awaited<ReturnType<PrismaClient['businessSource']['findUnique']>> & {
    business: {
      id: string
      organizationId: string
      organization: {
        id: string
        subscription: { currentPeriodStart: Date | null } | null
      } | null
    }
  },
  payload: ScanSourcePayload,
  maxItems: number,
  connection: ConnectionOptions,
) {
  if (!source) return { skipped: true }

  const meta = source.metadata as Record<string, unknown> | null
  const mediaType = (meta?.['mediaType'] as string | undefined) ?? 'review'
  const scanDepthKey = (meta?.['scanDepth'] as string | undefined) ?? 'standard'
  const isCompetitor = !!(meta?.['isCompetitor'] as boolean | undefined)
  const actorKey = actorKeyForSource(source.type, mediaType)

  if (!actorKey) {
    await db.businessSource.update({
      where: { id: source.id },
      data: { errorMessage: `No Apify actor for source type ${source.type}`, status: 'ERROR' },
    })
    return { error: 'No actor mapping' }
  }

  if (!source.url) {
    await db.businessSource.update({
      where: { id: source.id },
      data: { errorMessage: 'Source URL is required for Apify scans', status: 'ERROR' },
    })
    return { error: 'No source URL' }
  }

  const actorConfig = APIFY_ACTORS[actorKey]
  const budget = getScanBudget(scanDepthKey as 'light' | 'standard' | 'deep')

  // Derive scan / freshness mode — payload values override auto-detection
  const scanMode = payload.scanMode ?? deriveScanMode(source, payload)
  const freshnessMode = payload.freshnessMode ?? deriveFreshnessMode(scanMode)
  const since = payload.lastSuccessfulScanAt
    ? new Date(payload.lastSuccessfulScanAt)
    : (source.lastSuccessfulScanAt ?? undefined)

  const freshnessCtx: FreshnessContext = { scanMode, freshnessMode, since }
  const input = buildActorInput(actorKey, source.url, budget, { isCompetitor, freshness: freshnessCtx })
  const estimatedCost = estimateApifyCostCents(actorKey, maxItems)
  const organizationId = source.business.organizationId
  const periodStart = source.business.organization?.subscription?.currentPeriodStart ?? new Date()

  const providerRun = await db.providerRun.create({
    data: {
      organizationId,
      businessId: source.business.id,
      sourceId: source.id,
      provider: 'apify',
      actorId: actorConfig.actorId,   // real Apify actor ID, not the key
      status: 'PENDING',
      requestedMaxItems: maxItems,
      estimatedCostCents: estimatedCost,
    },
  })

  try {
    const client = getApifyClient()
    const { data: run } = await client.runActor(actorConfig.actorId, input)  // use real actor ID

    await db.providerRun.update({
      where: { id: providerRun.id },
      data: { runId: run.id, datasetId: run.defaultDatasetId, status: 'RUNNING' },
    })

    await db.businessSource.update({
      where: { id: source.id },
      data: { errorMessage: null },
    })

    const queue = getQueue('ingestion', connection)
    await queue.add(
      'collect-apify-run',
      {
        providerRunId: providerRun.id,
        apifyRunId: run.id,
        datasetId: run.defaultDatasetId,
        sourceId: source.id,
        businessId: source.business.id,
        organizationId,
        actorKey,
        maxItems,
        periodStart: periodStart.toISOString(),
        attempt: 0,
        freshnessMode,
        lastSuccessfulScanAt: since?.toISOString(),
      } satisfies CollectApifyRunPayload,
      { delay: 60_000 },
    )

    return { queued: true, runId: run.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)

    await db.providerRun.update({
      where: { id: providerRun.id },
      data: { status: 'FAILED', errorMessage: msg, finishedAt: new Date() },
    })

    await db.businessSource.update({
      where: { id: source.id },
      data: {
        errorMessage: msg,
        errorCount: { increment: 1 },
        status: (source.errorCount ?? 0) >= 4 ? 'ERROR' : 'CONNECTED',
      },
    })

    throw err
  }
}

// ── collect-apify-run ─────────────────────────────────────────────────────────

async function collectApifyRun(
  db: PrismaClient,
  payload: CollectApifyRunPayload,
  connection: ConnectionOptions,
) {
  const client = getApifyClient()
  const { data: runStatus } = await client.getRun(payload.apifyRunId)

  if (!APIFY_TERMINAL_STATUSES.has(runStatus.status)) {
    if (payload.attempt >= MAX_COLLECT_ATTEMPTS) {
      await db.providerRun.update({
        where: { id: payload.providerRunId },
        data: { status: 'FAILED', errorMessage: 'Timed out waiting for Apify run', finishedAt: new Date() },
      })
      await client.abortRun(payload.apifyRunId)
      return { aborted: true }
    }

    const queue = getQueue('ingestion', connection)
    await queue.add(
      'collect-apify-run',
      { ...payload, attempt: payload.attempt + 1 },
      { delay: 60_000 },
    )
    return { pending: true, attempt: payload.attempt + 1 }
  }

  if (APIFY_FAILED_STATUSES.has(runStatus.status)) {
    await db.providerRun.update({
      where: { id: payload.providerRunId },
      data: { status: 'FAILED', errorMessage: `Apify run ${runStatus.status}`, finishedAt: new Date() },
    })
    await db.businessSource.update({
      where: { id: payload.sourceId },
      data: { errorMessage: `Apify run ended with status ${runStatus.status}`, errorCount: { increment: 1 } },
    })
    return { failed: true, status: runStatus.status }
  }

  // SUCCEEDED — fetch and ingest dataset items
  const rawItems = await client.getDatasetItems(payload.datasetId, payload.maxItems)
  const actorKey = payload.actorKey as ActorKey

  let collected = 0
  const newMentionIds: string[] = []

  const cutoff = payload.lastSuccessfulScanAt ? new Date(payload.lastSuccessfulScanAt) : null

  for (const raw of rawItems) {
    const normalized = normalizeApifyItem(actorKey, raw)
    if (!normalized) continue

    // Early-stop for incremental scans: actors sort newest-first, so once we see
    // an item older than the last successful scan we can skip everything after it.
    if (
      payload.freshnessMode === 'since_last_scan' &&
      cutoff &&
      normalized.publishedAt &&
      normalized.publishedAt < cutoff
    ) {
      break
    }

    const text = normalized.text
    const textHash = hashText(text)

    const dbSourceType = normalized.sourceType.toUpperCase() as SourceType

    // Deduplicate by externalId
    const existing = await db.mention.findFirst({
      where: {
        businessId: payload.businessId,
        sourceType: dbSourceType,
        externalId: normalized.externalId,
      },
    })
    if (existing) continue

    // Deduplicate by text hash
    const duplicate = await db.mention.findFirst({
      where: { businessId: payload.businessId, textHash },
    })
    if (duplicate) continue

    const isSpam = isSpamText(text)

    const rawItem = await db.rawItem.upsert({
      where: { sourceId_externalId: { sourceId: payload.sourceId, externalId: normalized.externalId } },
      create: {
        sourceId: payload.sourceId,
        externalId: normalized.externalId,
        rawJson: normalized.rawJson as object,
        checksum: textHash,
        collectedAt: normalized.publishedAt ?? new Date(),
      },
      update: {},
    })

    const mention = await db.mention.create({
      data: {
        businessId: payload.businessId,
        sourceId: payload.sourceId,
        rawItemId: rawItem.id,
        externalId: normalized.externalId,
        sourceType: dbSourceType,
        authorName: normalized.authorName,
        authorId: normalized.authorId,
        text,
        textHash,
        rating: normalized.rating,
        url: normalized.url,
        publishedAt: normalized.publishedAt,
        isSpam,
      },
    })

    newMentionIds.push(mention.id)
    collected++
  }

  await db.providerRun.update({
    where: { id: payload.providerRunId },
    data: { status: 'SUCCEEDED', collectedItems: collected, finishedAt: new Date() },
  })

  await db.businessSource.update({
    where: { id: payload.sourceId },
    data: {
      lastScannedAt: new Date(),
      lastSuccessfulScanAt: new Date(),
      nextScanAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      totalItemsCollected: { increment: collected },
      errorCount: 0,
      errorMessage: null,
    },
  })

  const apifyCostCents = estimateApifyCostCents(actorKey, collected)
  await recordScanUsage(db, payload.organizationId, new Date(payload.periodStart), {
    signals: collected,
    apifyCostCents,
  })

  // Queue batch classification for new mentions
  if (newMentionIds.length > 0) {
    const queue = getQueue('analysis', connection)
    const BATCH_SIZE = 50
    for (let i = 0; i < newMentionIds.length; i += BATCH_SIZE) {
      await queue.add('classify-mentions-batch', {
        mentionIds: newMentionIds.slice(i, i + BATCH_SIZE),
        businessId: payload.businessId,
      })
    }
  }

  return { collected, newMentions: newMentionIds.length }
}

// ── Legacy connector scan path ────────────────────────────────────────────────

async function scanSourceViaConnector(
  db: PrismaClient,
  source: {
    id: string
    type: string
    accessTokenEncrypted: string | null
    refreshTokenEncrypted: string | null
    externalId: string | null
    metadata: unknown
    cursor: string | null
    errorCount: number | null
    status: string
    business: { id: string; organizationId: string }
  },
  payload: ScanSourcePayload,
  job: Job,
) {
  const connector = connectorRegistry.get(source.type.toLowerCase() as Parameters<typeof connectorRegistry.get>[0])
  if (!connector) {
    await db.businessSource.update({
      where: { id: source.id },
      data: { errorMessage: `No connector for type ${source.type}`, status: 'ERROR' },
    })
    return { error: 'No connector' }
  }

  const credentials = {
    accessToken: source.accessTokenEncrypted ? (decrypt(source.accessTokenEncrypted) ?? undefined) : undefined,
    refreshToken: source.refreshTokenEncrypted ? (decrypt(source.refreshTokenEncrypted) ?? undefined) : undefined,
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

        const normalized = await connector.normalize(item)
        for (const mention of normalized) {
          if (!mention.text?.trim()) continue

          const textHash = hashText(mention.text)
          const isSpam = isSpamText(mention.text)

          const existingMention = await db.mention.findFirst({
            where: {
              businessId: payload.businessId,
              sourceType: mention.sourceType.toUpperCase() as SourceType,
              externalId: mention.externalId,
            },
          })
          if (existingMention) continue

          await db.mention.create({
            data: {
              businessId: payload.businessId,
              sourceId: source.id,
              rawItemId: raw.id,
              externalId: mention.externalId,
              sourceType: mention.sourceType.toUpperCase() as SourceType,
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
      data: { status: 'COMPLETED', itemsCollected: totalCollected, completedAt: new Date() },
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

// ── normalize-raw-item (legacy, on-demand) ────────────────────────────────────

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
          sourceType: mention.sourceType.toUpperCase() as SourceType,
          externalId: mention.externalId,
        },
      },
      create: {
        businessId: payload.businessId,
        sourceId: payload.sourceId,
        rawItemId: raw.id,
        externalId: mention.externalId,
        sourceType: mention.sourceType.toUpperCase() as SourceType,
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

  await db.rawItem.update({ where: { id: raw.id }, data: { processedAt: new Date() } })

  return { normalized: normalized.length }
}
