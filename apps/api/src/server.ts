import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import { parseServerEnv } from '@whistling/config'

// Validate required env vars at startup — fails fast before any connections
parseServerEnv(process.env)
import { businessRoutes } from './routes/businesses.js'
import { sourceRoutes } from './routes/sources.js'
import { competitorRoutes } from './routes/competitors.js'
import { mentionRoutes } from './routes/mentions.js'
import { reportRoutes } from './routes/reports.js'
import { recommendationRoutes } from './routes/recommendations.js'
import { dashboardRoutes } from './routes/dashboard.js'
import { uploadRoutes } from './routes/upload.js'
import { webhookRoutes } from './routes/webhooks.js'
import { billingRoutes } from './routes/billing.js'
import { responderRoutes } from './routes/responder.js'
import { adminRoutes } from './routes/admin.js'
import { authPlugin } from './plugins/auth.js'
import { dbPlugin } from './plugins/db.js'
import { redisPlugin } from './plugins/redis.js'
import { jobsPlugin } from './plugins/jobs.js'

const port = parseInt(process.env['API_PORT'] ?? '3001', 10)
const host = process.env['API_HOST'] ?? '0.0.0.0'

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
      transport:
        process.env['NODE_ENV'] !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
      // Redact sensitive fields from all log output
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-admin-key"]',
          'req.headers["x-api-key"]',
          'res.headers["set-cookie"]',
          '*.password',
          '*.token',
          '*.secret',
          '*.apiKey',
          '*.api_key',
          '*.accessToken',
          '*.refreshToken',
          '*.encryptionKey',
        ],
        censor: '[REDACTED]',
      },
    },
    trustProxy: true,
  })

  // ─── Security ─────────────────────────────────────────────────────────────
  await app.register(helmet, { global: true })
  await app.register(cors, {
    origin: process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000',
    credentials: true,
  })
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
  })

  // ─── Parsing ──────────────────────────────────────────────────────────────
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })

  // ─── Plugins ──────────────────────────────────────────────────────────────
  await app.register(dbPlugin)
  await app.register(redisPlugin)
  await app.register(jobsPlugin)
  await app.register(authPlugin)

  // ─── Health ───────────────────────────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

  // ─── Routes ───────────────────────────────────────────────────────────────
  await app.register(businessRoutes, { prefix: '/api/businesses' })
  await app.register(sourceRoutes, { prefix: '/api/sources' })
  await app.register(competitorRoutes, { prefix: '/api/competitors' })
  await app.register(mentionRoutes, { prefix: '/api/mentions' })
  await app.register(reportRoutes, { prefix: '/api/reports' })
  await app.register(recommendationRoutes, { prefix: '/api/recommendations' })
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' })
  await app.register(uploadRoutes, { prefix: '/api/upload' })
  await app.register(billingRoutes, { prefix: '/api/billing' })
  await app.register(responderRoutes, { prefix: '/api/responder' })
  await app.register(adminRoutes, { prefix: '/internal/admin' })
  await app.register(webhookRoutes, { prefix: '/webhooks' })

  // ─── Global error handler ─────────────────────────────────────────────────
  app.setErrorHandler((err, req, reply) => {
    const statusCode = err.statusCode ?? 500

    if (statusCode >= 500) {
      // Log full error server-side (but redaction above strips sensitive headers)
      req.log.error({ err, statusCode }, 'Internal server error')
      reply.status(statusCode).send({ error: 'Internal server error' })
    } else {
      // 4xx: log at warn level, return the message only if it's a known safe error
      // (Zod validation, Fastify validation, NotFoundError from authz helpers)
      req.log.warn({ err: err.message, statusCode, path: req.url }, 'Request error')

      // Only surface err.message for validation and not-found errors;
      // don't leak arbitrary internal error messages for other 4xx codes.
      const isSafeMessage =
        err.name === 'ZodError' ||
        err.name === 'NotFoundError' ||
        err.validation !== undefined || // Fastify schema validation
        statusCode === 404 ||
        statusCode === 400 ||
        statusCode === 401 ||
        statusCode === 402 ||
        statusCode === 403 ||
        statusCode === 429

      reply.status(statusCode).send({
        error: isSafeMessage ? err.message : 'Bad request',
      })
    }
  })

  return app
}

async function start() {
  const app = await buildServer()
  await app.listen({ port, host })
  console.log(`API running at http://${host}:${port}`)
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
