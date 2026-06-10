'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Re-fetches server data on an interval while a scan or analysis is in flight. */
export function ScanAutoRefresh({ active, intervalMs = 15_000 }: { active: boolean; intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(id)
  }, [active, intervalMs, router])

  return null
}
