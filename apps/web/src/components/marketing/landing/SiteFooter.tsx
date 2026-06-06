import Link from 'next/link'
import { Container } from '@/components/marketing/Container'
import { Logo } from './Logo'

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Capabilities', href: '#capabilities' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Pricing', href: '#pricing' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'Sign in', href: '/auth/sign-in' },
      { label: 'Start free', href: '/onboarding' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="bg-foreground">
      <Container>
        <div className="grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo tone="light" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/55">
              Customer intelligence for the businesses that grow on word of mouth.
            </p>
            <a
              href="mailto:hello@whistling.io"
              className="mt-4 inline-block text-sm text-white/70 transition-colors hover:text-white"
            >
              hello@whistling.io
            </a>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">
                {col.heading}
              </p>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/70 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 py-6">
          <p className="text-xs text-white/45">
            © {new Date().getFullYear()} Whistling.io. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  )
}
