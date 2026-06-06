import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import { ApiError, apiHandler, errorResponse } from '../api-error'

// Minimal NextResponse stub — avoids pulling in the full Next.js runtime
vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => ({ body, status: init?.status ?? 200 }),
  },
}))

describe('ApiError', () => {
  it('carries status and message', () => {
    const err = new ApiError(404, 'Not found')
    expect(err.status).toBe(404)
    expect(err.message).toBe('Not found')
    expect(err.name).toBe('ApiError')
    expect(err).toBeInstanceOf(Error)
  })
})

describe('errorResponse', () => {
  it('maps ApiError to the correct status', () => {
    const res = errorResponse(new ApiError(403, 'Forbidden')) as { body: unknown; status: number }
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'Forbidden' })
  })

  it('maps Prisma P2002 (unique) to 409', () => {
    const err = Object.assign(new Error('unique'), { code: 'P2002' })
    const res = errorResponse(err) as { body: unknown; status: number }
    expect(res.status).toBe(409)
    expect((res.body as { error: string }).error).toMatch(/already exists/)
  })

  it('maps Prisma P2025 (not found) to 404', () => {
    const err = Object.assign(new Error('notfound'), { code: 'P2025' })
    const res = errorResponse(err) as { body: unknown; status: number }
    expect(res.status).toBe(404)
  })

  it('maps Prisma P2003 (FK) to 422', () => {
    const err = Object.assign(new Error('fk'), { code: 'P2003' })
    const res = errorResponse(err) as { body: unknown; status: number }
    expect(res.status).toBe(422)
  })

  it('maps SyntaxError (bad JSON) to 400', () => {
    const res = errorResponse(new SyntaxError('Unexpected token')) as { body: unknown; status: number }
    expect(res.status).toBe(400)
    expect((res.body as { error: string }).error).toMatch(/JSON/)
  })

  it('maps unknown errors to 500 without leaking details', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = errorResponse(new Error('DB connection refused')) as { body: unknown; status: number }
    expect(res.status).toBe(500)
    expect((res.body as { error: string }).error).not.toMatch(/connection refused/)
    consoleSpy.mockRestore()
  })
})

describe('apiHandler', () => {
  it('passes through successful responses unchanged', async () => {
    const handler = apiHandler(async () => NextResponse.json({ ok: true }) as unknown as ReturnType<typeof NextResponse.json>)
    const res = await handler() as unknown as { body: unknown; status: number }
    expect(res.body).toEqual({ ok: true })
  })

  it('catches thrown ApiError and returns structured JSON', async () => {
    const handler = apiHandler(async () => {
      throw new ApiError(422, 'Unprocessable')
    })
    const res = await handler() as unknown as { body: unknown; status: number }
    expect(res.status).toBe(422)
    expect(res.body).toEqual({ error: 'Unprocessable' })
  })

  it('catches uncaught errors and returns 500', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const handler = apiHandler(async () => {
      throw new TypeError('Cannot read properties of undefined')
    })
    const res = await handler() as unknown as { body: unknown; status: number }
    expect(res.status).toBe(500)
    consoleSpy.mockRestore()
  })

  it('forwards args to the wrapped handler', async () => {
    const handler = apiHandler(async (n: number) => NextResponse.json({ n }) as unknown as ReturnType<typeof NextResponse.json>)
    const res = await handler(42) as unknown as { body: { n: number }; status: number }
    expect(res.body.n).toBe(42)
  })
})
