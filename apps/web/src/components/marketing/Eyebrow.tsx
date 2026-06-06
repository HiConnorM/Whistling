import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

/**
 * Small coral label above a section headline. Use sparingly: at most one per
 * three sections (the hero counts as one).
 */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-block font-mono text-xs uppercase tracking-[0.18em] text-brand',
        className,
      )}
    >
      {children}
    </span>
  )
}
