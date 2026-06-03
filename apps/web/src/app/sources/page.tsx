import type { Metadata } from 'next'
import { AlertCircle, CheckCircle2, Clock, ExternalLink, Plus, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Data Sources' }

const SOURCES = [
  { id: '1', type: 'Google Business Profile', icon: '⭐', status: 'connected', lastScanned: '2 hours ago', itemsCollected: 847, errorMessage: null },
  { id: '2', type: 'Instagram', icon: '📷', status: 'connected', lastScanned: '3 hours ago', itemsCollected: 412, errorMessage: null },
  { id: '3', type: 'Facebook', icon: '👍', status: 'connected', lastScanned: '3 hours ago', itemsCollected: 198, errorMessage: null },
  { id: '4', type: 'CSV Import', icon: '📄', status: 'connected', lastScanned: 'Yesterday', itemsCollected: 124, errorMessage: null },
  { id: '5', type: 'Yelp', icon: '🌟', status: 'needs_setup', lastScanned: null, itemsCollected: 0, errorMessage: null },
  { id: '6', type: 'TripAdvisor', icon: '🧭', status: 'needs_setup', lastScanned: null, itemsCollected: 0, errorMessage: null },
  { id: '7', type: 'YouTube', icon: '▶️', status: 'needs_setup', lastScanned: null, itemsCollected: 0, errorMessage: null },
]

const STATUS_CONFIG = {
  connected: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Connected' },
  needs_setup: { icon: Plus, color: 'text-gray-400', bg: 'bg-gray-50', label: 'Not connected' },
  error: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Error' },
  paused: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Paused' },
}

export default function SourcesPage() {
  const connectedCount = SOURCES.filter((s) => s.status === 'connected').length

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Data Sources</h1>
        <p className="mt-1 text-sm text-gray-500">
          {connectedCount} of {SOURCES.length} sources connected
        </p>
      </div>

      {/* CSV upload */}
      <div className="mb-6 rounded-xl border-2 border-dashed border-gray-300 p-6 text-center hover:border-gray-400">
        <div className="text-3xl mb-2">📤</div>
        <h3 className="text-sm font-semibold text-gray-900">Upload a CSV</h3>
        <p className="mt-1 text-xs text-gray-500">
          Import reviews from Google, Yelp, TripAdvisor, or any platform that lets you export CSV files.
        </p>
        <button className="mt-3 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Choose file
        </button>
      </div>

      {/* Sources list */}
      <div className="rounded-xl border border-gray-200 bg-white">
        {SOURCES.map((source, i) => {
          const config = STATUS_CONFIG[source.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.needs_setup
          const Icon = config.icon

          return (
            <div
              key={source.id}
              className={cn(
                'flex items-center justify-between p-5',
                i > 0 && 'border-t border-gray-100',
              )}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{source.icon}</span>
                <div>
                  <div className="text-sm font-medium text-gray-900">{source.type}</div>
                  {source.lastScanned && (
                    <div className="mt-0.5 text-xs text-gray-500">
                      Last scanned: {source.lastScanned} · {source.itemsCollected.toLocaleString()} items
                    </div>
                  )}
                  {source.errorMessage && (
                    <div className="mt-0.5 text-xs text-red-600">{source.errorMessage}</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', config.bg, config.color)}>
                  <Icon className="h-3.5 w-3.5" />
                  {config.label}
                </div>

                {source.status === 'connected' && (
                  <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                )}

                {source.status === 'needs_setup' && (
                  <button className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Connect
                  </button>
                )}

                {source.status === 'error' && (
                  <button className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
                    Reconnect
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
