import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { db } from '@whistling/db'

declare module 'fastify' {
  interface FastifyInstance {
    db: typeof db
  }
}

export const dbPlugin = fp(async (app: FastifyInstance) => {
  app.decorate('db', db)

  app.addHook('onClose', async () => {
    await db.$disconnect()
  })
})
