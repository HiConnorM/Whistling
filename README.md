# Whistling.io

**Customer intelligence for local businesses.**

Connect your Google reviews, Instagram comments, Facebook mentions, and competitor profiles. Every Monday, get a clear brief on what customers are saying, what competitors are winning at, and what to fix next — distilled into a single Pulse Score and three actionable recommendations.

---

## What it does

Local business owners drown in scattered feedback. Whistling ingests reviews and social mentions from every source, runs them through an AI analysis pipeline, and surfaces only what matters:

- **Pulse Score** — a weekly 0–100 signal that tracks customer sentiment over time
- **Top Complaints & Praises** — the five topics customers mention most, with week-over-week trends
- **Competitor Benchmark** — how nearby competitors are being talked about vs. you
- **Weekly Brief** — a plain-English email every Monday: the win, the risk, the one move worth making

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS v3 |
| Fonts | Geist Sans/Mono (UI), Cabinet Grotesk (display) |
| Motion | Framer Motion (`motion/react`) + GSAP + ScrollTrigger |
| Auth | Better Auth + Prisma adapter |
| API | Fastify 5, `@fastify/helmet`, `@fastify/rate-limit` |
| Database | PostgreSQL + pgvector + pg_trgm + citext |
| ORM | Prisma 6 |
| Jobs | BullMQ (Redis) |
| AI | OpenAI |
| Email | React Email |
| Monorepo | Turborepo + pnpm workspaces |
| Testing | Vitest |
| Language | TypeScript 5 throughout |

---

## Repository structure

```
whistling/
├── apps/
│   ├── web/          # Next.js frontend (public site + dashboard)
│   ├── api/          # Fastify REST API server
│   └── worker/       # BullMQ job worker (ingestion + analysis)
│
└── packages/
    ├── db/           # Prisma schema, client, and query helpers
    ├── domain/       # Zod schemas, types, and business-logic constants
    ├── ai/           # OpenAI wrapper and prompt library
    ├── analysis/     # Sentiment scoring and recommendation engine
    ├── connectors/   # Data-source connectors (Google, Meta, CSV)
    ├── jobs/         # BullMQ queue definitions and job payloads
    ├── email/        # React Email templates
    ├── config/       # Shared ESLint / TypeScript / Tailwind configs
    └── ui/           # Shared Radix-based component primitives
```

### `apps/web` — Next.js frontend

```
src/
├── app/
│   ├── page.tsx                  # Landing page (composed sections)
│   ├── auth/sign-in|sign-up/     # Authentication pages
│   ├── onboarding/               # New-user setup flow
│   ├── dashboard/                # Main dashboard
│   └── api/                      # Next.js API routes (BFF layer)
│       ├── auth/[...all]/        # Better Auth catch-all
│       ├── businesses/           # CRUD + source connection
│       ├── competitors/          # Competitor management
│       ├── onboarding/           # Org creation
│       └── health/               # Liveness probe
│
├── components/
│   ├── marketing/                # Landing page sections and primitives
│   │   └── landing/              # Hero, Nav, Pricing, CtaBand, etc.
│   ├── motion/                   # GSAP + Framer Motion primitives
│   │   ├── Reveal.tsx            # Scroll-triggered fade-up
│   │   ├── RevealStagger.tsx     # Staggered child reveals
│   │   ├── KineticHeadline.tsx   # Word-by-word hero entrance
│   │   ├── MagneticButton.tsx    # Cursor-tracking magnetic effect
│   │   ├── StickyStack.tsx       # GSAP pin + card stack scrub
│   │   └── HorizontalPan.tsx     # GSAP horizontal scroll scene
│   ├── dashboard/                # Dashboard widgets
│   ├── auth/                     # Sign-in/up forms + AuthShell
│   ├── onboarding/               # Multi-step onboarding flow
│   └── layout/                   # Sidebar
│
├── lib/
│   ├── api-error.ts              # ApiError class + apiHandler wrapper
│   ├── rate-limit.ts             # In-process sliding-window rate limiter
│   ├── session.ts                # getSession / requireSession helpers
│   └── utils.ts                  # cn(), formatters
│
├── middleware.ts                  # Auth guard + rate limiting
└── styles/globals.css             # Design token CSS variables
```

---

## Getting started

### Prerequisites

| Requirement | Version |
|---|---|
| Node.js | >= 20.0.0 (use `nvm use 20`) |
| pnpm | >= 10.0.0 |
| PostgreSQL | >= 15 with `pgvector` extension |
| Redis | >= 7 |

