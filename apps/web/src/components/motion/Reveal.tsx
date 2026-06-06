'use client'

import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  className?: string
  /** seconds */
  delay?: number
  /** initial vertical offset in px */
  y?: number
  amount?: number
}

/**
 * Single-element scroll reveal. Fades + rises into view once.
 * Collapses to a static render under prefers-reduced-motion.
 */
export function Reveal({ children, className, delay = 0, y = 24, amount = 0.3 }: RevealProps) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
