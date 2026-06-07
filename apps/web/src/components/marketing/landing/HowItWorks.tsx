import { Plug, Activity, Target } from 'lucide-react'
import { Container } from '@/components/marketing/Container'
import { Section } from '@/components/marketing/Section'
import { Reveal } from '@/components/motion/Reveal'
import { RevealStagger, RevealItem } from '@/components/motion/RevealStagger'

const STEPS = [
  {
    icon: Plug,
    title: 'Connect your sources',
    body: 'Add your Google, Yelp, Trustpilot, App Store, or Amazon profiles — wherever your customers already leave feedback. Name a few competitors. Two minutes, no code.',
  },
  {
    icon: Activity,
    title: 'Read the signal',
    body: 'We pull every new review and mention, score sentiment, weigh severity, and track how each theme moves week over week.',
  },
  {
    icon: Target,
    title: 'Act on the brief',
    body: 'Monday morning you get one short read: the win, the risk, and the single move most worth making this week.',
  },
]

export function HowItWorks() {
  return (
    <Section id="how-it-works" className="border-t border-border">
      <Container>
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="font-display text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              From scattered reviews to one clear move.
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
              No dashboards to babysit. Connect once and the brief comes to you, written like a
              partner who actually read everything.
            </p>
          </Reveal>

          <RevealStagger className="relative">
            <div
              aria-hidden
              className="absolute left-[1.4375rem] top-3 bottom-3 w-px bg-border md:left-[1.6875rem]"
            />
            <ol className="space-y-10">
              {STEPS.map(({ icon: Icon, title, body }) => (
                <RevealItem key={title}>
                  <li className="relative flex gap-6">
                    <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-card text-brand md:h-14 md:w-14">
                      <Icon className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />
                    </span>
                    <div className="pt-1.5">
                      <h3 className="font-display text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                        {title}
                      </h3>
                      <p className="mt-2 max-w-md leading-relaxed text-muted-foreground">{body}</p>
                    </div>
                  </li>
                </RevealItem>
              ))}
            </ol>
          </RevealStagger>
        </div>
      </Container>
    </Section>
  )
}
