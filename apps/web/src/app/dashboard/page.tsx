import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2, Plug, Sparkles } from 'lucide-react'
import { db } from '@whistling/db'
import { getSession } from '@/lib/session'
import { apiProxy, mintApiToken } from '@/lib/api-proxy'
import { PulseScoreCard } from '@/components/dashboard/PulseScoreCard'
import { KeyInsightCards } from '@/components/dashboard/KeyInsightCards'
import { TopComplaintsCard } from '@/components/dashboard/TopComplaintsCard'
import { TopPraisesCard } from '@/components/dashboard/TopPraisesCard'
import { RecommendationsPanel } from '@/components/dashboard/RecommendationsPanel'
import { SourceHealthPanel } from '@/components/dashboard/SourceHealthPanel'
import { PulseHistoryChart } from '@/components/dashboard/PulseHistoryChart'
import { RunScanButton } from '@/components/dashboard/RunScanButton'
import { ScanAutoRefresh } from '@/components/dashboard/ScanAutoRefresh'

export const metadata: Metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

// ─── API response shape (apps/api/src/routes/dashboard.ts) ───────────────────

type ScanState =
  | 'no_sources'
  | 'needs_connection'
  | 'sources_connected'
  | 'scanning'
  | 'analysis_pending'
  | 'scan_failed'
  | 'ready'

