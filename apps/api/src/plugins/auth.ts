import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import jwt from '@fastify/jwt'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string; organizationId: string }
    user: { userId: string; organizationId: string }
  }
}

function getJwtSecret(): string {
  const secret = process.env['API_JWT_SECRET']
  if (!secret) {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('API_JWT_SECRET is required in production. Set it to a 32+ character random string.')
    }
    // Dev/test only fallback — clearly named so it is never mistaken for a real secret
    console.warn('[auth] WARNING: API_JWT_SECRET not set. Using insecure dev fallback. DO NOT use in production.')
    return 'dev-only-api-jwt-secret-do-not-use-in-production!!'
  }
  if (secret.length < 32) {
    throw new Error('API_JWT_SECRET must be at least 32 characters long.')
  }
  return secret
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  await app.register(jwt, {
    secret: getJwtSecret(),
    sign: { expiresIn: '7d' },
  })

  app.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify()
    } catch {
      reply.status(401).send({ error: 'Unauthorized' })
    }
  })
})
