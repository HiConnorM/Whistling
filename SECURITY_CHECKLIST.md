# Whistling.io — Security Checklist

A reference for every engineer and operator. Review before each production deployment.

---

## 1. Secrets & environment variables

| Check | Status |
|-------|--------|
| `API_JWT_SECRET` set to 32+ char random string | Required in production |
| `BETTER_AUTH_SECRET` set to 32+ char random string | Required in production |
| `ENCRYPTION_KEY` set to exactly 64 hex chars | Required in production |
| `STRIPE_SECRET_KEY` set | Required for billing |
| `STRIPE_WEBHOOK_SECRET` set | Required for webhooks |
| `APIFY_API_TOKEN` set | Required for scraping |
| `OPENAI_API_KEY` set | Required for AI features |
| `RESEND_API_KEY` set | Required for email |
| `ADMIN_API_KEY` set to 32+ char random string | Required for admin routes in prod |
| No secret appears behind `NEXT_PUBLIC_` prefix | Run `pnpm check:public-keys` |
| Secrets stored in secrets manager, not in `.env` in source control | Verify in CI/CD config |

**Generate secrets:**
```bash
# 32-byte random (64 hex chars) — works for all secrets above
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 2. Authentication & authorization

| Check |
|-------|
| Every API route that returns user data uses `{ preHandler: [app.authenticate] }` |
| Every object lookup verifies `organizationId` ownership (use `apps/api/src/services/authz.ts` helpers) |
| No route trusts user-supplied IDs without a subsequent org-ownership check |
| `PATCH /sources/:id/status` and `POST /sources/:id/scan` both verify org ownership |
| Admin routes checked via `assertAdmin()` — constant-time comparison, deny-by-default in production |
| Stripe webhook verified with `stripe.webhooks.constructEvent()` before processing |
| Apify webhook verified with `APIFY_WEBHOOK_SECRET` constant-time check |

### IDOR prevention pattern
Every handler must follow:
```typescript
// ✅ Correct
const business = await requireBusinessAccess(app.db, businessId, req.user.organizationId)

