import Link from 'next/link'
import { Container } from '@/components/marketing/Container'
import { buttonVariants } from '@/components/marketing/Button'
import { KineticHeadline, type HeadlineWord } from '@/components/motion/KineticHeadline'
import { MagneticButton } from '@/components/motion/MagneticButton'
import { Reveal } from '@/components/motion/Reveal'
import { ProductPreview } from './ProductPreview'

const HEADLINE: HeadlineWord[] = [
  { text: 'Customer' },
  { text: 'intelligence,', break: true },
  { text: 'made' },
  { text: 'clear.', accent: true },
]

export function Hero() {
  return (
    <section className="relative flex min-h-[100dvh] items-center overflow-hidden pt-24">
      {/* ambient depth: one soft coral light, very low opacity, non-interactive */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[10%] top-[8%] h-[42rem] w-[42rem] rounded-full opacity-[0.06] blur-3xl"
        style={{ background: 'radial-gradient(circle, hsl(var(--brand)) 0%, transparent 70%)' }}
      />

      <Container className="relative">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div className="max-w-2xl">
            <KineticHeadline
              words={HEADLINE}
              className="text-5xl md:text-6xl lg:text-7xl"
            />

            <Reveal delay={0.5} className="mt-7 max-w-xl">
              <p className="text-lg leading-relaxed text-muted-foreground">
                Connect every place customers leave feedback — reviews, comments, support tickets,
                app stores. Every Monday, get a clear brief on what to fix next.
              </p>
            </Reveal>

            <Reveal delay={0.62} className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <MagneticButton className="inline-flex">
                <Link href="/onboarding" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
                  Start free
                </Link>
              </MagneticButton>
              <Link
                href="#how-it-works"
                className={buttonVariants({ variant: 'ghost', size: 'lg' })}
              >
                See how it works
              </Link>
            </Reveal>
          </div>

          <Reveal delay={0.35} y={32} className="lg:pl-6">
            <ProductPreview />
          </Reveal>
        </div>
      </Container>
    </section>
  )
}
