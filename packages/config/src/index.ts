import { z } from 'zod'

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // Auth (Better Auth)
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),

  // OpenAI
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  OPENAI_CHAT_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_REPORT_MODEL: z.string().default('gpt-4o'),

  // Resend
  RESEND_API_KEY: z.string().startsWith('re_'),
  EMAIL_FROM: z.string().email().default('intelligence@whistling.io'),

  // Encryption (for OAuth tokens at rest)
  ENCRYPTION_KEY: z.string().length(64),

  // Cloudflare R2
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Meta (Facebook/Instagram)
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),

  // PostHog
  POSTHOG_API_KEY: z.string().optional(),

  // Sentry
  SENTRY_DSN: z.string().url().optional(),

  // API
  API_PORT: z.coerce.number().default(3001),
  API_HOST: z.string().default('0.0.0.0'),

  // Worker
  WORKER_CONCURRENCY: z.coerce.number().default(5),
})

const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_').optional(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>
export type ClientEnv = z.infer<typeof clientEnvSchema>

export function parseServerEnv(env: NodeJS.ProcessEnv): ServerEnv {
  const result = serverEnvSchema.safeParse(env)
  if (!result.success) {
    console.error('Invalid server environment variables:')
    for (const err of result.error.errors) {
      console.error(`  ${err.path.join('.')}: ${err.message}`)
    }
    throw new Error('Invalid server environment configuration')
  }
  return result.data
}

export function parseClientEnv(env: Record<string, string | undefined>): ClientEnv {
  const result = clientEnvSchema.safeParse(env)
  if (!result.success) {
    console.error('Invalid client environment variables:')
    for (const err of result.error.errors) {
      console.error(`  ${err.path.join('.')}: ${err.message}`)
    }
    throw new Error('Invalid client environment configuration')
  }
  return result.data
}

export { serverEnvSchema, clientEnvSchema }
