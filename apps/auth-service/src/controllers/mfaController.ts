import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import bcrypt from 'bcryptjs'
import { createId } from '@paralleldrive/cuid2'
import { getDb, users, mfaDevices } from '@dentaliq/db'
import { getEnv } from '@dentaliq/config'
import { eq, and } from 'drizzle-orm'
import { EmailService } from '../services/emailService'
import { SmsService } from '../services/smsService'
import { createLogger } from '@dentaliq/logger'

const logger = createLogger('mfa-controller')

export type MfaMethodType = 'totp' | 'email' | 'sms'

// ─────────────────────────────────────────────────────────
// MFA Controller
// Supports: TOTP (RFC 6238), Email OTP, SMS OTP (gated)
// Compatible apps: Google Authenticator, Authy, 1Password
// ─────────────────────────────────────────────────────────

export class MfaController {
  private db = getDb()
  private env = getEnv()
  private emailService = new EmailService()
  private smsService = new SmsService()

  // ── Helpers ──────────────────────────────────────────────

  /** Read the enabled-methods array from a user row */
  getEnabledMethods(user: any): MfaMethodType[] {
    try {
      const arr = JSON.parse(user.mfaMethods ?? '[]') as MfaMethodType[]
      if (arr.length > 0) return arr
      // Fallback: legacy single mfa_method field
      const legacy = user.mfaMethod as MfaMethodType | undefined
      if (legacy && legacy !== 'totp' || user.mfaEnabled) return legacy ? [legacy] : []
      return []
    } catch { return [] }
  }

