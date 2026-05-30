import Fastify from "fastify";
import { fastifyJwt } from "@fastify/jwt";
import { fastifyHelmet } from "@fastify/helmet";
import { fastifyCors } from "@fastify/cors";
import { fastifyRateLimit } from "@fastify/rate-limit";
import { getEnv } from "@dentaliq/config";
import { createLogger } from "@dentaliq/logger";
import { ZodError } from "zod";

import { estimateRoutes } from "./routes/estimate";
import { cdtRoutes } from "./routes/cdt";
import {
  ensureCdtSeeded,
  getCdtCodeCached,
  getAllCdtCodesCached,
} from "./services/cdtDb";
import { registerCdtCache } from "./data/cdt-codes";

// ─────────────────────────────────────────────────────────
// DentalIQ — Estimate Service  (port 3004)
//
// Responsibilities:
//   POST /estimate          → CDT code + insurer → cost, coverage, explanation
//   GET  /estimate/codes    → full CDT code list for frontend dropdowns
//   GET  /estimate/history  → recent estimates for this tenant
//
// Rules engine runs first (< 1ms), LLM layer adds explanation.
// Falls back to Ollama → Claude → static template.
// ─────────────────────────────────────────────────────────

const logger = createLogger("estimate-service");

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
    max: 60,
    timeWindow: "1 minute",
    // Per-tenant limiting — one slow tenant cannot starve others
    keyGenerator: (req) => {
      try {
        const token = (req.headers.authorization ?? "").split(" ")[1] ?? "";
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
      error: "Rate limit exceeded. Max 60 requests/min per tenant.",
    }),
  });

  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof ZodError) {
      const issues = error.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`,
      );
      return reply
        .code(400)
        .send({ success: false, error: "Validation failed", details: issues });
    }
    const status = (error as any).statusCode ?? error.statusCode ?? 500;
    if (status >= 500) logger.error({ err: error }, "Internal error");
    return reply.code(status).send({
      success: false,
      error: status < 500 ? error.message : "Internal server error",
    });
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "estimate-service",
    version: "1.0.0",
    llmProvider: process.env.LLM_PROVIDER ?? "ollama",
    timestamp: new Date().toISOString(),
  }));

  // Routes
  await app.register(estimateRoutes);
  await app.register(cdtRoutes);

  return app;
}

async function main() {
  const env = getEnv();

  // Seed CDT codes into DB if needed, then register the cache
  let retries = 5;
  while (retries > 0) {
    try {
      await ensureCdtSeeded();
      break;
    } catch (err: any) {
      if (err?.code === "SQLITE_BUSY") {
        retries--;
        logger.warn(
          `Database locked, retrying ensureCdtSeeded... (${retries} left)`,
        );
        await new Promise((r) => setTimeout(r, 1000 + Math.random() * 500));
        if (retries === 0) {
          logger.fatal({ err }, "ensureCdtSeeded failed after retries");
          process.exit(1);
        }
      } else {
        logger.fatal({ err }, "ensureCdtSeeded failed");
        process.exit(1);
      }
    }
  }
  registerCdtCache(getCdtCodeCached, getAllCdtCodesCached);

  const app = await buildApp();
  const port = env.ESTIMATE_PORT ?? 3004;

  try {
    await app.listen({ port, host: "0.0.0.0" });
    logger.info(`\n  ✓ Estimate service → http://localhost:${port}`);
    logger.info(`  ✓ Health check     → http://localhost:${port}/health`);
    logger.info(`  ✓ LLM provider     → ${env.LLM_PROVIDER} (with fallback)`);
    logger.info(
      `  ✓ CDT codes        → ${getAllCdtCodesCached().length} procedures loaded from DB\n`,
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
