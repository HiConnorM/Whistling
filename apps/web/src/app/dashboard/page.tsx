import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PulseScoreCard } from '@/components/dashboard/PulseScoreCard'
import { KeyInsightCards } from '@/components/dashboard/KeyInsightCards'
import { TopComplaintsCard } from '@/components/dashboard/TopComplaintsCard'
import { TopPraisesCard } from '@/components/dashboard/TopPraisesCard'
import { RecommendationsPanel } from '@/components/dashboard/RecommendationsPanel'
import { SourceHealthPanel } from '@/components/dashboard/SourceHealthPanel'
import { PulseHistoryChart } from '@/components/dashboard/PulseHistoryChart'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'

export const metadata: Metadata = { title: 'Dashboard' }

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Week of {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          Run scan
        </button>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}

async function DashboardContent() {
  // In production this would use server-side data fetching
  return (
    <div className="space-y-6">
      {/* Top row: Pulse + 3 key cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <PulseScoreCard score={82} previous={76} />
        <div className="col-span-3">
          <KeyInsightCards
            biggestWin="Staff attentiveness mentions increased 22% this week. Customers are connecting you with personalized care — your strongest differentiator right now."
            biggestRisk="Online booking complaints increased 18%, mostly from new patients trying to schedule an initial visit."
            bestAction="Fix the intake form or add a direct-call CTA. Eleven reviews mention difficulty booking online — two nearby competitors are winning on 'easy scheduling.'"
          />
        </div>
      </div>

      {/* Pulse history */}
      <PulseHistoryChart
        data={[
          { date: 'Nov 4', score: 71 },
          { date: 'Nov 11', score: 68 },
          { date: 'Nov 18', score: 74 },
          { date: 'Nov 25', score: 76 },
          { date: 'Dec 2', score: 82 },
        ]}
      />

      {/* Middle row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopComplaintsCard
          complaints={[
            { topic: 'Online booking friction', count: 22, change: 18 },
            { topic: 'Wait after check-in', count: 14, change: 4 },
            { topic: 'Insurance billing questions', count: 9, change: -3 },
            { topic: 'Parking availability', count: 7, change: 0 },
            { topic: 'After-hours access', count: 5, change: -6 },
          ]}
        />
        <TopPraisesCard
          praises={[
            { topic: 'Staff attentiveness', count: 41, change: 22 },
            { topic: 'Treatment results', count: 38, change: 18 },
            { topic: 'Appointment flexibility', count: 29, change: 8 },
            { topic: 'Clean facility', count: 24, change: 5 },
            { topic: 'Clear communication', count: 18, change: 11 },
          ]}
        />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="col-span-2">
          <RecommendationsPanel
            recommendations={[
              {
                id: '1',
                title: 'Simplify the online booking flow',
                category: 'website',
                priority: 'high',
                why: 'Booking complaints are up 18% and cluster around new patients. Two competitors are winning on "easy scheduling."',
                difficulty: 'medium',
                suggestedTimeline: 'This week',
              },
              {
                id: '2',
                title: 'Promote treatment results in your marketing',
                category: 'marketing',
                priority: 'medium',
                why: 'Treatment outcomes are mentioned positively 38 times this week — your strongest differentiator. No competitor is owning this message.',
                difficulty: 'easy',
                suggestedTimeline: 'This week',
              },
              {
                id: '3',
                title: 'Add evening and Saturday appointment slots',
                category: 'operations',
                priority: 'high',
                why: 'Eleven reviews mention scheduling difficulty, and eight specifically ask about evening or weekend availability.',
                difficulty: 'medium',
                suggestedTimeline: '1–2 weeks',
              },
            ]}
          />
        </div>
        <SourceHealthPanel
          sources={[
            { type: 'Google', status: 'connected', lastScanned: '2 hours ago', count: 847 },
            { type: 'Instagram', status: 'connected', lastScanned: '3 hours ago', count: 412 },
            { type: 'Facebook', status: 'connected', lastScanned: '3 hours ago', count: 198 },
            { type: 'CSV Import', status: 'connected', lastScanned: 'Yesterday', count: 124 },
            { type: 'Yelp', status: 'needs_setup', lastScanned: null, count: 0 },
          ]}
        />
      </div>
    </div>
  )
}
