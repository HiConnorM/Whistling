import { Star } from 'lucide-react'
import { cn, formatRelativeDate, truncate } from '@/lib/utils'

const MOCK_MENTIONS = [
  { id: '1', source: 'Google', author: 'Sarah M.', text: 'The patio here is absolutely gorgeous. Came for the fajitas, stayed for the atmosphere. Live music on Friday night was a nice surprise. Will definitely be back, but the wait was a bit long.', rating: 4, sentiment: 'mixed', topics: ['patio', 'fajitas', 'wait time'], publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), isCompetitor: false },
  { id: '2', source: 'Google', author: 'James R.', text: 'Waited 45 minutes for our table on a Friday. The food was great when it finally came but that service time is unacceptable. Staff was very friendly at least.', rating: 2, sentiment: 'negative', topics: ['wait time', 'food quality', 'staff friendliness'], publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), isCompetitor: false },
  { id: '3', source: 'Instagram', author: '@localfoodie', text: 'The dog-friendly patio is everything! Brought my golden retriever and had the best time. Margaritas were a bit weak but the view was worth it.', rating: null, sentiment: 'positive', topics: ['patio', 'margaritas'], publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), isCompetitor: false },
  { id: '4', source: 'Google', author: 'Maria T.', text: 'Best fajitas in town, hands down. The staff always remembers my family and makes us feel at home. Parking is tough on weekends but worth it.', rating: 5, sentiment: 'positive', topics: ['fajitas', 'staff friendliness', 'parking'], publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), isCompetitor: false },
  { id: '5', source: 'Google', author: 'Tom K.', text: 'Competitor review: Super fast service, ordered online and my food was ready in under 10 minutes. The app works great.', rating: 5, sentiment: 'positive', topics: ['wait time', 'online ordering'], publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), isCompetitor: true },
]

const SENTIMENT_CONFIG = {
  positive: { color: 'text-green-700 bg-green-50 border-green-200', label: 'Positive' },
  negative: { color: 'text-red-700 bg-red-50 border-red-200', label: 'Negative' },
  neutral: { color: 'text-gray-700 bg-gray-50 border-gray-200', label: 'Neutral' },
  mixed: { color: 'text-amber-700 bg-amber-50 border-amber-200', label: 'Mixed' },
}

const SOURCE_ICONS: Record<string, string> = {
  Google: '⭐',
  Instagram: '📷',
  Facebook: '👍',
  Yelp: '🌟',
  CSV: '📄',
}

export function MentionsList() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">1,581 mentions · showing most recent</span>
        <select className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700">
          <option>Most recent</option>
          <option>Highest severity</option>
          <option>Lowest rating</option>
        </select>
      </div>

      {MOCK_MENTIONS.map((mention) => {
        const sentimentConfig = SENTIMENT_CONFIG[mention.sentiment as keyof typeof SENTIMENT_CONFIG]
        return (
          <div
            key={mention.id}
            className={cn(
              'rounded-xl border bg-white p-4',
              mention.isCompetitor ? 'border-orange-200 bg-orange-50/40' : 'border-gray-200',
            )}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-base">{SOURCE_ICONS[mention.source] ?? '💬'}</span>
                <span className="text-xs font-medium text-gray-500">{mention.source}</span>
                {mention.isCompetitor && (
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                    Competitor
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {mention.rating !== null && (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'h-3 w-3',
                          i < (mention.rating ?? 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-200',
                        )}
                      />
                    ))}
                  </div>
                )}
                <span
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-xs font-medium',
                    sentimentConfig?.color,
                  )}
                >
                  {sentimentConfig?.label}
                </span>
              </div>
            </div>

            <p className="mb-3 text-sm leading-relaxed text-gray-800">
              {truncate(mention.text, 200)}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {mention.topics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                  >
                    {topic}
                  </span>
                ))}
              </div>
              <div className="text-xs text-gray-400">
                {mention.author} · {formatRelativeDate(mention.publishedAt)}
              </div>
            </div>
          </div>
        )
      })}

      <button className="w-full rounded-lg border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">
        Load more mentions
      </button>
    </div>
  )
}
