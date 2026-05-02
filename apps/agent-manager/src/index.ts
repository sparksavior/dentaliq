// ─────────────────────────────────────────────────────────
// DentalIQ — Agent Manager (Cortex Orchestrator)
//
// This microservice orchestrates autonomous background
// agents for tenants on the Cortex plan.
//
// Each clinic (tenant) gets its own isolated agent instance.
// If a user has 3 clinics and hires the Billing Agent,
// that means 3 separate Billing Agent instances — one per
// clinic, each scanning only that clinic's data.
//
// HTTP API:
//   POST /scan       — trigger a manual scan for all cortex tenants
//   POST /scan/:id   — trigger a manual scan for a specific tenant
//   GET  /health     — health check
// ─────────────────────────────────────────────────────────

import http from "node:http";
import cron from "node-cron";
import { getDb, tenants } from "@dentaliq/db";
import { eq, sql } from "drizzle-orm";
import { runBillingAgent } from "./agents/BillingAgent";
import { runRecallAgent } from "./agents/RecallAgent";
import { runReviewAgent } from "./agents/ReviewAgent";
import { runSupplyAgent } from "./agents/SupplyAgent";
import { runTreatmentCoordinatorAgent } from "./agents/TreatmentCoordinatorAgent";
import { runHygienistAgent } from "./agents/HygienistAgent";

const PORT = parseInt(process.env.AGENT_MANAGER_PORT ?? "3006");

async function getCortexTenants() {
  const db = getDb() as any;
  try {
    const rows = await db
      .select()
      .from(tenants)
      .where(eq(tenants.plan, "cortex"));
    return rows;
  } catch (err) {
    console.error("[AgentManager] Failed to fetch cortex tenants:", err);
    return [];
  }
}

// Track scan results for the API response
interface ScanResult {
  tenantId: string;
  tenantName: string;
  schemaName: string;
  agentsRun: string[];
  itemsFound: number;
  status: "success" | "error";
  error?: string;
}

async function runAgentCycle(singleTenantId?: string): Promise<ScanResult[]> {
  const startTime = new Date().toISOString();
  console.log(`[AgentManager] ─── Starting agent cycle at ${startTime} ───`);

  let cortexTenants = await getCortexTenants();
  if (singleTenantId) {
    cortexTenants = cortexTenants.filter((t: any) => t.id === singleTenantId);
  }

  console.log(`[AgentManager] Found ${cortexTenants.length} Cortex tenant(s)`);
  const results: ScanResult[] = [];
  const db = getDb() as any;

  for (const tenant of cortexTenants) {
    console.log(
      `[AgentManager] ┌── Processing tenant: "${tenant.name}" (${tenant.schemaName})`,
    );

    // Fetch clinics and rented agents
    let clinics: any[] = [];
    let rentedAgents: any[] = [];
    try {
      clinics = await db.all(
        sql.raw(
          `SELECT * FROM "${tenant.schemaName}_clinic_locations" WHERE status = 'active'`,
        ),
      );
      rentedAgents = await db.all(
        sql.raw(`SELECT * FROM "${tenant.schemaName}_cortex_agents"`),
      );
    } catch (err) {
      console.log(
        `[AgentManager] │  No clinics or agents setup for "${tenant.name}" yet. Defaulting to main clinic billing...`,
      );
      clinics = [{ id: "default", name: tenant.name }];
      rentedAgents = [{ clinic_id: "default", agent_id: "billing" }];
    }

    if (clinics.length === 0) {
      clinics = [{ id: "default", name: tenant.name }];
    }
    if (rentedAgents.length === 0) {
      rentedAgents = [{ clinic_id: "default", agent_id: "billing" }];
    }

    for (const clinic of clinics) {
      const clinicAgents = rentedAgents.filter(
        (ra) => ra.clinic_id === clinic.id || ra.clinic_id === "default",
      );

      const result: ScanResult = {
        tenantId: tenant.id,
        tenantName: clinic.name,
        schemaName: tenant.schemaName,
        agentsRun: [],
        itemsFound: 0,
        status: "success",
      };

      console.log(`[AgentManager] │  Processing clinic: "${clinic.name}"`);

      for (const ra of clinicAgents) {
        console.log(
          `[AgentManager] │    Deploying ${ra.agent_id} agent for "${clinic.name}"...`,
        );

        try {
          let count = 0;
          if (ra.agent_id === "billing") {
            count = await runBillingAgent(tenant.id, tenant.schemaName);
          } else if (ra.agent_id === "recall") {
            count = await runRecallAgent(tenant.id, tenant.schemaName);
          } else if (ra.agent_id === "review") {
            count = await runReviewAgent(tenant.id, tenant.schemaName);
          } else if (ra.agent_id === "supply") {
            count = await runSupplyAgent(tenant.id, tenant.schemaName);
          } else if (ra.agent_id === "treatment") {
            count = await runTreatmentCoordinatorAgent(
              tenant.id,
              tenant.schemaName,
            );
          } else if (ra.agent_id === "hygienist") {
            count = await runHygienistAgent(tenant.id, tenant.schemaName);
          }

          result.agentsRun.push(ra.agent_id);
          result.itemsFound += count;
          console.log(
            `[AgentManager] │    └── ✓ ${ra.agent_id} complete: ${count} items processed`,
          );
        } catch (err: any) {
          console.error(
            `[AgentManager] │    └── ✗ ${ra.agent_id} failed for "${clinic.name}":`,
            err?.message,
          );
          result.status = "error";
          result.error = err?.message;
        }
      }

      results.push(result);
    }
    console.log(`[AgentManager] └── Completed tenant "${tenant.name}"`);
  }

  console.log(
    `[AgentManager] ─── Agent cycle complete (${cortexTenants.length} tenants) ───\n`,
  );
  return results;
}

