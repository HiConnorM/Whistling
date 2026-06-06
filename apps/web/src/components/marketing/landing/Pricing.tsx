import Link from 'next/link'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Container } from '@/components/marketing/Container'
import { Section } from '@/components/marketing/Section'
import { Eyebrow } from '@/components/marketing/Eyebrow'
import { buttonVariants } from '@/components/marketing/Button'
import { Reveal } from '@/components/motion/Reveal'
import { RevealStagger, RevealItem } from '@/components/motion/RevealStagger'

interface Tier {
  name: string
  price: string
  cadence: string
  description: string
  features: string[]
  featured?: boolean
}

const TIERS: Tier[] = [
  {
    name: 'Starter',
    price: '$49',
    cadence: '/mo',
    description: 'For a single location finding its footing.',
    features: [
      '1 business location',
      '3 competitors tracked',
      'Weekly brief by email',
      'Google and Yelp reviews',
      'CSV review import',
    ],
  },
  {
    name: 'Pro',
    price: '$129',
    cadence: '/mo',
    description: 'For owners who want the full picture every week.',
    features: [
      'Everything in Starter',
      '10 competitors tracked',
      'Facebook and Instagram',
      'Trend alerts between briefs',
      'Recommended actions',
      '12 months of history',
    ],
    featured: true,
  },
  {
    name: 'Growth',
    price: '$299',
    cadence: '/mo',
    description: 'For multi-location teams that compare notes.',
    features: [
      'Everything in Pro',
      'Up to 3 locations',
      '25 competitors tracked',
      'Team access',
      'Monthly strategy review',
    ],
  },
]

export function Pricing() {
  return (
    <Section id="pricing" className="border-t border-border">
      <Container>
        <Reveal className="max-w-2xl">
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Honest pricing. Cancel anytime.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Start free for two weeks. No card up front, no per-review surprises, no annual lock-in.
          </p>
        </Reveal>

        <RevealStagger className="mt-14 grid gap-6 lg:grid-cols-3 lg:items-start">
          {TIERS.map((tier) => (
            <RevealItem key={tier.name}>
              <div
                className={cn(
                  'flex h-full flex-col rounded-[14px] border bg-card p-8',
                  tier.featured
                    ? 'border-brand shadow-[0_8px_50px_-16px_rgba(232,91,86,0.35)] lg:-mt-4 lg:pb-12'
                    : 'border-border',
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
                    {tier.name}
                  </h3>
                  {tier.featured && (
                    <span className="rounded-full bg-brand/10 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-brand">
                      Most popular
                    </span>
                  )}
                </div>

                <div className="mt-5 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-semibold tracking-tight text-foreground">
                    {tier.price}
                  </span>
                  <span className="font-mono text-sm text-muted-foreground">{tier.cadence}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {tier.description}
                </p>

                <ul className="mt-7 flex-1 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={2} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/onboarding"
                  className={cn(
                    buttonVariants({ variant: tier.featured ? 'primary' : 'ghost' }),
                    'mt-8 w-full',
                  )}
                >
                  Start free
                </Link>
              </div>
            </RevealItem>
          ))}
        </RevealStagger>

        <Reveal className="mt-8">
          <p className="text-center text-sm text-muted-foreground">
            Running an agency or more than three locations?{' '}
            <Link href="/contact" className="text-brand underline-offset-4 hover:underline">
              Talk to us
            </Link>
            .
          </p>
        </Reveal>
      </Container>
    </Section>
  )
}
