import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("debug"),
  AUTH_PORT: z.coerce.number().default(3001),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
  TOTP_ISSUER: z.string().default("DentalIQ"),
  TENANT_PORT: z.coerce.number().default(3002),
  BILLING_PORT: z.coerce.number().default(3003),
  ESTIMATE_PORT: z.coerce.number().default(3004),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_ENTERPRISE: z.string().optional(),
  STRIPE_PRICE_CORTEX: z.string().optional(),
  DB_TYPE: z.enum(["sqlite", "postgres"]).default("sqlite"),
  DATABASE_PATH: z.string().default("dentaliq.db"),
  DATABASE_URL: z.string().optional(),
  LLM_PROVIDER: z
    .enum(["ollama", "openai", "claude", "gemini"])
    .default("ollama"),
  OLLAMA_BASE_URL: z.string().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().default("llama3.1:8b"),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  EMAIL_MODE: z.enum(["console", "smtp", "resend"]).default("console"),
  EMAIL_FROM: z.string().default("noreply@dentaliq.ca"),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  AGENT_MANAGER_PORT: z.coerce.number().default(3006),
  AGENT_MANAGER_URL: z.string().default("http://localhost:3006"),
  NEXT_PUBLIC_AGENT_MANAGER_URL: z.string().optional(),
  ADMIN_SECRET: z.string().optional(),
  APP_URL: z.string().default("http://localhost:3000"),
  NEXT_PUBLIC_ENABLE_DEMO: z.string().optional(),
});

function parseEnv(env: Record<string, string | undefined>) {
  return envSchema.safeParse(env);
}

describe("envSchema validation", () => {
  it("returns defaults when minimal env is set", () => {
    const result = parseEnv({ JWT_SECRET: "a".repeat(32) });
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.NODE_ENV).toBe("development");
    expect(result.data.AUTH_PORT).toBe(3001);
    expect(result.data.TENANT_PORT).toBe(3002);
    expect(result.data.ESTIMATE_PORT).toBe(3004);
    expect(result.data.DB_TYPE).toBe("sqlite");
    expect(result.data.LLM_PROVIDER).toBe("ollama");
    expect(result.data.EMAIL_MODE).toBe("console");
    expect(result.data.TOTP_ISSUER).toBe("DentalIQ");
  });

  it("fails when JWT_SECRET is too short", () => {
    const result = parseEnv({ JWT_SECRET: "short" });
    expect(result.success).toBe(false);
  });

  it("fails when JWT_SECRET is missing", () => {
    const result = parseEnv({});
    expect(result.success).toBe(false);
  });

  it("coerces port numbers from strings", () => {
    const result = parseEnv({
      JWT_SECRET: "a".repeat(32),
      AUTH_PORT: "9001",
      ESTIMATE_PORT: "9004",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.AUTH_PORT).toBe(9001);
    expect(result.data.ESTIMATE_PORT).toBe(9004);
  });

  it("accepts valid enum values for DB_TYPE", () => {
    const result = parseEnv({
      JWT_SECRET: "a".repeat(32),
      DB_TYPE: "postgres",
      DATABASE_URL: "postgresql://localhost/test",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.DB_TYPE).toBe("postgres");
  });

  it("rejects invalid DB_TYPE", () => {
    const result = parseEnv({
      JWT_SECRET: "a".repeat(32),
      DB_TYPE: "mysql",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid enum values for LLM_PROVIDER", () => {
    const result = parseEnv({
      JWT_SECRET: "a".repeat(32),
      LLM_PROVIDER: "claude",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.LLM_PROVIDER).toBe("claude");
  });

  it("rejects invalid LLM_PROVIDER", () => {
    const result = parseEnv({
      JWT_SECRET: "a".repeat(32),
      LLM_PROVIDER: "gpt5",
    });
    expect(result.success).toBe(false);
  });

  it("treats Stripe keys as optional", () => {
    const result = parseEnv({ JWT_SECRET: "a".repeat(32) });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.STRIPE_SECRET_KEY).toBeUndefined();
    expect(result.data.STRIPE_PUBLISHABLE_KEY).toBeUndefined();
    expect(result.data.STRIPE_WEBHOOK_SECRET).toBeUndefined();
  });

  it("accepts all valid EMAIL_MODE values", () => {
    for (const mode of ["console", "smtp", "resend"]) {
      const result = parseEnv({ JWT_SECRET: "a".repeat(32), EMAIL_MODE: mode });
      expect(result.success).toBe(true);
    }
  });

  it("accepts all valid NODE_ENV values", () => {
    for (const env of ["development", "test", "production"]) {
      const result = parseEnv({ JWT_SECRET: "a".repeat(32), NODE_ENV: env });
      expect(result.success).toBe(true);
    }
  });
});
