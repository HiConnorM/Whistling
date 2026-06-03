import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Business */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Business Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Business name</label>
              <input
                defaultValue="George's Restaurant"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none">
                <option>Restaurant</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
                <input defaultValue="Mandeville" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">State</label>
                <input defaultValue="LA" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none" />
              </div>
            </div>
            <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
              Save changes
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Email Notifications</h2>
          <div className="space-y-4">
            {[
              { label: 'Weekly intelligence brief', description: 'Every Monday morning', enabled: true },
              { label: 'Critical complaint alerts', description: 'When severity 4+ complaints spike', enabled: true },
              { label: 'Competitor activity alerts', description: 'When significant competitor changes detected', enabled: false },
              { label: 'Monthly strategy report', description: 'Deep monthly analysis and trends', enabled: false },
            ].map((notification) => (
              <div key={notification.label} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{notification.label}</div>
                  <div className="text-xs text-gray-500">{notification.description}</div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" defaultChecked={notification.enabled} className="peer sr-only" />
                  <div className="peer h-5 w-9 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-gray-900 peer-checked:after:translate-x-4 peer-focus:outline-none" />
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Subscription */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Subscription</h2>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Pro</span>
                <span className="text-sm text-gray-500">$149/month · renews Jan 1, 2026</span>
              </div>
            </div>
            <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Manage billing
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h2 className="mb-2 text-base font-semibold text-red-900">Danger Zone</h2>
          <p className="mb-4 text-sm text-red-700">
            Deleting your account will remove all business profiles, data, and reports permanently.
          </p>
          <button className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
            Delete account
          </button>
        </div>
      </div>
    </div>
  )
}
