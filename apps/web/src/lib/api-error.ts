/**
 * Structured API error and handler wrapper for Next.js App Router routes.
 *
 * Usage:
 *   export const GET = apiHandler(async (req) => { ... })
 *   throw new ApiError(404, 'Not found')
 */
import { NextResponse } from 'next/server'

// ─── Typed error class ───────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ─── Prisma error shape ──────────────────────────────────────────────────────

interface PrismaKnownError {
  code: string
  meta?: Record<string, unknown>
}

function isPrismaError(err: unknown, code: string): err is PrismaKnownError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as PrismaKnownError).code === code
  )
}

// ─── Error → Response mapping ────────────────────────────────────────────────

export function errorResponse(err: unknown): NextResponse {
  // Explicit API errors (thrown by route handlers)
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }

  // Prisma: unique constraint violation
  if (isPrismaError(err, 'P2002')) {
    return NextResponse.json(
      { error: 'A record with this value already exists.' },
      { status: 409 },
    )
  }

  // Prisma: record required but not found
  if (isPrismaError(err, 'P2025')) {
    return NextResponse.json({ error: 'Record not found.' }, { status: 404 })
  }

  // Prisma: foreign key constraint
  if (isPrismaError(err, 'P2003')) {
    return NextResponse.json({ error: 'Related record not found.' }, { status: 422 })
  }

  // Malformed JSON body (req.json() throws SyntaxError)
  if (err instanceof SyntaxError) {
    return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 })
  }

  // Anything else: log server-side, return generic message (no stack leak)
  console.error('[API]', err)
  return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
}

// ─── Handler wrapper ─────────────────────────────────────────────────────────

type RouteHandler<TArgs extends unknown[]> = (...args: TArgs) => Promise<NextResponse>

/**
 * Wraps a route handler with automatic error handling.
 * All uncaught errors are converted to structured JSON responses.
 */
export function apiHandler<TArgs extends unknown[]>(
  fn: RouteHandler<TArgs>,
): RouteHandler<TArgs> {
  return async (...args: TArgs): Promise<NextResponse> => {
    try {
      return await fn(...args)
    } catch (err) {
      return errorResponse(err)
    }
  }
}
