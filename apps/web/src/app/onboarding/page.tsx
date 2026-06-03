import type { Metadata } from 'next'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'

export const metadata: Metadata = { title: 'Get Started' }

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900">
              <span className="text-xs font-bold text-white">W</span>
            </div>
            <span className="font-semibold text-gray-900">Whistling.io</span>
          </div>
          <span className="text-sm text-gray-500">Set up your intelligence map</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <OnboardingFlow />
      </main>
    </div>
  )
}
