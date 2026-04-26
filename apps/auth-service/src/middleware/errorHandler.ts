import type { FastifyRequest, FastifyReply, FastifyError } from 'fastify'
import type { Logger } from '@dentaliq/logger'
import { ZodError } from 'zod'

// ── Error Handler ─────────────────────────────────────────
export function errorHandler(logger: Logger) {
  return (
    error: FastifyError,
    req: FastifyRequest,
    reply: FastifyReply,
  ) => {
    // Zod validation errors
    if (error instanceof ZodError) {
      const issues = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
      return reply.code(400).send({
        success: false,
        error: 'Validation failed',
        details: issues,
      })
    }

    const statusCode = (error as any).statusCode ?? error.statusCode ?? 500

    if (statusCode >= 500) {
      logger.error({ err: error, req: { method: req.method, url: req.url } }, 'Internal error')
    }

    return reply.code(statusCode).send({
      success: false,
      error: statusCode < 500 ? error.message : 'Internal server error',
    })
  }
}

// ── Request Logger ────────────────────────────────────────
export function requestLogger(logger: Logger) {
  return async (req: FastifyRequest, _reply: FastifyReply) => {
    logger.debug({
      method: req.method,
      url: req.url,
      ip: req.ip,
    }, 'Incoming request')
  }
}
