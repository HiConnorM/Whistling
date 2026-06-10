import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { db } from '@whistling/db'
import { getSession } from '@/lib/session'
import { apiProxy, mintApiToken } from '@/lib/api-proxy'
import { SourcesManager, type SourceRow } from '@/components/sources/SourcesManager'

export const metadata: Metadata = { title: 'Data Sources' }
export const dynamic = 'force-dynamic'

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/auth/sign-in')

  const membership = await db.orgMembership.findFirst({
    where: { userId: session.user.id },
    select: { organizationId: true },
  })
  if (!membership) redirect('/onboarding')

  const businesses = await db.business.findMany({
    where: { organizationId: membership.organizationId, isActive: true },
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  })
  if (businesses.length === 0) redirect('/onboarding')

  const { businessId: requestedId } = await searchParams
  const business = businesses.find((b) => b.id === requestedId) ?? businesses[0]!

  const auth = {
    userId: session.user.id,
    organizationId: membership.organizationId,
    token: mintApiToken({ userId: session.user.id, organizationId: membership.organizationId }),
  }

  let sources: SourceRow[] = []
  let apiOffline = false
  try {
    sources = await apiProxy<SourceRow[]>(`/api/sources/${business.id}`, { auth })
  } catch {
    apiOffline = true
  }

  return (
    <div className="p-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Data Sources</h1>
        <p className="mt-1 text-sm text-gray-500">{business.name}</p>
      </div>

      {apiOffline ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          The Whistling API isn&apos;t reachable. Start it with{' '}
          <code className="rounded bg-amber-100 px-1">pnpm dev</code> (it runs on port 3001), then
          reload this page.
        </div>
      ) : (
        <SourcesManager businessId={business.id} initialSources={sources} />
      )}
    </div>
  )
}
