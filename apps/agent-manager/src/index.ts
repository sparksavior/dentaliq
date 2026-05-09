// ─────────────────────────────────────────────────────────
// DentalIQ — Cortex Agent Manager
//
// Orchestrates autonomous agents for tenants on the Cortex plan.
// Each clinic gets isolated agents scanning only its own data.
//
// HTTP API:
//   POST /scan         — manual scan for all Cortex tenants
//   POST /scan/:id     — manual scan for specific tenant
//   GET  /tasks        — list pending agent tasks (auth required)
//   PATCH /tasks/:id   — approve/reject a task (auth required)
//   GET  /stats        — aggregate stats for tenant dashboard
//   GET  /health       — health check
// ─────────────────────────────────────────────────────────

import http from "node:http";
import cron from "node-cron";
import { getDb, tenants, agentTasks } from "@dentaliq/db";
import { eq, sql, desc, and } from "drizzle-orm";
import { getEnv } from "@dentaliq/config";
import { createLogger } from "@dentaliq/logger";
import { runBillingAgent } from "./agents/BillingAgent";
import { runRecallAgent } from "./agents/RecallAgent";
import { runReviewAgent } from "./agents/ReviewAgent";
import { runSupplyAgent } from "./agents/SupplyAgent";
import { runTreatmentCoordinatorAgent } from "./agents/TreatmentCoordinatorAgent";
import { runHygienistAgent } from "./agents/HygienistAgent";

const logger = createLogger("agent-manager");
const env = getEnv();
const PORT = parseInt(process.env.AGENT_MANAGER_PORT ?? "3006");

// Allowed origins from config
const ALLOWED_ORIGINS = (
  env.ALLOWED_ORIGINS ?? "http://localhost:3000,http://localhost:3005"
)
  .split(",")
  .map((o) => o.trim());

interface ScanResult {
  tenantId: string;
  tenantName: string;
  schemaName: string;
  agentsRun: string[];
  itemsFound: number;
  status: "success" | "error";
  error?: string;
}

async function getCortexTenants(singleId?: string) {
  const db = getDb();
  try {
    const all = await db
      .select()
      .from(tenants)
      .where(eq(tenants.plan, "cortex"));
    return singleId ? all.filter((t) => t.id === singleId) : all;
  } catch (err) {
    logger.error({ err }, "Failed to fetch Cortex tenants");
    return [];
  }
}

async function runAgentCycle(singleTenantId?: string): Promise<ScanResult[]> {
  logger.info({ singleTenantId }, "Agent cycle starting");

  const cortexTenants = await getCortexTenants(singleTenantId);
  logger.info({ count: cortexTenants.length }, "Processing Cortex tenants");

  const results: ScanResult[] = [];
  const db = getDb() as any;

  for (const tenant of cortexTenants) {
    logger.info(
      { tenant: tenant.name, schema: tenant.schemaName },
      "Processing tenant",
    );

    let clinics: any[] = [];
    let rentedAgents: any[] = [];

    try {
      clinics = await db.all(
        sql`SELECT * FROM ${sql.raw(`"${tenant.schemaName}_clinic_locations"`)} WHERE status = 'active'`,
      );
      rentedAgents = await db.all(
        sql`SELECT * FROM ${sql.raw(`"${tenant.schemaName}_cortex_agents"`)}`,
      );
    } catch {
      // Tenant hasn't set up clinic locations / agents yet — use defaults
      clinics = [{ id: "default", name: tenant.name }];
      rentedAgents = [{ clinic_id: "default", agent_id: "billing" }];
    }

    if (clinics.length === 0) clinics = [{ id: "default", name: tenant.name }];
    if (rentedAgents.length === 0)
      rentedAgents = [{ clinic_id: "default", agent_id: "billing" }];

    for (const clinic of clinics) {
      const clinicAgents = rentedAgents.filter(
        (ra: any) => ra.clinic_id === clinic.id || ra.clinic_id === "default",
      );

      const result: ScanResult = {
        tenantId: tenant.id,
        tenantName: clinic.name,
        schemaName: tenant.schemaName,
        agentsRun: [],
        itemsFound: 0,
        status: "success",
      };

      for (const ra of clinicAgents) {
        logger.info(
          { agent: ra.agent_id, clinic: clinic.name },
          "Running agent",
        );
        try {
          let count = 0;
          switch (ra.agent_id) {
            case "billing":
              count = await runBillingAgent(tenant.id, tenant.schemaName);
              break;
            case "recall":
              count = await runRecallAgent(tenant.id, tenant.schemaName);
              break;
            case "review":
              count = await runReviewAgent(tenant.id, tenant.schemaName);
              break;
            case "supply":
              count = await runSupplyAgent(tenant.id, tenant.schemaName);
              break;
            case "treatment":
              count = await runTreatmentCoordinatorAgent(
                tenant.id,
                tenant.schemaName,
              );
              break;
            case "hygienist":
              count = await runHygienistAgent(tenant.id, tenant.schemaName);
              break;
          }
          result.agentsRun.push(ra.agent_id);
          result.itemsFound += count;
          logger.info({ agent: ra.agent_id, count }, "Agent complete");
        } catch (err: any) {
          logger.error({ agent: ra.agent_id, err }, "Agent failed");
          result.status = "error";
          result.error = err?.message;
        }
      }

      results.push(result);
    }
    logger.info({ tenant: tenant.name }, "Tenant complete");
  }

  logger.info(
    { tenants: cortexTenants.length, results: results.length },
    "Agent cycle complete",
  );
  return results;
}

