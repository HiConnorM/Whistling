import type { Metadata } from 'next'
import { CheckCircle, Clock, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Recommendations' }

const RECOMMENDATIONS = [
  {
    id: '1',
    title: 'Simplify the new-patient booking flow',
    category: 'Website',
    priority: 'high',
    why: 'Online booking complaints are up 18% and cluster around first-time patients trying to schedule an initial evaluation. Your current form asks for insurance details before confirming availability — two competitors let patients see open slots first.',
    evidence: ['22 booking-friction mentions this week (+18%)', '11 reviews mention "hard to schedule"', 'Competitors praised 2x more for "easy online booking"'],
    suggestedAction: 'Reorder the intake form: show available slots first, collect insurance details after confirmation. Add a prominent "Call to book in 60 seconds" fallback for patients who prefer the phone.',
    estimatedImpact: 'Expected to reduce drop-off on the booking page and convert more new-patient inquiries.',
    difficulty: 'medium',
    suggestedTimeline: 'This week',
    status: 'new',
  },
  {
    id: '2',
    title: 'Promote patient outcomes in your Google profile',
    category: 'Marketing',
    priority: 'medium',
    why: 'Treatment results are mentioned positively in 38 reviews this week — more than any other topic. No direct competitor is owning the "results" message in your market. This is an underutilized differentiator.',
    evidence: ['38 outcome-focused reviews this week (+18%)', '0 competitors mentioned for treatment results', 'Staff attentiveness mentioned alongside outcomes in 71% of cases'],
    suggestedAction: 'Update your Google Business description to lead with outcomes. Add a "Patient success stories" post this week. Respond to three recent outcome-positive reviews to signal engagement.',
    estimatedImpact: 'Expected to improve click-through on Google profile and attract patients who are outcome-focused.',
    difficulty: 'easy',
    suggestedTimeline: 'This week',
    status: 'accepted',
  },
  {
    id: '3',
    title: 'Add evening and Saturday appointment slots',
    category: 'Operations',
    priority: 'high',
    why: 'Eight reviews in the past 30 days explicitly ask about evening or weekend availability. Nearby competitors who offer Saturday slots receive 3x more positive scheduling mentions. This is the single biggest scheduling gap vs. the competition.',
    evidence: ['8 explicit requests for evening or weekend slots', 'Competitors: 19 positive reviews mentioning Saturday hours', 'Current schedule ends at 5pm weekdays; no weekend hours'],
    suggestedAction: 'Pilot one late evening (until 7pm) on Tuesdays and Thursdays, plus Saturday morning. Announce via email to your existing patient list and update your Google hours immediately.',
    estimatedImpact: 'Expected to capture patients who currently choose competitors for scheduling convenience.',
    difficulty: 'medium',
    suggestedTimeline: '1–2 weeks',
    status: 'new',
  },
  {
    id: '4',
    title: 'Respond to the 4 unanswered 3-star reviews',
    category: 'Service',
    priority: 'medium',
    why: 'Four reviews from the past 14 days have received no response. All mention billing confusion or check-in wait time — issues that are fixable and worth acknowledging publicly. Responding to negative reviews within 48 hours measurably improves star rating over time.',
    evidence: ['4 unanswered reviews (avg 3.0 stars)', 'Topics: billing confusion (3), check-in wait (1)', 'Avg response time this month: 6.2 days'],
    suggestedAction: 'Reply to all four within 24 hours. Acknowledge the issue specifically, offer a direct contact (email or phone), and avoid generic copy. Use the response templates in Settings → Response Library.',
    estimatedImpact: 'Reduce likelihood of follow-up negative reviews and signal responsiveness to prospective patients.',
    difficulty: 'easy',
    suggestedTimeline: 'Today',
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