  /** Add a method to the array and persist */
  private async addMethod(userId: string, method: MfaMethodType, extra?: Record<string, any>) {
    const [user] = await (this.db as any).select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 })
    const methods = this.getEnabledMethods(user)
    if (!methods.includes(method)) methods.push(method)
    await (this.db as any).update(users).set({
      mfaEnabled: true,
      mfaMethods: JSON.stringify(methods),
      mfaMethod: methods[0],   // keep legacy field pointing at first method
      updatedAt: new Date(),
      ...extra,
    }).where(eq(users.id, userId))
    return methods
  }

  /** Remove a method from the array and persist. Disables MFA entirely if array becomes empty. */
  private async removeMethod(userId: string, method: MfaMethodType) {
    const [user] = await (this.db as any).select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 })
    const methods = this.getEnabledMethods(user).filter(m => m !== method)
    const extra: Record<string, any> = {
      mfaEnabled: methods.length > 0,
      mfaMethods: JSON.stringify(methods),
      mfaMethod: methods[0] ?? 'totp',
      updatedAt: new Date(),
    }
    if (method === 'totp') { extra.mfaSecret = null }
    if (method === 'email' || method === 'sms') { extra.mfaOtpCode = null; extra.mfaOtpExpires = null }
    if (method === 'sms') { extra.phoneNumber = null }
    await (this.db as any).update(users).set(extra).where(eq(users.id, userId))
    return methods
  }

  /** Generate 8 random backup codes */
  private generateBackupCodes(): string[] {
    return Array.from({ length: 8 }, () =>
      (createId().slice(0, 4) + '-' + createId().slice(0, 4)).toUpperCase(),
    )
  }

  /** Generate a random 6-digit OTP */
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  // ── TOTP Setup ────────────────────────────────────────────
  async setupTotp(userId: string, email: string) {
    const secret = authenticator.generateSecret(20)
    const backupCodes = this.generateBackupCodes()
    const otpAuthUrl = authenticator.keyuri(email, this.env.TOTP_ISSUER, secret)
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl)
    return { secret, qrCodeDataUrl, backupCodes }
  }

  // ── TOTP Verify + Enable ──────────────────────────────────
  async verifyAndEnableMfa(userId: string, secret: string, code: string) {
    const isValid = authenticator.verify({ token: code, secret })
    if (!isValid) {
      const err = new Error('Invalid TOTP code. Please try again.')
      ;(err as any).statusCode = 400
      throw err
    }

    const backupCodes = this.generateBackupCodes()
    await this.addMethod(userId, 'totp', { mfaSecret: secret, mfaBackupCodes: JSON.stringify(backupCodes) })

    const [user] = await (this.db as any).select().from(users).where(eq(users.id, userId)).limit(1)
    if (user) this.emailService.sendMfaEnabledEmail(user.email, user.name).catch(() => {})

    return { backupCodes }
  }

  // ── Email MFA Setup ───────────────────────────────────────
  // Sends a 6-digit OTP to the user's email. Call verifyEmailMfaSetup to confirm.
  async setupEmailMfa(userId: string) {
    const [user] = await (this.db as any).select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 })

    const otp = this.generateOtp()
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min

    await (this.db as any)
      .update(users)
      .set({ mfaOtpCode: otp, mfaOtpExpires: expires, updatedAt: new Date() })
      .where(eq(users.id, userId))

    await this.emailService.sendMfaOtpEmail(user.email, user.name, otp, 'setup')
    logger.info({ userId }, 'Email MFA setup OTP sent')
  }

  // Verifies the OTP and completes email MFA setup
  async verifyEmailMfaSetup(userId: string, code: string) {
    const [user] = await (this.db as any).select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 })

    if (!user.mfaOtpCode || !user.mfaOtpExpires) {
      throw Object.assign(new Error('No pending OTP. Request a new code.'), { statusCode: 400 })
    }
    if (new Date(user.mfaOtpExpires) < new Date()) {
      throw Object.assign(new Error('Code expired. Request a new one.'), { statusCode: 410 })
    }
    if (user.mfaOtpCode !== code.trim()) {
      throw Object.assign(new Error('Incorrect code. Please try again.'), { statusCode: 401 })
    }

    const backupCodes = this.generateBackupCodes()
    await this.addMethod(userId, 'email', { mfaOtpCode: null, mfaOtpExpires: null, mfaBackupCodes: JSON.stringify(backupCodes) })

    this.emailService.sendMfaEnabledEmail(user.email, user.name).catch(() => {})
    return { backupCodes }
  }

  // ── SMS MFA Setup ─────────────────────────────────────────
  // PRODUCTION READY — disabled until SMS_ENABLED=true in .env
  async setupSmsMfa(userId: string, phoneNumber: string) {
    if (!this.smsService.isEnabled()) {
      throw Object.assign(
        new Error('SMS authentication is not yet available. Please use the Authenticator app or Email code instead.'),
        { statusCode: 503 },
      )
    }

    const [user] = await (this.db as any).select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 })

    const normalised = phoneNumber.replace(/\s/g, '')
    const otp = this.generateOtp()
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    await (this.db as any)
      .update(users)
      .set({ phoneNumber: normalised, mfaOtpCode: otp, mfaOtpExpires: expires, updatedAt: new Date() })
      .where(eq(users.id, userId))

    await this.smsService.sendOtp(normalised, otp, 'setup')
    logger.info({ userId }, 'SMS MFA setup OTP sent')
  }

  async verifySmsMfaSetup(userId: string, code: string) {
    if (!this.smsService.isEnabled()) {
      throw Object.assign(new Error('SMS authentication is not yet available.'), { statusCode: 503 })
    }

    const [user] = await (this.db as any).select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 })
    if (!user.mfaOtpCode || !user.mfaOtpExpires) throw Object.assign(new Error('No pending OTP.'), { statusCode: 400 })
    if (new Date(user.mfaOtpExpires) < new Date()) throw Object.assign(new Error('Code expired.'), { statusCode: 410 })
    if (user.mfaOtpCode !== code.trim()) throw Object.assign(new Error('Incorrect code.'), { statusCode: 401 })

    const backupCodes = this.generateBackupCodes()
    await this.addMethod(userId, 'sms', { mfaOtpCode: null, mfaOtpExpires: null, mfaBackupCodes: JSON.stringify(backupCodes) })
    return { backupCodes }
  }

  // ── Login OTP (email/SMS) ─────────────────────────────────
  // Sends OTP for the specified method (or all email/SMS methods if none specified).
  // All email/SMS methods share the same OTP code stored on the user row.
  async sendLoginOtp(userId: string, targetMethod?: MfaMethodType) {
    const [user] = await (this.db as any).select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 })

    const otp = this.generateOtp()
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    await (this.db as any)
      .update(users)
      .set({ mfaOtpCode: otp, mfaOtpExpires: expires, updatedAt: new Date() })
      .where(eq(users.id, userId))

    const methods = targetMethod ? [targetMethod] : this.getEnabledMethods(user).filter(m => m === 'email' || m === 'sms')

    for (const method of methods) {
      if (method === 'sms' && this.smsService.isEnabled() && (user as any).phoneNumber) {
        await this.smsService.sendOtp((user as any).phoneNumber, otp, 'login')
      } else if (method === 'email') {
        await this.emailService.sendMfaOtpEmail(user.email, user.name, otp, 'login')
      }
    }

    logger.info({ userId, methods }, 'Login OTP sent')
  }

  // Verify a login OTP and clear it
  async verifyLoginOtp(userId: string, code: string): Promise<boolean> {
    const [user] = await (this.db as any).select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user || !user.mfaOtpCode || !user.mfaOtpExpires) return false
    if (new Date(user.mfaOtpExpires) < new Date()) return false
    if (user.mfaOtpCode !== code.trim()) return false

    // Clear OTP after successful use
    await (this.db as any)
      .update(users)
      .set({ mfaOtpCode: null, mfaOtpExpires: null, updatedAt: new Date() })
      .where(eq(users.id, userId))

    return true
  }

  // ── Additional Authenticator Devices ─────────────────────
  async initiateAddDevice(userId: string, email: string) {
    const secret = authenticator.generateSecret(20)
    const otpAuthUrl = authenticator.keyuri(email, this.env.TOTP_ISSUER, secret)
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl)
    return { secret, qrCodeDataUrl }
  }

  async confirmAddDevice(userId: string, secret: string, code: string, label: string) {
    const isValid = authenticator.verify({ token: code, secret })
    if (!isValid) {
      throw Object.assign(new Error('Invalid code. Make sure you scanned the QR code for this new device.'), { statusCode: 400 })
    }

    const [device] = await (this.db as any)
      .insert(mfaDevices)
      .values({ userId, secret, label: label || 'Authenticator' })
      .returning()

    logger.info({ userId, deviceId: device.id }, 'Additional MFA device added')
    return device
  }

  async listDevices(userId: string) {
    return (this.db as any)
      .select({ id: mfaDevices.id, label: mfaDevices.label, lastUsedAt: mfaDevices.lastUsedAt, createdAt: mfaDevices.createdAt })
      .from(mfaDevices)
      .where(eq(mfaDevices.userId, userId))
  }

  async removeDevice(userId: string, deviceId: string) {
    const [device] = await (this.db as any)
      .select()
      .from(mfaDevices)
      .where(and(eq(mfaDevices.id, deviceId), eq(mfaDevices.userId, userId)))
      .limit(1)

    if (!device) throw Object.assign(new Error('Device not found'), { statusCode: 404 })

    await (this.db as any)
      .delete(mfaDevices)
      .where(and(eq(mfaDevices.id, deviceId), eq(mfaDevices.userId, userId)))
  }

  // Verify TOTP against primary secret OR any registered extra device
  async verifyTotpAnyDevice(userId: string, code: string): Promise<boolean> {
    const [user] = await (this.db as any).select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user) return false

    // Check primary secret
    if (user.mfaSecret && authenticator.verify({ token: code, secret: user.mfaSecret })) {
      return true
    }

    // Check additional devices
    const devices = await (this.db as any).select().from(mfaDevices).where(eq(mfaDevices.userId, userId))
    for (const device of devices) {
      if (authenticator.verify({ token: code, secret: device.secret })) {
        // Update last used
        await (this.db as any)
          .update(mfaDevices)
          .set({ lastUsedAt: new Date().toISOString() })
          .where(eq(mfaDevices.id, device.id))
        return true
      }
    }

    // Check backup codes
    if (user.mfaBackupCodes) {
      try {
        const codes: string[] = JSON.parse(user.mfaBackupCodes)
        const normalised = code.toUpperCase().replace(/\s/g, '')
        const idx = codes.indexOf(normalised)
        if (idx !== -1) {
          // Consume the backup code
          codes.splice(idx, 1)
          await (this.db as any)
            .update(users)
            .set({ mfaBackupCodes: JSON.stringify(codes), updatedAt: new Date() })
            .where(eq(users.id, userId))
          logger.info({ userId }, 'Backup code used for login')
          return true
        }
      } catch { /* ignore */ }
    }

    return false
  }

  // ── Get current MFA status for a user ─────────────────────
  async getStatus(userId: string) {
    const [user] = await (this.db as any).select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 })
    const methods = this.getEnabledMethods(user)
    const devices = await this.listDevices(userId)
    return {
      enabled: !!user.mfaEnabled,
      methods,
      devices,
    }
  }

  // ── Regenerate Backup Codes ───────────────────────────────
  async regenerateBackupCodes(userId: string, password: string) {
    const [user] = await (this.db as any).select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw Object.assign(new Error('Incorrect password'), { statusCode: 401 })

    const backupCodes = this.generateBackupCodes()
    await (this.db as any)
      .update(users)
      .set({ mfaBackupCodes: JSON.stringify(backupCodes), updatedAt: new Date() })
      .where(eq(users.id, userId))

    return { backupCodes }
  }

  // ── Remove a single MFA method (requires verifying ANY active method) ──────
  async disableMethod(userId: string, methodToRemove: MfaMethodType, password: string, code: string) {
    const [user] = await (this.db as any).select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 })

    const validPassword = await bcrypt.compare(password, user.passwordHash)
    if (!validPassword) throw Object.assign(new Error('Invalid password'), { statusCode: 401 })

    // Verify via ANY active method
    const verified = await this.verifyTotpAnyDevice(userId, code) || await this.verifyLoginOtp(userId, code)
    if (!verified) throw Object.assign(new Error('Invalid or expired code'), { statusCode: 401 })

    const remaining = await this.removeMethod(userId, methodToRemove)
    if (methodToRemove === 'totp') {
      await (this.db as any).delete(mfaDevices).where(eq(mfaDevices.userId, userId))
    }
    return { remainingMethods: remaining }
  }

  // ── Disable ALL MFA (requires password + current code) ────────
  async disableMfa(userId: string, password: string, code: string) {
    const [user] = await (this.db as any).select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 })

    const validPassword = await bcrypt.compare(password, user.passwordHash)
    if (!validPassword) throw Object.assign(new Error('Invalid password'), { statusCode: 401 })

    const verified = await this.verifyTotpAnyDevice(userId, code) || await this.verifyLoginOtp(userId, code)
    if (!verified) throw Object.assign(new Error('Invalid or expired code'), { statusCode: 401 })

    await (this.db as any)
      .update(users)
      .set({ mfaEnabled: false, mfaMethods: '[]', mfaSecret: null, mfaOtpCode: null, mfaOtpExpires: null, updatedAt: new Date() })
      .where(eq(users.id, userId))

    await (this.db as any).delete(mfaDevices).where(eq(mfaDevices.userId, userId))
  }
}
