import { cn } from '@/lib/utils'

/**
 * Coral pulse gauge. A real product visual (the score arc used across the app),
 * not a fake screenshot. Geometry mirrors the dashboard PulseScoreCard.
 */
function arcPath(value: number): string {
  const radius = 54
  const cx = 64
  const cy = 68
  const startAngle = -210
  const endAngle = startAngle + (value / 100) * 240
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const x1 = cx + radius * Math.cos(toRad(startAngle))
  const y1 = cy + radius * Math.sin(toRad(startAngle))
  const x2 = cx + radius * Math.cos(toRad(endAngle))
  const y2 = cy + radius * Math.sin(toRad(endAngle))
  const largeArc = value > 50 ? 1 : 0
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`
}

export function PulseRing({
  score,
  delta,
  size = 'md',
  className,
}: {
  score: number
  delta?: number
  size?: 'md' | 'lg'
  className?: string
}) {
  const dim = size === 'lg' ? 'h-40 w-40' : 'h-32 w-32'
  const num = size === 'lg' ? 'text-5xl' : 'text-4xl'
  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className={cn('relative', dim)}>
        <svg viewBox="0 0 128 96" className="h-full w-full" fill="none">
          <path d={arcPath(100)} stroke="hsl(var(--secondary))" strokeWidth="10" strokeLinecap="round" />
          <path d={arcPath(score)} stroke="hsl(var(--brand))" strokeWidth="10" strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <span className={cn('font-display font-semibold tracking-tight text-foreground', num)}>
            {score}
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">/ 100</span>
        </div>
      </div>
      {delta !== undefined && (
        <span className="mt-1 font-mono text-xs font-medium text-brand">
          {delta > 0 ? '+' : ''}
          {delta} this week
        </span>
      )}
    </div>
  )
}
