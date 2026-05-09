import { z } from "zod";

// ─────────────────────────────────────────────────────────
// DentalIQ — Environment Config (local-dev friendly)
// ─────────────────────────────────────────────────────────

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("debug"),

  // Auth
  AUTH_PORT: z.coerce.number().default(3001),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
  TOTP_ISSUER: z.string().default("DentalIQ"),

  // Tenant
  TENANT_PORT: z.coerce.number().default(3002),

  // Billing
  BILLING_PORT: z.coerce.number().default(3003),

  // Estimate / Insurance Engine
  ESTIMATE_PORT: z.coerce.number().default(3004),

  // Stripe (all optional — gracefully disabled if not set)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_ENTERPRISE: z.string().optional(),
  STRIPE_PRICE_CORTEX: z.string().optional(),

  // Database
  // DB_TYPE=sqlite  → local file, no Docker needed (default for dev)
  // DB_TYPE=postgres → requires DATABASE_URL pointing at a PostgreSQL server
  DB_TYPE: z.enum(["sqlite", "postgres"]).default("sqlite"),
  DATABASE_PATH: z.string().default("dentaliq.db"), // sqlite only
  DATABASE_URL: z.string().optional(), // postgres only

  // LLM (all optional locally — add keys when needed)
  LLM_PROVIDER: z
    .enum(["ollama", "openai", "claude", "gemini"])
    .default("ollama"),
  OLLAMA_BASE_URL: z.string().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().default("llama3.1:8b"),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // CORS
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),

  // Email — console mode for local dev (no SMTP server needed)
  EMAIL_MODE: z.enum(["console", "smtp", "resend"]).default("console"),
  EMAIL_FROM: z.string().default("noreply@dentaliq.ca"),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),

  // Agent Manager
  AGENT_MANAGER_PORT: z.coerce.number().default(3006),
  AGENT_MANAGER_URL: z.string().default("http://localhost:3006"),
  NEXT_PUBLIC_AGENT_MANAGER_URL: z.string().optional(),

  // Admin portal auth token (set a long random string in production)
  ADMIN_SECRET: z.string().optional(),

  // Frontend
  APP_URL: z.string().default("http://localhost:3000"),
  NEXT_PUBLIC_ENABLE_DEMO: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`\n❌ Invalid environment variables:\n${errors}\n`);
  }
  return result.data;
}

let _env: Env | undefined;

export function getEnv(): Env {
  if (!_env) _env = parseEnv();
  return _env;
}
