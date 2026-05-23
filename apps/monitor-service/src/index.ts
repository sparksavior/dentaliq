import Fastify from "fastify";
import { fastifyHelmet } from "@fastify/helmet";
import { fastifyCors } from "@fastify/cors";
import { createLogger } from "@dentaliq/logger";
import { globalRegistry } from "@dentaliq/metrics";

const logger = createLogger("monitor-service");
const PORT = parseInt(process.env.MONITOR_PORT ?? "3007");

const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ?? "http://localhost:3000,http://localhost:3005"
)
  .split(",")
  .map((o) => o.trim());

// ── Service registry ─────────────────────────────────────────

interface ServiceEntry {
  name: string;
  url: string;
  healthEndpoint: string;
  metricsEndpoint: string;
}

const SERVICE_REGISTRY: ServiceEntry[] = [
  {
    name: "auth-service",
    url: `http://localhost:${process.env.AUTH_PORT ?? 3001}`,
    healthEndpoint: "/health",
    metricsEndpoint: "/metrics",
  },
  {
    name: "tenant-service",
    url: `http://localhost:${process.env.TENANT_PORT ?? 3002}`,
    healthEndpoint: "/health",
    metricsEndpoint: "/metrics",
  },
  {
    name: "estimate-service",
    url: `http://localhost:${process.env.ESTIMATE_PORT ?? 3004}`,
    healthEndpoint: "/health",
    metricsEndpoint: "/metrics",
  },
  {
    name: "agent-manager",
    url: `http://localhost:${process.env.AGENT_MANAGER_PORT ?? 3006}`,
    healthEndpoint: "/health",
    metricsEndpoint: "/metrics",
  },
];

// ── Health polling ───────────────────────────────────────────

interface ServiceStatus {
  name: string;
  status: "healthy" | "degraded" | "unhealthy" | "unreachable";
  latencyMs: number;
  lastCheck: string;
  lastHealthy: string | null;
  consecutiveFailures: number;
  details: any;
}

const serviceStatuses = new Map<string, ServiceStatus>();

interface IncidentRecord {
  id: string;
  service: string;
  from: string;
  to: string;
  timestamp: string;
  resolved: string | null;
  durationMs: number | null;
}

const incidents: IncidentRecord[] = [];
let incidentCounter = 0;

// ── Alert rules ──────────────────────────────────────────────

interface AlertRule {
  id: string;
  name: string;
  severity: "critical" | "warning" | "info";
  condition: (statuses: Map<string, ServiceStatus>) => boolean;
  message: (statuses: Map<string, ServiceStatus>) => string;
  cooldownMs: number;
  lastFired: number;
}

const alertRules: AlertRule[] = [
  {
    id: "service_down",
    name: "Service Unreachable",
    severity: "critical",
    condition: (s) =>
      [...s.values()].some((svc) => svc.consecutiveFailures >= 3),
    message: (s) => {
      const down = [...s.values()]
        .filter((svc) => svc.consecutiveFailures >= 3)
        .map((svc) => svc.name);
      return `CRITICAL: Services unreachable for 90s+: ${down.join(", ")}`;
    },
    cooldownMs: 300_000,
    lastFired: 0,
  },
  {
    id: "service_degraded",
    name: "Service Degraded",
    severity: "warning",
    condition: (s) => [...s.values()].some((svc) => svc.status === "degraded"),
    message: (s) => {
      const degraded = [...s.values()]
        .filter((svc) => svc.status === "degraded")
        .map((svc) => svc.name);
      return `WARNING: Services degraded: ${degraded.join(", ")}`;
    },
    cooldownMs: 600_000,
    lastFired: 0,
  },
  {
    id: "high_latency",
    name: "High Health Check Latency",
    severity: "warning",
    condition: (s) =>
      [...s.values()].some(
        (svc) => svc.latencyMs > 5000 && svc.status !== "unreachable",
      ),
    message: (s) => {
      const slow = [...s.values()]
        .filter((svc) => svc.latencyMs > 5000)
        .map((svc) => `${svc.name} (${svc.latencyMs}ms)`);
      return `WARNING: Slow health checks: ${slow.join(", ")}`;
    },
    cooldownMs: 600_000,
    lastFired: 0,
  },
];

