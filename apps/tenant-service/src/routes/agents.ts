import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { getDb, tenants } from "@dentaliq/db";
import { sql, eq } from "drizzle-orm";
import { requireAuth } from "../middleware/requireAuth";

const RentAgentSchema = z.object({
  agentId: z.string().optional(),
  clinicId: z.string().optional(),
  assignments: z
    .array(
      z.object({
        agentId: z.string(),
        clinicId: z.string(),
      }),
    )
    .optional(),
});

export async function agentsRoutes(app: FastifyInstance) {
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

      const db = getDb() as any;
      await createAgentsTable(db, tablePrefix);

      try {
        const rowsRaw = await db.all(
          sql.raw(
            `SELECT * FROM "${tablePrefix}_cortex_agents" ORDER BY created_at ASC`,
          ),
        );
        const rows = Array.isArray(rowsRaw)
          ? rowsRaw
          : (rowsRaw as any).rows || [];
        return reply.send({ success: true, data: rows });
      } catch (err) {
        req.log.error(err);
        return reply
          .code(500)
          .send({ success: false, error: "Database error" });
      }
    },
  );

  app.post(
    "/rent",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const jwtUser = req.user as any;
      const body = RentAgentSchema.parse(req.body);
      const tablePrefix = await getTablePrefix(jwtUser.tenantId);
      if (!tablePrefix)
        return reply
          .code(400)
          .send({ success: false, error: "Tenant not found" });

      const db = getDb() as any;
      await createAgentsTable(db, tablePrefix);

      try {
        let targetAssignments = body.assignments || [];
        if (body.agentId && body.clinicId) {
          targetAssignments.push({
            agentId: body.agentId,
            clinicId: body.clinicId,
          });
        }

        if (targetAssignments.length === 0) {
          return reply
            .code(400)
            .send({ success: false, error: "No assignments provided." });
        }

        const newAssignments = [];
        for (const assignment of targetAssignments) {
          const newId = createId();
          await db.run(
            sql.raw(`
          INSERT INTO "${tablePrefix}_cortex_agents" (id, clinic_id, agent_id)
          VALUES ('${newId}', '${assignment.clinicId}', '${assignment.agentId}')
        `),
          );
          newAssignments.push({
            id: newId,
            clinicId: assignment.clinicId,
            agentId: assignment.agentId,
          });
        }

        return reply.code(201).send({ success: true, data: newAssignments });
      } catch (err) {
        req.log.error(err);
        return reply
          .code(500)
          .send({ success: false, error: "Database error" });
      }
    },
  );
}

async function createAgentsTable(db: any, tablePrefix: string) {
  await db.run(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS "${tablePrefix}_cortex_agents" (
      id TEXT PRIMARY KEY,
      clinic_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `),
  );
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
