import crypto from 'node:crypto'
import { db } from '@whistling/db'
import { getSession } from './session'
import { ApiError } from './api-error'

/**
 * Server-side bridge from the Next.js app to the Fastify API.
 *
 * The Fastify API owns all business logic for source creation, scans, and the
 * dashboard (usage enforcement, SSRF/allowlist validation, Apify metadata,
 * audit logs, org rate limits). Web BFF routes must proxy through it rather
 * than duplicating that logic against the database.
 *
 * Auth: we mint a short-lived HS256 JWT with the same secret @fastify/jwt
 * verifies (API_JWT_SECRET). The secret never reaches the browser — this
 * module is server-only.
 */

const API_URL =
  process.env['API_URL'] ?? process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

function getJwtSecret(): string {
  const secret = process.env['API_JWT_SECRET']
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('API_JWT_SECRET is required in production')
  }
  // Must match the dev fallback in apps/api/src/plugins/auth.ts
  return 'dev-only-api-jwt-secret-do-not-use-in-production!!'
}

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString('base64url')

/** Mint a short-lived HS256 JWT the Fastify API accepts. */
export function mintApiToken(payload: { userId: string; organizationId: string }): string {
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + 5 * 60 }))
  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(`${header}.${body}`)
    .digest('base64url')
  return `${header}.${body}.${signature}`
}

export interface ApiAuthContext {
  userId: string
  organizationId: string
  token: string
}

/** Resolve the current Better Auth session to an API auth context. */
export async function getApiAuthContext(): Promise<ApiAuthContext> {
  const session = await getSession()
  if (!session) throw new ApiError(401, 'Unauthorized')

  const membership = await db.orgMembership.findFirst({
    where: { userId: session.user.id },
    select: { organizationId: true },
  })
  if (!membership) throw new ApiError(404, 'No organization found')

  return {
    userId: session.user.id,
    organizationId: membership.organizationId,
    token: mintApiToken({
      userId: session.user.id,
      organizationId: membership.organizationId,
    }),
  }
}

/**
 * Call the Fastify API as the current user. Throws ApiError with the API's
 * status and message on non-2xx responses so BFF routes propagate them as-is.
 */
export async function apiProxy<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: ApiAuthContext } = {},
): Promise<T> {
  const auth = options.auth ?? (await getApiAuthContext())

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${auth.token}`,
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
    })
  } catch {
    throw new ApiError(503, 'API server is unreachable. Is `pnpm dev` running the api app?')
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    throw new ApiError(res.status, data?.error ?? `API request failed (${res.status})`)
  }

  return res.json() as Promise<T>
}
