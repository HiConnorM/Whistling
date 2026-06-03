import { Worker, type ConnectionOptions } from 'bullmq'
import type { PrismaClient } from '@whistling/db'
import { sendWeeklyBrief } from '@whistling/email'
import type { SendNewsletterPayload } from '@whistling/jobs'

export function startNotificationWorker(
  db: PrismaClient,
  connection: ConnectionOptions,
  concurrency: number,
) {
  const worker = new Worker(
    'notifications',
    async (job) => {
      if (job.name === 'send-newsletter') {
        return sendNewsletter(db, job.data as SendNewsletterPayload)
      }
      throw new Error(`Unknown job: ${job.name}`)
    },
    { connection, concurrency },
  )

  worker.on('failed', (job, err) => {
    console.error(`[notifications] Job ${job?.id} failed:`, err.message)
  })

  return worker
}

async function sendNewsletter(db: PrismaClient, payload: SendNewsletterPayload) {
  const report = await db.report.findUnique({
    where: { id: payload.reportId },
    include: {
      business: { select: { name: true } },
      recommendations: {
        where: { status: { in: ['NEW', 'ACCEPTED'] } },
        orderBy: { priority: 'asc' },
        take: 5,
      },
    },
  })

  if (!report || report.status !== 'READY') {
    return { skipped: true, reason: 'Report not ready' }
  }

  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://whistling.io'

  await sendWeeklyBrief(payload.recipientEmail, {
    businessName: report.business.name,
    periodLabel: `${report.periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${report.periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    pulseScore: report.pulseScore ?? 0,
    pulsePrevious: report.pulsePrevious ?? undefined,
    biggestWin: report.biggestWin ?? 'See your dashboard for this week\'s wins.',
    biggestRisk: report.biggestRisk ?? 'No major risks detected this week.',
    bestAction: report.bestAction ?? 'Continue monitoring customer feedback.',
    topComplaints: (report.topComplaints as Array<{ topic: string; count: number; change?: number }>) ?? [],
    topPraises: (report.topPraises as Array<{ topic: string; count: number }>) ?? [],
    customerRequests: (report.customerRequests as Array<{ request: string; count: number }>) ?? [],
    competitorHighlight: undefined,
    recommendedActions: report.recommendations.map((r) => ({
      title: r.title,
      category: r.category.toLowerCase(),
      priority: r.priority.toLowerCase(),
    })),
    dashboardUrl: `${appUrl}/dashboard`,
    reportUrl: `${appUrl}/reports/${report.id}`,
    unsubscribeUrl: `${appUrl}/unsubscribe?org=${payload.organizationId}`,
  })

  await db.report.update({
    where: { id: payload.reportId },
    data: { emailSentAt: new Date(), status: 'SENT' },
  })

  return { sent: true }
}
