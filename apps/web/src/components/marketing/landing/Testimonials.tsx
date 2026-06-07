import { Container } from '@/components/marketing/Container'
import { Section } from '@/components/marketing/Section'
import { Reveal } from '@/components/motion/Reveal'
import { RevealStagger, RevealItem } from '@/components/motion/RevealStagger'

interface Quote {
  body: string
  name: string
  role: string
  business: string
}

const FEATURED: Quote = {
  body: 'I used to skim reviews on Sunday night and forget half of them. Now one email tells me what changed and the one thing to do about it. I read it with my coffee and I am done.',
  name: 'Marcus Webb',
  role: 'Owner',
  business: 'Lakeside Grill',
}

const SUPPORTING: Quote[] = [
  {
    body: 'It flagged a booking-friction trend three weeks before it would have dented my star rating. We fixed the intake form quietly and never took the hit.',
    name: 'Priya Nair',
    role: 'Owner',
    business: 'Aster & Oak Wellness',
  },
  {
    body: 'The competitor benchmark is the part I did not know I needed. Seeing exactly where we actually win changed how we talk to new clients.',
    name: 'Diego Romero',
    role: 'Founder',
    business: 'Romero Legal Group',
  },
]

function Attribution({ name, role, business }: Omit<Quote, 'body'>) {
  return (
    <div className="mt-6 flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm font-semibold text-foreground">
        {name.charAt(0)}
      </span>
      <div className="text-sm leading-tight">
        <p className="font-medium text-foreground">{name}</p>
        <p className="text-muted-foreground">
          {role}, {business}
        </p>
      </div>
    </div>
  )
}

export function Testimonials() {
  return (
    <Section className="border-t border-border">
      <Container>
        <Reveal className="max-w-2xl">
          <h2 className="font-display text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Owners stopped guessing.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Clinics, law firms, salons, contractors, SaaS teams — any business that earns reviews
            is now reading the room before it shows up in the ratings.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <figure className="flex h-full flex-col justify-between rounded-[14px] border border-border bg-card p-8 md:p-10">
              <blockquote className="font-display text-2xl font-medium leading-snug tracking-tight text-foreground md:text-3xl">
                <span className="text-brand">"</span>
                {FEATURED.body}
              </blockquote>
              <figcaption>
                <Attribution name={FEATURED.name} role={FEATURED.role} business={FEATURED.business} />
              </figcaption>
            </figure>
          </Reveal>

          <RevealStagger className="grid gap-6 lg:col-span-2">
            {SUPPORTING.map((q) => (
              <RevealItem key={q.name}>
                <figure className="flex h-full flex-col justify-between rounded-[14px] border border-border bg-card p-7">
                  <blockquote className="leading-relaxed text-foreground">{q.body}</blockquote>
                  <figcaption>
                    <Attribution name={q.name} role={q.role} business={q.business} />
                  </figcaption>
                </figure>
              </RevealItem>
            ))}
          </RevealStagger>
        </div>
      </Container>
    </Section>
  )
}
