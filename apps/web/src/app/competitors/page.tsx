import type { Metadata } from 'next'
import { Plus, TrendingDown, TrendingUp } from 'lucide-react'

export const metadata: Metadata = { title: 'Competitor Intelligence' }

const COMPETITORS = [
  {
    name: 'Taqueria Morelos',
    strengths: ['Fast service', 'Online ordering', 'Value for money'],
    weaknesses: ['Food quality inconsistency', 'Limited hours', 'Atmosphere'],
    avgRating: 4.1,
    totalReviews: 284,
    youVsThem: [
      { topic: 'Atmosphere', you: 24, them: 8, youWin: true },
      { topic: 'Wait time', you: -18, them: 5, youWin: false },
      { topic: 'Food quality', you: 31, them: 19, youWin: true },
      { topic: 'Online ordering', you: 3, them: 22, youWin: false },
    ],
  },
  {
    name: 'Casa Blanca Grill',
    strengths: ['Reservations system', 'Event nights', 'Staff training'],
    weaknesses: ['Pricing', 'Portion size', 'Parking'],
    avgRating: 4.3,
    totalReviews: 412,
    youVsThem: [
      { topic: 'Atmosphere', you: 24, them: 15, youWin: true },
      { topic: 'Value for money', you: 18, them: -12, youWin: true },
      { topic: 'Reservations', you: 0, them: 18, youWin: false },
    ],
  },
]

export default function CompetitorsPage() {
  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Competitor Intelligence</h1>
          <p className="mt-1 text-sm text-gray-500">
            What customers are saying about businesses like yours
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          <Plus className="h-4 w-4" />
          Add competitor
        </button>
      </div>

      {/* Market gaps */}
      <div className="mb-6 rounded-xl border border-purple-200 bg-purple-50 p-5">
        <h3 className="mb-3 text-sm font-semibold text-purple-900">Market Gaps — Nobody Owns These Yet</h3>
        <div className="flex flex-wrap gap-2">
          {[
            'Family-friendly weekday dinner experience',
            'Vegetarian / vegan menu options',
            'Birthday/celebration packages',
            'Late-night dining (past 10pm)',
          ].map((gap) => (
            <span key={gap} className="rounded-full bg-white border border-purple-200 px-3 py-1 text-xs font-medium text-purple-800">
              {gap}
            </span>
          ))}
        </div>
      </div>

      {/* Competitor cards */}
      <div className="space-y-6">
        {COMPETITORS.map((comp) => (
          <div key={comp.name} className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{comp.name}</h3>
                <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                  <span>⭐ {comp.avgRating}</span>
                  <span>·</span>
                  <span>{comp.totalReviews} reviews analyzed</span>
                </div>
              </div>
              <button className="text-xs font-medium text-gray-500 underline hover:text-gray-700">
                View all mentions
              </button>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-4">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-700">
                  They win at
                </div>
                <div className="space-y-1">
                  {comp.strengths.map((s) => (
                    <div key={s} className="flex items-center gap-2 text-sm text-gray-700">
                      <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                      {s}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">
                  They lose at
                </div>
                <div className="space-y-1">
                  {comp.weaknesses.map((w) => (
                    <div key={w} className="flex items-center gap-2 text-sm text-gray-700">
                      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                      {w}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                You vs. them (mention volume %)
              </div>
              <div className="space-y-2">
                {comp.youVsThem.map((item) => (
                  <div key={item.topic} className="flex items-center gap-3">
                    <span className="w-32 text-xs text-gray-600">{item.topic}</span>
                    <div className="flex flex-1 items-center gap-2">
                      <div className="flex-1">
                        <div className="flex items-center justify-end gap-1">
                          <span className={`text-xs font-medium ${item.youWin ? 'text-green-600' : 'text-gray-500'}`}>
                            You: {item.you > 0 ? '+' : ''}{item.you}%
                          </span>
                          <div
                            className={`h-2 rounded-full ${item.youWin ? 'bg-green-400' : 'bg-gray-300'}`}
                            style={{ width: `${Math.abs(item.you)}%`, maxWidth: '100px' }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">vs</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <div
                            className={`h-2 rounded-full ${!item.youWin ? 'bg-orange-400' : 'bg-gray-200'}`}
                            style={{ width: `${Math.abs(item.them)}%`, maxWidth: '100px' }}
                          />
                          <span className={`text-xs font-medium ${!item.youWin ? 'text-orange-600' : 'text-gray-400'}`}>
                            Them: {item.them > 0 ? '+' : ''}{item.them}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