const firedAlerts: Array<{
  rule: string;
  severity: string;
  message: string;
  timestamp: string;
}> = [];

function evaluateAlerts() {
  const now = Date.now();
  for (const rule of alertRules) {
    if (
      rule.condition(serviceStatuses) &&
      now - rule.lastFired > rule.cooldownMs
    ) {
      const msg = rule.message(serviceStatuses);
      logger.warn({ alertId: rule.id, severity: rule.severity }, msg);
      firedAlerts.push({
        rule: rule.id,
        severity: rule.severity,
        message: msg,
        timestamp: new Date().toISOString(),
      });
      if (firedAlerts.length > 1000)
        firedAlerts.splice(0, firedAlerts.length - 500);
      rule.lastFired = now;
    }
  }
}

async function pollService(entry: ServiceEntry): Promise<void> {
  const prev = serviceStatuses.get(entry.name);
  const start = Date.now();

  try {
    const res = await fetch(`${entry.url}${entry.healthEndpoint}`, {
      signal: AbortSignal.timeout(10_000),
    });
    const latency = Date.now() - start;
    const body = await res.json().catch(() => ({}));
    const status =
      body.status === "unhealthy"
        ? "unhealthy"
        : body.status === "degraded"
          ? "degraded"
          : res.ok
            ? "healthy"
            : "unhealthy";

    const now = new Date().toISOString();
    const entry_status: ServiceStatus = {
      name: entry.name,
      status: status as any,
      latencyMs: latency,
      lastCheck: now,
      lastHealthy: status === "healthy" ? now : (prev?.lastHealthy ?? null),
      consecutiveFailures:
        status === "healthy" ? 0 : (prev?.consecutiveFailures ?? 0) + 1,
      details: body,
    };
    serviceStatuses.set(entry.name, entry_status);

    if (prev && prev.status !== status) {
      const incident: IncidentRecord = {
        id: `inc-${++incidentCounter}`,
        service: entry.name,
        from: prev.status,
        to: status,
        timestamp: now,
        resolved: status === "healthy" ? now : null,
        durationMs:
          status === "healthy" && prev.lastHealthy
            ? Date.now() - new Date(prev.lastHealthy).getTime()
            : null,
      };
      incidents.push(incident);
      if (incidents.length > 500) incidents.splice(0, incidents.length - 250);
      logger.info(
        { incident },
        `Service ${entry.name}: ${prev.status} → ${status}`,
      );
    }
  } catch {
    const now = new Date().toISOString();
    serviceStatuses.set(entry.name, {
      name: entry.name,
      status: "unreachable",
      latencyMs: Date.now() - start,
      lastCheck: now,
      lastHealthy: prev?.lastHealthy ?? null,
      consecutiveFailures: (prev?.consecutiveFailures ?? 0) + 1,
      details: null,
    });

    if (prev && prev.status !== "unreachable") {
      incidents.push({
        id: `inc-${++incidentCounter}`,
        service: entry.name,
        from: prev.status,
        to: "unreachable",
        timestamp: now,
        resolved: null,
        durationMs: null,
      });
    }
  }
}

async function pollAll() {
  await Promise.allSettled(SERVICE_REGISTRY.map((s) => pollService(s)));
  evaluateAlerts();
}

// ── SLA calculator ───────────────────────────────────────────

function calculateSla(
  serviceName: string,
  windowMs: number = 30 * 24 * 60 * 60 * 1000,
) {
  const cutoff = new Date(Date.now() - windowMs).toISOString();
  const serviceIncidents = incidents.filter(
    (i) => i.service === serviceName && i.timestamp >= cutoff,
  );

  let downtimeMs = 0;
  for (const inc of serviceIncidents) {
    if (inc.to === "unreachable" || inc.to === "unhealthy") {
      const resolvedAt = inc.resolved
        ? new Date(inc.resolved).getTime()
        : Date.now();
      downtimeMs += resolvedAt - new Date(inc.timestamp).getTime();
    }
  }

  const uptimePct = Math.max(0, ((windowMs - downtimeMs) / windowMs) * 100);
  return {
    service: serviceName,
    windowDays: Math.round(windowMs / (24 * 60 * 60 * 1000)),
    uptimePercent: Math.round(uptimePct * 1000) / 1000,
    downtimeMinutes: Math.round(downtimeMs / 60000),
    incidents: serviceIncidents.length,
    target: 99.9,
    meetingTarget: uptimePct >= 99.9,
  };
}

