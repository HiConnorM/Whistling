'use client'

import { useRef, useEffect, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useReducedMotion } from 'motion/react'

gsap.registerPlugin(ScrollTrigger)

/**
 * Vertical-scroll to horizontal-pan hijack. The section pins at the top of the
 * viewport and the inner track scrubs sideways as the user scrolls. Under
 * reduced motion it degrades to a normal horizontal scroll-snap strip.
 */
export function HorizontalPan({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (reduce || !wrap.current || !track.current) return
    const ctx = gsap.context(() => {
      const distance = () => track.current!.scrollWidth - window.innerWidth
      gsap.to(track.current, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: wrap.current,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      })
    }, wrap)
    return () => ctx.revert()
  }, [reduce])

  if (reduce) {
    return (
      <section className={className}>
        <div className="flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-6">
          {children}
        </div>
      </section>
    )
  }

  return (
    <section ref={wrap} className={cnOverflow(className)}>
      <div ref={track} className="flex h-[100dvh] items-center gap-8 px-[8vw]">
        {children}
      </div>
    </section>
  )
}

function cnOverflow(className?: string) {
  return ['relative overflow-hidden', className].filter(Boolean).join(' ')
}
