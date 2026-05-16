import bcrypt from "bcryptjs";
import { createId } from "@paralleldrive/cuid2";
import type { FastifyInstance } from "fastify";
import { getDb, users, refreshTokens, tenants } from "@dentaliq/db";
import { getEnv } from "@dentaliq/config";
import { createLogger } from "@dentaliq/logger";
import type { JWTPayload, AuthTokens, UserRole } from "@dentaliq/types";
import { eq, and, gt } from "drizzle-orm";
import { authenticator } from "otplib";
import { TenantService } from "../services/tenantService";
import { EmailService } from "../services/emailService";
import { AuditService } from "../services/auditService";

const logger = createLogger("auth-controller");

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  clinicName: string;
  plan: string;
  inviteToken?: string;
}

interface LoginInput {
  email: string;
  password: string;
  totpCode?: string;
}

export class AuthController {
  private db = getDb();
  private env = getEnv();
  private tenantService = new TenantService();
  private emailService = new EmailService();
  private auditService = new AuditService();

  constructor(private app: FastifyInstance) {}

  // ── Register ──────────────────────────────────────────────
  async register(input: RegisterInput) {
    const { name, email, password, clinicName, plan } = input;
    logger.info({ email, clinicName, plan }, "Starting registration...");

    try {
      const existing = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existing.length > 0) {
        logger.warn({ email }, "Registration failed — email exists");
        const err = new Error("An account with this email already exists");
        (err as any).statusCode = 409;
        throw err;
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const emailVerifyToken = createId();

      logger.info({ clinicName }, "Provisioning tenant...");
      const tenant = await this.tenantService.provision({
        name: clinicName,
        plan: plan as any,
      });

      logger.info({ tenantId: tenant.id }, "Inserting user...");
      const [user] = await this.db
        .insert(users)
        .values({
          tenantId: tenant.id,
          email: email.toLowerCase(),
          name,
          passwordHash,
          role: "admin" as UserRole,
          emailVerifyToken,
        })
        .returning();

      // Send verification email (non-blocking)
      this.emailService
        .sendVerificationEmail(user.email, user.name, emailVerifyToken)
        .catch((err) => logger.error({ err }, "Verification email failed"));

      logger.info(
        { userId: user.id, tenantId: tenant.id },
        "User registered successfully",
      );

      await this.auditService.log({
        tenantId: tenant.id,
        userId: user.id,
        action: "USER_REGISTERED",
        resourceType: "user",
        resourceId: user.id,
        metadata: { email: user.email, plan: tenant.plan },
      });

      return {
        userId: user.id,
        tenantId: tenant.id,
        email: user.email,
        message:
          "Account created! Check your email (or terminal in dev mode) for a verification link.",
      };
    } catch (err: any) {
      logger.error({ err, email }, "Registration process failed");
      throw err;
    }
  }

  // ── Login ─────────────────────────────────────────────────
  async login(input: LoginInput, ip: string) {
    const { email, password, totpCode } = input;

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      const err = new Error("Invalid email or password");
      (err as any).statusCode = 401;
      throw err;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      logger.warn({ email, ip }, "Failed login — wrong password");
      const err = new Error("Invalid email or password");
      (err as any).statusCode = 401;
      throw err;
    }

    if (user.mfaEnabled) {
      if (!totpCode) return { requiresMfa: true, tokens: null, user: null };
      if (!user.mfaSecret) throw new Error("MFA setup incomplete");
      const isValid = authenticator.verify({
        token: totpCode,
        secret: user.mfaSecret,
      });
      if (!isValid) {
        const err = new Error("Invalid MFA code");
        (err as any).statusCode = 401;
        throw err;
      }
    }

    const tokens = await this.issueTokens(user);

    await this.db
      .update(users)
      .set({ lastLoginAt: new Date().toISOString() })
      .where(eq(users.id, user.id));

    logger.info({ userId: user.id, tenantId: user.tenantId }, "User logged in");

