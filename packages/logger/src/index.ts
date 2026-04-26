import pino from 'pino'

// ─────────────────────────────────────────────────────────
// DentalIQ — Structured Logger (Pino)
// ─────────────────────────────────────────────────────────
// Usage:
//   import { createLogger } from '@dentaliq/logger'
//   const logger = createLogger('auth-service')
//   logger.info({ userId }, 'User logged in')
// ─────────────────────────────────────────────────────────

const isDev = process.env.NODE_ENV !== 'production'
const level = process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info')

export function createLogger(service: string) {
  return pino({
    level,
    base: { service },
    timestamp: pino.stdTimeFunctions.isoTime,
    // Pretty-print in dev, structured JSON in prod
    transport: isDev
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
    // Redact sensitive fields from all log lines
    redact: {
      paths: [
        'password',
        'passwordHash',
        'token',
        'accessToken',
        'refreshToken',
        'secret',
        'apiKey',
        '*.password',
        '*.token',
        'req.headers.authorization',
      ],
      censor: '[REDACTED]',
    },
  })
}

// Pre-built app-level logger
export const logger = createLogger('dentaliq')

export type Logger = ReturnType<typeof createLogger>
