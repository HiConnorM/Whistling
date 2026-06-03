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
            biggestWin="Patio mentions increased 27% this week. Customers are connecting you with atmosphere and live music — your strongest differentiator right now."
            biggestRisk="Wait-time complaints increased 18%, mostly on Friday evenings between 6–9pm."
            bestAction="Set up a dedicated Friday pickup station. Three nearby competitors are being praised for fast takeout while your dine-in overflow creates friction."
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
            { topic: 'Wait time', count: 22, change: 18 },
            { topic: 'Parking', count: 14, change: -5 },
            { topic: 'Margarita consistency', count: 9, change: 3 },
            { topic: 'Price confusion', count: 7, change: 0 },
            { topic: 'Noise level', count: 5, change: -8 },
          ]}
        />
        <TopPraisesCard
          praises={[
            { topic: 'Patio atmosphere', count: 41, change: 27 },
            { topic: 'Staff friendliness', count: 38, change: 5 },
            { topic: 'Fajitas', count: 29, change: 12 },
            { topic: 'Live music nights', count: 24, change: 19 },
            { topic: 'Value for money', count: 18, change: -2 },
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
                title: 'Reduce Friday wait-time complaints',
                category: 'operations',
                priority: 'high',
                why: 'Wait-time complaints are up 18% and concentrated on Friday evenings. Three competitor reviews specifically praise pickup speed.',
                difficulty: 'medium',
                suggestedTimeline: 'Test for 2 Fridays',
              },
              {
                id: '2',
                title: 'Amplify your patio advantage in marketing',
                category: 'marketing',
                priority: 'medium',
                why: 'Patio is mentioned positively 41 times this week — more than any other single topic. No competitor is winning on atmosphere.',
                difficulty: 'easy',
                suggestedTimeline: 'This week',
              },
              {
                id: '3',
                title: 'Add or promote online ordering',
                category: 'website',
                priority: 'high',
                why: 'Nearby competitors receive 3x more positive mentions for online ordering than you. Customers are asking for it explicitly.',
                difficulty: 'medium',
                suggestedTimeline: '2–4 weeks',
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