    await this.auditService.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: "USER_LOGIN",
      ipAddress: ip,
      metadata: { email: user.email },
    });

    let permissions: string[] = []
    try { permissions = JSON.parse(user.permissions ?? '[]') } catch {}

    return {
      requiresMfa: false,
      tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        mfaEnabled: user.mfaEnabled,
        permissions,
        invitedBy: user.invitedBy ?? null,
      },
    };
  }

  // ── Refresh token ─────────────────────────────────────────
  async refreshToken(rawToken: string) {
    const now = new Date().toISOString();
    const activeTokens = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.revokedAt, null as any));

    let matched = null;
    for (const t of activeTokens) {
      if (t.expiresAt < now) continue;
      if (await bcrypt.compare(rawToken, t.tokenHash)) {
        matched = t;
        break;
      }
    }

    if (!matched) {
      const err = new Error("Invalid or expired refresh token");
      (err as any).statusCode = 401;
      throw err;
    }

    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date().toISOString() })
      .where(eq(refreshTokens.id, matched.id));

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, matched.userId))
      .limit(1);

    if (!user) {
      const err = new Error("User not found");
      (err as any).statusCode = 401;
      throw err;
    }

    return this.issueTokens(user);
  }

  // ── Logout ────────────────────────────────────────────────
  async logout(rawToken: string) {
    const active = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.revokedAt, null as any));

    for (const t of active) {
      if (await bcrypt.compare(rawToken, t.tokenHash)) {
        await this.db
          .update(refreshTokens)
          .set({ revokedAt: new Date().toISOString() })
          .where(eq(refreshTokens.id, t.id));
        break;
      }
    }
  }

  // ── Verify email ──────────────────────────────────────────
  async verifyEmail(token: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.emailVerifyToken, token))
      .limit(1);

    if (!user) {
      const err = new Error("Invalid or expired verification token");
      (err as any).statusCode = 400;
      throw err;
    }

    await this.db
      .update(users)
      .set({ emailVerified: true, emailVerifyToken: null })
      .where(eq(users.id, user.id));


  }

  // ── Forgot password ───────────────────────────────────────
  async forgotPassword(email: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) return;

    const token = createId();
    const expires = new Date(Date.now() + 3600000).toISOString();

    await this.db
      .update(users)
      .set({ passwordResetToken: token, passwordResetExpires: expires })
      .where(eq(users.id, user.id));

    await this.emailService.sendPasswordResetEmail(
      user.email,
      user.name,
      token,
    );
  }

  // ── Reset password ────────────────────────────────────────
  async resetPassword({
    token,
    password,
  }: {
    token: string;
    password: string;
  }) {
    const now = new Date().toISOString();
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, token))
      .limit(1);

    if (
      !user ||
      !user.passwordResetExpires ||
      user.passwordResetExpires < now
    ) {
      const err = new Error("Invalid or expired reset token");
      (err as any).statusCode = 400;
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await this.db
      .update(users)
      .set({
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      })
      .where(eq(users.id, user.id));

    // Revoke all refresh tokens
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date().toISOString() })
      .where(
        and(
          eq(refreshTokens.userId, user.id),
          eq(refreshTokens.revokedAt, null as any),
        ),
      );

    this.emailService
      .sendPasswordChangedEmail(user.email, user.name)
      .catch((err) => logger.error({ err }, "Password changed email failed"));
  }

  // ── Issue JWT + refresh token ─────────────────────────────
  async issueTokens(user: any): Promise<AuthTokens> {
    // Parse permissions from DB (stored as JSON string)
    let permissions: string[] = []
    try { permissions = JSON.parse(user.permissions ?? '[]') } catch {}

    const payload: JWTPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      permissions,
    };

    const accessToken = this.app.jwt.sign(payload, {
      expiresIn: this.env.JWT_EXPIRES_IN,
    });

    const rawRefreshToken = createId() + createId();
    const tokenHash = await bcrypt.hash(rawRefreshToken, 10);
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    await this.db
      .insert(refreshTokens)
      .values({ userId: user.id, tokenHash, expiresAt });

    return { accessToken, refreshToken: rawRefreshToken, expiresIn: 900 };
  }
}
