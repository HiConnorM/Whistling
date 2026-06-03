import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { Queue } from 'bullmq'
import { getQueue } from '@whistling/jobs'

declare module 'fastify' {
  interface FastifyInstance {
    queues: {
      ingestion: Queue
      analysis: Queue
      clustering: Queue
      intelligence: Queue
      reporting: Queue
      notifications: Queue
    }
  }
}

export const jobsPlugin = fp(async (app: FastifyInstance) => {
  const connection = { url: process.env['REDIS_URL'] ?? 'redis://localhost:6379' }

  const queues = {
    ingestion: getQueue('ingestion', connection),
    analysis: getQueue('analysis', connection),
    clustering: getQueue('clustering', connection),
    intelligence: getQueue('intelligence', connection),
    reporting: getQueue('reporting', connection),
    notifications: getQueue('notifications', connection),
  }

  app.decorate('queues', queues)

  app.addHook('onClose', async () => {
    await Promise.all(Object.values(queues).map((q) => q.close()))
  })
})