interface DashboardData {
  business: { id: string; name: string }
  pulseScore: { total: number } | null
  pulseHistory: Array<{ total: number; calculatedAt: string }>
  stats: {
    current: { total: number } | null
    previous: { total: number } | null
  }
  topTopics: Array<{
    id: string
    label: string
    sentiment: string
    mentionCount: number
    changePercent: number
  }>
  latestReport: { biggestWin: string | null; biggestRisk: string | null; bestAction: string | null } | null
  recommendations: Array<{
    id: string
    title: string
    category: string
    priority: string
    why: string
    difficulty: string
    suggestedTimeline: string | null
  }>
  sourceHealth: Array<{
    id: string
    type: string
    status: string
    lastScannedAt: string | null
    totalItemsCollected: number
    errorMessage: string | null
  }>
  scanState: ScanState
  recentProviderRuns: Array<{ id: string; actorId: string; status: string }>
  usage: {
    signalsUsed: number
    signalsLimit: number
    estimatedCostCents: number
    hardStopCents: number
  } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const SOURCE_LABELS: Record<string, string> = {
  GOOGLE: 'Google', YELP: 'Yelp', TRIPADVISOR: 'TripAdvisor', FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram', TIKTOK: 'TikTok', CSV: 'CSV Import', MANUAL: 'Manual',
}

const DISCOVERY_ACTOR_HINTS = ['facebook-posts-scraper', 'instagram-post-scraper', 'clockworks/tiktok-scraper']

function scanBanner(data: DashboardData): { icon: 'ok' | 'spin' | 'warn' | 'plug'; text: string } | null {
  const activeRun = data.recentProviderRuns.find((r) => r.status === 'RUNNING' || r.status === 'PENDING')
  const discovering = activeRun && DISCOVERY_ACTOR_HINTS.some((h) => activeRun.actorId.includes(h))

  switch (data.scanState) {
    case 'no_sources':
      return { icon: 'plug', text: 'No sources connected yet. Connect a review or social source to start collecting customer signals.' }
    case 'needs_connection':
      return { icon: 'warn', text: 'Your sources need attention — reconnect or fix the source URL to resume scanning.' }
    case 'sources_connected':
      return { icon: 'ok', text: 'Source connected. Ready to scan.' }
    case 'scanning':
      return { icon: 'spin', text: discovering ? 'Discovering recent posts…' : 'Scanning latest reviews…' }
    case 'analysis_pending':
      return { icon: 'spin', text: 'Analyzing comments…' }
    case 'scan_failed':
      return { icon: 'warn', text: 'Scan failed: edit the source URL or retry.' }
    case 'ready':
      return { icon: 'ok', text: `Ready: ${data.stats.current?.total ?? 0} customer signals found this week.` }
    default:
      return null
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/auth/sign-in')

  const membership = await db.orgMembership.findFirst({
    where: { userId: session.user.id },
    select: { organizationId: true },
  })
  if (!membership) redirect('/onboarding')

  const businesses = await db.business.findMany({
    where: { organizationId: membership.organizationId, isActive: true },
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  })
  if (businesses.length === 0) redirect('/onboarding')

  const { businessId: requestedId } = await searchParams
  const businessId = businesses.find((b) => b.id === requestedId)?.id ?? businesses[0]!.id

  const auth = {
    userId: session.user.id,
    organizationId: membership.organizationId,
    token: mintApiToken({ userId: session.user.id, organizationId: membership.organizationId }),
  }

  let data: DashboardData
  try {
    data = await apiProxy<DashboardData>(`/api/dashboard/${businessId}`, { auth })
  } catch {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          The Whistling API isn&apos;t reachable. Start it with <code className="rounded bg-amber-100 px-1">pnpm dev</code>{' '}
          (it runs on port 3001), then reload this page.
        </div>
      </div>
    )
  }

  const banner = scanBanner(data)
  const isBusy = data.scanState === 'scanning' || data.scanState === 'analysis_pending'

  const complaints = data.topTopics
    .filter((t) => t.sentiment === 'NEGATIVE' || t.sentiment === 'MIXED')
    .slice(0, 5)
    .map((t) => ({ topic: t.label, count: t.mentionCount, change: Math.round(t.changePercent) }))

  const praises = data.topTopics
    .filter((t) => t.sentiment === 'POSITIVE')
    .slice(0, 5)
    .map((t) => ({ topic: t.label, count: t.mentionCount, change: Math.round(t.changePercent) }))

  const recommendations = data.recommendations.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category.toLowerCase(),
    priority: r.priority.toLowerCase(),
    why: r.why,
    difficulty: r.difficulty.toLowerCase(),
    suggestedTimeline: r.suggestedTimeline ?? undefined,
  }))

  const sources = data.sourceHealth.map((s) => ({
    type: SOURCE_LABELS[s.type] ?? s.type,
    status: (s.status === 'CONNECTED' ? 'connected'
      : s.status === 'ERROR' ? 'error'
      : s.status === 'PAUSED' ? 'paused'
      : 'needs_setup') as 'connected' | 'error' | 'paused' | 'needs_setup',
    lastScanned: timeAgo(s.lastScannedAt),
    count: s.totalItemsCollected,
  }))

  const history = data.pulseHistory.map((p) => ({
    date: new Date(p.calculatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: p.total,
  }))

  const hasInsights = data.scanState === 'ready' || (data.stats.current?.total ?? 0) > 0

  return (
    <div className="p-8">
      <ScanAutoRefresh active={isBusy} />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{data.business.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Week of {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <RunScanButton businessId={businessId} disabled={data.scanState === 'no_sources' || isBusy} />
      </div>

      {banner && (
        <div
          className={
            banner.icon === 'warn'
              ? 'mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700'
              : 'mb-6 flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-700'
          }
        >
          {banner.icon === 'spin' && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
          {banner.icon === 'ok' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
          {banner.icon === 'warn' && <AlertCircle className="h-4 w-4 text-red-600" />}
          {banner.icon === 'plug' && <Plug className="h-4 w-4 text-gray-500" />}
          <span>{banner.text}</span>
          {data.scanState === 'no_sources' && (
            <a href="/sources" className="ml-auto rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800">
              Connect a source
            </a>
          )}
          {data.scanState === 'scan_failed' && (
            <a href="/sources" className="ml-auto rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100">
              Review sources
            </a>
          )}
        </div>
      )}

      <div className="space-y-6">
        {/* Top row: Pulse + insight cards */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {data.pulseScore ? (
            <PulseScoreCard
              score={data.pulseScore.total}
              previous={data.pulseHistory.length > 1 ? data.pulseHistory[data.pulseHistory.length - 2]?.total : undefined}
            />
          ) : (
            <EmptyCard title="Pulse Score" body="Appears after your first scan is analyzed." />
          )}
          <div className="col-span-3">
            {data.latestReport?.biggestWin ? (
              <KeyInsightCards
                biggestWin={data.latestReport.biggestWin}
                biggestRisk={data.latestReport.biggestRisk ?? ''}
                bestAction={data.latestReport.bestAction ?? ''}
              />
            ) : (
              <EmptyCard
                title="Key insights"
                body={hasInsights
                  ? 'Your weekly report is being prepared — wins, risks, and the best next action will appear here.'
                  : 'After your first scan, your biggest win, biggest risk, and best action appear here.'}
              />
            )}
          </div>
        </div>

        {history.length > 1 && <PulseHistoryChart data={history} />}

        {/* Topics */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {complaints.length > 0 ? (
            <TopComplaintsCard complaints={complaints} />
          ) : (
            <EmptyCard title="Top complaints" body="No complaint topics detected yet." />
          )}
          {praises.length > 0 ? (
            <TopPraisesCard praises={praises} />
          ) : (
            <EmptyCard title="Top praises" body="No praise topics detected yet." />
          )}
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="col-span-2">
            {recommendations.length > 0 ? (
              <RecommendationsPanel recommendations={recommendations} />
            ) : (
              <EmptyCard
                title="Recommendations"
                body="Once enough customer signals are analyzed, prioritized recommendations show up here."
              />
            )}
          </div>
          <div className="space-y-4">
            <SourceHealthPanel sources={sources} />
            {data.usage && (
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                  <Sparkles className="h-4 w-4 text-gray-400" /> Usage this period
                </h3>
                <div className="text-sm text-gray-600">
                  {data.usage.signalsUsed.toLocaleString()} / {data.usage.signalsLimit.toLocaleString()} signals
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gray-900"
                    style={{ width: `${Math.min(100, (data.usage.signalsUsed / Math.max(1, data.usage.signalsLimit)) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full min-h-[120px] flex-col justify-center rounded-xl border border-dashed border-gray-300 bg-white p-6">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{body}</p>
    </div>
  )
}
