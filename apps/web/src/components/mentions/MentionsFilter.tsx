'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

const SENTIMENTS = ['All', 'Positive', 'Neutral', 'Negative', 'Mixed']
const SOURCES = ['All', 'Google', 'Instagram', 'Facebook', 'CSV', 'Yelp']
const RATINGS = ['All', '5 stars', '4 stars', '3 stars', '2 stars', '1 star']

export function MentionsFilter() {
  const [sentiment, setSentiment] = useState('All')
  const [source, setSource] = useState('All')
  const [rating, setRating] = useState('All')
  const [isCompetitor, setIsCompetitor] = useState<boolean | null>(null)

  return (
    <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-4">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Sentiment</div>
        <div className="space-y-1">
          {SENTIMENTS.map((s) => (
            <button
              key={s}
              onClick={() => setSentiment(s)}
              className={cn(
                'w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors',
                sentiment === s ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Source</div>
        <div className="space-y-1">
          {SOURCES.map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={cn(
                'w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors',
                source === s ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Rating</div>
        <div className="space-y-1">
          {RATINGS.map((r) => (
            <button
              key={r}
              onClick={() => setRating(r)}
              className={cn(
                'w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors',
                rating === r ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Type</div>
        <div className="space-y-1">
          {[
            { label: 'All mentions', value: null },
            { label: 'Your business', value: false },
            { label: 'Competitors', value: true },
          ].map(({ label, value }) => (
            <button
              key={label}
              onClick={() => setIsCompetitor(value)}
              className={cn(
                'w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors',
                isCompetitor === value ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
