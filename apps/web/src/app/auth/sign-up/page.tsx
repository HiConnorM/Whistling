import type { Metadata } from 'next'
import Link from 'next/link'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { AuthShell } from '@/components/auth/AuthShell'

export const metadata: Metadata = { title: 'Create Account' }

export default function SignUpPage() {
  return (
    <AuthShell
      heading="Start for free"
      subheading="Setup takes a few minutes. Your first weekly brief lands within a day."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/auth/sign-in" className="font-medium text-brand underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  )
}
