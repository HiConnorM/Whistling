'use client'

import { useState, type ComponentType, type SVGProps } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, ChevronRight, Building2, Globe, Users, Link2, ArrowRight, Plus } from 'lucide-react'
import { BUSINESS_CATEGORIES, BUSINESS_CATEGORY_GROUPS, SOURCE_CAPABILITIES } from '@whistling/domain'
import { cn } from '@/lib/utils'
import {
  GoogleMark,
  YelpMark,
  TripadvisorMark,
  InstagramMark,
  FacebookMark,
  TrustpilotMark,
  AmazonMark,
  ShopifyMark,
  AppStoreMark,
} from '@/components/marketing/landing/BrandLogos'

// ─── Step IDs ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'org', label: 'Workspace' },
  { id: 'business', label: 'Business profile' },
  { id: 'sources', label: 'Connect sources' },
  { id: 'competitors', label: 'Add competitors' },
]

// ─── Schemas ─────────────────────────────────────────────────────────────────

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

// ─── Category labels ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  // Food & Beverage
  restaurant: 'Restaurant', cafe: 'Café', bar: 'Bar / Nightclub',
  coffee_shop: 'Coffee Shop', bakery: 'Bakery', food_truck: 'Food Truck', catering: 'Catering',
  // Fitness & Wellness
  gym_fitness: 'Gym / Fitness Studio', yoga_studio: 'Yoga / Pilates Studio', martial_arts: 'Martial Arts Studio',
  // Beauty & Personal Care
  hair_salon: 'Hair Salon', barber_shop: 'Barber Shop', spa: 'Spa', med_spa: 'Med Spa',
  nail_salon: 'Nail Salon', tattoo_shop: 'Tattoo & Piercing',
  // Pet Services
  veterinarian: 'Veterinarian', pet_grooming: 'Pet Grooming', pet_boarding: 'Pet Boarding & Daycare',
  // Auto Services
  auto_repair: 'Auto Repair / Mechanic', car_wash: 'Car Wash & Detailing', auto_dealership: 'Auto Dealership',
  // Home & Trade Services
  plumbing: 'Plumbing', electrical: 'Electrical', hvac: 'HVAC', roofing: 'Roofing',
  landscaping: 'Landscaping & Lawn Care', cleaning_services: 'Cleaning Services',
  moving_company: 'Moving Company', general_contractor: 'General Contractor',
  // Healthcare
  dental: 'Dental Office', chiropractic: 'Chiropractic', physical_therapy: 'Physical Therapy',
  mental_health: 'Therapy / Counseling', primary_care: 'Primary Care', urgent_care: 'Urgent Care',
  dermatology: 'Dermatology', vision_care: 'Vision / Eye Care', wellness_clinic: 'Wellness Clinic',
  // Hospitality & Experiences
  hotel: 'Hotel / Boutique Inn', event_venue: 'Event & Wedding Venue',
  golf_country_club: 'Golf Course / Country Club', entertainment_attraction: 'Entertainment & Attraction',
  tour_travel: 'Tour & Travel Company',
  // Retail
  boutique: 'Boutique / Clothing', specialty_retail: 'Specialty Retail', jewelry_store: 'Jewelry Store',
  furniture_home: 'Furniture & Home Décor', florist: 'Florist', sporting_goods: 'Sporting Goods',
  bookstore: 'Bookstore & Gift Shop',
  // Professional Services
  law_firm: 'Law Firm', accounting_tax: 'Accounting & Tax', real_estate: 'Real Estate',
  insurance_agency: 'Insurance Agency', marketing_agency: 'Marketing Agency',
  consulting: 'Consulting', architecture_design: 'Architecture & Design',
  // Education & Childcare
  daycare_preschool: 'Daycare & Preschool', tutoring_center: 'Tutoring Center',
  music_dance_arts: 'Music, Dance & Arts School', trade_vocational_school: 'Trade & Vocational School',
  // Online & Digital
  ecommerce: 'eCommerce / Online Store', saas_software: 'SaaS / Software',
  mobile_app: 'Mobile App', online_course_community: 'Online Courses & Community',
  creator_brand: 'Creator / Brand',
  // Legacy
  retail: 'Retail', health_wellness: 'Health & Wellness', beauty_salon: 'Beauty Salon',
  medical_dental: 'Medical / Dental', home_services: 'Home Services', fitness_gym: 'Fitness / Gym',
  hospitality: 'Hospitality', professional_services: 'Professional Services',
  auto_services: 'Auto Services', pet_services: 'Pet Services',
  education: 'Education', entertainment: 'Entertainment',
  other: 'Other',
}

// ─── Goal options ─────────────────────────────────────────────────────────────

const GOAL_OPTIONS = [
  'More bookings or appointments',
  'More 5-star reviews',
  'Better reputation score',
  'Understand why customers churn',
  'Beat nearby competitors',
  'Improve customer experience',
  'Find service gaps',
  'Grow social following',
  'Reduce refunds or complaints',
  'Track product feedback',
]

