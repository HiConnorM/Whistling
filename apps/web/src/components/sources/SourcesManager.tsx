'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Link2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SourceRow {
  id: string
  type: string // uppercase Prisma enum value
  url: string | null
  status: string
  lastScannedAt: string | null
  totalItemsCollected: number
  errorMessage: string | null
  metadata: { mediaType?: string; ingestionPlan?: string } | null
}

interface SourceCardDef {
  key: string
  type: string // lowercase API source type
  mediaType: 'review' | 'comment'
  label: string
  icon: string
  hint: string
  placeholder: string
  /** Normalize user input into a URL the API accepts. */
  normalize?: (input: string) => string
}

const SOURCE_CARDS: SourceCardDef[] = [
  {
    key: 'google-review', type: 'google', mediaType: 'review',
    label: 'Google Reviews', icon: '⭐',
    hint: 'Paste your Google Maps business URL',
    placeholder: 'https://www.google.com/maps/place/Your+Business/...',
  },
  {
    key: 'yelp-review', type: 'yelp', mediaType: 'review',
    label: 'Yelp Reviews', icon: '🌟',
    hint: 'Paste your Yelp business URL',
    placeholder: 'https://www.yelp.com/biz/your-business',
  },
  {
    key: 'tripadvisor-review', type: 'tripadvisor', mediaType: 'review',
    label: 'TripAdvisor Reviews', icon: '🧭',
    hint: 'Paste your TripAdvisor listing URL',
    placeholder: 'https://www.tripadvisor.com/Restaurant_Review-...',
  },
  {
    key: 'facebook-review', type: 'facebook', mediaType: 'review',
    label: 'Facebook Reviews', icon: '👍',
    hint: 'Paste your Facebook Page reviews URL',
    placeholder: 'https://www.facebook.com/yourbusiness/reviews',
  },
  {
    key: 'facebook-comment', type: 'facebook', mediaType: 'comment',
    label: 'Facebook Comments', icon: '💬',
    hint: 'Paste your Facebook Page URL — we find recent posts and pull their comments',
    placeholder: 'https://www.facebook.com/yourbusiness',
  },
  {
    key: 'instagram-comment', type: 'instagram', mediaType: 'comment',
    label: 'Instagram Comments', icon: '📷',
    hint: 'Paste your Instagram profile URL — we find recent posts and pull their comments',
    placeholder: 'https://www.instagram.com/yourbusiness/',
  },
  {
    key: 'tiktok-comment', type: 'tiktok', mediaType: 'comment',
    label: 'TikTok Comments', icon: '🎵',
    hint: 'Paste your TikTok profile URL or @username — we find recent videos and pull their comments',
    placeholder: 'https://www.tiktok.com/@yourbusiness or @yourbusiness',
    normalize: (input) => {
      const v = input.trim()
      if (/^https?:\/\//i.test(v)) return v
      return `https://www.tiktok.com/@${v.replace(/^@/, '')}`
    },
  },
]

// ─── Matching connected sources to cards ─────────────────────────────────────

function sourceForCard(card: SourceCardDef, sources: SourceRow[]): SourceRow | undefined {
  return sources.find((s) => {
    if (s.type.toLowerCase() !== card.type) return false
    const mediaType = s.metadata?.mediaType ?? 'review'
    return mediaType === card.mediaType
  })
}

function timeAgo(iso: string | null): string | null {
  if (!iso) return null
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SourcesManager({
  businessId,
  initialSources,
}: {
  businessId: string
  initialSources: SourceRow[]
}) {
  const router = useRouter()
  const [sources, setSources] = useState<SourceRow[]>(initialSources)
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [scanned, setScanned] = useState<Set<string>>(new Set())

  const setError = (key: string, message: string | null) =>
    setErrors((prev) => {
      const next = { ...prev }
      if (message) next[key] = message
      else delete next[key]
      return next
    })

  const connect = async (card: SourceCardDef) => {
    const raw = inputs[card.key]?.trim()
    if (!raw) return
    const url = card.normalize ? card.normalize(raw) : raw

    setBusy(card.key)
    setError(card.key, null)
    try {
      const res = await fetch(`/api/businesses/${businessId}/sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: card.type, mediaType: card.mediaType, url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to connect source')
      setSources((prev) => [...prev, data as SourceRow])
      setInputs((prev) => ({ ...prev, [card.key]: '' }))
      router.refresh()
    } catch (err) {
      setError(card.key, err instanceof Error ? err.message : 'Failed to connect source')
    } finally {
      setBusy(null)
    }
  }

  const scan = async (card: SourceCardDef, source: SourceRow) => {
    setBusy(card.key)
    setError(card.key, null)
    try {
      const res = await fetch(`/api/sources/${source.id}/scan`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to queue scan')
      setScanned((prev) => new Set(prev).add(card.key))
      router.refresh()
    } catch (err) {
      setError(card.key, err instanceof Error ? err.message : 'Failed to queue scan')
    } finally {
      setBusy(null)
    }
  }

  const connectedCount = SOURCE_CARDS.filter((c) => sourceForCard(c, sources)).length

  return (
    <div>
      <p className="mb-6 text-sm text-gray-500">
        {connectedCount} of {SOURCE_CARDS.length} sources connected
      </p>

      <div className="space-y-3">
        {SOURCE_CARDS.map((card) => {
          const source = sourceForCard(card, sources)
          const isBusy = busy === card.key
          const error = errors[card.key] ?? source?.errorMessage
          const wasScanned = scanned.has(card.key)

          return (
            <div key={card.key} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{card.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{card.label}</div>
                    <div className="text-xs text-gray-500">
                      {source
                        ? [
                            source.lastScannedAt
                              ? `Last scanned ${timeAgo(source.lastScannedAt)}`
                              : wasScanned
                                ? 'Scan queued — results arrive in a few minutes'
                                : 'Connected. Ready to scan.',
                            source.totalItemsCollected > 0
                              ? `${source.totalItemsCollected.toLocaleString()} items`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        : card.hint}
                    </div>
                  </div>
                </div>

                {source ? (
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={cn(
                        'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                        source.status === 'ERROR'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-green-50 text-green-600',
                      )}
                    >
                      {source.status === 'ERROR' ? (
                        <AlertCircle className="h-3.5 w-3.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      {source.status === 'ERROR' ? 'Error' : 'Connected'}
                    </span>
                    <button
                      onClick={() => scan(card, source)}
                      disabled={isBusy}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      <RefreshCw className={cn('h-3.5 w-3.5', isBusy && 'animate-spin')} />
                      Scan now
                    </button>
                  </div>
                ) : null}
              </div>

              {!source && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    placeholder={card.placeholder}
                    value={inputs[card.key] ?? ''}
                    onChange={(e) => setInputs((prev) => ({ ...prev, [card.key]: e.target.value }))}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
                  />
                  <button
                    onClick={() => connect(card)}
                    disabled={isBusy || !inputs[card.key]?.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    {isBusy ? 'Connecting…' : 'Connect'}
                  </button>
                </div>
              )}

              {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
            </div>
          )
        })}
      </div>

      <div className="mt-6 rounded-xl border-2 border-dashed border-gray-300 p-6 text-center">
        <div className="mb-2 text-3xl">📤</div>
        <h3 className="text-sm font-semibold text-gray-900">CSV import</h3>
        <p className="mt-1 text-xs text-gray-500">
          Import reviews exported from any platform. Coming later in the beta.
        </p>
      </div>
    </div>
  )
}
