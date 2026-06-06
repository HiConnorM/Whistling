import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Whistling.io wordmark with a simple geometric mark. `tone="light"` is for use
 * on the dark CTA / footer surfaces.
 */
export function Logo({
  className,
  tone = 'dark',
  href = '/',
}: {
  className?: string
  tone?: 'dark' | 'light'
  href?: string
}) {
  const light = tone === 'light'
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-md',
          light ? 'bg-white' : 'bg-primary',
        )}
      >
        <span
          className={cn(
            'font-display text-sm font-bold leading-none',
            light ? 'text-primary' : 'text-primary-foreground',
          )}
        >
          W
        </span>
      </span>
      <span
        className={cn(
          'font-display text-lg font-semibold tracking-tight',
          light ? 'text-white' : 'text-foreground',
        )}
      >
        Whistling<span className="text-brand">.io</span>
      </span>
    </Link>
  )
}
