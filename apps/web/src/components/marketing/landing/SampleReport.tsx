import { ArrowUpRight, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { Container } from '@/components/marketing/Container'
import { Section } from '@/components/marketing/Section'
import { Eyebrow } from '@/components/marketing/Eyebrow'
import { Reveal } from '@/components/motion/Reveal'
import { StickyStack } from '@/components/motion/StickyStack'
import { PulseRing } from './PulseRing'

function ReportCard({ tag, children }: { tag: string; children: ReactNode }) {
  return (
    <div className="w-full max-w-xl rounded-[14px] border border-border bg-card p-8 shadow-[0_8px_50px_-16px_rgba(22,23,26,0.18)] md:p-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">{tag}</p>
      <div className="mt-6">{children}</div>
    </div>
  )
}

const LOVED = [
  { topic: 'Patio atmosphere', mentions: 34, change: 27 },
  { topic: 'Live music nights', mentions: 21, change: 12 },
  { topic: 'Friendly servers', mentions: 18, change: 4 },
]

const WATCH = [
  { topic: 'Friday wait times', note: 'Rising', weight: 0.9 },
  { topic: 'Online ordering glitches', note: 'Steady', weight: 0.55 },
  { topic: 'Parking near the patio', note: 'Low', weight: 0.3 },
]

const CARDS: ReactNode[] = [
  <ReportCard key="pulse" tag="Pulse">
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
      <PulseRing score={82} delta={6} size="lg" />
      <div>
        <h3 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Your patio is carrying the week.
        </h3>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Up six points, driven by warmer weather and a run of strong weekend reviews. The number
          you watch, on one honest scale.
        </p>
      </div>
    </div>
  </ReportCard>,

  <ReportCard key="loved" tag="What they love">
    <ul className="space-y-4">
      {LOVED.map((item) => (
        <li key={item.topic} className="flex items-center justify-between gap-4">
          <span className="text-base text-foreground">{item.topic}</span>
          <span className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted-foreground">{item.mentions} mentions</span>
            <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-brand">
              <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.75} />+{item.change}%
            </span>
          </span>
        </li>
      ))}
    </ul>
  </ReportCard>,

  <ReportCard key="watch" tag="What to watch">
    <ul className="space-y-5">
      {WATCH.map((item) => (
        <li key={item.topic}>
          <div className="flex items-center justify-between gap-4">
            <span className="text-base text-foreground">{item.topic}</span>
            <span className="font-mono text-xs text-muted-foreground">{item.note}</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-foreground/70"
              style={{ width: `${item.weight * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  </ReportCard>,

  <ReportCard key="move" tag="Your move this week">
    <div className="flex items-start gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
        <ArrowUpRight className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <div>
        <h3 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Open a Friday pickup station.
        </h3>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Wait-time complaints climbed 18% in the 6 to 9pm window, and three nearby spots are getting
          praised for fast takeout. Test it for two weekends and we will tell you if it moved.
        </p>
      </div>
    </div>
  </ReportCard>,
]

export function SampleReport() {
  return (
    <>
      <Section className="pb-12 md:pb-16">
        <Container>
          <Reveal className="max-w-2xl">
            <Eyebrow>The weekly brief</Eyebrow>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              What lands in your inbox on Monday.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Four short sections, in the order a busy owner reads them. Keep scrolling to see the
              brief build itself.
            </p>
          </Reveal>
        </Container>
      </Section>

      <Container>
        <StickyStack cards={CARDS} />
      </Container>
    </>
  )
}
