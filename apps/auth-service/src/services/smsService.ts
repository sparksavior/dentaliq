import { createLogger } from '@dentaliq/logger'

const logger = createLogger('sms-service')

// ─────────────────────────────────────────────────────────
// SMS Service — Twilio
//
// PRODUCTION READY — but DISABLED by default.
// Enable by setting SMS_ENABLED=true in .env, plus:
//   TWILIO_ACCOUNT_SID=ACxxxx
//   TWILIO_AUTH_TOKEN=your_auth_token
//   TWILIO_FROM_NUMBER=+1XXXXXXXXXX  (your Twilio number)
//
// Cost: ~$0.0075 USD/SMS (Twilio standard)
// ─────────────────────────────────────────────────────────

export class SmsService {
  private enabled: boolean
  private accountSid: string
  private authToken: string
  private fromNumber: string

  constructor() {
    this.enabled = process.env.SMS_ENABLED === 'true'
    this.accountSid = process.env.TWILIO_ACCOUNT_SID ?? ''
    this.authToken = process.env.TWILIO_AUTH_TOKEN ?? ''
    this.fromNumber = process.env.TWILIO_FROM_NUMBER ?? ''
  }

  isEnabled(): boolean {
    return this.enabled && !!this.accountSid && !!this.authToken && !!this.fromNumber
  }

  async sendOtp(toNumber: string, otp: string, context: 'setup' | 'login'): Promise<void> {
    if (!this.isEnabled()) {
      throw new Error('SMS service is not enabled')
    }

    const message = context === 'setup'
      ? `Your DentalIQ verification code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.`
      : `Your DentalIQ sign-in code is: ${otp}\n\nThis code expires in 10 minutes. If you didn't request this, secure your account immediately.`

    if (process.env.SMS_MODE === 'console') {
      // Console mode — print instead of send (useful for staging)
      logger.info(`[SMS:console] To: ${toNumber}\n${message}`)
      return
    }

    // Real Twilio send
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`
    const body = new URLSearchParams({
      From: this.fromNumber,
      To: toNumber,
      Body: message,
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as any
      logger.error({ toNumber, twilioError: err }, 'Twilio SMS send failed')
      throw Object.assign(
        new Error(`Failed to send SMS: ${err?.message ?? response.statusText}`),
        { statusCode: 502 },
      )
    }

    const result = await response.json() as any
    logger.info({ sid: result.sid, to: toNumber, context }, 'SMS OTP sent via Twilio')
  }
}
