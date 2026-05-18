import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { MfaController } from "../controllers/mfaController";
import { requireAuth } from "../middleware/requireAuth";

// ─────────────────────────────────────────────────────────
// MFA Routes (PHIPA mandates MFA for PHI access)
// POST /auth/mfa/setup          → generate TOTP secret + QR code
// POST /auth/mfa/verify         → verify TOTP and enable MFA
// POST /auth/mfa/disable        → disable ALL MFA (requires TOTP code)
// POST /auth/mfa/send-otp       → send email/SMS OTP for setup or login
// POST /auth/mfa/verify-otp     → verify email/SMS OTP and enable method
// POST /auth/mfa/remove-method  → remove a specific MFA method
// GET  /auth/mfa/status         → return enabled methods + SMS availability
// ─────────────────────────────────────────────────────────

const verifySchema = z.object({
  code: z.string().length(6),
  secret: z.string(),
});

const disableSchema = z.object({
  password: z.string(),
  code: z.string().length(6),
});

const sendOtpSchema = z.object({
  method: z.enum(["email", "sms"]),
});

const verifyOtpSchema = z.object({
  method: z.enum(["email", "sms"]),
  code: z.string().length(6),
});

const removeMethodSchema = z.object({
  method: z.enum(["totp", "email", "sms"]),
  password: z.string(),
});

export async function mfaRoutes(app: FastifyInstance) {
  const ctrl = new MfaController();

  // All MFA routes require a logged-in user
  app.addHook("onRequest", requireAuth(app));

  // ── Status: which methods are enabled + SMS availability ──
  app.get("/status", async (req, reply) => {
    return reply.send({
      success: true,
      data: { smsAvailable: ctrl.isSmsConfigured() },
    });
  });

  // ── Setup: generate TOTP secret + QR code ────────────────
  app.post("/setup", async (req, reply) => {
    const user = req.user as any;
    const { secret, qrCodeDataUrl, backupCodes } = await ctrl.setupMfa(
      user.sub,
      user.email,
    );
    return reply.send({
      success: true,
      data: {
        secret,
        qrCodeDataUrl,
        backupCodes,
        message:
          "Scan the QR code with your authenticator app, then verify with a 6-digit code.",
      },
    });
  });

  // ── Verify TOTP: confirm code and enable TOTP method ──────
  app.post("/verify", async (req, reply) => {
    const user = req.user as any;
    const { code, secret } = verifySchema.parse(req.body);
    try {
      await ctrl.verifyAndEnableMfa(user.sub, secret, code);
      return reply.send({
        success: true,
        message:
          "Authenticator app enabled. Your account is now PHIPA-compliant.",
      });
    } catch (err: any) {
      const status = err.statusCode ?? 400;
      return reply
        .code(status)
        .send({ success: false, error: err.message ?? "Verification failed" });
    }
  });

  // ── Send OTP: email or SMS ────────────────────────────────
  app.post("/send-otp", async (req, reply) => {
    const user = req.user as any;
    const { method } = sendOtpSchema.parse(req.body);
    try {
      await ctrl.sendOtp(user.sub, method);
      return reply.send({
        success: true,
        message: `Verification code sent via ${method}.`,
      });
    } catch (err: any) {
      const status = err.statusCode ?? 500;
      return reply
        .code(status)
        .send({ success: false, error: err.message ?? "Failed to send code" });
    }
  });

  // ── Verify OTP: confirm email/SMS code and enable method ──
  app.post("/verify-otp", async (req, reply) => {
    const user = req.user as any;
    const { method, code } = verifyOtpSchema.parse(req.body);
    try {
      await ctrl.verifyOtpAndEnable(user.sub, method, code);
      return reply.send({
        success: true,
        message: `${method === "email" ? "Email" : "SMS"} two-factor authentication enabled.`,
      });
    } catch (err: any) {
      const status = err.statusCode ?? 400;
      return reply
        .code(status)
        .send({ success: false, error: err.message ?? "Verification failed" });
    }
  });

  // ── Remove a specific MFA method ─────────────────────────
  app.post("/remove-method", async (req, reply) => {
    const user = req.user as any;
    const { method, password } = removeMethodSchema.parse(req.body);
    await ctrl.removeMethod(user.sub, method, password);
    return reply.send({
      success: true,
      message: `${method.toUpperCase()} method removed.`,
    });
  });

  // ── Disable ALL MFA (legacy — requires TOTP code) ────────
  app.post("/disable", async (req, reply) => {
    const user = req.user as any;
    const { password, code } = disableSchema.parse(req.body);
    await ctrl.disableMfa(user.sub, password, code);
    return reply.send({ success: true, message: "All MFA methods disabled." });
  });
}
