import Link from 'next/link'
import { Container } from '@/components/marketing/Container'
import { MagneticButton } from '@/components/motion/MagneticButton'
import { Reveal } from '@/components/motion/Reveal'

export function CtaBand() {
  return (
    <section className="bg-brand">
      <Container>
        <div className="flex flex-col items-center gap-8 py-24 text-center md:py-32">
          <Reveal>
            <h2 className="mx-auto max-w-2xl font-display text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Your customers are already telling you.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg font-medium leading-relaxed text-white/90">
              Connect your sources and get your first brief in minutes. Free for two weeks, no card
              required.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <MagneticButton className="inline-flex">
              <Link
                href="/onboarding"
                className="inline-flex h-14 select-none items-center justify-center rounded-md bg-white px-8 text-base font-semibold text-foreground transition-[transform,background-color] duration-200 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand active:scale-[0.98]"
              >
                Start free
              </Link>
            </MagneticButton>
          </Reveal>
        </div>
      </Container>
    </section>
  )
}
