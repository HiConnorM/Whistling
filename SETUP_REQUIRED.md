# Setup Required

External accounts and environment variables needed before the app runs in production.

---

## 1. Database

| Step | Command |
|------|---------|
| Create PostgreSQL database | Provision a Postgres 15+ instance with pgvector extension |
| Run migrations | `cd packages/db && pnpm prisma migrate deploy` |

**Required env:**
```
DATABASE_URL=postgresql://user:password@host:5432/whistling
```

---

## 2. Redis

Required for BullMQ job queues.

```
REDIS_URL=redis://host:6379
```

---

## 3. Stripe

**Steps:**
1. Create a Stripe account at [stripe.com](https://stripe.com)
2. In Stripe Dashboard → Products, create three recurring products:
   - **Whistling Starter** — $49/month
   - **Whistling Pro** — $129/month
   - **Whistling Growth** — $299/month
3. Copy each product's Price ID (starts with `price_`)
4. In Stripe Dashboard → Developers → Webhooks, create a webhook pointing to:
   `https://yourdomain.com/webhooks/stripe`
   
   Enable these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

**Required env:**
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_GROWTH_PRICE_ID=price_...
```

---

## 4. OpenAI

Used for: mention classification, embeddings, weekly report generation, trend summaries, AI responder drafts.

1. Create account at [platform.openai.com](https://platform.openai.com)
2. Create an API key
3. Recommended: enable usage limits per-month in the OpenAI dashboard

**Required env:**
```
OPENAI_API_KEY=sk-...
```

**Model used:** `gpt-4o-mini` (classification, responder drafts, reports)

---

## 5. Apify

Used for scraping Google reviews, Yelp, TripAdvisor, Facebook comments/reviews, Instagram comments.

1. Create account at [apify.com](https://apify.com)
2. Subscribe to at minimum the **Starter plan** ($29/month with $29 usage credit)
3. Copy your API token

**Actors used (you may need to subscribe to each):**
| Source | Actor |
|--------|-------|
| Google reviews | `compass/google-maps-reviews-scraper` |
| TripAdvisor | `maxcopell/tripadvisor-reviews` |
| Facebook comments | `apify/facebook-comments-scraper` |
| Facebook reviews | `apify/facebook-reviews-scraper` |
| Instagram comments | `apify/instagram-comment-scraper` |
| Yelp | `delicious_zebu/yelp-reviews-scraper` ($30/month) |

**Required env:**
```
APIFY_API_TOKEN=apify_api_...
```

**Yelp note:** The Yelp actor requires a $30/month actor subscription. Consider making Yelp a Pro+ source only until you have enough customers to absorb this cost.

---

## 6. Google Places API (competitor discovery)

Used in onboarding to auto-discover local competitors. Optional — competitor discovery returns empty results if not configured.

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable the **Places API**
3. Create an API key and restrict it to the Places API + your server IP

**Required env:**
```
GOOGLE_PLACES_API_KEY=AIza...
```

---

## 7. Resend (email)

Used for sending weekly brief emails.

1. Create account at [resend.com](https://resend.com)
2. Verify your sending domain
3. Create an API key

**Required env:**
```
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=briefs@yourdomain.com
```

---

## 8. Security keys

**ENCRYPTION_KEY** — Used for AES-256-GCM encryption of OAuth tokens and provider credentials.

Generate a 32-byte key:
```bash
# Hex format (64 chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Required env:**
```
ENCRYPTION_KEY=<64-char hex string>
```

**AUTH_SECRET** — JWT signing secret (min 32 chars):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```
AUTH_SECRET=<64-char hex string>
```

**ADMIN_API_KEY** — Protects `/internal/admin/*` routes. Required in production.
```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```
```
ADMIN_API_KEY=<48-char hex string>
```

---

## 9. App URL

```
NEXT_PUBLIC_APP_URL=https://yourdomain.com
API_PORT=3001
API_HOST=0.0.0.0
NODE_ENV=production
```

---

## 10. Run migrations

After all env vars are set:
```bash
cd packages/db
pnpm prisma migrate deploy
```

---

## Monthly cost estimates by plan

| Plan | Revenue | Target provider cost | Hard stop |
|------|---------|---------------------|-----------|
| Starter | $49 | $3–$9 | $10.00 |
| Pro | $129 | $10–$45 | $45.00 |
| Growth | $299 | $31–$125 | $125.00 |
| Agency | $599+ | custom | $500.00 |

The app's `enforceUsageLimit()` blocks all Apify scans, AI calls, and responder drafts before the hard stop is reached. No expensive operation runs without passing this check.

---

## Security checklist

- [ ] `ENCRYPTION_KEY` set in production secrets manager (not in .env file)
- [ ] `AUTH_SECRET` set and rotated from default
- [ ] `ADMIN_API_KEY` set — `/internal/admin/*` is unprotected without it
- [ ] `STRIPE_WEBHOOK_SECRET` set — webhooks are rejected without a valid signature
- [ ] Database: enable SSL (`?sslmode=require` in DATABASE_URL)
- [ ] Deploy API behind a WAF or rate-limiting proxy (Cloudflare, etc.)
- [ ] Set `NODE_ENV=production` — disables dev bypass behavior in encryption and error responses
- [ ] Rotate `OPENAI_API_KEY` and `APIFY_API_TOKEN` — store in secrets manager, not source code
