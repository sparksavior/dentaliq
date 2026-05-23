import client from "prom-client";

// Collect default Node.js metrics (CPU, memory, event loop, GC)
const collectDefaultMetrics = client.collectDefaultMetrics;
const Registry = client.Registry;

const globalRegistry = new Registry();
collectDefaultMetrics({ register: globalRegistry, prefix: "dentaliq_" });

// ── HTTP metrics ────────────────────────────────────────────

export const httpRequestsTotal = new client.Counter({
  name: "dentaliq_http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["service", "method", "path", "status"] as const,
  registers: [globalRegistry],
});

export const httpRequestDuration = new client.Histogram({
  name: "dentaliq_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["service", "method", "path"] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [globalRegistry],
});

export const httpActiveRequests = new client.Gauge({
  name: "dentaliq_http_active_requests",
  help: "Currently active HTTP requests",
  labelNames: ["service"] as const,
  registers: [globalRegistry],
});

// ── Auth metrics ────────────────────────────────────────────

export const authLoginsTotal = new client.Counter({
  name: "dentaliq_auth_logins_total",
  help: "Total login attempts",
  labelNames: ["result"] as const,
  registers: [globalRegistry],
});

export const authMfaVerificationsTotal = new client.Counter({
  name: "dentaliq_auth_mfa_verifications_total",
  help: "Total MFA verifications",
  labelNames: ["method", "result"] as const,
  registers: [globalRegistry],
});

export const authRegistrationsTotal = new client.Counter({
  name: "dentaliq_auth_registrations_total",
  help: "Total user registrations",
  labelNames: ["plan"] as const,
  registers: [globalRegistry],
});

// ── Estimate metrics ────────────────────────────────────────

export const estimatesTotal = new client.Counter({
  name: "dentaliq_estimates_total",
  help: "Total estimates generated",
  labelNames: ["plan", "risk", "category"] as const,
  registers: [globalRegistry],
});

export const estimateDuration = new client.Histogram({
  name: "dentaliq_estimate_duration_seconds",
  help: "Estimate generation duration in seconds",
  labelNames: ["has_llm"] as const,
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [globalRegistry],
});

// ── LLM metrics ─────────────────────────────────────────────

export const llmRequestsTotal = new client.Counter({
  name: "dentaliq_llm_requests_total",
  help: "Total LLM API requests",
  labelNames: ["provider", "result"] as const,
  registers: [globalRegistry],
});

export const llmLatency = new client.Histogram({
  name: "dentaliq_llm_latency_seconds",
  help: "LLM request latency in seconds",
  labelNames: ["provider"] as const,
  buckets: [0.5, 1, 2, 5, 10, 20, 30],
  registers: [globalRegistry],
});

export const llmTokensTotal = new client.Counter({
  name: "dentaliq_llm_tokens_total",
  help: "Total LLM tokens consumed",
  labelNames: ["provider", "direction"] as const,
  registers: [globalRegistry],
});

// ── Agent metrics ───────────────────────────────────────────

export const agentCycleDuration = new client.Histogram({
  name: "dentaliq_agent_cycle_duration_seconds",
  help: "Agent cycle duration in seconds",
  labelNames: ["agent"] as const,
  buckets: [1, 5, 10, 30, 60, 120],
  registers: [globalRegistry],
});

export const agentTasksCreatedTotal = new client.Counter({
  name: "dentaliq_agent_tasks_created_total",
  help: "Total agent tasks created",
  labelNames: ["agent", "type"] as const,
  registers: [globalRegistry],
});

export const agentTasksProcessedTotal = new client.Counter({
  name: "dentaliq_agent_tasks_processed_total",
  help: "Total agent tasks approved or rejected",
  labelNames: ["agent", "status"] as const,
  registers: [globalRegistry],
});

// ── Tenant metrics ──────────────────────────────────────────

export const activeTenantsGauge = new client.Gauge({
  name: "dentaliq_active_tenants",
  help: "Number of active tenants by plan",
  labelNames: ["plan"] as const,
  registers: [globalRegistry],
});

// ── Database metrics ────────────────────────────────────────

export const dbQueryDuration = new client.Histogram({
  name: "dentaliq_db_query_duration_seconds",
  help: "Database query duration in seconds",
  labelNames: ["operation"] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [globalRegistry],
});

// ── Audit/compliance metrics ────────────────────────────────

export const auditLogsWrittenTotal = new client.Counter({
  name: "dentaliq_audit_logs_written_total",
  help: "Total audit log entries written",
  registers: [globalRegistry],
});

