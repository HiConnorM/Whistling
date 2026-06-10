# Social Two-Step Ingestion — Test Guide

Tests the full pipeline: **page/profile URL → discover posts → scrape comments → Mentions**.

---

## Prerequisites

- `.env` configured with a valid `APIFY_API_TOKEN`
- Local Postgres + Redis running (`docker compose up -d`)
- Prisma migrated (`cd packages/db && pnpm prisma migrate dev`)
- Worker running (`pnpm --filter @whistling/worker dev`)

---

## 1. Facebook Page Comments

### 1a. Create a BusinessSource via the API

```bash
curl -X POST http://localhost:3001/api/sources/<businessId> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "facebook",
    "mediaType": "comment",
    "url": "https://www.facebook.com/<page-slug>"
  }'
```

**Expected metadata on the created source:**
```json
{
  "strategy": "apify",
  "actorKey": "facebookComments",
  "actorId": "apify/facebook-comments-scraper",
  "mediaType": "comment",
  "scanDepth": "light",
  "maxItems": 150,
  "ingestionPlan": "facebookPageComments"
}
```

### 1b. Trigger a manual scan

```bash
curl -X POST http://localhost:3001/api/sources/<sourceId>/scan \
  -H "Authorization: Bearer <token>"
```

### 1c. Verify discovery ProviderRun

```sql
SELECT id, "actorId", status, "requestedMaxItems", "collectedItems"
FROM provider_runs
WHERE "sourceId" = '<sourceId>'
ORDER BY "startedAt" DESC;
```

Expected:
- First row: `actor_id = 'apify/facebook-posts-scraper'`, `status = 'SUCCEEDED'`, `collected_items > 0`
- Second row (appears after discovery): `actor_id = 'apify/facebook-comments-scraper'`, `status = 'SUCCEEDED'`

### 1d. Verify Mentions were created

```sql
SELECT id, "sourceType", "authorName", rating, "publishedAt", text
FROM mentions
WHERE "businessId" = '<businessId>' AND "sourceType" = 'FACEBOOK'
ORDER BY "publishedAt" DESC
LIMIT 20;
```

Expected: rows with `sourceType = 'FACEBOOK'`, populated `text`, `authorName`.

### 1e. Verify `lastSuccessfulScanAt` was written

```sql
SELECT id, "lastScannedAt", "lastSuccessfulScanAt"
FROM business_sources
WHERE id = '<sourceId>';
```

Both should be non-null after a successful run.

---

## 2. Instagram Profile Comments

Same steps as Facebook, but:
- `"type": "instagram"`, `"mediaType": "comment"`
- `"url": "https://www.instagram.com/<username>/"`
- Expected `ingestionPlan`: `"instagramProfileComments"`
- Discovery actor: `apify/instagram-post-scraper`
- Comments actor: `apify/instagram-comment-scraper`

---

## 3. TikTok Profile Comments

Same steps, but:
- `"type": "tiktok"`, `"mediaType": "comment"`
- `"url": "https://www.tiktok.com/@<username>"`
- Expected `ingestionPlan`: `"tiktokProfileComments"`
- Discovery actor: `clockworks/tiktok-scraper`
- Comments actor: `clockworks/tiktok-comments-scraper`

---

## 4. Review sources (unchanged, single-step)

These should continue to work without an ingestion plan:
- Google Maps: `"type": "google"` → `actorKey: googleMapsReviews`, no `ingestionPlan`
- Yelp: `"type": "yelp"` → `actorKey: yelpReviews`, no `ingestionPlan`
- TripAdvisor: `"type": "tripadvisor"` → `actorKey: tripadvisorReviews`, no `ingestionPlan`
- Facebook Reviews: `"type": "facebook"`, `"mediaType": "review"` → no `ingestionPlan`

---

## 5. extractPostUrls — unit tests with sample fixtures

Unit tests live at `packages/connectors/src/providers/apify/__tests__/normalizers.test.ts`:

```bash
pnpm --filter @whistling/connectors test
```

The extractor logic is covered by inline samples today. Three fixture-driven tests are
marked **todo** until you replace the stub fixtures with real actor output:

```
packages/connectors/src/providers/apify/fixtures/
  facebook-posts-discovery.sample.json     ← paste apify/facebook-posts-scraper dataset JSON
  instagram-posts-discovery.sample.json    ← paste apify/instagram-post-scraper dataset JSON
  tiktok-videos-discovery.sample.json      ← paste clockworks/tiktok-scraper dataset JSON
```

For each: run the actor in the Apify console against a public page/profile, then
Storage → Dataset → Export → JSON, and paste the array over the stub. The todo tests
activate automatically. If extraction returns no URLs, check the raw item fields and
update the extractors in `packages/connectors/src/providers/apify/normalizers.ts`.
Never include API tokens or private data in fixtures.

---

## 6. Incremental scan (second run)

After the initial scan succeeds:
1. `lastSuccessfulScanAt` is set on the source
2. Trigger a second manual scan
3. Verify the discovery actor input includes a `startDate` (Facebook) or equivalent
4. Verify fewer posts/comments are fetched (incremental cap is smaller than full backfill)

---

## Troubleshooting

| Symptom | Likely cause |
|---------|-------------|
| Discovery ProviderRun `SUCCEEDED` but `collected_items = 0` | Page has no recent posts, or actor output field names don't match — check raw Apify dataset and update `extractPostUrls()` |
| Comments ProviderRun never created | Discovery returned 0 URLs — see above |
| `ingestionPlan` missing from source metadata | Source was created before the fix — update metadata directly or recreate the source |
| Worker exits on boot with config error | Missing `API_JWT_SECRET` or other required env — check `.env` |
