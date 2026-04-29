import Fastify from 'fastify'
import { fastifyJwt } from '@fastify/jwt'
import { fastifyHelmet } from '@fastify/helmet'
import { fastifyCors } from '@fastify/cors'
import { fastifyRateLimit } from '@fastify/rate-limit'
import { getEnv } from '@dentaliq/config'
import { createLogger } from '@dentaliq/logger'
import { ZodError } from 'zod'

import { estimateRoutes } from './routes/estimate'

// ─────────────────────────────────────────────────────────
// DentalIQ — Estimate Service  (port 3004)
//
// Responsibilities:
//   POST /estimate          → CDT code + insurer → cost, coverage, explanation
//   GET  /estimate/codes    → full CDT code list for frontend dropdowns
//   GET  /estimate/history  → recent estimates for this tenant
//
// Rules engine runs first (< 1ms), LLM layer adds explanation.
// Falls back to Ollama → Claude → static template.
// ─────────────────────────────────────────────────────────

const logger = createLogger('estimate-service')

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
    max: 300,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({ success: false, error: 'Rate limit exceeded' }),
  })

  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof ZodError) {
      const issues = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
      return reply.code(400).send({ success: false, error: 'Validation failed', details: issues })
    }
    const status = (error as any).statusCode ?? error.statusCode ?? 500
    if (status >= 500) logger.error({ err: error }, 'Internal error')
    return reply.code(status).send({
      success: false,
      error: status < 500 ? error.message : 'Internal server error',
    })
  })

  app.get('/health', async () => ({
    status: 'ok',
    service: 'estimate-service',
    version: '1.0.0',
    llmProvider: process.env.LLM_PROVIDER ?? 'ollama',
    timestamp: new Date().toISOString(),
  }))

  // Routes

  await app.register(estimateRoutes)

  return app
}

async function main() {
  const env = getEnv()
  const app = await buildApp()

  const port = env.ESTIMATE_PORT ?? 3004

  try {
    await app.listen({ port, host: '0.0.0.0' })
    logger.info(`\n  ✓ Estimate service → http://localhost:${port}`)
    logger.info(`  ✓ Health check     → http://localhost:${port}/health`)
    logger.info(`  ✓ LLM provider     → ${env.LLM_PROVIDER} (with fallback)`)
    logger.info(`  ✓ CDT codes        → ${Object.keys((await import('./data/cdt-codes')).CDT_DATABASE).length} procedures loaded\n`)
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
