import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { MfaController } from '../controllers/mfaController'
import { requireAuth } from '../middleware/requireAuth'

// ─────────────────────────────────────────────────────────
// MFA Routes (PHIPA mandates MFA for PHI access)
// POST /auth/mfa/setup     → generate TOTP secret + QR code
// POST /auth/mfa/verify    → verify TOTP and enable MFA
// POST /auth/mfa/disable   → disable MFA (requires password)
// POST /auth/mfa/backup    → get backup codes
// ─────────────────────────────────────────────────────────

const verifySchema = z.object({
  code: z.string().length(6),
  secret: z.string(),          // the secret returned from /setup
})

const disableSchema = z.object({
  password: z.string(),
  code: z.string().length(6),
})

export async function mfaRoutes(app: FastifyInstance) {
  const ctrl = new MfaController()

  // All MFA routes require a logged-in user
  app.addHook('onRequest', requireAuth(app))

  // ── Setup: generate TOTP secret + QR code ─────────────
  app.post('/setup', async (req, reply) => {
    const user = req.user as any
    const { secret, qrCodeDataUrl, backupCodes } = await ctrl.setupMfa(user.sub, user.email)
    return reply.send({
      success: true,
      data: {
        secret,
        qrCodeDataUrl,    // scan with authenticator app
        backupCodes,      // show to user once, then store hashes
        message: 'Scan the QR code with your authenticator app, then verify with a 6-digit code.',
      },
    })
  })

  // ── Verify: confirm TOTP code and enable MFA ──────────
  app.post('/verify', async (req, reply) => {
    const user = req.user as any
    const { code, secret } = verifySchema.parse(req.body)
    await ctrl.verifyAndEnableMfa(user.sub, secret, code)
    return reply.send({
      success: true,
      message: 'MFA enabled. Your account is now PHIPA-compliant.',
    })
  })

  // ── Disable MFA ────────────────────────────────────────
  app.post('/disable', async (req, reply) => {
    const user = req.user as any
    const { password, code } = disableSchema.parse(req.body)
    await ctrl.disableMfa(user.sub, password, code)
    return reply.send({ success: true, message: 'MFA disabled.' })
  })
}
