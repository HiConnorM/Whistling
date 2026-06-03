import Link from 'next/link'
import { ArrowRight, BarChart3, Bell, Shield, TrendingUp, Users, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900">
              <span className="text-sm font-bold text-white">W</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">Whistling.io</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-gray-600 md:flex">
            <Link href="#features" className="hover:text-gray-900">Features</Link>
            <Link href="#pricing" className="hover:text-gray-900">Pricing</Link>
            <Link href="/auth/sign-in" className="hover:text-gray-900">Sign in</Link>
            <Link
              href="/onboarding"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b bg-white px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Weekly intelligence brief for local businesses
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-gray-900">
            The customer intelligence layer{' '}
            <span className="text-blue-600">your business is missing</span>
          </h1>
          <p className="mb-10 text-xl leading-relaxed text-gray-600">
            Connect your reviews, social profiles, and competitors. Every Monday, get a clear
            report on what customers love, what they complain about, what competitors are winning
            at, and exactly what to do next.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/onboarding"
              className="flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
            >
              Build your customer map <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#features"
              className="rounded-lg border border-gray-200 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              See how it works
            </Link>
          </div>
        </div>
      </section>

      {/* Social proof metrics */}
      <section className="border-b bg-gray-50 px-6 py-10">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-around gap-8 text-center md:flex-row">
          {[
            { number: '82', label: 'Average Pulse Score improvement', suffix: 'pts' },
            { number: '3.2x', label: 'More insights than reading reviews manually', suffix: '' },
            { number: '15', label: 'Minutes to get your first report', suffix: 'min' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold text-gray-900">
                {stat.number}
                <span className="text-xl text-gray-500">{stat.suffix}</span>
              </div>
              <div className="mt-1 text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b bg-white px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              Everything big brands have. Built for local businesses.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: BarChart3,
                title: 'Business Pulse Score',
                description:
                  'A clear 0–100 score that combines sentiment, review velocity, complaint severity, competitor comparison, and trend direction.',
              },
              {
                icon: Bell,
                title: 'Weekly Intelligence Brief',
                description:
                  'Every Monday, get a newsletter that reads like a trusted advisor — specific, actionable, and written for someone who is busy.',
              },
              {
                icon: Users,
                title: 'Competitor Benchmarking',
                description:
                  "See exactly where you outperform competitors and where they're winning. Identify market gaps nobody else is filling.",
              },
              {
                icon: TrendingUp,
                title: 'Trend Detection',
                description:
                  'Spot rising complaints before they become crises. Catch growing praise before competitors notice the same pattern.',
              },
              {
                icon: Zap,
                title: 'Action Recommendations',
                description:
                  'Not "improve customer service." But: "Wait-time complaints rose 18% on Fridays. Test a dedicated pickup lane for two weekends."',
              },
              {
                icon: Shield,
                title: 'Multi-Source Collection',
                description:
                  'Google reviews, Facebook, Instagram, CSV uploads, Yelp — all normalized into one clean intelligence layer.',
              },
            ].map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-xl border border-gray-200 p-6">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                  <Icon className="h-5 w-5 text-gray-700" />
                </div>
                <h3 className="mb-2 font-semibold text-gray-900">{title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample report */}
      <section className="border-b bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900">This is what Monday mornings look like</h2>
            <p className="mt-3 text-gray-600">A real example from a restaurant client.</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b bg-gray-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                <span className="ml-2 text-sm text-gray-500">
                  Your patio is your #1 advantage — but Friday wait times are hurting you
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
              <div className="flex flex-col items-center rounded-lg bg-gray-50 p-6 text-center">
                <span className="text-4xl font-bold text-blue-600">82</span>
                <span className="mt-1 text-sm text-gray-500">Business Pulse</span>
                <span className="mt-1 text-xs font-medium text-green-600">↑ 6 points this week</span>
              </div>
              <div className="rounded-lg bg-green-50 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-700">Biggest Win</div>
                <p className="text-sm text-gray-800">Patio mentions up 27%. Customers connect you with atmosphere and live music.</p>
              </div>
              <div className="rounded-lg bg-red-50 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">Biggest Risk</div>
                <p className="text-sm text-gray-800">Friday wait-time complaints up 18%. Mostly 6–9pm window.</p>
              </div>
            </div>
            <div className="border-t px-6 py-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Best Move This Week</div>
              <p className="mt-1 text-sm text-gray-800">
                Set up a dedicated Friday night pickup station. Three nearby competitors are getting praised for fast takeout while you absorb the sit-down overflow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-b bg-white px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900">Simple pricing. Cancel anytime.</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                name: 'Starter',
                price: '$49',
                description: 'For single-location businesses getting started.',
                features: ['1 business', '3 competitors', 'Weekly brief', 'Google reviews', 'CSV upload', 'Basic dashboard'],
                cta: 'Get started',
              },
              {
                name: 'Pro',
                price: '$149',
                description: 'For growth-focused local businesses.',
                features: ['1 business', '10 competitors', 'Daily scans', 'AI recommendations', 'Trend alerts', 'All integrations'],
                cta: 'Most popular',
                highlighted: true,
              },
              {
                name: 'Growth',
                price: '$299',
                description: 'For multi-location businesses.',
                features: ['3 locations', '25 competitors', 'Faster scans', 'Advanced benchmarking', 'Team access', 'Monthly strategy report'],
                cta: 'Get started',
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-6 ${plan.highlighted ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white'}`}
              >
                <div className="mb-4">
                  <div className={`text-sm font-semibold ${plan.highlighted ? 'text-gray-300' : 'text-gray-500'}`}>{plan.name}</div>
                  <div className="mt-1 text-3xl font-bold">{plan.price}<span className={`text-base font-normal ${plan.highlighted ? 'text-gray-400' : 'text-gray-500'}`}>/mo</span></div>
                  <div className={`mt-2 text-sm ${plan.highlighted ? 'text-gray-400' : 'text-gray-600'}`}>{plan.description}</div>
                </div>
                <ul className="mb-6 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${plan.highlighted ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${plan.highlighted ? 'bg-blue-400' : 'bg-gray-400'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/onboarding"
                  className={`block rounded-lg px-4 py-2.5 text-center text-sm font-medium ${plan.highlighted ? 'bg-white text-gray-900 hover:bg-gray-100' : 'border border-gray-900 bg-transparent text-gray-900 hover:bg-gray-50'}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-gray-500">
            Agency plans start at $399/month. <Link href="/contact" className="underline">Contact us.</Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 px-6 py-12 text-gray-400">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 md:flex-row">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white">
                <span className="text-xs font-bold text-gray-900">W</span>
              </div>
              <span className="font-semibold text-white">Whistling.io</span>
            </div>
            <p className="mt-2 max-w-xs text-sm leading-relaxed">
              Customer intelligence for local businesses. Built for restaurants, spas, gyms, clinics, and every business that grows on word of mouth.
            </p>
          </div>
          <div className="flex gap-12 text-sm">
            <div>
              <div className="mb-3 font-medium text-white">Product</div>
              <div className="space-y-2">
                <Link href="#features" className="block hover:text-white">Features</Link>
                <Link href="#pricing" className="block hover:text-white">Pricing</Link>
                <Link href="/onboarding" className="block hover:text-white">Get started</Link>
              </div>
            </div>
            <div>
              <div className="mb-3 font-medium text-white">Legal</div>
              <div className="space-y-2">
                <Link href="/privacy" className="block hover:text-white">Privacy</Link>
                <Link href="/terms" className="block hover:text-white">Terms</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-6xl border-t border-gray-800 pt-6 text-xs">
          © {new Date().getFullYear()} Whistling.io. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
