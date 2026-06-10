# Google Reviews Ingestion — Local End-to-End Test

Proves the primary pipeline on your machine:

**Google Maps URL → real Apify run → RawItems + Mentions in DB → AI analysis → dashboard updates.**

---

## Prerequisites

| What | Why |
|------|-----|
| Docker | Postgres (pgvector) + Redis |
| `APIFY_API_TOKEN` in `.env` | Runs `compass/google-maps-reviews-scraper` (costs a few cents per run) |
| `OPENAI_API_KEY` in `.env` | Classifies mentions into MentionAnalysis |

Stripe, Resend, and Google Places keys are **not** required for this test — they are
optional in development.

## 1. Environment

```bash
cp .env.example .env
# Edit .env and set at minimum:
#   APIFY_API_TOKEN=apify_api_...        (from console.apify.com → Settings → API tokens)
#   OPENAI_API_KEY=sk-...
#   API_JWT_SECRET=<any 32+ char string>
#   BETTER_AUTH_SECRET=<any 32+ char string>
#   ENCRYPTION_KEY=<64 hex chars>  → node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`.env` is git-ignored and must never be committed.

## 2. Infrastructure + migrations

```bash
docker compose -f infra/docker-compose.yml up -d
cd packages/db
pnpm prisma migrate dev        # applies prisma/migrations/0_init
pnpm prisma generate
cd ../..
```

## 3. Start everything

```bash
pnpm dev
# web    → http://localhost:3000
# api    → http://localhost:3001  (health: curl localhost:3001/health)
# worker → BullMQ consumer (watch its logs in the turbo TUI)
```

## 4. Create the test organization, business, and source (via the UI)

1. Visit `http://localhost:3000/auth/sign-up` and create an account.
2. Complete onboarding: workspace name → business profile. This creates the
   Organization (with a 14-day STARTER trial subscription) and Business.
3. On the **Connect sources** step (or later at `/sources`), find **Google Reviews**
   and paste a real Google Maps business URL, e.g.
   `https://www.google.com/maps/place/Joe's+Pizza/@40.730,-73.985,17z/...`
4. Click **Connect**. The API validates the URL against the Google domain allowlist
   and writes the source with metadata:

```json
{
  "strategy": "apify",
  "actorKey": "googleMapsReviews",
  "actorId": "compass/google-maps-reviews-scraper",
  "mediaType": "review",
  "scanDepth": "light",
  "maxItems": 150
}
```

(Review sources never have an `ingestionPlan` — that's only for multi-step social
comment sources, see `TEST_SOCIAL_INGESTION.md`.)

## 5. Queue the scan

Click **Scan now** on the source card (or **Run scan** on the dashboard). This calls
`POST /api/sources/:id/scan` on the Fastify API, which enforces plan limits and queues
the `scan-source` job.

API alternative (mint a token by signing in via UI is easier, but for raw curl):

```bash
curl -X POST http://localhost:3001/api/sources/<sourceId>/scan \
  -H "Authorization: Bearer <jwt>"
```

## 6. Wait / poll the ProviderRun

The worker starts the Apify actor, then polls every 60s (`collect-apify-run`).
A light Google scan typically finishes in 1–3 minutes.

```bash
docker exec -it $(docker ps -qf name=postgres) psql -U whistling -d whistling
```

```sql
-- 6a. ProviderRun lifecycle: PENDING → RUNNING → SUCCEEDED (never 'COMPLETED')
SELECT id, "actorId", status, "requestedMaxItems", "collectedItems",
       "startedAt", "finishedAt", "errorMessage"
FROM provider_runs ORDER BY "startedAt" DESC LIMIT 5;
```

## 7. Verify the data chain

```sql
-- 7a. RawItems (one per scraped review)
SELECT count(*) FROM raw_items;

-- 7b. Mentions (normalized customer signals)
SELECT "sourceType", "authorName", rating, left(text, 60) AS text, "publishedAt"
FROM mentions ORDER BY "publishedAt" DESC LIMIT 10;

-- 7c. MentionAnalysis (written by the analysis worker's classify-mentions-batch)
SELECT m."authorName", a.sentiment, a."sentimentScore", a.topics, a."businessArea"
FROM mention_analyses a JOIN mentions m ON m.id = a."mentionId"
LIMIT 10;

-- 7d. UsageLedger (signals + estimated Apify/OpenAI cost tracked per period)
SELECT "collectedSignals", "apifyRuns", "estimatedApifyCostCents",
       "openaiInputTokens", "estimatedOpenAICostCents", "estimatedTotalCostCents"
FROM usage_ledger;

-- 7e. Source freshness anchors (must be set after a successful run)
SELECT status, "lastScannedAt", "lastSuccessfulScanAt", "totalItemsCollected", "errorCount"
FROM business_sources;
```

> Column names are camelCase quoted identifiers; table names are snake_case
> (Prisma `@@map`). Adjust if your psql version complains about quoting.

## 8. Verify the dashboard

Reload `http://localhost:3000/dashboard`. Expected progression of `scanState`
(returned by `GET /api/dashboard/:businessId` and rendered as the banner):

| State | Banner |
|-------|--------|
| `no_sources` | "No sources connected yet…" |
| `sources_connected` | "Source connected. Ready to scan." |
| `scanning` | "Scanning latest reviews…" (auto-refreshes every 15s) |
| `analysis_pending` | "Analyzing comments…" |
| `ready` | "Ready: X customer signals found this week." |
| `scan_failed` | "Scan failed: edit the source URL or retry." |

## 9. Second scan = incremental

Run **Scan now** again. Because `lastSuccessfulScanAt` is now set, the worker derives
`scanMode = weekly_incremental` / `freshnessMode = since_last_scan`: the actor input is
capped to the incremental window, and collection early-stops at the first review older
than the last successful scan — no full history backfill.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| API exits on boot: "Invalid server environment configuration" | A required `.env` var is missing/malformed — the error lists which |
| `402` on connect/scan | Plan usage limit reached (UsageLedger) — expected behavior, not a bug |
| `400 Invalid source URL` | URL failed SSRF/domain-allowlist validation — must be a `google.com/maps` URL |
| ProviderRun stuck `RUNNING` | Check worker logs; Apify run still in progress; times out + aborts after ~2.5h |
| ProviderRun `SUCCEEDED`, 0 mentions | Actor output field drift — compare the Apify dataset JSON against `normalizeGoogleReview` in `packages/connectors/src/providers/apify/normalizers.ts` |
| Mentions exist, no MentionAnalysis | `OPENAI_API_KEY` missing or analysis worker not running |
