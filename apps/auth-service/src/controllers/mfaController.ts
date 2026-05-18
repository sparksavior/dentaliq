import { authenticator } from "otplib";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import { createId } from "@paralleldrive/cuid2";
import { getDb, users } from "@dentaliq/db";
import { getEnv } from "@dentaliq/config";
import { eq } from "drizzle-orm";
import { EmailService } from "../services/emailService";
import twilio from "twilio";

// ─────────────────────────────────────────────────────────
// MFA Controller
//   • TOTP   — Google Authenticator, Authy, 1Password
//   • Email  — 6-digit OTP sent to registered email
//   • SMS    — 6-digit OTP sent via Twilio (optional)
// ─────────────────────────────────────────────────────────

type MfaMethod = "totp" | "email" | "sms";

function generateNumericOtp(): string {
  // Cryptographically random 6-digit code
  return String(Math.floor(100000 + Math.random() * 900000));
}

export class MfaController {
  private db = getDb();
  private env = getEnv();
  private emailService = new EmailService();

  // ── Generate TOTP secret + QR code ───────────────────────
  async setupMfa(userId: string, email: string) {
    const secret = authenticator.generateSecret(20);

    // Generate backup codes (8 codes, each 8 chars)
    const backupCodes = Array.from({ length: 8 }, () =>
      (createId().slice(0, 4) + "-" + createId().slice(0, 4)).toUpperCase(),
    );

    // OTPAuth URL for QR code
    const otpAuthUrl = authenticator.keyuri(
      email,
      this.env.TOTP_ISSUER,
      secret,
    );
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    return { secret, qrCodeDataUrl, backupCodes };
  }

  // ── Verify TOTP code and enable MFA ──────────────────────
  async verifyAndEnableMfa(userId: string, secret: string, code: string) {
    const isValid = authenticator.verify({ token: code, secret });

    if (!isValid) {
      const err = new Error("Invalid TOTP code. Please try again.");
      (err as any).statusCode = 400;
      throw err;
    }

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new Error("User not found");

    const methods = this._parseMethods(user.mfaMethods);
    if (!methods.includes("totp")) methods.push("totp");

    await this.db
      .update(users)
      .set({
        mfaEnabled: true,
        mfaSecret: secret,
        mfaMethods: JSON.stringify(methods),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    this.emailService
      .sendMfaEnabledEmail(user.email, user.name)
      .catch((err) => console.error("[MfaController] MFA email failed:", err));
  }

  // ── Send OTP (email or SMS) ───────────────────────────────
  async sendOtp(userId: string, method: MfaMethod) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new Error("User not found");

    if (method === "sms" && !user.phoneNumber) {
      const err = new Error(
        "No phone number on file. Add a phone number to your account first.",
      );
      (err as any).statusCode = 400;
      throw err;
    }

    const code = generateNumericOtp();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    await this.db
      .update(users)
      .set({ mfaOtpCode: code, mfaOtpExpires: expires, updatedAt: new Date() })
      .where(eq(users.id, userId));

    if (method === "email") {
      await this.emailService.sendMfaOtpEmail(user.email, user.name, code);
    } else if (method === "sms") {
      await this._sendSms(
        user.phoneNumber!,
        `Your DentalIQ verification code: ${code}. Valid for 10 minutes. Do not share it.`,
      );
    }
  }

  // ── Verify OTP and enable email/SMS method ────────────────
  async verifyOtpAndEnable(userId: string, method: MfaMethod, code: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new Error("User not found");

    if (!user.mfaOtpCode || !user.mfaOtpExpires) {
      const err = new Error("No OTP pending. Request a new code first.");
      (err as any).statusCode = 400;
      throw err;
    }

    if (new Date() > new Date(user.mfaOtpExpires)) {
      const err = new Error("Code expired. Please request a new one.");
      (err as any).statusCode = 400;
      throw err;
    }

    if (user.mfaOtpCode !== code) {
      const err = new Error("Incorrect code. Please try again.");
      (err as any).statusCode = 400;
      throw err;
    }

    const methods = this._parseMethods(user.mfaMethods);
    if (!methods.includes(method)) methods.push(method);

    await this.db
      .update(users)
      .set({
        mfaEnabled: true,
        mfaMethods: JSON.stringify(methods),
        mfaOtpCode: null,
        mfaOtpExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // ── Remove a specific MFA method ─────────────────────────
  async removeMethod(userId: string, method: MfaMethod, password: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new Error("User not found");

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      const err = new Error("Invalid password");
      (err as any).statusCode = 401;
      throw err;
    }

    const methods = this._parseMethods(user.mfaMethods).filter(
      (m) => m !== method,
    );
    const stillEnabled =
      methods.length > 0 || (method !== "totp" && user.mfaSecret);

    await this.db
      .update(users)
      .set({
        mfaEnabled: stillEnabled,
        mfaSecret: method === "totp" ? null : user.mfaSecret,
        mfaMethods: JSON.stringify(methods),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // ── Disable ALL MFA (legacy route — requires TOTP code) ───
  async disableMfa(userId: string, password: string, code: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new Error("User not found");

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      const err = new Error("Invalid password");
      (err as any).statusCode = 401;
      throw err;
    }

    if (user.mfaSecret) {
      const validCode = authenticator.verify({
        token: code,
        secret: user.mfaSecret,
      });
      if (!validCode) {
        const err = new Error("Invalid MFA code");
        (err as any).statusCode = 401;
        throw err;
      }
    }

    await this.db
      .update(users)
      .set({
        mfaEnabled: false,
        mfaSecret: null,
        mfaMethods: "[]",
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // ── Check which SMS capability is available ───────────────
  isSmsConfigured(): boolean {
    return !!(
      this.env.TWILIO_ACCOUNT_SID &&
      this.env.TWILIO_AUTH_TOKEN &&
      this.env.TWILIO_FROM_NUMBER
    );
  }

  // ── Private helpers ───────────────────────────────────────
  private _parseMethods(raw: string | null | undefined): MfaMethod[] {
    try {
      return JSON.parse(raw ?? "[]");
    } catch {
      return [];
    }
  }

  private async _sendSms(to: string, body: string) {
    if (!this.isSmsConfigured()) {
      throw new Error("SMS is not configured on this server.");
    }
    const client = twilio(
      this.env.TWILIO_ACCOUNT_SID!,
      this.env.TWILIO_AUTH_TOKEN!,
    );
    await client.messages.create({
      body,
      from: this.env.TWILIO_FROM_NUMBER!,
      to,
    });
  }
}