// ── JWT auth helper for API endpoints ────────────────────
function extractTenantId(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    );
    return payload.tenantId ?? null;
  } catch {
    return null;
  }
}

// ── HTTP server ───────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin ?? "";
  const corsOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  res.setHeader("Access-Control-Allow-Origin", corsOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  const json = (data: unknown, status = 200) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };

  const readBody = (): Promise<any> =>
    new Promise((resolve) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          resolve(JSON.parse(body || "{}"));
        } catch {
          resolve({});
        }
      });
    });

  // ── GET /health ─────────────────────────────────────────
  if (url.pathname === "/health" && req.method === "GET") {
    return json({
      status: "ok",
      service: "agent-manager",
      uptime: process.uptime(),
    });
  }

  // ── POST /scan — manual trigger (internal only) ─────────
  if (url.pathname === "/scan" && req.method === "POST") {
    logger.info("Manual scan triggered via API");
    const results = await runAgentCycle();
    return json({ success: true, results });
  }

  const tenantScanMatch = url.pathname.match(/^\/scan\/(.+)$/);
  if (tenantScanMatch && req.method === "POST") {
    const tenantId = tenantScanMatch[1];
    const results = await runAgentCycle(tenantId);
    if (results.length === 0)
      return json(
        { success: false, error: "Not found or not Cortex plan" },
        404,
      );
    return json({ success: true, results });
  }

  // ── GET /tasks — list agent tasks for authenticated tenant ─
  if (url.pathname === "/tasks" && req.method === "GET") {
    const tenantId = extractTenantId(req.headers.authorization);
    if (!tenantId) return json({ success: false, error: "Unauthorized" }, 401);

    const db = getDb();
    const statusFilter = (url.searchParams.get("status") as any) ?? "pending";
    const tasks = await db
      .select()
      .from(agentTasks)
      .where(
        and(
          eq(agentTasks.tenantId, tenantId),
          eq(agentTasks.status, statusFilter),
        ),
      )
      .orderBy(desc(agentTasks.createdAt))
      .limit(100);

    return json({ success: true, data: tasks });
  }

  // ── PATCH /tasks/:id — approve or reject a task ─────────
  const taskMatch = url.pathname.match(/^\/tasks\/(.+)$/);
  if (taskMatch && req.method === "PATCH") {
    const tenantId = extractTenantId(req.headers.authorization);
    if (!tenantId) return json({ success: false, error: "Unauthorized" }, 401);

    const taskId = taskMatch[1];
    const body = await readBody();
    const status = body.status as string;

    if (!["approved", "rejected"].includes(status)) {
      return json(
        { success: false, error: "status must be approved or rejected" },
        400,
      );
    }

    const db = getDb();
    const [existing] = await db
      .select()
      .from(agentTasks)
      .where(eq(agentTasks.id, taskId))
      .limit(1);

    if (!existing || existing.tenantId !== tenantId) {
      return json({ success: false, error: "Task not found" }, 404);
    }

    const [updated] = await db
      .update(agentTasks)
      .set({
        status,
        approvedBy: body.userId ?? null,
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(agentTasks.id, taskId))
      .returning();

    return json({ success: true, data: updated });
  }

  // ── GET /stats — aggregate stats for the Cortex dashboard ─
  if (url.pathname === "/stats" && req.method === "GET") {
    const tenantId = extractTenantId(req.headers.authorization);
    if (!tenantId) return json({ success: false, error: "Unauthorized" }, 401);

    const db = getDb() as any;

    // Count tasks by status and agent
    const taskRows = await db
      .all(
        sql`SELECT agent_id, status, COUNT(*) as count
          FROM agent_tasks
          WHERE tenant_id = ${tenantId}
          GROUP BY agent_id, status`,
      )
      .catch(() => []);

    const totalPending = (taskRows as any[])
      .filter((r: any) => r.status === "pending")
      .reduce((sum: number, r: any) => sum + r.count, 0);
    const totalApproved = (taskRows as any[])
      .filter((r: any) => r.status === "approved")
      .reduce((sum: number, r: any) => sum + r.count, 0);

    return json({
      success: true,
      data: {
        tasks: { pending: totalPending, approved: totalApproved },
        byAgent: taskRows,
        lastUpdated: new Date().toISOString(),
      },
    });
  }

  json({ error: "Not found" }, 404);
});

server.listen(PORT, () => {
  logger.info({ port: PORT }, "Cortex Agent Manager listening");
});

// Nightly run at 2:00 AM
cron.schedule("0 2 * * *", () => {
  logger.info("Scheduled nightly agent cycle starting");
  runAgentCycle().catch((err) => logger.error({ err }, "Nightly cycle failed"));
});

// Run on startup in dev/test
if (env.NODE_ENV !== "production") {
  logger.info("Running startup agent cycle (dev mode)");
  runAgentCycle().catch((err) => logger.error({ err }, "Startup cycle failed"));
}
