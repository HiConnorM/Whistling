import { TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Praise {
  topic: string
  count: number
  change?: number
}

export function TopPraisesCard({ praises }: { praises: Praise[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="mb-4 font-semibold text-gray-900">What Customers Love</h3>
      <div className="space-y-3">
        {praises.map((p, i) => (
          <div key={p.topic} className="flex items-center gap-3">
            <span className="w-5 text-right text-sm font-medium text-gray-400">{i + 1}</span>
            <div className="flex flex-1 items-center justify-between">
              <span className="text-sm text-gray-800">{p.topic}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-green-600">{p.count}</span>
                {p.change !== undefined && p.change !== 0 && (
                  <div
                    className={cn(
                      'flex items-center gap-0.5 text-xs font-medium',
                      p.change > 0 ? 'text-green-600' : 'text-gray-500',
                    )}
                  >
                    <TrendingUp className="h-3 w-3" />
                    {p.change > 0 ? '+' : ''}{p.change}%
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
