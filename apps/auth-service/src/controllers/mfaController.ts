import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import bcrypt from 'bcryptjs'
import { createId } from '@paralleldrive/cuid2'
import { getDb, users } from '@dentaliq/db'
import { getEnv } from '@dentaliq/config'
import { eq } from 'drizzle-orm'

// ─────────────────────────────────────────────────────────
// MFA Controller — TOTP (RFC 6238)
// Compatible with: Google Authenticator, Authy, 1Password
// ─────────────────────────────────────────────────────────

export class MfaController {
  private db = getDb()
  private env = getEnv()

  // ── Generate TOTP secret + QR code ───────────────────────
  async setupMfa(userId: string, email: string) {
    const secret = authenticator.generateSecret(20)

    // Generate backup codes (8 codes, each 8 chars)
    const backupCodes = Array.from({ length: 8 }, () =>
      (createId().slice(0, 4) + '-' + createId().slice(0, 4)).toUpperCase(),
    )

    // OTPAuth URL for QR code
    const otpAuthUrl = authenticator.keyuri(email, this.env.TOTP_ISSUER, secret)
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl)

    return { secret, qrCodeDataUrl, backupCodes }
  }

  // ── Verify TOTP code and enable MFA ──────────────────────
  async verifyAndEnableMfa(userId: string, secret: string, code: string) {
    const isValid = authenticator.verify({ token: code, secret })

    if (!isValid) {
      const err = new Error('Invalid TOTP code. Please try again.')
      ;(err as any).statusCode = 400
      throw err
    }

    // Store secret encrypted — in production use AWS KMS or similar
    // For now we store it directly; add encryption wrapper in Phase 3
    await this.db
      .update(users)
      .set({
        mfaEnabled: true,
        mfaSecret: secret,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
  }

  // ── Disable MFA ───────────────────────────────────────────
  async disableMfa(userId: string, password: string, code: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user) throw new Error('User not found')

    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash)
    if (!validPassword) {
      const err = new Error('Invalid password')
      ;(err as any).statusCode = 401
      throw err
    }

    // Verify TOTP one last time
    if (user.mfaSecret) {
      const validCode = authenticator.verify({ token: code, secret: user.mfaSecret })
      if (!validCode) {
        const err = new Error('Invalid MFA code')
        ;(err as any).statusCode = 401
        throw err
      }
    }

    await this.db
      .update(users)
      .set({ mfaEnabled: false, mfaSecret: null, updatedAt: new Date() })
      .where(eq(users.id, userId))
  }
}