// ── HTTP Server for manual triggers ──────────────────────
const server = http.createServer(async (req, res) => {
  // CORS headers for frontend access
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const json = (data: any, status = 200) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };

  // Health check
  if (url.pathname === "/health" && req.method === "GET") {
    return json({
      status: "ok",
      service: "agent-manager",
      uptime: process.uptime(),
    });
  }

  // Manual scan — all tenants
  if (url.pathname === "/scan" && req.method === "POST") {
    console.log("[AgentManager] ⚡ Manual scan triggered via API");
    const results = await runAgentCycle();
    return json({ success: true, message: "Scan complete", results });
  }

  // Manual scan — specific tenant
  const tenantMatch = url.pathname.match(/^\/scan\/(.+)$/);
  if (tenantMatch && req.method === "POST") {
    const tenantId = tenantMatch[1];
    console.log(
      `[AgentManager] ⚡ Manual scan triggered for tenant: ${tenantId}`,
    );
    const results = await runAgentCycle(tenantId);
    if (results.length === 0) {
      return json(
        { success: false, error: "Tenant not found or not on Cortex plan" },
        404,
      );
    }
    return json({ success: true, message: "Scan complete", results });
  }

  json({ error: "Not found" }, 404);
});

server.listen(PORT, () => {
  console.log(`[AgentManager] DentalIQ Cortex Agent Manager`);
  console.log(`[AgentManager]   → HTTP API:  http://localhost:${PORT}`);
  console.log(`[AgentManager]   → Health:    http://localhost:${PORT}/health`);
  console.log(
    `[AgentManager]   → Scan API:  POST http://localhost:${PORT}/scan`,
  );
  console.log(`[AgentManager]   → Scheduled: nightly at 2:00 AM`);
});

// Schedule: Run every night at 2:00 AM
cron.schedule("0 2 * * *", () => {
  console.log("[AgentManager] Scheduled nightly run triggered");
  runAgentCycle();
});

// Also run on startup for dev/testing
console.log("[AgentManager] Running initial agent cycle...");
runAgentCycle();
