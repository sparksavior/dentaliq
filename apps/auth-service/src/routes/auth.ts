import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AuthController } from '../controllers/authController'

// ─────────────────────────────────────────────────────────
// Auth Routes
// POST /auth/register   → create account + send verify email
// POST /auth/login      → issue JWT + refresh token
// POST /auth/refresh    → rotate access token
// POST /auth/logout     → revoke refresh token
// POST /auth/verify-email
// POST /auth/forgot-password
// POST /auth/reset-password
// ─────────────────────────────────────────────────────────

// Zod schemas for request validation
const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  clinicName: z.string().min(2).max(200),
  plan: z.enum(['starter', 'pro', 'enterprise']).default('pro'),
  inviteToken: z.string().optional(),   // for adding staff to existing clinic
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  totpCode: z.string().length(6).optional(),  // required if MFA enabled
})

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).max(128),
})

const verifyEmailSchema = z.object({
  token: z.string(),
})

export async function authRoutes(app: FastifyInstance) {
  const ctrl = new AuthController(app)

  // ── Register ───────────────────────────────────────────
  app.post('/register', {
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
    schema: {
      body: {
        type: 'object',
        required: ['name', 'email', 'password', 'clinicName'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          clinicName: { type: 'string' },
          plan: { type: 'string', enum: ['starter', 'pro', 'enterprise'] },
        },
      },
    },
  }, async (req, reply) => {
    const body = registerSchema.parse(req.body)
    const result = await ctrl.register(body)
    return reply.code(201).send({ success: true, data: result })
  })

  // ── Login ──────────────────────────────────────────────
  app.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
  }, async (req, reply) => {
    const body = loginSchema.parse(req.body)
    const { tokens, user, requiresMfa } = await ctrl.login(body, req.ip)

    if (requiresMfa) {
      return reply.code(202).send({
        success: true,
        data: { requiresMfa: true, message: 'Please provide your MFA code' },
      })
    }

    // Set refresh token as httpOnly cookie
    reply.setCookie('refresh_token', tokens!.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth/refresh',
      maxAge: 60 * 60 * 24 * 7,  // 7 days
    })

    return reply.send({
      success: true,
      data: {
        accessToken: tokens!.accessToken,
        expiresIn: tokens!.expiresIn,
        user,
      },
    })
  })

  // ── Refresh token ──────────────────────────────────────
  app.post('/refresh', async (req, reply) => {
    const refreshToken = req.cookies?.refresh_token
    if (!refreshToken) {
      return reply.code(401).send({ success: false, error: 'No refresh token' })
    }
    const tokens = await ctrl.refreshToken(refreshToken)
    reply.setCookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth/refresh',
      maxAge: 60 * 60 * 24 * 7,
    })
    return reply.send({ success: true, data: { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn } })
  })

  // ── Logout ─────────────────────────────────────────────
  app.post('/logout', async (req, reply) => {
    const refreshToken = req.cookies?.refresh_token
    if (refreshToken) await ctrl.logout(refreshToken)
    reply.clearCookie('refresh_token', { path: '/auth/refresh' })
    return reply.send({ success: true, message: 'Logged out' })
  })

  // ── Email verification ─────────────────────────────────
  app.post('/verify-email', async (req, reply) => {
    const { token } = verifyEmailSchema.parse(req.body)
    await ctrl.verifyEmail(token)
    return reply.send({ success: true, message: 'Email verified' })
  })

  // ── Password reset ─────────────────────────────────────
  app.post('/forgot-password', {
    config: { rateLimit: { max: 3, timeWindow: '15 minutes' } },
  }, async (req, reply) => {
    const { email } = forgotPasswordSchema.parse(req.body)
    await ctrl.forgotPassword(email)
    // Always return 200 — don't leak whether email exists
    return reply.send({ success: true, message: 'If that email exists, a reset link has been sent.' })
  })

  app.post('/reset-password', async (req, reply) => {
    const body = resetPasswordSchema.parse(req.body)
    await ctrl.resetPassword(body)
    return reply.send({ success: true, message: 'Password updated. Please log in.' })
  })
}
