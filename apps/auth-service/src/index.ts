import Fastify from "fastify";
import { fastifyJwt } from "@fastify/jwt";
import { fastifyCookie } from "@fastify/cookie";
import { fastifyHelmet } from "@fastify/helmet";
import { fastifyCors } from "@fastify/cors";
import { fastifyRateLimit } from "@fastify/rate-limit";
import { getEnv } from "@dentaliq/config";
import { createLogger } from "@dentaliq/logger";
import { getDb, schema } from "@dentaliq/db";
import { sql } from "drizzle-orm";

import { authRoutes } from "./routes/auth";
import { mfaRoutes } from "./routes/mfa";
import { userRoutes } from "./routes/users";
import { adminRoutes } from "./routes/admin";
import { supportRoutes } from "./routes/support";
import { errorHandler } from "./middleware/errorHandler";

// ─────────────────────────────────────────────────────────
// DentalIQ — Auth Service  (port 3001)
// Pure JS stack — no Docker, no native modules
// Last update: 2026-04-30 01:28
// ─────────────────────────────────────────────────────────

const logger = createLogger("auth-service");

async function initDb() {
  const db = getDb() as any;

  // Create core tables if they don't exist (libsql / SQLite)
  await db.run(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      schema_name TEXT NOT NULL UNIQUE,
      plan TEXT NOT NULL DEFAULT 'pro',
      status TEXT NOT NULL DEFAULT 'trial',
      pms_type TEXT NOT NULL DEFAULT 'none',
      pms_connected INTEGER NOT NULL DEFAULT 0,
      pms_api_key TEXT,
      stripe_customer_id TEXT,
      trial_ends_at TEXT,
      billing_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `),
  );

  await db.run(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'front_desk',
      mfa_enabled INTEGER NOT NULL DEFAULT 0,
      mfa_secret TEXT,
      mfa_backup_codes TEXT,
      email_verified INTEGER NOT NULL DEFAULT 0,
      email_verify_token TEXT,
      password_reset_token TEXT,
      password_reset_expires TEXT,
      last_login_at TEXT,
      permissions TEXT NOT NULL DEFAULT '[]',
      invited_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `),
  );

  // Add columns for existing DBs that predate this migration
  for (const col of [
    `ALTER TABLE users ADD COLUMN permissions TEXT NOT NULL DEFAULT '[]'`,
    `ALTER TABLE users ADD COLUMN invited_by TEXT`,
  ]) {
    try { await db.run(sql.raw(col)) } catch { /* column already exists */ }
  }

  await db.run(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `),
  );

  await db.run(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      user_id TEXT,
      service TEXT NOT NULL,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `),
  );

  await db.run(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      clinic_name TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `),
  );

  await db.run(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS support_messages (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      sender_type TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `),
  );

  await db.run(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS invite_tokens (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      invited_by_user_id TEXT NOT NULL,
      permissions TEXT NOT NULL DEFAULT '[]',
      mfa_setup_secret TEXT,
      mfa_backup_codes TEXT,
      expires_at TEXT NOT NULL,
      accepted_at TEXT,
      created_user_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `),
  );

  logger.info("✓ Database tables ready (SQLite)");
}

async function buildApp() {
  const env = getEnv();
  const app = Fastify({ logger: false, trustProxy: true });

  await app.register(fastifyHelmet, { contentSecurityPolicy: false });
  await app.register(fastifyCors, {
    origin: env.ALLOWED_ORIGINS.split(","),
    credentials: true,
  });
  await app.register(fastifyCookie, {
    secret: env.JWT_SECRET,
    hook: "onRequest",
  });
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    cookie: { cookieName: "refresh_token", signed: true },
  });
  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: "1 minute",
    errorResponseBuilder: () => ({
      success: false,
      error: "Too many requests — slow down.",
    }),
  });

  app.setErrorHandler(errorHandler(logger));

  app.get("/health", async () => ({
    status: "ok",
    service: "auth-service",
    version: "1.0.0",
    db: "sqlite (libsql)",
    timestamp: new Date().toISOString(),
  }));

  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(mfaRoutes, { prefix: "/auth/mfa" });
  await app.register(userRoutes, { prefix: "/users" });
  await app.register(adminRoutes, { prefix: "/admin" });
  await app.register(supportRoutes, { prefix: "/support" });

  return app;
}

async function runTrialExpiryCheck() {
  const db = getDb() as any;
  const now = new Date().toISOString();
  try {
    const result = await db.run(
      sql.raw(`
      UPDATE tenants 
      SET status = 'suspended' 
      WHERE status = 'trial' AND trial_ends_at < '${now}'
    `),
    );
    if (result.rowsAffected > 0) {
      logger.info(
        `[TrialExpiry] Suspended ${result.rowsAffected} clinics due to expired trials.`,
      );
    }
  } catch (err) {
    logger.error({ err }, "Failed to run trial expiry check");
  }
}

async function main() {
  const env = getEnv();

  try {
    await initDb();
  } catch (err) {
    logger.fatal({ err }, "Database init failed");
    process.exit(1);
  }

  const app = await buildApp();

  try {
    await app.listen({ port: env.AUTH_PORT, host: "0.0.0.0" });
    logger.info(`\n  ✓ Auth service   → http://localhost:${env.AUTH_PORT}`);
    logger.info(
      `  ✓ Health check   → http://localhost:${env.AUTH_PORT}/health`,
    );
    logger.info(`  ✓ Database       → dentaliq.db (SQLite)`);
    logger.info(
      `  ✓ Email mode     → ${env.EMAIL_MODE} ${env.EMAIL_MODE === "console" ? "(emails print to terminal)" : "(REAL EMAILS ENABLED)"}\n`,
    );
  } catch (err) {
    logger.fatal({ err }, "Failed to start");
    process.exit(1);
  }

  // Run trial expiry check on startup and then every hour
  runTrialExpiryCheck();
  setInterval(runTrialExpiryCheck, 60 * 60 * 1000);

  const shutdown = async () => {
    logger.info("Shutting down...");
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
