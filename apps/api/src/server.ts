import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import { businessRoutes } from './routes/businesses.js'
import { sourceRoutes } from './routes/sources.js'
import { competitorRoutes } from './routes/competitors.js'
import { mentionRoutes } from './routes/mentions.js'
import { reportRoutes } from './routes/reports.js'
import { recommendationRoutes } from './routes/recommendations.js'
import { dashboardRoutes } from './routes/dashboard.js'
import { uploadRoutes } from './routes/upload.js'
import { webhookRoutes } from './routes/webhooks.js'
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
  await app.register(webhookRoutes, { prefix: '/webhooks' })

  // ─── Global error handler ─────────────────────────────────────────────────
  app.setErrorHandler((err, _req, reply) => {
    app.log.error(err)
    const statusCode = err.statusCode ?? 500
    reply.status(statusCode).send({
      error: statusCode >= 500 ? 'Internal server error' : err.message,
      ...(process.env['NODE_ENV'] !== 'production' && { stack: err.stack }),
    })
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
