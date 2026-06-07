import { Activity, FileText, Lightbulb, TrendingUp, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { Container } from '@/components/marketing/Container'
import { Section } from '@/components/marketing/Section'
import { Eyebrow } from '@/components/marketing/Eyebrow'
import { Reveal } from '@/components/motion/Reveal'
import { HorizontalPan } from '@/components/motion/HorizontalPan'
import { PulseRing } from './PulseRing'

interface Capability {
  icon: typeof Activity
  title: string
  body: string
  visual: ReactNode
}

const CAPABILITIES: Capability[] = [
  {
    icon: Activity,
    title: 'Pulse Score',
    body: 'One 0 to 100 read that blends sentiment, review velocity, complaint severity, and trend direction.',
    visual: <PulseRing score={82} delta={6} />,
  },
  {
    icon: FileText,
    title: 'Weekly Brief',
    body: 'A Monday email that reads like a sharp advisor. The win, the risk, and the one move worth making.',
    visual: (
      <div className="w-full space-y-2.5">
        {['5-star mentions up 31%', 'Booking friction complaints rising', 'Reply to 4 unanswered reviews'].map(
          (line) => (
            <div key={line} className="flex items-center gap-2.5 text-sm text-foreground">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              {line}
            </div>
          ),
        )}
      </div>
    ),
  },
  {
    icon: Users,
    title: 'Competitor Benchmark',
    body: 'See where you beat nearby businesses and where they pull ahead, scored on the same scale.',
    visual: (
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            You
          </p>
          <p className="font-display text-4xl font-semibold text-foreground">82</p>
        </div>
        <span className="mb-1 rounded-full bg-brand/10 px-2.5 py-1 font-mono text-xs font-medium text-brand">
          +11 vs area
        </span>
        <div className="text-right">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Area avg
          </p>
          <p className="font-display text-4xl font-semibold text-muted-foreground">71</p>
        </div>
      </div>
    ),
  },
  {
    icon: TrendingUp,
    title: 'Trend Detection',
    body: 'Catch a rising complaint before it becomes a crisis, and growing praise before rivals notice.',
    visual: (
      <svg viewBox="0 0 200 64" className="h-16 w-full" fill="none" aria-hidden>
        <polyline
          points="0,52 28,46 56,48 84,34 112,38 140,22 168,18 200,8"
          stroke="hsl(var(--brand))"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="200" cy="8" r="3.5" fill="hsl(var(--brand))" />
      </svg>
    ),
  },
  {
    icon: Lightbulb,
    title: 'Recommendations',
    body: 'Not "improve service." Instead: a specific, testable move tied to what the data just showed.',
    visual: (
      <div className="w-full space-y-3">
        {['Add evening appointment slots', 'Reply to the 4 newest 2-star reviews'].map((rec) => (
          <div
            key={rec}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-3 text-sm text-foreground"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 font-mono text-[11px] text-brand">
              +
            </span>
            {rec}
          </div>
        ))}
      </div>
    ),
  },
]

export function Capabilities() {
  return (
    <>
      <Section id="capabilities" className="pb-12 md:pb-16">
        <Container>
          <Reveal className="max-w-2xl">
            <Eyebrow>What it tracks</Eyebrow>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Five signals, one weekly read.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Everything an enterprise intelligence team watches, distilled for the owner who is also
              doing the work. Scroll across to see each one.
            </p>
          </Reveal>
        </Container>
      </Section>

      <HorizontalPan>
        {CAPABILITIES.map(({ icon: Icon, title, body, visual }) => (
          <article
            key={title}
            className="flex h-[62vh] w-[85vw] shrink-0 flex-col justify-between rounded-[14px] border border-border bg-card p-8 sm:w-[58vw] md:w-[44vw] md:p-10 lg:w-[34vw]"
          >
            <div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <Icon className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <h3 className="mt-6 font-display text-2xl font-semibold tracking-tight text-foreground">
                {title}
              </h3>
              <p className="mt-3 max-w-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
            <div className="mt-8 flex min-h-[10rem] items-center">{visual}</div>
          </article>
        ))}
      </HorizontalPan>
    </>
  )
}
