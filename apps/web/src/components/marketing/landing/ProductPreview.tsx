import { ArrowUpRight, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PulseRing } from './PulseRing'

const LOVED = [
  { topic: 'Food quality', change: 19 },
  { topic: 'Weekend atmosphere', change: 24 },
  { topic: 'Staff friendliness', change: 11 },
]

/**
 * Authentic mini-version of the weekly brief UI used as the hero asset. Built
 * from the same components the product ships, populated with sample data.
 */
export function ProductPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'w-full rounded-[14px] border border-border bg-card p-5 shadow-[0_8px_40px_-12px_rgba(22,23,26,0.14)]',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-sm font-semibold text-foreground">Weekly brief</p>
          <p className="font-mono text-[11px] text-muted-foreground">Monday, Jun 1</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 font-mono text-[11px] font-medium text-foreground">
          Lakeside Grill
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-5">
        <PulseRing score={82} delta={6} />
        <div className="space-y-2.5">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            What customers love
          </p>
          {LOVED.map((item) => (
            <div key={item.topic} className="flex items-center justify-between">
              <span className="text-sm text-foreground">{item.topic}</span>
              <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-brand">
                <TrendingUp className="h-3 w-3" strokeWidth={1.75} />+{item.change}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-secondary/60 p-3.5">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Best move this week
        </p>
        <p className="mt-1 flex items-start gap-1.5 text-sm leading-relaxed text-foreground">
          <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />
          Add a reservation link to Google. Fourteen reviews mention difficulty booking — two nearby spots are winning on "easy reservations."
        </p>
      </div>
    </div>
  )
}
