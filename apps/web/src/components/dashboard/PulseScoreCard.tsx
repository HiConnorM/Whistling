import { cn, pulseScoreColor } from '@/lib/utils'
import { TrendingDown, TrendingUp } from 'lucide-react'

interface Props {
  score: number
  previous?: number
}

function getLabel(score: number) {
  if (score >= 85) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 55) return 'Fair'
  if (score >= 40) return 'Needs Work'
  return 'Critical'
}

function getArcPath(score: number): string {
  const radius = 54
  const cx = 64
  const cy = 68
  const startAngle = -210
  const endAngle = startAngle + (score / 100) * 240

  const toRad = (deg: number) => (deg * Math.PI) / 180
  const x1 = cx + radius * Math.cos(toRad(startAngle))
  const y1 = cy + radius * Math.sin(toRad(startAngle))
  const x2 = cx + radius * Math.cos(toRad(endAngle))
  const y2 = cy + radius * Math.sin(toRad(endAngle))
  const largeArc = score > 50 ? 1 : 0

  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`
}

export function PulseScoreCard({ score, previous }: Props) {
  const change = previous !== undefined ? score - previous : undefined
  const isUp = change !== undefined && change > 0
  const isDown = change !== undefined && change < 0

  return (
    <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Business Pulse
      </div>

      <div className="relative h-32 w-32">
        <svg viewBox="0 0 128 96" className="h-full w-full" fill="none">
          {/* Background arc */}
          <path
            d={getArcPath(100)}
            stroke="#f3f4f6"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Score arc */}
          <path
            d={getArcPath(score)}
            stroke={score >= 70 ? '#2563eb' : score >= 40 ? '#d97706' : '#dc2626'}
            strokeWidth="10"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-3">
          <span className={cn('text-3xl font-bold', pulseScoreColor(score))}>{score}</span>
          <span className="text-xs text-gray-400">/ 100</span>
        </div>
      </div>

      <div className="mt-1 text-sm font-semibold text-gray-700">{getLabel(score)}</div>

      {change !== undefined && (
        <div
          className={cn(
            'mt-2 flex items-center gap-1 text-xs font-medium',
            isUp ? 'text-green-600' : isDown ? 'text-red-600' : 'text-gray-500',
          )}
        >
          {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : isDown ? <TrendingDown className="h-3.5 w-3.5" /> : null}
          {isUp ? '+' : ''}{change} from last week
        </div>
      )}
    </div>
  )
}