// ── Fastify app ──────────────────────────────────────────────

async function buildApp() {
  const app = Fastify({ logger: false, trustProxy: true });

  await app.register(fastifyHelmet, { contentSecurityPolicy: false });
  await app.register(fastifyCors, {
    origin: ALLOWED_ORIGINS,
    credentials: true,
  });

  // Own health
  app.get("/health", async () => ({
    status: "healthy",
    service: "monitor-service",
    version: "1.0.0",
    uptime: Math.round(process.uptime()),
    monitoredServices: SERVICE_REGISTRY.length,
    timestamp: new Date().toISOString(),
  }));

  // Own metrics
  app.get("/metrics", async (_req, reply) => {
    reply.header("Content-Type", globalRegistry.contentType);
    return globalRegistry.metrics();
  });

  // Aggregate status of all services
  app.get("/status", async () => {
    const services = [...serviceStatuses.values()];
    const hasUnhealthy = services.some(
      (s) => s.status === "unhealthy" || s.status === "unreachable",
    );
    const hasDegraded = services.some((s) => s.status === "degraded");

    return {
      overall: hasUnhealthy
        ? "unhealthy"
        : hasDegraded
          ? "degraded"
          : "healthy",
      services,
      timestamp: new Date().toISOString(),
    };
  });

  // Per-service detailed health
  app.get("/status/:service", async (req, reply) => {
    const { service } = req.params as { service: string };
    const status = serviceStatuses.get(service);
    if (!status) return reply.code(404).send({ error: "Service not found" });
    return status;
  });

  // SLA report
  app.get("/sla", async (req) => {
    const days = parseInt((req.query as any).days ?? "30");
    const windowMs = days * 24 * 60 * 60 * 1000;
    return {
      reports: SERVICE_REGISTRY.map((s) => calculateSla(s.name, windowMs)),
      generatedAt: new Date().toISOString(),
    };
  });

  // Incident timeline
  app.get("/incidents", async (req) => {
    const limit = Math.min(parseInt((req.query as any).limit ?? "50"), 200);
    const service = (req.query as any).service;
    let filtered = service
      ? incidents.filter((i) => i.service === service)
      : incidents;
    return {
      incidents: filtered.slice(-limit).reverse(),
      total: filtered.length,
    };
  });

  // Fired alerts history
  app.get("/alerts", async (req) => {
    const limit = Math.min(parseInt((req.query as any).limit ?? "50"), 200);
    const severity = (req.query as any).severity;
    let filtered = severity
      ? firedAlerts.filter((a) => a.severity === severity)
      : firedAlerts;
    return {
      alerts: filtered.slice(-limit).reverse(),
      total: filtered.length,
    };
  });

  // Alert rules configuration
  app.get("/alerts/rules", async () => ({
    rules: alertRules.map((r) => ({
      id: r.id,
      name: r.name,
      severity: r.severity,
      cooldownMs: r.cooldownMs,
      lastFired: r.lastFired ? new Date(r.lastFired).toISOString() : null,
    })),
  }));

  // Force re-poll all services
  app.post("/poll", async () => {
    await pollAll();
    return { success: true, services: [...serviceStatuses.values()] };
  });

  return app;
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  const app = await buildApp();

  // Initial poll
  await pollAll();

  // Poll every 30 seconds
  setInterval(pollAll, 30_000);

  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    logger.info(`\n  ✓ Monitor service  → http://localhost:${PORT}`);
    logger.info(`  ✓ Status dashboard → http://localhost:${PORT}/status`);
    logger.info(`  ✓ SLA reports      → http://localhost:${PORT}/sla`);
    logger.info(`  ✓ Polling ${SERVICE_REGISTRY.length} services every 30s\n`);
  } catch (err) {
    logger.fatal({ err }, "Failed to start");
    process.exit(1);
  }

  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();

export { buildApp, SERVICE_REGISTRY, pollAll };