// ─── Source definitions ───────────────────────────────────────────────────────

type SourceMark = ComponentType<SVGProps<SVGSVGElement>>

interface SourceEntry {
  type: 'google' | 'yelp' | 'tripadvisor' | 'instagram' | 'facebook' | 'trustpilot' | 'amazon' | 'shopify' | 'app_store'
  label: string
  Mark: SourceMark
}

const ALL_SOURCE_ENTRIES: SourceEntry[] = [
  { type: 'google', label: 'Google Business Profile', Mark: GoogleMark },
  { type: 'yelp', label: 'Yelp', Mark: YelpMark },
  { type: 'tripadvisor', label: 'TripAdvisor', Mark: TripadvisorMark },
  { type: 'instagram', label: 'Instagram', Mark: InstagramMark },
  { type: 'facebook', label: 'Facebook', Mark: FacebookMark },
  { type: 'trustpilot', label: 'Trustpilot', Mark: TrustpilotMark },
  { type: 'amazon', label: 'Amazon', Mark: AmazonMark },
  { type: 'shopify', label: 'Shopify', Mark: ShopifyMark },
  { type: 'app_store', label: 'App Store', Mark: AppStoreMark },
]

const ONLINE_CATEGORIES = new Set([
  'ecommerce', 'saas_software', 'mobile_app', 'online_course_community', 'creator_brand',
])

const HOSPITALITY_CATEGORIES = new Set([
  'hotel', 'event_venue', 'golf_country_club', 'entertainment_attraction', 'tour_travel',
  'restaurant', 'cafe', 'bar', 'food_truck', 'catering',
])