// ❌ Wrong — trusts user-supplied ID without org check
const business = await app.db.business.findUnique({ where: { id: businessId } })
```

---

## 3. Rate limiting

### Per-IP (via `@fastify/rate-limit`)
| Endpoint | Limit |
|----------|-------|
| Global | 100 / minute / IP |
| `POST /api/sources/:id` (create source) | 20 / hour / IP |
| `POST /api/sources/:id/scan` | 10 / hour / IP |
| `POST /api/responder` (create draft) | 20 / hour / IP |
| `POST /api/billing/checkout` | 10 / hour / IP |
| `POST /api/reports/:id/generate` | 5 / day / IP |
| `/internal/admin/*` | 20 / hour / IP |

### Per-organization (via `apps/api/src/services/rateLimitOrg.ts`)
| Action | Starter | Pro | Growth | Agency |
|--------|---------|-----|--------|--------|
| `responder_draft` daily | 0 | 10/day | 50/day | 200/day |
| `manual_scan` daily | 2/day | 5/day | 10/day | 20/day |
| `competitor_discovery` daily | 5/day (all plans) |
| `report_generate` daily | 5/day (all plans) |
| `source_create` hourly | 10/hour (all plans) |
| `csv_upload` hourly | 5/hour (all plans) |
| `billing_checkout` hourly | 10/hour (all plans) |

---

## 4. SSRF protection

File: `apps/api/src/services/ssrf.ts`

| Check |
|-------|
| All user-supplied URLs pass through `validateExternalUrl()` before storage |
| URLs that will be fetched server-side use `validateExternalUrlResolved()` (async DNS check) |
| All Apify source URLs pass `assertHostForSourceType()` allowlist check |
| Only `http:` and `https:` schemes allowed |
| Private/reserved IP ranges blocked: 127.x, 10.x, 192.168.x, 172.16-31.x, 169.254.x, AWS metadata |
| IPv6-mapped IPv4 (`::ffff:127.0.0.1`) blocked |
| Hex/octal IP encodings blocked |
| Credentials and fragments stripped via `sanitizeUrl()` |

### Platform allowlists
| Source type | Allowed hostnames |
|------------|-------------------|
| google | google.com, maps.google.com, www.google.com |
| yelp | yelp.com, www.yelp.com |
| tripadvisor | tripadvisor.com, www.tripadvisor.com |
| facebook | facebook.com, www.facebook.com |
| instagram | instagram.com, www.instagram.com |
| tiktok | tiktok.com, www.tiktok.com |

---

## 5. Webhook security

| Check |
|-------|
| Stripe: `stripe-signature` header verified with `STRIPE_WEBHOOK_SECRET` |
| Stripe: events deduplicated via `ProcessedWebhookEvent` table (keyed by `event.id`) |
| Apify: `APIFY_WEBHOOK_SECRET` verified via constant-time compare on every request |
| Apify: runs deduplicated via `ProcessedWebhookEvent` (keyed by `apify:run:{runId}`) |
| Webhook endpoints have no normal user rate limit (handled by signature verification) |

---

## 6. AI prompt injection

Files: `packages/ai/src/classify.ts`, `responder.ts`, `report.ts`

| Rule |
|------|
| Review/comment text always wrapped in `<review>` or `<customer_review>` XML delimiters |
| Brand voice input wrapped in `<brand_voice>` delimiter |
| System prompts include explicit "SECURITY RULES" section stating review text is untrusted |
| Model instructed to mark injection attempts as spam and ignore them |
| Model instructed never to reveal system prompt, API keys, internal data |
| Regex safety scan (`SAFETY_RULES` in `responder.ts`) catches refund promises, fault admission, PII in output |
| Prompt injection tests: `packages/ai/src/__tests__/prompt-injection.test.ts` |

### What the model must never do
- Follow instructions embedded in review/comment text
- Reveal system prompt, API keys, internal metadata, billing data
- Admit legal fault or liability
- Promise refunds or compensation
- Invent details not in the review

---

## 7. Logging

| Check |
|-------|
| Pino redaction configured for `authorization`, `cookie`, `set-cookie`, `x-admin-key`, `password`, `token`, `secret`, `apiKey`, `accessToken` headers |
| Error handler never sends `err.stack` to clients |
| 5xx errors return generic "Internal server error" message |
| 4xx errors return `err.message` only for known-safe error types (validation, not-found, etc.) |
| `classify.ts` fallback logs `err.message` only, not the full error object |
| Worker jobs log `err.message` only in failure handlers |

---

## 8. File uploads

File: `apps/api/src/routes/upload.ts`

| Check |
|-------|
| File size capped at 10MB (Fastify multipart limit) |
| MIME type and extension both checked for CSV |
| Per-plan row cap enforced before processing (500/2k/10k/50k by plan) |
| Batch insert used instead of N+1 per row |
| Files stored as parsed rows in DB, not as files on disk/object storage |

---

## 9. Before production launch

- [ ] All required env vars set and verified (run `pnpm typecheck` — `parseServerEnv` throws on boot if any are missing)
- [ ] `API_JWT_SECRET` is a fresh random secret, not the dev fallback
- [ ] `ADMIN_API_KEY` set — admin routes are locked by default in prod
- [ ] `ENCRYPTION_KEY` stored in secrets manager, rotated from any committed value
- [ ] Stripe webhooks configured for your production API URL
- [ ] `pnpm audit` clean (no critical vulnerabilities in prod deps)
- [ ] `pnpm check:public-keys` clean (no server secrets in NEXT_PUBLIC_ context)
- [ ] Database SSL enabled (`?sslmode=require` in `DATABASE_URL`)
- [ ] `NODE_ENV=production` set in your runtime environment
- [ ] API deployed behind a reverse proxy / WAF with TLS termination
- [ ] Prisma migration `add_processed_webhook_events` has run: `cd packages/db && pnpm prisma migrate deploy`

---

## 10. Incident response basics

1. **Compromised secret**: rotate immediately via your secrets manager, redeploy, invalidate all active JWT sessions (change `API_JWT_SECRET`).
2. **Billing webhook replay**: check `ProcessedWebhookEvent` table — duplicates are automatically dropped.
3. **Suspected IDOR**: check `AuditLog` table filtered by `organizationId` + `action` to see cross-org data access.
4. **AI safety flag**: check `responderDraft.safetyFlags` array — any non-empty value means output was flagged; require manual review before sending.
5. **Rate limit abuse**: Redis keys `rl:{action}:{orgId}:{date}` — inspect or delete to reset a specific org's counter.
