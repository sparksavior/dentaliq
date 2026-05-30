import Fastify from "fastify";
import { fastifyJwt } from "@fastify/jwt";
import { fastifyHelmet } from "@fastify/helmet";
import { fastifyCors } from "@fastify/cors";
import { fastifyRateLimit } from "@fastify/rate-limit";
import { getEnv } from "@dentaliq/config";
import { createLogger } from "@dentaliq/logger";

import { tenantRoutes } from "./routes/tenants";
import { patientsRoutes } from "./routes/patients";
import { insurancePlansRoutes } from "./routes/insurance-plans";
import { clinicsRoutes } from "./routes/clinics";
import { agentsRoutes } from "./routes/agents";
import { billingRoutes } from "./routes/billing";
import { analyticsRoutes } from "./routes/analytics";
import { documentsRoutes } from "./routes/documents";
import { notesRoutes } from "./routes/notes";

// ─────────────────────────────────────────────────────────
// DentalIQ — Tenant Service  (port 3002)
// Manages clinic provisioning, PMS connections, usage data
// ─────────────────────────────────────────────────────────

const logger = createLogger("tenant-service");

async function buildApp() {
  const env = getEnv();
  const app = Fastify({ logger: false, trustProxy: true });

  await app.register(fastifyHelmet, { contentSecurityPolicy: false });
  await app.register(fastifyCors, {
    origin: env.ALLOWED_ORIGINS.split(","),
    credentials: true,
  });
  await app.register(fastifyJwt, { secret: env.JWT_SECRET });
  await app.register(fastifyRateLimit, {
    max: 120,
    timeWindow: "1 minute",
    // Per-tenant limiting — one slow tenant cannot starve others
    keyGenerator: (req) => {
      try {
        const token =
          ((req.headers.authorization as string) ?? "").split(" ")[1] ?? "";
        const payload = JSON.parse(
          Buffer.from(token.split(".")[1], "base64url").toString(),
        );
        return payload.tenantId ?? req.ip;
      } catch {
        return req.ip;
      }
    },
    errorResponseBuilder: () => ({
      success: false,
      error: "Rate limit exceeded. Max 120 requests/min per tenant.",
    }),
  });

  app.setErrorHandler((error, req, reply) => {
    const status = (error as any).statusCode ?? error.statusCode ?? 500;
    if (status >= 500) logger.error({ err: error }, "Internal error");
    reply.code(status).send({
      success: false,
      error: status < 500 ? error.message : "Internal server error",
    });
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "tenant-service",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  }));

  // Register routes

  await app.register(tenantRoutes, { prefix: "/tenants" });
  await app.register(patientsRoutes, { prefix: "/patients" });
  await app.register(insurancePlansRoutes, { prefix: "/insurance-plans" });
  await app.register(clinicsRoutes, { prefix: "/clinics" });
  await app.register(agentsRoutes, { prefix: "/agents" });
  await app.register(billingRoutes, { prefix: "/billing" });
  await app.register(analyticsRoutes, { prefix: "/analytics" });
  await app.register(documentsRoutes, { prefix: "/documents" });
  await app.register(notesRoutes, { prefix: "/notes" });

  return app;
}

async function main() {
  const env = getEnv();
  const app = await buildApp();

  try {
    await app.listen({ port: env.TENANT_PORT, host: "0.0.0.0" });
    logger.info(`\n  ✓ Tenant service  → http://localhost:${env.TENANT_PORT}`);
    logger.info(
      `  ✓ Health check    → http://localhost:${env.TENANT_PORT}/health`,
    );
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
