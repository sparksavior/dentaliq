import Fastify from 'fastify'
import { fastifyJwt } from '@fastify/jwt'
import { fastifyHelmet } from '@fastify/helmet'
import { fastifyCors } from '@fastify/cors'
import { fastifyRateLimit } from '@fastify/rate-limit'
import { getEnv } from '@dentaliq/config'
import { createLogger } from '@dentaliq/logger'

import { tenantRoutes } from './routes/tenants'
import { patientsRoutes } from './routes/patients'

// ─────────────────────────────────────────────────────────
// DentalIQ — Tenant Service  (port 3002)
// Manages clinic provisioning, PMS connections, usage data
// ─────────────────────────────────────────────────────────

const logger = createLogger('tenant-service')

async function buildApp() {
  const env = getEnv()
  const app = Fastify({ logger: false, trustProxy: true })

  await app.register(fastifyHelmet, { contentSecurityPolicy: false })
  await app.register(fastifyCors, {
    origin: env.ALLOWED_ORIGINS.split(','),
    credentials: true,
  })
  await app.register(fastifyJwt, { secret: env.JWT_SECRET })
  await app.register(fastifyRateLimit, {
    max: 200,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({ success: false, error: 'Rate limit exceeded' }),
  })

  app.setErrorHandler((error, req, reply) => {
    const status = (error as any).statusCode ?? error.statusCode ?? 500
    if (status >= 500) logger.error({ err: error }, 'Internal error')
    reply.code(status).send({
      success: false,
      error: status < 500 ? error.message : 'Internal server error',
    })
  })

  app.get('/health', async () => ({
    status: 'ok',
    service: 'tenant-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  }))

  await app.register(tenantRoutes, { prefix: '/tenants' })
  await app.register(patientsRoutes, { prefix: '/patients' })

  return app
}

async function main() {
  const env = getEnv()
  const app = await buildApp()

  try {
    await app.listen({ port: env.TENANT_PORT, host: '0.0.0.0' })
    logger.info(`\n  ✓ Tenant service  → http://localhost:${env.TENANT_PORT}`)
    logger.info(`  ✓ Health check    → http://localhost:${env.TENANT_PORT}/health`)
  } catch (err) {
    logger.fatal({ err }, 'Failed to start')
    process.exit(1)
  }

  const shutdown = async () => {
    await app.close()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main()
