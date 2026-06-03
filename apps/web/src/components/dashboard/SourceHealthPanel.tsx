import { AlertCircle, CheckCircle2, Clock, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Source {
  type: string
  status: 'connected' | 'needs_setup' | 'error' | 'paused'
  lastScanned: string | null
  count: number
}

const STATUS_CONFIG = {
  connected: { icon: CheckCircle2, color: 'text-green-500', label: 'Connected' },
  needs_setup: { icon: Plus, color: 'text-gray-400', label: 'Not connected' },
  error: { icon: AlertCircle, color: 'text-red-500', label: 'Error' },
  paused: { icon: Clock, color: 'text-amber-500', label: 'Paused' },
}

export function SourceHealthPanel({ sources }: { sources: Source[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="mb-4 font-semibold text-gray-900">Data Sources</h3>
      <div className="space-y-3">
        {sources.map((source) => {
          const config = STATUS_CONFIG[source.status]
          const Icon = config.icon

          return (
            <div key={source.type} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={cn('h-4 w-4', config.color)} />
                <span className="text-sm text-gray-800">{source.type}</span>
              </div>
              <div className="text-right">
                {source.status === 'connected' ? (
                  <div className="text-xs text-gray-500">
                    {source.count.toLocaleString()} items
                    {source.lastScanned && <span> · {source.lastScanned}</span>}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">{config.label}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <button className="mt-4 w-full rounded-lg border border-dashed border-gray-300 py-2 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700">
        + Connect a source
      </button>
    </div>
  )
}
