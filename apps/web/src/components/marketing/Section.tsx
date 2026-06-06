import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export function Section({
  children,
  className,
  id,
}: {
  children: ReactNode
  className?: string
  id?: string
}) {
  return (
    <section id={id} className={cn('py-24 md:py-32', className)}>
      {children}
    </section>
  )
}
