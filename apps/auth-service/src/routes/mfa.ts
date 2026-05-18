import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { MfaController } from '../controllers/mfaController'
import { requireAuth } from '../middleware/requireAuth'

// ─────────────────────────────────────────────────────────
// MFA Routes
//
// POST /auth/mfa/setup/totp          → generate TOTP secret + QR code
// POST /auth/mfa/setup/totp/verify   → verify TOTP code and enable
// POST /auth/mfa/setup/email         → send OTP to email for setup
// POST /auth/mfa/setup/email/verify  → verify OTP and enable email MFA
// POST /auth/mfa/setup/sms           → send OTP via SMS (DISABLED until SMS_ENABLED=true)
// POST /auth/mfa/setup/sms/verify    → verify SMS OTP (DISABLED)
// POST /auth/mfa/send-otp            → resend email/SMS login OTP
// POST /auth/mfa/disable             → disable MFA (password + current code)
// POST /auth/mfa/backup-codes        → regenerate backup codes
// GET  /auth/mfa/devices             → list additional authenticator devices
// POST /auth/mfa/devices             → initiate adding a new device (returns QR)
// POST /auth/mfa/devices/:id/verify  → confirm and save a new device
// DELETE /auth/mfa/devices/:id       → remove an extra device
// ─────────────────────────────────────────────────────────

export async function mfaRoutes(app: FastifyInstance) {
  const ctrl = new MfaController()

  app.addHook('onRequest', requireAuth(app))

  // ── TOTP Setup ────────────────────────────────────────────
  app.post('/setup/totp', async (req, reply) => {
    const user = req.user as any
    const data = await ctrl.setupTotp(user.sub, user.email)
    return reply.send({ success: true, data })
  })

  app.post('/setup/totp/verify', async (req, reply) => {
    const user = req.user as any
    const { code, secret } = z.object({ code: z.string().length(6), secret: z.string() }).parse(req.body)
    const { backupCodes } = await ctrl.verifyAndEnableMfa(user.sub, secret, code)
    return reply.send({ success: true, data: { backupCodes }, message: 'Authenticator app 2FA enabled.' })
  })

  // Legacy aliases so existing calls (/setup, /verify) still work
  app.post('/setup', async (req, reply) => {
    const user = req.user as any
    const data = await ctrl.setupTotp(user.sub, user.email)
    return reply.send({ success: true, data })
  })

  app.post('/verify', async (req, reply) => {
    const user = req.user as any
    const { code, secret } = z.object({ code: z.string().length(6), secret: z.string() }).parse(req.body)
    const { backupCodes } = await ctrl.verifyAndEnableMfa(user.sub, secret, code)
    return reply.send({ success: true, data: { backupCodes }, message: 'MFA enabled. Your account is now PHIPA-compliant.' })
  })

  // ── Email MFA Setup ───────────────────────────────────────
  app.post('/setup/email', async (req, reply) => {
    const user = req.user as any
    await ctrl.setupEmailMfa(user.sub)
    return reply.send({ success: true, message: 'A 6-digit code has been sent to your email address.' })
  })

  app.post('/setup/email/verify', async (req, reply) => {
    const user = req.user as any
    const { code } = z.object({ code: z.string().min(6).max(6) }).parse(req.body)
    const { backupCodes } = await ctrl.verifyEmailMfaSetup(user.sub, code)
    return reply.send({ success: true, data: { backupCodes }, message: 'Email 2FA enabled.' })
  })

  // ── SMS MFA Setup (production-ready, DISABLED until SMS_ENABLED=true) ────
  app.post('/setup/sms', async (req, reply) => {
    const user = req.user as any
    const { phoneNumber } = z.object({ phoneNumber: z.string().min(7) }).parse(req.body)
    await ctrl.setupSmsMfa(user.sub, phoneNumber)
    return reply.send({ success: true, message: 'A 6-digit code has been sent to your phone.' })
  })

  app.post('/setup/sms/verify', async (req, reply) => {
    const user = req.user as any
    const { code } = z.object({ code: z.string().min(6).max(6) }).parse(req.body)
    const { backupCodes } = await ctrl.verifySmsMfaSetup(user.sub, code)
    return reply.send({ success: true, data: { backupCodes }, message: 'SMS 2FA enabled.' })
  })

  // ── Resend OTP (for email/SMS login and setup) ────────────
  app.post('/send-otp', async (req, reply) => {
    const user = req.user as any
    await ctrl.sendLoginOtp(user.sub)
    return reply.send({ success: true, message: 'A new code has been sent.' })
  })

  // ── MFA status (all enabled methods + devices) ────────────
  app.get('/status', async (req, reply) => {
    const user = req.user as any
    const status = await ctrl.getStatus(user.sub)
    return reply.send({ success: true, data: status })
  })

  // ── Disable a single method ────────────────────────────────
  app.post('/disable-method', async (req, reply) => {
    const user = req.user as any
    const { method, password, code } = z.object({ method: z.enum(['totp', 'email', 'sms']), password: z.string(), code: z.string() }).parse(req.body)
    const { remainingMethods } = await ctrl.disableMethod(user.sub, method, password, code)
    return reply.send({ success: true, data: { remainingMethods }, message: `${method.toUpperCase()} authentication removed.` })
  })

  // ── Disable ALL MFA ───────────────────────────────────────
  app.post('/disable', async (req, reply) => {
    const user = req.user as any
    const { password, code } = z.object({ password: z.string(), code: z.string() }).parse(req.body)
    await ctrl.disableMfa(user.sub, password, code)
    return reply.send({ success: true, message: 'Two-factor authentication has been disabled.' })
  })

  // ── Backup Codes ──────────────────────────────────────────
  app.post('/backup-codes', async (req, reply) => {
    const user = req.user as any
    const { password } = z.object({ password: z.string() }).parse(req.body)
    const { backupCodes } = await ctrl.regenerateBackupCodes(user.sub, password)
    return reply.send({ success: true, data: { backupCodes }, message: 'New backup codes generated. Your old codes are no longer valid.' })
  })

  // ── Additional Devices ────────────────────────────────────
  app.get('/devices', async (req, reply) => {
    const user = req.user as any
    const devices = await ctrl.listDevices(user.sub)
    return reply.send({ success: true, data: devices })
  })

  app.post('/devices', async (req, reply) => {
    const user = req.user as any
    const data = await ctrl.initiateAddDevice(user.sub, user.email)
    return reply.send({ success: true, data })
  })

  app.post('/devices/verify', async (req, reply) => {
    const user = req.user as any
    const { secret, code, label } = z.object({
      secret: z.string(),
      code: z.string().length(6),
      label: z.string().max(40).optional(),
    }).parse(req.body)
    const device = await ctrl.confirmAddDevice(user.sub, secret, code, label ?? 'Authenticator')
    return reply.send({ success: true, data: device, message: `"${device.label}" added as a trusted device.` })
  })

  app.delete('/devices/:id', async (req, reply) => {
    const user = req.user as any
    const { id } = req.params as { id: string }
    await ctrl.removeDevice(user.sub, id)
    return reply.send({ success: true, message: 'Device removed.' })
  })
}
