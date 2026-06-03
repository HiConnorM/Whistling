'use client'

import { useState } from 'react'
import { CheckCircle, ChevronRight, Clock, X, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Recommendation {
  id: string
  title: string
  category: string
  priority: string
  why: string
  difficulty: string
  suggestedTimeline?: string
}

const PRIORITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-600',
}

const DIFFICULTY_DOTS: Record<string, number> = {
  easy: 1, medium: 2, hard: 3,
}

export function RecommendationsPanel({ recommendations }: { recommendations: Recommendation[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<string | null>(null)

  const visible = recommendations.filter((r) => !dismissed.has(r.id))

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Recommended Actions</h3>
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {visible.length}
        </span>
      </div>

      {visible.length === 0 && (
        <div className="py-8 text-center text-sm text-gray-500">
          No pending recommendations. Your business is on track.
        </div>
      )}

      <div className="space-y-3">
        {visible.map((rec) => (
          <div
            key={rec.id}
            className={cn(
              'rounded-lg border transition-colors',
              expanded === rec.id ? 'border-gray-300 bg-gray-50' : 'border-gray-200 bg-white',
            )}
          >
            <button
              className="flex w-full items-start gap-3 p-4 text-left"
              onClick={() => setExpanded(expanded === rec.id ? null : rec.id)}
            >
              <div className="mt-0.5 flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'rounded px-1.5 py-0.5 text-xs font-semibold uppercase',
                    PRIORITY_STYLES[rec.priority] ?? PRIORITY_STYLES['medium'],
                  )}
                >
                  {rec.priority}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{rec.title}</div>
                <div className="mt-0.5 text-xs text-gray-500 capitalize">
                  {rec.category} ·{' '}
                  <span className="inline-flex gap-0.5">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <span
                        key={i}
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          i < (DIFFICULTY_DOTS[rec.difficulty] ?? 2) ? 'bg-gray-400' : 'bg-gray-200',
                        )}
                      />
                    ))}
                  </span>{' '}
                  {rec.difficulty}
                </div>
              </div>
              <ChevronRight
                className={cn(
                  'h-4 w-4 text-gray-400 transition-transform',
                  expanded === rec.id && 'rotate-90',
                )}
              />
            </button>

            {expanded === rec.id && (
              <div className="border-t border-gray-200 px-4 pb-4 pt-3">
                <p className="mb-3 text-sm leading-relaxed text-gray-700">{rec.why}</p>
                {rec.suggestedTimeline && (
                  <div className="mb-3 flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    Timeline: {rec.suggestedTimeline}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setDismissed((prev) => new Set([...prev, rec.id]))}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Dismiss
                  </button>
                  <button className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Mark accepted
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