function getRecommendedSources(category: string): SourceEntry[] {
  if (ONLINE_CATEGORIES.has(category)) {
    return ALL_SOURCE_ENTRIES.filter((s) =>
      ['google', 'trustpilot', 'amazon', 'shopify', 'app_store'].includes(s.type),
    )
  }
  if (HOSPITALITY_CATEGORIES.has(category)) {
    return ALL_SOURCE_ENTRIES.filter((s) =>
      ['google', 'yelp', 'tripadvisor', 'instagram', 'facebook'].includes(s.type),
    )
  }
  // Default: local/service businesses
  return ALL_SOURCE_ENTRIES.filter((s) =>
    ['google', 'yelp', 'facebook', 'instagram', 'trustpilot'].includes(s.type),
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────

type ConnectedSource = { type: string; url?: string }

const fieldClass =
  'w-full rounded-md border border-input bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-ring/30'
const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-[transform,background-color] duration-200 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60'
const ghostBtn =
  'inline-flex items-center justify-center gap-2 rounded-md border border-border bg-transparent px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-foreground/25 hover:bg-secondary/60'

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

// ─── Component ────────────────────────────────────────────────────────────────

export function OnboardingFlow() {
  const router = useRouter()
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const [connectedSources, setConnectedSources] = useState<ConnectedSource[]>([])
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({})
  const [competitors, setCompetitors] = useState([{ name: '', googleUrl: '' }])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')

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
      setSelectedCategory(data.category)
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

  const stepMotion = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
      }

  const card = 'rounded-[14px] border border-border bg-card p-8'

  function renderStep() {
    // Step 0: Workspace
    if (step === 0) {
      return (
        <div className={card}>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Name your workspace
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This is how your team will recognize your Whistling.io account.
          </p>
          <form onSubmit={orgForm.handleSubmit(handleOrgSubmit)} className="mt-6 space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Workspace name
              </label>
              <input
                placeholder="e.g. Sunrise Dental Group"
                className={fieldClass}
                {...orgForm.register('name')}
              />
              {orgForm.formState.errors.name && (
                <p className="mt-1.5 text-xs text-destructive">
                  {orgForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <button type="submit" disabled={isSubmitting} className={cn(primaryBtn, 'w-full')}>
              {isSubmitting ? 'Creating' : 'Continue'}
              {!isSubmitting && <ArrowRight className="h-4 w-4" strokeWidth={1.75} />}
            </button>
          </form>
        </div>
      )
    }

    // Step 1: Business profile
    if (step === 1) {
      return (
        <div className={card}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Building2 className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                Tell us about your business
              </h2>
              <p className="text-sm text-muted-foreground">This shapes your intelligence map.</p>
            </div>
          </div>
          <form onSubmit={businessForm.handleSubmit(handleBusinessSubmit)} className="mt-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Business name
                </label>
                <input className={fieldClass} {...businessForm.register('name')} />
                {businessForm.formState.errors.name && (
                  <p className="mt-1.5 text-xs text-destructive">
                    {businessForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-foreground">Category</label>
                <select className={fieldClass} {...businessForm.register('category')}>
                  <option value="">Select a category</option>
                  {BUSINESS_CATEGORY_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.categories.map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_LABELS[c] ?? c}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {businessForm.formState.errors.category && (
                  <p className="mt-1.5 text-xs text-destructive">
                    {businessForm.formState.errors.category.message}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">City</label>
                <input
                  placeholder="e.g. Austin"
                  className={fieldClass}
                  {...businessForm.register('city')}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">State</label>
                <input
                  placeholder="e.g. TX"
                  className={fieldClass}
                  {...businessForm.register('state')}
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Website <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://"
                  className={fieldClass}
                  {...businessForm.register('websiteUrl')}
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Current goals{' '}
                <span className="font-normal text-muted-foreground">(select all that apply)</span>
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
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      selectedGoals.includes(goal)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border text-muted-foreground hover:border-foreground/30',
                    )}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={isSubmitting} className={cn(primaryBtn, 'w-full')}>
              {isSubmitting ? 'Saving' : 'Continue'}
              {!isSubmitting && <ArrowRight className="h-4 w-4" strokeWidth={1.75} />}
            </button>
          </form>
        </div>
      )
    }

    // Step 2: Connect sources
    if (step === 2) {
      const recommendedSources = getRecommendedSources(selectedCategory)

      return (
        <div className={card}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Globe className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                Connect your review profiles
              </h2>
              <p className="text-sm text-muted-foreground">
                We pull in reviews and comments automatically.
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {recommendedSources.map(({ type, label, Mark }) => {
              const cap = SOURCE_CAPABILITIES[type]
              const isConnected = connectedSources.some((s) => s.type === type)
              const isUrlMode = cap.mode === 'public_url'

              return (
                <div key={type} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
                        <Mark className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-sm font-medium text-foreground">{label}</div>
                        <div className="text-xs text-muted-foreground">{cap.connectHint}</div>
                      </div>
                    </div>
                    {isConnected ? (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
                        <Check className="h-3 w-3" strokeWidth={2} /> Connected
                      </span>
                    ) : isUrlMode ? null : (
                      <button
                        type="button"
                        onClick={() => connectSource(type)}
                        className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-foreground/25 hover:bg-secondary/60"
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
                        className={cn(fieldClass, 'flex-1')}
                      />
                      <button
                        type="button"
                        onClick={() => handleUrlConnect(type)}
                        disabled={!urlInputs[type]?.trim()}
                        className={cn(primaryBtn, 'px-3 py-2 text-xs')}
                      >
                        <Link2 className="h-3 w-3" strokeWidth={1.75} /> Save
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-6 flex gap-3">
            <button type="button" onClick={() => setStep(3)} className={ghostBtn}>
              Skip for now
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className={cn(primaryBtn, 'flex-1')}
            >
              Continue
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )
    }

    // Step 3: Competitors
    return (
      <div className={card}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Users className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Add your competitors
            </h2>
            <p className="text-sm text-muted-foreground">
              We track what customers say about them too. That is the part most tools skip.
            </p>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {competitors.map((comp, i) => (
            <div key={i} className="grid grid-cols-2 gap-3">
              <input
                placeholder="Competitor name"
                value={comp.name}
                onChange={(e) =>
                  setCompetitors((prev) => prev.map((c, j) => (j === i ? { ...c, name: e.target.value } : c)))
                }
                className={fieldClass}
              />
              <input
                placeholder="Google Maps link (optional)"
                value={comp.googleUrl}
                onChange={(e) =>
                  setCompetitors((prev) => prev.map((c, j) => (j === i ? { ...c, googleUrl: e.target.value } : c)))
                }
                className={fieldClass}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setCompetitors((prev) => [...prev, { name: '', googleUrl: '' }])}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand transition-colors hover:text-brand/80"
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} /> Add another competitor
        </button>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => router.push(`/dashboard${businessId ? `?businessId=${businessId}` : ''}`)}
            className={ghostBtn}
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={handleCompetitorsSubmit}
            disabled={isSubmitting}
            className={cn(primaryBtn, 'flex-1')}
          >
            {isSubmitting ? 'Setting up your dashboard' : 'Build my intelligence map'}
            {!isSubmitting && <ArrowRight className="h-4 w-4" strokeWidth={1.75} />}
          </button>
        </div>
      </div>
    )
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
                    ? 'bg-primary text-primary-foreground'
                    : i === step
                      ? 'border-2 border-brand text-brand'
                      : 'border border-border text-muted-foreground',
                )}
              >
                {i < step ? <Check className="h-4 w-4" strokeWidth={2} /> : i + 1}
              </div>
              <span
                className={cn(
                  'ml-2 hidden text-sm md:block',
                  i === step ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <ChevronRight className="mx-3 h-4 w-4 text-muted-foreground/40" strokeWidth={1.75} />
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} {...stepMotion}>
          {renderStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
