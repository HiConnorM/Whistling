import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/dashboard', '/mentions', '/recommendations', '/reports', '/competitors', '/sources', '/settings', '/onboarding']
const AUTH_ROUTES = ['/auth/sign-in', '/auth/sign-up']

type Session = {
  user: { id: string; email: string; name: string }
  session: { id: string }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p))

  if (!isProtected && !isAuthRoute) return NextResponse.next()

  const res = await fetch(new URL('/api/auth/get-session', request.nextUrl.origin), {
    headers: { cookie: request.headers.get('cookie') ?? '' },
  })
  const session: Session | null = res.ok ? await res.json() : null

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
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'
  ],
}
