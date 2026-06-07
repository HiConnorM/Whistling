import type { Metadata } from 'next'
import { BookOpen, Calendar, TrendingUp } from 'lucide-react'

export const metadata: Metadata = { title: 'Weekly Briefs' }

const MOCK_REPORTS = [
  { id: '1', period: 'Dec 2 – Dec 8, 2025', pulse: 87, pulsePrev: 78, biggestWin: 'Treatment outcome reviews up 18% — patients are sharing results unprompted', biggestRisk: 'Online booking complaints up 18% from new patients', sentAt: 'Dec 9, 2025' },
  { id: '2', period: 'Nov 25 – Dec 1, 2025', pulse: 78, pulsePrev: 74, biggestWin: 'Staff attentiveness at an all-time high in patient feedback', biggestRisk: 'Scheduling friction — 8 reviews ask for evening or weekend hours', sentAt: 'Dec 2, 2025' },
  { id: '3', period: 'Nov 18 – Nov 24, 2025', pulse: 74, pulsePrev: 69, biggestWin: 'Appointment availability mentions improved after adding Tuesday late hours', biggestRisk: 'Insurance billing questions spiked — 9 mentions, up from 3', sentAt: 'Nov 25, 2025' },
]

export default function ReportsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Weekly Briefs</h1>
        <p className="mt-1 text-sm text-gray-500">Your complete history of customer intelligence reports</p>
      </div>

      {/* Latest report highlight */}
      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-700" />
            <span className="text-sm font-semibold text-blue-700">Latest Report</span>
          </div>
          <span className="text-xs text-blue-600">Dec 2 – Dec 8, 2025</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col items-center rounded-lg bg-white p-4 text-center">
            <span className="text-3xl font-bold text-blue-600">82</span>
            <span className="mt-1 text-xs text-gray-500">Pulse Score</span>
            <span className="mt-1 text-xs font-medium text-green-600">↑ +6 pts</span>
          </div>
          <div className="rounded-lg bg-white p-4">
            <div className="mb-1 text-xs font-semibold text-green-700">Biggest Win</div>
            <p className="text-sm text-gray-800">Treatment outcome reviews up 18%. Patients are sharing results unprompted — your strongest differentiator.</p>
          </div>
          <div className="rounded-lg bg-white p-4">
            <div className="mb-1 text-xs font-semibold text-red-700">Biggest Risk</div>
            <p className="text-sm text-gray-800">Online booking complaints up 18%, mostly from new patients scheduling initial visits.</p>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
            View full report
          </button>
          <button className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100">
            Generate next report
          </button>
        </div>
      </div>

      {/* Report history */}
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Report History</h2>
      <div className="space-y-3">
        {MOCK_REPORTS.map((report) => {
          const change = report.pulsePrev ? report.pulse - report.pulsePrev : 0
          return (
            <div key={report.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 hover:border-gray-300">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-gray-100">
                  <span className="text-lg font-bold text-gray-900">{report.pulse}</span>
                  <span className="text-xs text-gray-400">pts</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{report.period}</span>
                    {change !== 0 && (
                      <div className={`flex items-center gap-0.5 text-xs font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        <TrendingUp className="h-3 w-3" />
                        {change > 0 ? '+' : ''}{change}
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Win: {report.biggestWin}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Calendar className="h-3.5 w-3.5" />
                  Sent {report.sentAt}
                </div>
                <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                  View
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
