import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/mentions',
  '/recommendations',
  '/reports',
  '/competitors',
  '/sources',
  '/settings',
  '/onboarding',
]
const AUTH_ROUTES = ['/auth/sign-in', '/auth/sign-up']

// Rate-limit sensitive endpoints: 20 req / 60 s per IP
const RATE_LIMITED_PREFIXES = ['/api/auth', '/api/onboarding']

type Session = {
  user: { id: string; email: string; name: string }
  session: { id: string }
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const isRateLimited = RATE_LIMITED_PREFIXES.some((p) => pathname.startsWith(p))
  if (isRateLimited) {
    const ip = getIp(request)
    const allowed = rateLimit(`${ip}:${pathname.split('/').slice(0, 3).join('/')}`, {
      limit: 20,
      windowMs: 60_000,
    })
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a moment.' },
        {
          status: 429,
          headers: { 'Retry-After': '60' },
        },
      )
    }
  }

  // ── Auth guard ─────────────────────────────────────────────────────────────
  // Dev bypass: set BYPASS_AUTH=true in .env.local to skip auth checks locally.
  // Never set this in production — it is not present in any deployed env.
  if (process.env.BYPASS_AUTH === 'true') return NextResponse.next()

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p))

  if (!isProtected && !isAuthRoute) return NextResponse.next()

  const res = await fetch(new URL('/api/auth/get-session', request.nextUrl.origin), {
    headers: { cookie: request.headers.get('cookie') ?? '' },
  })
  let session: Session | null = null
  if (res.ok) {
    try {
      const text = await res.text()
      session = text ? (JSON.parse(text) as Session) : null
    } catch {
      session = null
    }
  }

  if (isProtected && !session) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/sign-in'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)', '/api/auth/:path*', '/api/onboarding/:path*'],
}
