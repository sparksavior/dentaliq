import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { getDb, tenants, users } from "@dentaliq/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/requireAuth";

const TicketBodySchema = z.object({
  subject: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
});

export async function supportRoutes(app: FastifyInstance) {
  // POST /support/tickets — submit a support ticket (requires auth)
  app.post(
    "/tickets",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const jwtUser = req.user as any;
      const body = TicketBodySchema.parse(req.body);
      const db = getDb() as any;

      // Fetch tenant and user for context
      const tenantRows = await getDb()
        .select()
        .from(tenants)
        .where(eq(tenants.id, jwtUser.tenantId))
        .limit(1);
      const userRows = await getDb()
        .select()
        .from(users)
        .where(eq(users.id, jwtUser.sub))
        .limit(1);

      const tenantName = tenantRows[0]?.name ?? "Unknown Clinic";
      const userName = userRows[0]?.name ?? "Unknown User";
      const userEmail = userRows[0]?.email ?? "";

      const newId = createId();
      await db.run(
        sql.raw(`
      INSERT INTO support_tickets (id, tenant_id, clinic_name, user_name, user_email, subject, description, status)
      VALUES ('${newId}', '${jwtUser.tenantId}', '${tenantName.replace(/'/g, "''")}',
              '${userName.replace(/'/g, "''")}', '${userEmail.replace(/'/g, "''")}',
              '${body.subject.replace(/'/g, "''")}', '${body.description.replace(/'/g, "''")}', 'open')
    `),
      );

      return reply.code(201).send({ success: true, data: { id: newId } });
    },
  );

  // GET /support/tickets — list all tickets for tenant
  app.get(
    "/tickets",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const jwtUser = req.user as any;
      const db = getDb() as any;
      const rows = await db.all(
        sql.raw(`
      SELECT * FROM support_tickets WHERE tenant_id = '${jwtUser.tenantId}' ORDER BY created_at DESC
    `),
      );
      return reply.send({ success: true, data: rows ?? [] });
    },
  );

  // GET /support/tickets/:id — get ticket details and messages
  app.get(
    "/tickets/:id",
    {
      preHandler: requireAuth(app),
    },
    async (req: any, reply) => {
      const { id } = req.params;
      const jwtUser = req.user as any;
      const db = getDb() as any;
      const tickets = await db.all(
        sql.raw(`
      SELECT * FROM support_tickets WHERE id = '${id}' AND tenant_id = '${jwtUser.tenantId}' LIMIT 1
    `),
      );
      if (!tickets || tickets.length === 0) {
        return reply
          .code(404)
          .send({ success: false, error: "Ticket not found" });
      }
      const messages = await db.all(
        sql.raw(`
      SELECT * FROM support_messages WHERE ticket_id = '${id}' ORDER BY created_at ASC
    `),
      );
      return reply.send({
        success: true,
        data: { ...tickets[0], messages: messages ?? [] },
      });
    },
  );

  const MessageBodySchema = z.object({
    message: z.string().min(1).max(2000),
  });

  // POST /support/tickets/:id/messages — add message
  app.post(
    "/tickets/:id/messages",
    {
      preHandler: requireAuth(app),
    },
    async (req: any, reply) => {
      const { id } = req.params;
      const jwtUser = req.user as any;
      const body = MessageBodySchema.parse(req.body);
      const db = getDb() as any;

      const tickets = await db.all(
        sql.raw(`
      SELECT * FROM support_tickets WHERE id = '${id}' AND tenant_id = '${jwtUser.tenantId}' LIMIT 1
    `),
      );
      if (!tickets || tickets.length === 0) {
        return reply
          .code(404)
          .send({ success: false, error: "Ticket not found" });
      }

      const userRows = await getDb()
        .select()
        .from(users)
        .where(eq(users.id, jwtUser.sub))
        .limit(1);
      const userName = userRows[0]?.name ?? "Unknown User";

      const newId = createId();
      await db.run(
        sql.raw(`
      INSERT INTO support_messages (id, ticket_id, sender_type, sender_name, message)
      VALUES ('${newId}', '${id}', 'user', '${userName.replace(/'/g, "''")}', '${body.message.replace(/'/g, "''")}')
    `),
      );

      return reply.code(201).send({ success: true, data: { id: newId } });
    },
  );
}