### 1. Clone and install

```bash
git clone https://github.com/HiConnorM/Whistling.git
cd Whistling
nvm use 20
pnpm install
```

### 2. Set up environment variables

Copy the example file and fill in your values:

```bash
cp apps/web/.env.example apps/web/.env.local
```

**Required variables (`apps/web/.env.local`):**

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/whistling

# Auth (generate a random 32+ char string)
BETTER_AUTH_SECRET=your-secret-here
BETTER_AUTH_URL=http://localhost:3000

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Redis (for job queue)
REDIS_URL=redis://localhost:6379
```

### 3. Set up the database

```bash
# Run migrations
pnpm db:migrate

# (Optional) Seed with sample data
pnpm --filter @whistling/db db:seed
```

The schema requires the `pgvector`, `pg_trgm`, and `citext` PostgreSQL extensions. Enable them once:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;
```

### 4. Run locally

```bash
# All apps in parallel (web + api + worker)
pnpm dev

# Or run just the web frontend
pnpm --filter @whistling/web dev
```

The web app runs on **http://localhost:3000** by default. The dev launch config in `.claude/launch.json` also supports starting on port 3940 via the Claude Preview MCP.

---

## Development workflow

### Common commands

```bash
# Type-check all packages
pnpm typecheck

# Run tests
pnpm --filter @whistling/web test          # unit tests (Vitest)
pnpm --filter @whistling/web test:coverage # with coverage report

# Lint
pnpm lint

# Format
pnpm format

# Database
pnpm db:migrate        # run pending migrations (production-safe)
pnpm db:migrate:dev    # create + run a new migration (dev only)
pnpm db:studio         # open Prisma Studio at localhost:5555
pnpm db:generate       # regenerate Prisma client after schema changes
```

### Bypassing auth in local dev

When you have no database set up yet, add this to `apps/web/.env.local`:

```env
BYPASS_AUTH=true
```

This makes the middleware skip all session checks so you can browse every protected route (dashboard, onboarding, etc.) without signing in. **Never set this outside of local development** — it is not present in any deployed environment and the check is compiled out in the middleware logic.

Remove or set to `false` to re-enable auth.

---

## Architecture

### Request flow

```
Browser
  └── Next.js middleware          (auth guard, rate limiting)
        └── Next.js App Router    (pages + server components)
              ├── BFF API routes  (/api/*)   → PostgreSQL via Prisma
              └── Fastify API     (:3001)    → PostgreSQL + Redis
                    └── BullMQ worker        → AI analysis pipeline
                          └── Connectors     (Google, Meta, CSV)
```

### Data pipeline

1. **Connect** — user links review sources (Google, Instagram, Facebook, Yelp, TripAdvisor, CSV upload) during onboarding
2. **Ingest** — the worker polls each source connector and stores raw mentions in PostgreSQL
3. **Analyse** — AI pipeline scores sentiment, extracts topics, detects trends, and generates recommendations
4. **Pulse** — a 0–100 score is calculated from weighted sentiment signals across all sources
5. **Brief** — every Monday, a React Email template is compiled and sent with the week's summary

### Authentication

Better Auth handles sessions with a Prisma adapter backed by PostgreSQL. Sessions are JWT-free (database-backed token lookup) with a 7-day expiry and a 5-minute cookie cache to reduce DB hits on every request.

### Job queue

BullMQ on Redis. Queue: `ingestion`. Job types:

| Job | Trigger | Description |
|---|---|---|
| `scan-source` | Manual ("Run scan") or scheduled | Fetches new mentions from a connected source |
| `analyse-business` | After ingestion | Runs AI scoring for a business period |
| `send-weekly-brief` | Weekly cron | Compiles and sends the Monday email |

---

## Design system

The frontend uses a locked single-accent token system. **All accents are coral — nothing else.**

| Token | Value | Use |
|---|---|---|
| Canvas | `#FFFFFF` | Page background |
| Surface / border | `#E5E6E9` | Cards, hairlines |
| Brand (coral) | `#E85B56` | Accent, links, focus rings, CTA band |
| Text primary | `#16171A` | Headlines, body |
| Text muted | `#6B6E76` | Sub-copy, captions |

**Typography:**
- Display headings — Cabinet Grotesk variable (self-hosted)
- Body / UI — Geist Sans
- Numbers / meta — Geist Mono

