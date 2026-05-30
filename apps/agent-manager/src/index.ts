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
import { AgentRegistry, CycleEventBus } from "@dentaliq/agent-core";
import { billingAgent } from "./agents/BillingAgent";
import { recallAgent } from "./agents/RecallAgent";
import { reviewAgent } from "./agents/ReviewAgent";
import { supplyAgent } from "./agents/SupplyAgent";
import { treatmentCoordinatorAgent } from "./agents/TreatmentCoordinatorAgent";
import { hygienistAgent } from "./agents/HygienistAgent";

const logger = createLogger("agent-manager");
const env = getEnv();
const PORT = parseInt(process.env.AGENT_MANAGER_PORT ?? "3006");

const ALLOWED_ORIGINS = (
  env.ALLOWED_ORIGINS ?? "http://localhost:3000,http://localhost:3005"
)
  .split(",")
  .map((o) => o.trim());

// ── Agent registry — add new agents here, no other changes needed ──
const registry = new AgentRegistry()
  .register(hygienistAgent)
  .register(billingAgent)
  .register(recallAgent)
  .register(reviewAgent)
  .register(treatmentCoordinatorAgent)
  .register(supplyAgent);

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
  const rawDb = getDb() as any;

  for (const tenant of cortexTenants) {
    logger.info(
      { tenant: tenant.name, schema: tenant.schemaName },
      "Processing tenant",
    );

    let clinics: any[] = [];
    let rentedAgents: any[] = [];

    try {
      clinics = await rawDb.all(
        sql`SELECT * FROM ${sql.raw(`"${tenant.schemaName}_clinic_locations"`)} WHERE status = 'active'`,
      );
      rentedAgents = await rawDb.all(
        sql`SELECT * FROM ${sql.raw(`"${tenant.schemaName}_cortex_agents"`)}`,
      );
    } catch {
      clinics = [{ id: "default", name: tenant.name }];
      rentedAgents = [{ clinic_id: "default", agent_id: "billing" }];
    }

    if (clinics.length === 0) clinics = [{ id: "default", name: tenant.name }];
    if (rentedAgents.length === 0)
      rentedAgents = [{ clinic_id: "default", agent_id: "billing" }];

    for (const clinic of clinics) {
      const clinicAgentIds = rentedAgents
        .filter(
          (ra: any) => ra.clinic_id === clinic.id || ra.clinic_id === "default",
        )
        .map((ra: any) => ra.agent_id as string);

      const result: ScanResult = {
        tenantId: tenant.id,
        tenantName: clinic.name,
        schemaName: tenant.schemaName,
        agentsRun: [],
        itemsFound: 0,
        status: "success",
      };

      // One shared event bus per clinic cycle — enables agent-to-agent communication
      const bus = new CycleEventBus();

      for (const agent of registry.getOrdered(clinicAgentIds)) {
        logger.info({ agent: agent.id, clinic: clinic.name }, "Running agent");
        try {
          const ctx = {
            tenantId: tenant.id,
            clinicId: clinic.id,
            tablePrefix: tenant.schemaName,
            db: rawDb,
            llm: null,
            emit: (type: string, payload: Record<string, unknown>) =>
              bus.emit(type, agent.id, tenant.id, clinic.id, payload),
            getEvents: (type: string) => bus.getEvents(type),
          };

          const { tasksCreated } = await agent.run(ctx);
          result.agentsRun.push(agent.id);
          result.itemsFound += tasksCreated;
          logger.info({ agent: agent.id, tasksCreated }, "Agent complete");

          // Broadcast SSE event for new tasks
          if (tasksCreated > 0) {
            broadcastEvent({
              type: "task_created",
              data: {
                agentId: agent.id,
                tenantId: tenant.id,
                clinicId: clinic.id,
                tasksCreated,
              },
              timestamp: new Date().toISOString(),
            });
          }
        } catch (err: any) {
          logger.error({ agent: agent.id, err }, "Agent failed");
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

  // Broadcast scan completion
  broadcastEvent({
    type: "scan_complete",
    data: {
      tenantCount: cortexTenants.length,
      totalTasks: results.reduce((s, r) => s + r.itemsFound, 0),
    },
    timestamp: new Date().toISOString(),
  });

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

// ── SSE (Server-Sent Events) client tracking ─────────────
const sseClients = new Set<http.ServerResponse>();

function broadcastEvent(event: { type: string; data: any; timestamp: string }) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
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
      agents: registry.all().map((a) => ({ id: a.id, version: a.version })),
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

    // Broadcast SSE event
    broadcastEvent({
      type: status === "approved" ? "task_approved" : "task_rejected",
      data: { taskId, agentId: updated?.agentId, tenantId },
      timestamp: new Date().toISOString(),
    });

    return json({ success: true, data: updated });
  }

  // ── GET /activity — recent tasks feed (any status) ─────────
  if (url.pathname === "/activity" && req.method === "GET") {
    const tenantId = extractTenantId(req.headers.authorization);
    if (!tenantId) return json({ success: false, error: "Unauthorized" }, 401);

    const db = getDb();
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") ?? "40"),
      100,
    );

    const tasks = await db
      .select()
      .from(agentTasks)
      .where(eq(agentTasks.tenantId, tenantId))
      .orderBy(desc(agentTasks.createdAt))
      .limit(limit);

    // Per-agent last-active + counts derived from this same result set
    const agentMeta: Record<
      string,
      { lastAt: string; pending: number; approved: number; total: number }
    > = {};
    for (const t of tasks) {
      const m = agentMeta[t.agentId] ?? {
        lastAt: t.createdAt,
        pending: 0,
        approved: 0,
        total: 0,
      };
      if (t.createdAt > m.lastAt) m.lastAt = t.createdAt;
      if (t.status === "pending") m.pending++;
      if (t.status === "approved") m.approved++;
      m.total++;
      agentMeta[t.agentId] = m;
    }

    return json({ success: true, data: { tasks, agentMeta } });
  }

  // ── GET /stats — aggregate stats for the Cortex dashboard ─
  if (url.pathname === "/stats" && req.method === "GET") {
    const tenantId = extractTenantId(req.headers.authorization);
    if (!tenantId) return json({ success: false, error: "Unauthorized" }, 401);

    const db = getDb() as any;

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

  // ── GET /events — Server-Sent Events stream ─────────────
  if (url.pathname === "/events" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": corsOrigin,
    });
    res.write(
      `data: ${JSON.stringify({ type: "connected", data: {}, timestamp: new Date().toISOString() })}\n\n`,
    );
    sseClients.add(res);
    req.on("close", () => sseClients.delete(res));
    return;
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

// Monthly CDT staleness check — 9 AM on the 1st of each month
cron.schedule("0 9 1 * *", () => {
  checkCdtStaleness().catch((err) =>
    logger.error({ err }, "CDT staleness check failed"),
  );
});

async function checkCdtStaleness(): Promise<void> {
  const rawDb = getDb() as any;

  let activeVersion: any = null;
  try {
    const rows = await rawDb.all(
      sql.raw(
        `SELECT * FROM cdt_uploads WHERE status = 'active' ORDER BY created_at DESC LIMIT 1`,
      ),
    );
    activeVersion = rows?.[0] ?? null;
  } catch {
    logger.warn("CDT staleness check: cdt_uploads table not found — skipping");
    return;
  }

  if (!activeVersion) {
    logger.warn("CDT staleness check: no active CDT version found");
    return;
  }

  const effectiveDate = new Date(activeVersion.effective_date);
  const ageMs = Date.now() - effectiveDate.getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

  if (ageDays < 330) {
    logger.info(
      { ageDays, version: activeVersion.version_label },
      "CDT version is current",
    );
    return;
  }

  logger.warn(
    { ageDays, version: activeVersion.version_label },
    "CDT fee schedule is stale — ODA releases an updated guide annually",
  );

  const cortexTenants = await getCortexTenants();
  const now = new Date().toISOString();
  const thisMonth = now.slice(0, 7);

  for (const tenant of cortexTenants) {
    try {
      const existing = await rawDb.all(
        sql.raw(`
          SELECT id FROM agent_tasks
          WHERE tenant_id = '${tenant.id}'
            AND task_type = 'cdt_version_reminder'
            AND created_at >= '${thisMonth}-01'
          LIMIT 1
        `),
      );
      if ((existing ?? []).length > 0) continue;

      const { createId } = await import("@paralleldrive/cuid2");
      await rawDb.run(
        sql.raw(`
          INSERT INTO agent_tasks
            (id, tenant_id, agent_id, task_type, content, status, metadata, created_at, updated_at)
          VALUES (
            '${createId()}',
            '${tenant.id}',
            'billing',
            'cdt_version_reminder',
            'Your CDT fee schedule (${activeVersion.version_label}, effective ${activeVersion.effective_date}) is ${ageDays} days old. The ODA typically releases an updated fee guide each January. Contact DentalIQ support or upload the new fee guide in the admin portal to keep estimates accurate.',
            'pending',
            '{"versionLabel":"${activeVersion.version_label}","effectiveDate":"${activeVersion.effective_date}","ageDays":${ageDays}}',
            '${now}',
            '${now}'
          )
        `),
      );
      logger.info(
        { tenantId: tenant.id },
        "CDT staleness reminder task created",
      );
    } catch (err) {
      logger.error(
        { err, tenantId: tenant.id },
        "Failed to create CDT reminder task",
      );
    }
  }
}

// Run on startup in dev/test
if (env.NODE_ENV !== "production") {
  logger.info("Running startup agent cycle (dev mode)");
  runAgentCycle().catch((err) => logger.error({ err }, "Startup cycle failed"));
}
