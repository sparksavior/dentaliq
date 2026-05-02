import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { getDb, tenants } from "@dentaliq/db";
import { sql, eq } from "drizzle-orm";
import { requireAuth } from "../middleware/requireAuth";

const ClinicBodySchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]).default("active"),
  operatingHours: z.string().optional(),
  pmsType: z.string().optional(),
});

export async function clinicsRoutes(app: FastifyInstance) {
  // GET /clinics — list all clinic locations for the tenant
  app.get(
    "/",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const jwtUser = req.user as any;
      const tablePrefix = await getTablePrefix(jwtUser.tenantId);
      if (!tablePrefix)
        return reply
          .code(400)
          .send({ success: false, error: "Tenant not found" });

      // Ensure table exists (for older tenants before schema migration)
      const db = getDb() as any;
      await (db as any).run(
        sql.raw(`
      CREATE TABLE IF NOT EXISTS "${tablePrefix}_clinic_locations" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        email TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        operating_hours TEXT,
        pms_type TEXT DEFAULT 'none',
        pms_connected INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `),
      );

      try {
        const rows = await (db as any).all(
          sql.raw(
            `SELECT * FROM "${tablePrefix}_clinic_locations" ORDER BY created_at ASC`,
          ),
        );
        return reply.send({ success: true, data: rows });
      } catch (err) {
        req.log.error(err);
        return reply
          .code(500)
          .send({ success: false, error: "Database error" });
      }
    },
  );

  // POST /clinics — create a clinic location
  app.post(
    "/",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const jwtUser = req.user as any;
      const body = ClinicBodySchema.parse(req.body);
      const tablePrefix = await getTablePrefix(jwtUser.tenantId);
      if (!tablePrefix)
        return reply
          .code(400)
          .send({ success: false, error: "Tenant not found" });

      const db = getDb();
      const rawDb = db as any;

      // Tier limit enforcement
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, jwtUser.tenantId))
        .limit(1);
      if (tenant) {
        const existingRows = await rawDb.all(
          sql.raw(`SELECT id FROM "${tablePrefix}_clinic_locations"`),
        );
        const count = Array.isArray(existingRows) ? existingRows.length : 0;
        if (tenant.plan === "starter" && count >= 1) {
          return reply
            .code(403)
            .send({
              success: false,
              error: "Starter plan is limited to 1 location",
            });
        }
        if (tenant.plan === "pro" && count >= 3) {
          return reply
            .code(403)
            .send({
              success: false,
              error: "Pro plan is limited to 3 locations",
            });
        }
      }

      const newId = createId();
      try {
        await (db as any).run(
          sql.raw(`
        INSERT INTO "${tablePrefix}_clinic_locations"
          (id, name, address, phone, email, status, operating_hours, pms_type)
        VALUES
          ('${newId}', ${sqlStr(body.name)}, ${sqlStr(body.address)}, ${sqlStr(body.phone)},
           ${sqlStr(body.email)}, '${body.status}', ${sqlStr(body.operatingHours)}, ${sqlStr(body.pmsType ?? "none")})
      `),
        );

        // Auto-assign billing agent to new clinic
        const agentAssignId = createId();
        await (db as any).run(
          sql.raw(`
        CREATE TABLE IF NOT EXISTS "${tablePrefix}_cortex_agents" (
          id TEXT PRIMARY KEY,
          clinic_id TEXT NOT NULL,
          agent_id TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `),
        );
        await (db as any).run(
          sql.raw(`
        INSERT INTO "${tablePrefix}_cortex_agents" (id, clinic_id, agent_id)
        VALUES ('${agentAssignId}', '${newId}', 'billing')
      `),
        );

        return reply
          .code(201)
          .send({ success: true, data: { id: newId, ...body } });
      } catch (err) {
        req.log.error(err);
        return reply
          .code(500)
          .send({ success: false, error: "Database error" });
      }
    },
  );

  // PATCH /clinics/:id — update a clinic location
  app.patch(
    "/:id",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const jwtUser = req.user as any;
      const { id } = req.params as { id: string };
      const body = ClinicBodySchema.partial().parse(req.body);
      const tablePrefix = await getTablePrefix(jwtUser.tenantId);
      if (!tablePrefix)
        return reply
          .code(400)
          .send({ success: false, error: "Tenant not found" });

      const db = getDb() as any;
      const setClauses = [
        body.name !== undefined && `name = ${sqlStr(body.name)}`,
        body.address !== undefined && `address = ${sqlStr(body.address)}`,
        body.phone !== undefined && `phone = ${sqlStr(body.phone)}`,
        body.email !== undefined && `email = ${sqlStr(body.email)}`,
        body.status !== undefined && `status = '${body.status}'`,
        body.operatingHours !== undefined &&
          `operating_hours = ${sqlStr(body.operatingHours)}`,
        body.pmsType !== undefined && `pms_type = ${sqlStr(body.pmsType)}`,
        `updated_at = datetime('now')`,
      ]
        .filter(Boolean)
        .join(", ");

      try {
        await (db as any).run(
          sql.raw(
            `UPDATE "${tablePrefix}_clinic_locations" SET ${setClauses} WHERE id = '${id}'`,
          ),
        );
        return reply.send({ success: true });
      } catch (err) {
        req.log.error(err);
        return reply
          .code(500)
          .send({ success: false, error: "Database error" });
      }
    },
  );

  // DELETE /clinics/:id
  app.delete(
    "/:id",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const jwtUser = req.user as any;
      const { id } = req.params as { id: string };
      const tablePrefix = await getTablePrefix(jwtUser.tenantId);
      if (!tablePrefix)
        return reply
          .code(400)
          .send({ success: false, error: "Tenant not found" });

      const db = getDb() as any;
      try {
        await (db as any).run(
          sql.raw(
            `DELETE FROM "${tablePrefix}_clinic_locations" WHERE id = '${id}'`,
          ),
        );
        return reply.send({ success: true });
      } catch (err) {
        req.log.error(err);
        return reply
          .code(500)
          .send({ success: false, error: "Database error" });
      }
    },
  );
}

function sqlStr(val: string | undefined | null): string {
  if (val === undefined || val === null) return "NULL";
  return `'${val.replace(/'/g, "''")}'`;
}

async function getTablePrefix(tenantId: string): Promise<string | null> {
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    return rows[0]?.schemaName ?? null;
  } catch {
    return null;
  }
}
