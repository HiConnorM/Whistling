import type { Metadata } from 'next'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'
import { Logo } from '@/components/marketing/landing/Logo'

export const metadata: Metadata = { title: 'Get Started' }

export default function OnboardingPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-muted">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Logo />
          <span className="hidden text-sm text-muted-foreground sm:block">
            Set up your intelligence map
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <OnboardingFlow />
      </main>
    </div>
  )
}
