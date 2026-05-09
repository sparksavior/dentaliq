import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import {
  getDb,
  tenants,
  supportTickets,
  supportMessages,
  agentTasks,
} from "@dentaliq/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/requireAuth";

const UpdateTenantSchema = z.object({
  plan: z.enum(["starter", "pro", "enterprise", "cortex"]).optional(),
  status: z.enum(["trial", "active", "suspended"]).optional(),
  billingDate: z.string().optional(),
  trialEndsAt: z.string().optional(),
});

const UpdateTicketSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved"]),
});

const AddMessageSchema = z.object({
  message: z.string().min(1).max(2000),
});

export async function adminRoutes(app: FastifyInstance) {
  // All routes require auth + admin role
  app.addHook("preHandler", requireAuth(app));
  app.addHook("preHandler", async (req, reply) => {
    if (req.user?.role !== "admin") {
      return reply
        .code(403)
        .send({ success: false, error: "Forbidden: Admin access only" });
    }
  });

  const db = getDb();

  // ── GET /admin/tenants — list all clinics ──────────────────
  app.get("/tenants", async (_req, reply) => {
    const all = await db
      .select()
      .from(tenants)
      .orderBy(desc(tenants.createdAt));
    return reply.send({ success: true, data: all, total: all.length });
  });

  // ── PATCH /admin/tenants/:id — update clinic ───────────────
  app.patch("/tenants/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = UpdateTenantSchema.parse(req.body);

    const [updated] = await db
      .update(tenants)
      .set({
        ...body,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tenants.id, id))
      .returning();

    if (!updated)
      return reply
        .code(404)
        .send({ success: false, error: "Tenant not found" });
    return reply.send({ success: true, data: updated });
  });

  // ── GET /admin/tickets — list all support tickets ──────────
  app.get("/tickets", async (_req, reply) => {
    // Ensure table exists before querying
    await ensureSupportTables();
    const rows = await db
      .select()
      .from(supportTickets)
      .orderBy(desc(supportTickets.createdAt));
    return reply.send({ success: true, data: rows });
  });

  // ── PATCH /admin/tickets/:id — update ticket status ────────
  app.patch("/tickets/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status } = UpdateTicketSchema.parse(req.body);

    await ensureSupportTables();
    const [updated] = await db
      .update(supportTickets)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(eq(supportTickets.id, id))
      .returning();

    if (!updated)
      return reply
        .code(404)
        .send({ success: false, error: "Ticket not found" });
    return reply.send({ success: true, data: updated });
  });

  // ── GET /admin/tickets/:id — ticket + messages ─────────────
  app.get("/tickets/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    await ensureSupportTables();

    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, id))
      .limit(1);

    if (!ticket)
      return reply
        .code(404)
        .send({ success: false, error: "Ticket not found" });

    const messages = await db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.ticketId, id))
      .orderBy(supportMessages.createdAt);

    return reply.send({ success: true, data: { ...ticket, messages } });
  });

  // ── POST /admin/tickets/:id/messages — admin reply ─────────
  app.post("/tickets/:id/messages", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { message } = AddMessageSchema.parse(req.body);

    await ensureSupportTables();

    const [ticket] = await db
      .select({ id: supportTickets.id })
      .from(supportTickets)
      .where(eq(supportTickets.id, id))
      .limit(1);

    if (!ticket)
      return reply
        .code(404)
        .send({ success: false, error: "Ticket not found" });

    const [newMsg] = await db
      .insert(supportMessages)
      .values({
        ticketId: id,
        senderType: "admin",
        senderName: "DentalIQ Support",
        message,
      })
      .returning();

    // Update ticket timestamp
    await db
      .update(supportTickets)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(supportTickets.id, id));

    return reply.code(201).send({ success: true, data: newMsg });
  });

  // ── GET /admin/stats — system-wide stats ──────────────────
  app.get("/stats", async (_req, reply) => {
    const allTenants = await db.select().from(tenants);
    const PLAN_PRICES: Record<string, number> = {
      starter: 49,
      pro: 149,
      enterprise: 249,
      cortex: 299,
    };

    const byPlan = allTenants.reduce((acc: Record<string, number>, t) => {
      acc[t.plan] = (acc[t.plan] ?? 0) + 1;
      return acc;
    }, {});
    const byStatus = allTenants.reduce((acc: Record<string, number>, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    }, {});

    const mrr = allTenants
      .filter((t) => t.status === "active")
      .reduce((sum, t) => sum + (PLAN_PRICES[t.plan] ?? 0), 0);

    await ensureSupportTables();
    const openTickets = await db
      .select({ id: supportTickets.id })
      .from(supportTickets)
      .where(eq(supportTickets.status, "open"));

    // Agent task counts
    let agentTaskCounts = { pending: 0, approved: 0, rejected: 0 };
    try {
      const taskRows = await db.select().from(agentTasks);
      agentTaskCounts = {
        pending: taskRows.filter((r) => r.status === "pending").length,
        approved: taskRows.filter((r) => r.status === "approved").length,
        rejected: taskRows.filter((r) => r.status === "rejected").length,
      };
    } catch {
      /* agent_tasks may not exist yet */
    }

    return reply.send({
      success: true,
      data: {
        tenants: { total: allTenants.length, byPlan, byStatus },
        mrr,
        support: { openTickets: openTickets.length },
        agentTasks: agentTaskCounts,
      },
    });
  });

  // ── GET /admin/audit — recent agent task activity ──────────
  app.get("/audit", async (req, reply) => {
    const limit = Math.min(parseInt((req.query as any).limit ?? "100"), 500);

    let rows: any[] = [];
    try {
      rows = await db
        .select()
        .from(agentTasks)
        .orderBy(desc(agentTasks.createdAt))
        .limit(limit);
    } catch {
      /* agent_tasks may not exist yet */
    }

    return reply.send({ success: true, data: rows });
  });
}

// Creates support_tickets / support_messages tables if they don't exist yet.
// This handles the migration for databases provisioned before these tables were added.
async function ensureSupportTables() {
  const db = getDb() as any;
  try {
    await db.run(
      sql.raw(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        clinic_name TEXT NOT NULL DEFAULT '',
        user_name TEXT NOT NULL DEFAULT '',
        user_email TEXT NOT NULL DEFAULT '',
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
  } catch {
    /* tables already exist */
  }
}
