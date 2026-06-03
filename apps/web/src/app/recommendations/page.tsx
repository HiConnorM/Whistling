import type { Metadata } from 'next'
import { CheckCircle, Clock, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Recommendations' }

const RECOMMENDATIONS = [
  {
    id: '1',
    title: 'Set up a dedicated Friday pickup station',
    category: 'Operations',
    priority: 'high',
    why: 'Wait-time complaints are concentrated on Friday evenings between 6–9pm. Your data shows 22 complaints about service speed in the past week, up 31% from the previous period. Three nearby competitors are praised specifically for fast pickup service.',
    evidence: ['22 wait-time complaints this week (+31%)', '14 reviews mention "Friday" specifically', 'Competitors praised 3x more for pickup speed'],
    suggestedAction: 'Designate a separate counter or section for to-go and pickup orders during Friday dinner service. Staff one person specifically for this queue.',
    estimatedImpact: 'Expected to reduce wait-time complaints by 40-60% within 2 weeks of testing.',
    difficulty: 'medium',
    suggestedTimeline: 'Test for 2 consecutive Fridays',
    status: 'new',
  },
  {
    id: '2',
    title: 'Build a patio marketing campaign',
    category: 'Marketing',
    priority: 'medium',
    why: 'Your patio is mentioned positively in 41 reviews this week — more than any other feature. No direct competitor owns "atmosphere" or "outdoor dining" in your market. This is a unique differentiator you are underutilizing.',
    evidence: ['41 patio mentions this week (+27%)', '0 competitors mentioned for outdoor dining', 'Live music nights generate 3x more shares'],
    suggestedAction: 'Create 3 Instagram posts this week featuring the patio. Run a simple $50 boosted post targeting local food/dining interests.',
    estimatedImpact: 'Expected to increase new customer discovery and patio-specific bookings.',
    difficulty: 'easy',
    suggestedTimeline: 'This week',
    status: 'accepted',
  },
  {
    id: '3',
    title: 'Add or promote online ordering',
    category: 'Website',
    priority: 'high',
    why: 'Customers are explicitly asking for online ordering in 8 different reviews. Nearby competitors receive 3x more positive mentions for this feature. This is the single biggest operational gap when compared to competitors.',
    evidence: ['8 explicit customer requests for online ordering', 'Competitors: 22 positive mentions of ordering apps', 'Yelp: 3 reviews mention your competitors for this specifically'],
    suggestedAction: 'Integrate Toast or Square for online ordering. Takes ~2 hours to set up. Promote with a social post and Google Business update.',
    estimatedImpact: 'Expected to capture 15-25% of customers currently choosing competitors for convenience.',
    difficulty: 'medium',
    suggestedTimeline: '1–2 weeks',
    status: 'new',
  },
  {
    id: '4',
    title: 'Address margarita consistency',
    category: 'Operations',
    priority: 'medium',
    why: '9 customers mentioned inconsistent margarita strength or quality. This is a kitchen/bar training issue that creates a bad impression on high-margin items.',
    evidence: ['9 mentions of margarita inconsistency', 'Average sentiment: mixed', 'Price-vs-value complaints often accompany margarita feedback'],
    suggestedAction: 'Standardize the margarita recipe with measured pours. Train all bar staff on the same process. Do a quality-check shift.',
    estimatedImpact: 'Reduce drink-related complaints and improve table spend confidence.',
    difficulty: 'easy',
    suggestedTimeline: 'This week',
    status: 'new',
  },
]

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-600',
  critical: 'bg-red-100 text-red-700',
}

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700',
  accepted: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  dismissed: 'bg-gray-50 text-gray-400',
}

export default function RecommendationsPage() {
  const newCount = RECOMMENDATIONS.filter((r) => r.status === 'new').length
  const acceptedCount = RECOMMENDATIONS.filter((r) => r.status === 'accepted').length

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recommendations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Data-driven actions to improve your business this week
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-gray-400" />
            {newCount} new
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-green-500" />
            {acceptedCount} accepted
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {RECOMMENDATIONS.map((rec) => (
          <div key={rec.id} className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className={cn('rounded px-2 py-0.5 text-xs font-semibold uppercase', PRIORITY_STYLES[rec.priority])}>
                    {rec.priority}
                  </span>
                  <span className={cn('rounded px-2 py-0.5 text-xs font-medium', STATUS_STYLES[rec.status])}>
                    {rec.status}
                  </span>
                  <span className="text-xs text-gray-500">{rec.category}</span>
                </div>
                <h3 className="text-base font-semibold text-gray-900">{rec.title}</h3>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-xs text-gray-500">
                <Clock className="h-3.5 w-3.5" />
                {rec.suggestedTimeline}
              </div>
            </div>

            <p className="mb-4 text-sm leading-relaxed text-gray-700">{rec.why}</p>

            <div className="mb-4 rounded-lg bg-gray-50 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Suggested action</div>
              <p className="text-sm text-gray-800">{rec.suggestedAction}</p>
            </div>

            <div className="mb-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Evidence</div>
              <div className="flex flex-wrap gap-2">
                {rec.evidence.map((e) => (
                  <span key={e} className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700">
                    {e}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Expected impact: <span className="font-medium text-gray-700">{rec.estimatedImpact}</span>
              </div>
              {rec.status === 'new' && (
                <div className="flex gap-2">
                  <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                    Dismiss
                  </button>
                  <button className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Accept
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
