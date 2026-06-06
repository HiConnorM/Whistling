'use client'

import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

export interface HeadlineWord {
  text: string
  /** render as coral italic emphasis (same display family) */
  accent?: boolean
  /** force a line break after this word */
  break?: boolean
}

/**
 * Hero headline that reveals word by word with a mask-up motion. Emphasis words
 * render as coral italic of the same display family. Static (final state) under
 * prefers-reduced-motion. Pick emphasis words without descenders (y g j p q) to
 * keep the clipped reveal clean.
 */
export function KineticHeadline({
  words,
  className,
}: {
  words: HeadlineWord[]
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <h1
      className={cn(
        'font-display font-semibold tracking-tight leading-[1.05] text-foreground',
        className,
      )}
    >
      {words.map((word, i) => (
        <span key={i} className="contents">
          <span className="inline-block overflow-hidden pb-[0.16em] align-baseline">
            <motion.span
              className={cn('inline-block leading-[1.1]', word.accent && 'italic text-brand')}
              initial={reduce ? false : { y: '115%' }}
              animate={reduce ? undefined : { y: 0 }}
              transition={{ duration: 0.7, delay: 0.12 + i * 0.075, ease: [0.16, 1, 0.3, 1] }}
            >
              {word.text}
            </motion.span>
          </span>
          {word.break ? <br /> : <span className="inline-block w-[0.26em]" aria-hidden />}
        </span>
      ))}
    </h1>
  )
}
