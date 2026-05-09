import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  getDb,
  tenants,
  users,
  supportTickets,
  supportMessages,
} from "@dentaliq/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/requireAuth";

const TicketBodySchema = z.object({
  subject: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
});

const MessageBodySchema = z.object({
  message: z.string().min(1).max(2000),
});

export async function supportRoutes(app: FastifyInstance) {
  const db = getDb();

  // POST /support/tickets — submit a support ticket
  app.post(
    "/tickets",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const jwtUser = req.user as any;
      const body = TicketBodySchema.parse(req.body);

      await ensureSupportTables();

      const [tenantRow] = await db
        .select({ name: tenants.name })
        .from(tenants)
        .where(eq(tenants.id, jwtUser.tenantId))
        .limit(1);
      const [userRow] = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, jwtUser.sub))
        .limit(1);

      const [ticket] = await db
        .insert(supportTickets)
        .values({
          tenantId: jwtUser.tenantId,
          clinicName: tenantRow?.name ?? "",
          userName: userRow?.name ?? "",
          userEmail: userRow?.email ?? "",
          subject: body.subject,
          description: body.description,
          status: "open",
        })
        .returning();

      return reply.code(201).send({ success: true, data: ticket });
    },
  );

  // GET /support/tickets — list tenant's own tickets
  app.get(
    "/tickets",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const jwtUser = req.user as any;
      await ensureSupportTables();
      const rows = await db
        .select()
        .from(supportTickets)
        .where(eq(supportTickets.tenantId, jwtUser.tenantId))
        .orderBy(desc(supportTickets.createdAt));
      return reply.send({ success: true, data: rows });
    },
  );

  // GET /support/tickets/:id — ticket + messages (own tickets only)
  app.get(
    "/tickets/:id",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const jwtUser = req.user as any;
      await ensureSupportTables();

      const [ticket] = await db
        .select()
        .from(supportTickets)
        .where(eq(supportTickets.id, id))
        .limit(1);

      if (!ticket || ticket.tenantId !== jwtUser.tenantId) {
        return reply
          .code(404)
          .send({ success: false, error: "Ticket not found" });
      }

      const messages = await db
        .select()
        .from(supportMessages)
        .where(eq(supportMessages.ticketId, id))
        .orderBy(supportMessages.createdAt);

      return reply.send({ success: true, data: { ...ticket, messages } });
    },
  );

  // POST /support/tickets/:id/messages — add user message
  app.post(
    "/tickets/:id/messages",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const jwtUser = req.user as any;
      const body = MessageBodySchema.parse(req.body);
      await ensureSupportTables();

      const [ticket] = await db
        .select({ id: supportTickets.id, tenantId: supportTickets.tenantId })
        .from(supportTickets)
        .where(eq(supportTickets.id, id))
        .limit(1);

      if (!ticket || ticket.tenantId !== jwtUser.tenantId) {
        return reply
          .code(404)
          .send({ success: false, error: "Ticket not found" });
      }

      const [userRow] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, jwtUser.sub))
        .limit(1);

      const [msg] = await db
        .insert(supportMessages)
        .values({
          ticketId: id,
          senderType: "user",
          senderName: userRow?.name ?? "User",
          message: body.message,
        })
        .returning();

      // Mark ticket updated so admin sees new activity
      await db
        .update(supportTickets)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(supportTickets.id, id));

      return reply.code(201).send({ success: true, data: msg });
    },
  );
}

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
