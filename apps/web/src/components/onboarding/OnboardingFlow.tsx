'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { CheckCircle, ChevronRight, Building2, Globe, Users, Upload } from 'lucide-react'
import { BUSINESS_CATEGORIES } from '@whistling/domain'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

const STEPS = [
  { id: 'account', label: 'Account' },
  { id: 'business', label: 'Business profile' },
  { id: 'sources', label: 'Connect sources' },
  { id: 'competitors', label: 'Add competitors' },
]

const accountSchema = z
  .object({
    name: z.string().min(2, 'Name required'),
    email: z.string().email('Valid email required'),
    password: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

const businessSchema = z.object({
  name: z.string().min(2, 'Business name required'),
  category: z.enum(BUSINESS_CATEGORIES),
  city: z.string().min(1, 'City required'),
  state: z.string().min(1, 'State required'),
  websiteUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  goals: z.array(z.string()).optional(),
})

type AccountData = z.infer<typeof accountSchema>
type BusinessData = z.infer<typeof businessSchema>

const GOAL_OPTIONS = [
  'More bookings',
  'More foot traffic',
  'More positive reviews',
  'Better reputation',
  'Improve customer service',
  'Beat nearby competitors',
  'Find service gaps',
  'Grow social following',
]

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: 'Restaurant',
  cafe: 'Café',
  bar: 'Bar',
  retail: 'Retail store',
  health_wellness: 'Health & wellness',
  beauty_salon: 'Beauty salon',
  medical_dental: 'Medical / dental',
  home_services: 'Home services',
  fitness_gym: 'Fitness / gym',
  hospitality: 'Hospitality / hotel',
  professional_services: 'Professional services',
  auto_services: 'Auto services',
  pet_services: 'Pet services',
  education: 'Education',
  entertainment: 'Entertainment',
  other: 'Other',
}

export function OnboardingFlow() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const [sources, setSources] = useState<{ type: string; url: string }[]>([])
  const [competitors, setCompetitors] = useState<{ name: string; googleUrl: string }[]>([
    { name: '', googleUrl: '' },
  ])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)

  const accountForm = useForm<AccountData>({ resolver: zodResolver(accountSchema) })
  const businessForm = useForm<BusinessData>({ resolver: zodResolver(businessSchema) })

  const handleAccountSubmit = async (data: AccountData) => {
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await api.post<{ organizationId: string }>('/api/auth/sign-up', {
        name: data.name,
        email: data.email,
        password: data.password,
      })
      setOrgId(result.organizationId)
      setStep(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Account creation failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBusinessSubmit = async (data: BusinessData) => {
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await api.post<{ id: string }>('/api/businesses', {
        ...data,
        goals: selectedGoals,
      })
      setBusinessId(result.id)
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create business')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSourcesSubmit = async () => {
    setStep(3)
  }

  const handleCompetitorsSubmit = async () => {
    setError(null)
    setIsSubmitting(true)
    try {
      const validCompetitors = competitors.filter((c) => c.name.trim())
      for (const comp of validCompetitors) {
        await api.post(`/api/competitors/${businessId}`, comp)
      }

      // Kick off first scan
      if (businessId) {
        await api.post(`/api/businesses/${businessId}/scan`)
      }

      router.push(`/dashboard?businessId=${businessId}&firstScan=true`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save competitors')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {/* Progress */}
      <div className="mb-10">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                  i < step
                    ? 'bg-gray-900 text-white'
                    : i === step
                      ? 'border-2 border-gray-900 text-gray-900'
                      : 'border border-gray-300 text-gray-400',
                )}
              >
                {i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  'ml-2 hidden text-sm md:block',
                  i === step ? 'font-medium text-gray-900' : 'text-gray-500',
                )}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <ChevronRight className="mx-3 h-4 w-4 text-gray-300" />
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Step 0: Account */}
      {step === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-8">
          <h2 className="mb-2 text-xl font-bold text-gray-900">Create your account</h2>
          <p className="mb-6 text-sm text-gray-600">Start your 14-day free trial. No credit card required.</p>
          <form onSubmit={accountForm.handleSubmit(handleAccountSubmit)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Full name</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                {...accountForm.register('name')}
              />
              {accountForm.formState.errors.name && (
                <p className="mt-1 text-xs text-red-600">{accountForm.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                {...accountForm.register('email')}
              />
              {accountForm.formState.errors.email && (
                <p className="mt-1 text-xs text-red-600">{accountForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  {...accountForm.register('password')}
                />
                {accountForm.formState.errors.password && (
                  <p className="mt-1 text-xs text-red-600">{accountForm.formState.errors.password.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Confirm password</label>
                <input
                  type="password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  {...accountForm.register('confirmPassword')}
                />
                {accountForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">{accountForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {isSubmitting ? 'Creating account…' : 'Create account →'}
            </button>
          </form>
        </div>
      )}

      {/* Step 1: Business Profile */}
      {step === 1 && (
        <div className="rounded-xl border border-gray-200 bg-white p-8">
          <div className="mb-6 flex items-center gap-3">
            <Building2 className="h-5 w-5 text-gray-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Tell us about your business</h2>
              <p className="text-sm text-gray-600">This shapes your intelligence map.</p>
            </div>
          </div>
          <form onSubmit={businessForm.handleSubmit(handleBusinessSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Business name</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
                  {...businessForm.register('name')}
                />
                {businessForm.formState.errors.name && (
                  <p className="mt-1 text-xs text-red-600">{businessForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
                  {...businessForm.register('category')}
                >
                  <option value="">Select a category…</option>
                  {BUSINESS_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c] ?? c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
                  {...businessForm.register('city')}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">State</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
                  {...businessForm.register('state')}
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Website (optional)</label>
                <input
                  type="url"
                  placeholder="https://"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
                  {...businessForm.register('websiteUrl')}
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Current goals <span className="font-normal text-gray-500">(select all that apply)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {GOAL_OPTIONS.map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() =>
                      setSelectedGoals((prev) =>
                        prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
                      )
                    }
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      selectedGoals.includes(goal)
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-400',
                    )}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : 'Continue →'}
            </button>
          </form>
        </div>
      )}

      {/* Step 2: Connect Sources */}
      {step === 2 && (
        <div className="rounded-xl border border-gray-200 bg-white p-8">
          <div className="mb-6 flex items-center gap-3">
            <Globe className="h-5 w-5 text-gray-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Connect your profiles</h2>
              <p className="text-sm text-gray-600">We'll pull in your reviews and comments automatically.</p>
            </div>
          </div>
          <div className="mb-6 space-y-3">
            {[
              { type: 'google', label: 'Google Business Profile', icon: '⭐', helpText: 'Connect to pull in all Google reviews' },
              { type: 'instagram', label: 'Instagram', icon: '📷', helpText: 'Pull comments from your posts' },
              { type: 'facebook', label: 'Facebook', icon: '👍', helpText: 'Collect page reviews and comments' },
              { type: 'yelp', label: 'Yelp', icon: '🌟', helpText: 'Add your Yelp business link' },
            ].map((s) => (
              <div
                key={s.type}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{s.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{s.label}</div>
                    <div className="text-xs text-gray-500">{s.helpText}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => setSources((prev) => [...prev, { type: s.type, url: '' }])}
                >
                  Connect
                </button>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <Upload className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <strong>Or upload a CSV</strong> — you can import existing review exports from any platform. We'll analyze them immediately.
              </div>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={handleSourcesSubmit}
              className="flex-1 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Competitors */}
      {step === 3 && (
        <div className="rounded-xl border border-gray-200 bg-white p-8">
          <div className="mb-6 flex items-center gap-3">
            <Users className="h-5 w-5 text-gray-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add your competitors</h2>
              <p className="text-sm text-gray-600">
                This is what makes Whistling.io different from basic review tools. We'll track what customers say about them too.
              </p>
            </div>
          </div>
          <div className="mb-4 space-y-3">
            {competitors.map((comp, i) => (
              <div key={i} className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Competitor name"
                  value={comp.name}
                  onChange={(e) =>
                    setCompetitors((prev) =>
                      prev.map((c, j) => (j === i ? { ...c, name: e.target.value } : c)),
                    )
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
                />
                <input
                  placeholder="Google Maps link (optional)"
                  value={comp.googleUrl}
                  onChange={(e) =>
                    setCompetitors((prev) =>
                      prev.map((c, j) => (j === i ? { ...c, googleUrl: e.target.value } : c)),
                    )
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setCompetitors((prev) => [...prev, { name: '', googleUrl: '' }])}
            className="mb-6 text-sm font-medium text-gray-600 underline hover:text-gray-900"
          >
            + Add another competitor
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCompetitorsSubmit}
              disabled={isSubmitting}
              className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {isSubmitting ? 'Setting up your dashboard…' : 'Build my intelligence map →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
