'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { CheckCircle, ChevronRight, Building2, Globe, Users, Link2, Check } from 'lucide-react'
import { BUSINESS_CATEGORIES, SOURCE_CAPABILITIES } from '@whistling/domain'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 'org', label: 'Workspace' },
  { id: 'business', label: 'Business profile' },
  { id: 'sources', label: 'Connect sources' },
  { id: 'competitors', label: 'Add competitors' },
]

const orgSchema = z.object({
  name: z.string().min(2, 'Workspace name required'),
})

const businessSchema = z.object({
  name: z.string().min(2, 'Business name required'),
  category: z.enum(BUSINESS_CATEGORIES),
  city: z.string().min(1, 'City required'),
  state: z.string().min(1, 'State required'),
  websiteUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
})

type OrgData = z.infer<typeof orgSchema>
type BusinessData = z.infer<typeof businessSchema>

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: 'Restaurant', cafe: 'Café', bar: 'Bar', retail: 'Retail store',
  health_wellness: 'Health & wellness', beauty_salon: 'Beauty salon',
  medical_dental: 'Medical / dental', home_services: 'Home services',
  fitness_gym: 'Fitness / gym', hospitality: 'Hospitality / hotel',
  professional_services: 'Professional services', auto_services: 'Auto services',
  pet_services: 'Pet services', education: 'Education', entertainment: 'Entertainment',
  other: 'Other',
}

const GOAL_OPTIONS = [
  'More bookings', 'More foot traffic', 'More positive reviews', 'Better reputation',
  'Improve customer service', 'Beat nearby competitors', 'Find service gaps', 'Grow social following',
]

const ONBOARDING_SOURCES = [
  { type: 'google' as const, label: 'Google Business Profile', icon: '⭐' },
  { type: 'yelp' as const, label: 'Yelp', icon: '🌟' },
  { type: 'tripadvisor' as const, label: 'TripAdvisor', icon: '🦉' },
  { type: 'instagram' as const, label: 'Instagram', icon: '📷' },
  { type: 'facebook' as const, label: 'Facebook', icon: '👍' },
]

type ConnectedSource = { type: string; url?: string }

async function apiFetch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Request failed')
  return data as T
}

export function OnboardingFlow() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const [connectedSources, setConnectedSources] = useState<ConnectedSource[]>([])
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({})
  const [competitors, setCompetitors] = useState([{ name: '', googleUrl: '' }])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [businessId, setBusinessId] = useState<string | null>(null)

  const orgForm = useForm<OrgData>({ resolver: zodResolver(orgSchema) })
  const businessForm = useForm<BusinessData>({ resolver: zodResolver(businessSchema) })

  const handleOrgSubmit = async (data: OrgData) => {
    setError(null)
    setIsSubmitting(true)
    try {
      await apiFetch('/api/onboarding/organization', { name: data.name })
      setStep(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBusinessSubmit = async (data: BusinessData) => {
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await apiFetch<{ id: string }>('/api/businesses', {
        ...data,
        goals: selectedGoals,
        websiteUrl: data.websiteUrl || undefined,
      })
      setBusinessId(result.id)
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create business')
    } finally {
      setIsSubmitting(false)
    }
  }

  const connectSource = async (type: string, url?: string) => {
    if (!businessId) return
    if (connectedSources.some((s) => s.type === type)) return
    try {
      await apiFetch(`/api/businesses/${businessId}/sources`, { type, url })
      setConnectedSources((prev) => [...prev, { type, url }])
    } catch {
      // non-fatal: user can connect later in Settings
    }
  }

  const handleUrlConnect = async (type: string) => {
    const url = urlInputs[type]?.trim()
    if (!url) return
    await connectSource(type, url)
  }

  const handleCompetitorsSubmit = async () => {
    setError(null)
    setIsSubmitting(true)
    try {
      const valid = competitors.filter((c) => c.name.trim())
      for (const comp of valid) {
        await apiFetch(`/api/competitors/${businessId}`, comp)
      }
      if (businessId) {
        await apiFetch(`/api/businesses/${businessId}/scan`, {})
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
              {i < STEPS.length - 1 && <ChevronRight className="mx-3 h-4 w-4 text-gray-300" />}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Step 0: Workspace */}
      {step === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-8">
          <h2 className="mb-2 text-xl font-bold text-gray-900">Name your workspace</h2>
          <p className="mb-6 text-sm text-gray-600">This is how your team will recognize your Whistling.io account.</p>
          <form onSubmit={orgForm.handleSubmit(handleOrgSubmit)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Workspace name</label>
              <input
                placeholder="e.g. Sunrise Coffee Co."
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                {...orgForm.register('name')}
              />
              {orgForm.formState.errors.name && (
                <p className="mt-1 text-xs text-red-600">{orgForm.formState.errors.name.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {isSubmitting ? 'Creating…' : 'Continue →'}
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
                    <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
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
              <h2 className="text-xl font-bold text-gray-900">Connect your review profiles</h2>
              <p className="text-sm text-gray-600">We'll pull in reviews and comments automatically.</p>
            </div>
          </div>
          <div className="mb-6 space-y-3">
            {ONBOARDING_SOURCES.map(({ type, label, icon }) => {
              const cap = SOURCE_CAPABILITIES[type]
              const isConnected = connectedSources.some((s) => s.type === type)
              const isUrlMode = cap.mode === 'public_url'

              return (
                <div key={type} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{icon}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{label}</div>
                        <div className="text-xs text-gray-500">{cap.connectHint}</div>
                      </div>
                    </div>
                    {isConnected ? (
                      <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                        <Check className="h-3 w-3" /> Connected
                      </span>
                    ) : isUrlMode ? null : (
                      <button
                        type="button"
                        onClick={() => connectSource(type)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        {cap.connectLabel}
                      </button>
                    )}
                  </div>
                  {isUrlMode && !isConnected && (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="url"
                        placeholder={cap.urlPlaceholder ?? 'https://'}
                        value={urlInputs[type] ?? ''}
                        onChange={(e) => setUrlInputs((prev) => ({ ...prev, [type]: e.target.value }))}
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleUrlConnect(type)}
                        disabled={!urlInputs[type]?.trim()}
                        className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-40 hover:bg-gray-800"
                      >
                        <Link2 className="h-3 w-3" /> Save
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
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
                We'll track what customers say about them too — that's what makes Whistling.io different.
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
                    setCompetitors((prev) => prev.map((c, j) => (j === i ? { ...c, name: e.target.value } : c)))
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
                />
                <input
                  placeholder="Google Maps link (optional)"
                  value={comp.googleUrl}
                  onChange={(e) =>
                    setCompetitors((prev) => prev.map((c, j) => (j === i ? { ...c, googleUrl: e.target.value } : c)))
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
              onClick={() => router.push(`/dashboard${businessId ? `?businessId=${businessId}` : ''}`)}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={handleCompetitorsSubmit}
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {isSubmitting ? 'Setting up your dashboard…' : 'Build my intelligence map →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
