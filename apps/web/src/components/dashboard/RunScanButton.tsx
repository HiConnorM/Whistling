'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export function RunScanButton({ businessId, disabled }: { businessId: string; disabled?: boolean }) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runScan = async () => {
    setIsPending(true)
    setError(null)
    try {
      const res = await fetch(`/api/businesses/${businessId}/scan`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to queue scan')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue scan')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={runScan}
        disabled={disabled || isPending}
        className={cn(
          'flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800',
          (disabled || isPending) && 'cursor-not-allowed opacity-60',
        )}
      >
        <RefreshCw className={cn('h-4 w-4', isPending && 'animate-spin')} />
        {isPending ? 'Queueing…' : 'Run scan'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
