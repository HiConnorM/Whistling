import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Complaint {
  topic: string
  count: number
  change?: number
}

export function TopComplaintsCard({ complaints }: { complaints: Complaint[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="mb-4 font-semibold text-gray-900">Top Complaints</h3>
      <div className="space-y-3">
        {complaints.map((c, i) => (
          <div key={c.topic} className="flex items-center gap-3">
            <span className="w-5 text-right text-sm font-medium text-gray-400">{i + 1}</span>
            <div className="flex flex-1 items-center justify-between">
              <span className="text-sm text-gray-800">{c.topic}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">{c.count}</span>
                {c.change !== undefined && c.change !== 0 && (
                  <div
                    className={cn(
                      'flex items-center gap-0.5 text-xs font-medium',
                      c.change > 0 ? 'text-red-600' : 'text-green-600',
                    )}
                  >
                    {c.change > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {c.change > 0 ? '+' : ''}{c.change}%
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