**Motion budget:**
- Hero kinetic entrance + magnetic CTA
- Scroll reveals on every section (reduced-motion gated)
- GSAP horizontal-pan (Capabilities section)
- GSAP sticky-stack (Sample Report section)
- One marquee (logo wall)

All motion components respect `prefers-reduced-motion` and collapse to static layouts.

---

## API routes (BFF layer)

The Next.js app exposes a thin BFF (backend-for-frontend) layer under `/api`. All routes use the `apiHandler` wrapper which maps errors to structured JSON with no stack-trace leakage.

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness + DB readiness probe |
| `GET/POST` | `/api/businesses` | List / create businesses |
| `GET/POST` | `/api/businesses/:id/sources` | List / connect data sources |
| `POST` | `/api/businesses/:id/scan` | Queue an ingestion job |
| `POST` | `/api/competitors/:businessId` | Add a competitor |
| `POST` | `/api/onboarding/organization` | Create org + membership + trial |
| `*` | `/api/auth/[...all]` | Better Auth catch-all |

### Error response format

Every error returns a consistent shape:

```json
{ "error": "Human-readable message here" }
```

| Scenario | Status |
|---|---|
| Not authenticated | `401` |
| Forbidden (wrong org) | `403` |
| Resource not found | `404` |
| Validation failed | `400` |
| Unique constraint | `409` |
| Plan limit reached | `402` |
| No connected sources | `422` |
| Queue unavailable | `503` |
| Unexpected error | `500` (logged server-side only) |

---

## Security

### HTTP headers (every response)

| Header | Value |
|---|---|
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | camera, mic, geolocation, browsing-topics all disabled |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `Content-Security-Policy` | `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'` |

### Rate limiting

Sensitive endpoints (`/api/auth/*`, `/api/onboarding/*`) are rate-limited to **20 requests per 60 seconds per IP**. Exceeded requests receive `429` with a `Retry-After: 60` header.

The current implementation uses an in-process sliding-window Map. For multi-instance deployments, swap the store in `src/lib/rate-limit.ts` for `@upstash/ratelimit` — the interface is identical.

---

## Testing

```bash
pnpm --filter @whistling/web test
```

**4 test files, 39 tests** — all unit, no I/O:

| File | What it covers |
|---|---|
| `api-error.test.ts` | Error class, Prisma code mapping, handler wrapper, arg forwarding |
| `rate-limit.test.ts` | Quota enforcement, window reset (fake timers), key isolation |
| `slug.test.ts` | Org-name to URL-slug edge cases (symbols, unicode, collisions) |
| `security-headers.test.ts` | All 7 required headers present with correct values |

---

## Dependency notes

### kysely patch

`@better-auth/kysely-adapter@1.6.14` imports `DEFAULT_MIGRATION_TABLE` and `DEFAULT_MIGRATION_LOCK_TABLE` from the `kysely` main entry. In `kysely@0.29.2` these were moved to the `kysely/migration` subpath. A one-line patch re-exports them from `dist/index.js`:

```
patches/kysely@0.29.2.patch
```

This is registered in `package.json` under `pnpm.patchedDependencies` and applied automatically on `pnpm install`.

### Node version

Next.js 15 requires Node `^18.18.0 || >=20.0.0`. The repo ships with `"node": ">=20.0.0"` in `engines`. If you use nvm:

```bash
nvm use 20
```

---

## Deployment

### Environment variables (production)

All variables from the local `.env.local` table above are required. **Do not set `BYPASS_AUTH` in any deployed environment.**

### Build

```bash
nvm use 20
pnpm install
pnpm build
```

### Health check

Point your load balancer or uptime monitor at:

```
GET /api/health
```

Returns `200 { status: "ok" }` when the database is reachable, `503 { status: "degraded" }` otherwise.

### Scaling

The web app is stateless (sessions in PostgreSQL, jobs in Redis). Any number of instances can run behind a load balancer. The worker can also be scaled horizontally — BullMQ handles concurrency and deduplication.

---

## Contributing

1. Branch from `main`
2. `pnpm typecheck` and `pnpm --filter @whistling/web test` must pass
3. No em-dashes (`—`) in any user-facing copy
4. All new motion components must include a `useReducedMotion` static fallback
5. New API routes must use `apiHandler` from `src/lib/api-error.ts`

---

## License

Private — all rights reserved. Not open source.
