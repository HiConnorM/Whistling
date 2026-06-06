import { Container } from '@/components/marketing/Container'
import { DATA_SOURCES } from './BrandLogos'

export function LogoWall() {
  const row = [...DATA_SOURCES, ...DATA_SOURCES]
  return (
    <section className="border-y border-border py-12">
      <Container>
        <p className="text-center text-sm text-muted-foreground">
          Pulls from the platforms your customers already use
        </p>
      </Container>

      <div
        className="relative mt-8 overflow-hidden"
        style={{
          maskImage:
            'linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)',
        }}
      >
        <div className="flex w-max animate-marquee items-center gap-20 pr-20 motion-reduce:animate-none motion-reduce:justify-center">
          {row.map(({ name, Mark }, i) => (
            <div key={`${name}-${i}`} className="flex shrink-0 items-center">
              <Mark className="h-7 w-7 text-muted-foreground/70" />
              <span className="sr-only">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
