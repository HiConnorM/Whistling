import { NextResponse } from 'next/server'
import { db } from '@whistling/db'

/**
 * GET /api/health
 *
 * Liveness + readiness probe suitable for load balancers and uptime monitors.
 * Returns 200 when the app and database are reachable, 503 otherwise.
 */
export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {}

  try {
    await db.$queryRaw`SELECT 1`
    checks.database = 'ok'
  } catch {
    checks.database = 'error'
  }

  const healthy = Object.values(checks).every((v) => v === 'ok')

  return NextResponse.json(
    { status: healthy ? 'ok' : 'degraded', checks, ts: new Date().toISOString() },
    { status: healthy ? 200 : 503 },
  )
}
