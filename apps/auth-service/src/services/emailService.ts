import { getEnv } from '@dentaliq/config'
import { createLogger } from '@dentaliq/logger'

const logger = createLogger('email-service')

// ─────────────────────────────────────────────────────────
// Email Service
// EMAIL_MODE=console → prints to terminal (local dev default)
// EMAIL_MODE=smtp    → sends via nodemailer (add later)
// ─────────────────────────────────────────────────────────

export class EmailService {
  private env = getEnv()

  async sendVerificationEmail(email: string, name: string, token: string) {
    const url = `${this.env.APP_URL}/verify-email?token=${token}`

    if (this.env.EMAIL_MODE === 'console') {
      this.printEmail({
        to: email,
        subject: 'Verify your DentalIQ email',
        body: [
          `Hi ${name},`,
          ``,
          `Verify your email by clicking this link (or copy into browser):`,
          ``,
          `  ${url}`,
          ``,
          `This link expires in 24 hours.`,
        ],
      })
      return
    }

    // SMTP mode — install nodemailer and uncomment when ready
    // const transporter = nodemailer.createTransport({ host: this.env.SMTP_HOST, port: this.env.SMTP_PORT })
    // await transporter.sendMail({ from: this.env.SMTP_FROM, to: email, subject: '...', html: '...' })
  }

  async sendPasswordResetEmail(email: string, name: string, token: string) {
    const url = `${this.env.APP_URL}/reset-password?token=${token}`

    if (this.env.EMAIL_MODE === 'console') {
      this.printEmail({
        to: email,
        subject: 'Reset your DentalIQ password',
        body: [
          `Hi ${name},`,
          ``,
          `Reset your password by clicking this link:`,
          ``,
          `  ${url}`,
          ``,
          `This link expires in 1 hour.`,
          `If you didn't request this, ignore this email.`,
        ],
      })
      return
    }
  }

  private printEmail({ to, subject, body }: { to: string; subject: string; body: string[] }) {
    const line = '─'.repeat(55)
    logger.info(
      `\n${line}\n📧 EMAIL (console mode)\n   To: ${to}\n   Subject: ${subject}\n\n${body.map(l => '   ' + l).join('\n')}\n${line}`
    )
  }
}