export const auditLogFailuresTotal = new client.Counter({
  name: "dentaliq_audit_log_failures_total",
  help: "Total audit log write failures",
  registers: [globalRegistry],
});

// ── Health check types ──────────────────────────────────────

export interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  latencyMs?: number;
  message?: string;
}

export interface ServiceHealth {
  status: "healthy" | "degraded" | "unhealthy";
  service: string;
  version: string;
  uptime: number;
  checks: Record<string, HealthCheckResult>;
  timestamp: string;
}

export async function checkDatabase(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const { getDb } = require("@dentaliq/db");
    const { sql } = require("drizzle-orm");
    const db = getDb() as any;
    await db.all(sql`SELECT 1`);
    return { status: "healthy", latencyMs: Date.now() - start };
  } catch (err: any) {
    return {
      status: "unhealthy",
      latencyMs: Date.now() - start,
      message: err.message,
    };
  }
}

export async function checkLlm(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const { getLLMWithFallback } = require("@dentaliq/llm-interface");
    const llm = await getLLMWithFallback();
    const latency = Date.now() - start;
    return {
      status: latency > 5000 ? "degraded" : "healthy",
      latencyMs: latency,
      message: `Provider: ${llm.name}`,
    };
  } catch (err: any) {
    return {
      status: "degraded",
      latencyMs: Date.now() - start,
      message: err.message,
    };
  }
}

export async function checkRedis(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const res = await fetch("http://localhost:6379", {
      signal: AbortSignal.timeout(2000),
    });
    return { status: "healthy", latencyMs: Date.now() - start };
  } catch {
    return {
      status: "degraded",
      latencyMs: Date.now() - start,
      message: "Redis unavailable (non-critical)",
    };
  }
}

export function checkMemory(): HealthCheckResult {
  const used = process.memoryUsage();
  const heapUsedMb = Math.round(used.heapUsed / 1024 / 1024);
  const heapTotalMb = Math.round(used.heapTotal / 1024 / 1024);
  const pct = Math.round((used.heapUsed / used.heapTotal) * 100);
  return {
    status: pct > 90 ? "degraded" : "healthy",
    message: `${heapUsedMb}MB / ${heapTotalMb}MB (${pct}%)`,
  };
}

export async function buildHealthResponse(
  service: string,
  version: string,
  extraChecks?: Record<
    string,
    () => Promise<HealthCheckResult> | HealthCheckResult
  >,
): Promise<ServiceHealth> {
  const checks: Record<string, HealthCheckResult> = {};

  checks.database = await checkDatabase();
  checks.memory = checkMemory();

  if (extraChecks) {
    for (const [name, checker] of Object.entries(extraChecks)) {
      checks[name] = await checker();
    }
  }

  const hasUnhealthy = Object.values(checks).some(
    (c) => c.status === "unhealthy",
  );
  const hasDegraded = Object.values(checks).some(
    (c) => c.status === "degraded",
  );

  return {
    status: hasUnhealthy ? "unhealthy" : hasDegraded ? "degraded" : "healthy",
    service,
    version,
    uptime: Math.round(process.uptime()),
    checks,
    timestamp: new Date().toISOString(),
  };
}

// ── Fastify plugin for auto-instrumenting HTTP requests ─────

export function metricsPlugin(serviceName: string) {
  return async function (app: any) {
    app.addHook("onRequest", async (req: any) => {
      req._metricsStart = process.hrtime.bigint();
      httpActiveRequests.inc({ service: serviceName });
    });

    app.addHook("onResponse", async (req: any, reply: any) => {
      httpActiveRequests.dec({ service: serviceName });
      const path = normalizePath(req.routeOptions?.url ?? req.url);
      const duration =
        Number(process.hrtime.bigint() - req._metricsStart) / 1e9;

      httpRequestsTotal.inc({
        service: serviceName,
        method: req.method,
        path,
        status: String(reply.statusCode),
      });
      httpRequestDuration.observe(
        { service: serviceName, method: req.method, path },
        duration,
      );
    });

    app.get("/metrics", async (_req: any, reply: any) => {
      reply.header("Content-Type", globalRegistry.contentType);
      return globalRegistry.metrics();
    });
  };
}

function normalizePath(path: string): string {
  return (
    path.replace(/\/[a-z0-9]{20,}/gi, "/:id").replace(/\/\d+/g, "/:id") || "/"
  );
}

// ── Exports ─────────────────────────────────────────────────

export { globalRegistry, client as promClient };
