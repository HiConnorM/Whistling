import type { Metadata } from 'next'
import { MentionsFilter } from '@/components/mentions/MentionsFilter'
import { MentionsList } from '@/components/mentions/MentionsList'

export const metadata: Metadata = { title: 'Mentions' }

export default function MentionsPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mentions</h1>
        <p className="mt-1 text-sm text-gray-500">Every review and comment, analyzed and searchable</p>
      </div>
      <div className="flex gap-6">
        <div className="w-56 shrink-0">
          <MentionsFilter />
        </div>
        <div className="flex-1">
          <MentionsList />
        </div>
      </div>
    </div>
  )
}
