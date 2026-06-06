import type { Metadata } from 'next'
import Link from 'next/link'
import { SignInForm } from '@/components/auth/SignInForm'
import { AuthShell } from '@/components/auth/AuthShell'

export const metadata: Metadata = { title: 'Sign In' }

export default function SignInPage() {
  return (
    <AuthShell
      heading="Welcome back"
      subheading="Sign in to pick up where your last brief left off."
      footer={
        <>
          No account yet?{' '}
          <Link href="/onboarding" className="font-medium text-brand underline-offset-4 hover:underline">
            Start free
          </Link>
        </>
      }
    >
      <SignInForm />
    </AuthShell>
  )
}
