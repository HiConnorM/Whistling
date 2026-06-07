import { Worker, type ConnectionOptions } from 'bullmq'
import type { PrismaClient } from '@whistling/db'
import { classifyMentionsBatch } from '@whistling/ai'
import { getUnclassifiedMentions } from '@whistling/db'
import type { ClassifyMentionsBatchPayload } from '@whistling/jobs'
import { recordAiUsage } from '../services/enforcement.js'

export function startAnalysisWorker(
  db: PrismaClient,
  connection: ConnectionOptions,
  concurrency: number,
) {
  const worker = new Worker(
    'analysis',
    async (job) => {
      switch (job.name) {
        case 'classify-mentions-batch':
          return classifyBatch(db, job.data as ClassifyMentionsBatchPayload)
        case 'classify-pending':
          return classifyPending(db, job.data as { businessId: string })
        default:
          throw new Error(`Unknown job: ${job.name}`)
      }
    },
    { connection, concurrency },
  )

  worker.on('failed', (job, err) => {
    console.error(`[analysis] Job ${job?.id} (${job?.name}) failed:`, err.message)
  })

  return worker
}

async function classifyBatch(
  db: PrismaClient,
  payload: ClassifyMentionsBatchPayload,
) {
  const mentions = await db.mention.findMany({
    where: {
      id: { in: payload.mentionIds },
      isSpam: false,
      analysis: null,
    },
    include: { business: { select: { category: true, organizationId: true } } },
  })

  if (mentions.length === 0) return { classified: 0 }

  const business = mentions[0]?.business
  const category = business?.category.toLowerCase().replace('_', ' ')
  const organizationId = business?.organizationId

  // Skip AI if subscription is inactive — respect hard stop rule
  if (organizationId) {
    const sub = await db.subscription.findUnique({
      where: { organizationId },
      select: { status: true, currentPeriodStart: true },
    })
    if (sub?.status === 'PAST_DUE' || sub?.status === 'CANCELED') {
      return { classified: 0, skipped: true, reason: `subscription ${sub.status}` }
    }
    // Check hard stop
    if (sub?.currentPeriodStart) {
      const ledger = await db.usageLedger.findUnique({
        where: { organizationId_periodStart: { organizationId, periodStart: sub.currentPeriodStart } },
      })
      if (ledger && ledger.estimatedTotalCostCents >= ledger.hardStopCents) {
        return { classified: 0, skipped: true, reason: 'hard_stop_reached' }
      }
    }
  }

  const toClassify = mentions.map((m) => ({
    id: m.id,
    text: m.text,
    rating: m.rating ?? null,
  }))

  const { results, totalInputTokens, totalOutputTokens } =
    await classifyMentionsBatch(toClassify, category)

  let classified = 0
  for (const [mentionId, analysis] of results.entries()) {
    await db.mentionAnalysis.upsert({
      where: { mentionId },
      create: {
        mentionId,
        sentiment: analysis.sentiment.toUpperCase() as Parameters<typeof db.mentionAnalysis.upsert>[0]['create']['sentiment'],
        sentimentScore: analysis.sentimentScore,
        topics: analysis.topics,
        complaintTypes: analysis.complaintTypes,
        praiseTypes: analysis.praiseTypes,
        severity: analysis.severity,
        urgency: analysis.urgency,
        actionability: analysis.actionability,
        businessArea: analysis.businessArea,
        summary: analysis.summary,
        isSpam: analysis.isSpam,
        containsPII: analysis.containsPII,
        modelVersion: `${MODELS_VERSION}-${new Date().toISOString().slice(0, 7)}`,
      },
      update: {},
    })

    if (analysis.isSpam) {
      await db.mention.update({ where: { id: mentionId }, data: { isSpam: true } })
    }

    classified++
  }

  // Record token costs against the org's usage ledger
  if (organizationId && (totalInputTokens > 0 || totalOutputTokens > 0)) {
    const sub = await db.subscription.findUnique({
      where: { organizationId },
      select: { currentPeriodStart: true },
    })
    if (sub?.currentPeriodStart) {
      await recordAiUsage(db, organizationId, sub.currentPeriodStart, {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        eventType: 'ai_classify',
        batch: true,
      })
    }
  }

  return { classified }
}

async function classifyPending(db: PrismaClient, payload: { businessId: string }) {
  const mentions = await getUnclassifiedMentions(db, 50)
  if (mentions.length === 0) return { classified: 0 }

  const business = await db.business.findUnique({
    where: { id: payload.businessId },
    select: { category: true, organizationId: true },
  })

  const category = business?.category.toLowerCase().replace('_', ' ')
  const organizationId = business?.organizationId

  const toClassify = mentions.map((m) => ({
    id: m.id,
    text: m.text,
    rating: m.rating ?? null,
  }))

  const { results, totalInputTokens, totalOutputTokens } =
    await classifyMentionsBatch(toClassify, category)

  let classified = 0
  for (const [mentionId, analysis] of results.entries()) {
    await db.mentionAnalysis.upsert({
      where: { mentionId },
      create: {
        mentionId,
        sentiment: analysis.sentiment.toUpperCase() as Parameters<typeof db.mentionAnalysis.upsert>[0]['create']['sentiment'],
        sentimentScore: analysis.sentimentScore,
        topics: analysis.topics,
        complaintTypes: analysis.complaintTypes,
        praiseTypes: analysis.praiseTypes,
        severity: analysis.severity,
        urgency: analysis.urgency,
        actionability: analysis.actionability,
        businessArea: analysis.businessArea,
        summary: analysis.summary,
        isSpam: analysis.isSpam,
        containsPII: analysis.containsPII,
        modelVersion: `${MODELS_VERSION}-${new Date().toISOString().slice(0, 7)}`,
      },
      update: {},
    })
    classified++
  }

  if (organizationId && (totalInputTokens > 0 || totalOutputTokens > 0)) {
    const sub = await db.subscription.findUnique({
      where: { organizationId },
      select: { currentPeriodStart: true },
    })
    if (sub?.currentPeriodStart) {
      await recordAiUsage(db, organizationId, sub.currentPeriodStart, {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        eventType: 'ai_classify',
        batch: true,
      })
    }
  }

  return { classified }
}

const MODELS_VERSION = process.env['OPENAI_CLASSIFICATION_MODEL'] ?? 'gpt-4o-mini'
