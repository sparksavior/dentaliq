import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { getDb, tenants } from "@dentaliq/db";
import { sql, eq } from "drizzle-orm";
import { requireAuth } from "../middleware/requireAuth";
import { createLogger } from "@dentaliq/logger";

const logger = createLogger("notes-routes");

const NoteBodySchema = z.object({
  patientId: z.string().min(1),
  content: z.string().min(1).max(2000),
  type: z
    .enum(["clinical", "billing", "general", "follow_up", "phone_call"])
    .default("general"),
});

const NOTES_TABLE_DDL = (prefix: string) => `
  CREATE TABLE IF NOT EXISTS "${prefix}_patient_notes" (
    id            TEXT PRIMARY KEY,
    patient_id    TEXT NOT NULL,
    content       TEXT NOT NULL,
    type          TEXT NOT NULL DEFAULT 'general',
    created_by    TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  )
`;

export async function notesRoutes(app: FastifyInstance) {
  // GET /notes?patientId=xxx
  app.get("/", { preHandler: requireAuth(app) }, async (req, reply) => {
    const jwtUser = req.user as any;
    const { patientId } = req.query as { patientId?: string };
    if (!patientId)
      return reply
        .code(400)
        .send({ success: false, error: "patientId is required" });

    const tablePrefix = await getTablePrefix(jwtUser.tenantId);
    if (!tablePrefix)
      return reply
        .code(400)
        .send({ success: false, error: "Tenant schema not found" });

    const db = getDb() as any;
    await ensureTable(db, tablePrefix);

    try {
      const rows = await db.all(
        sql`SELECT * FROM ${sql.raw(`"${tablePrefix}_patient_notes"`)}
              WHERE patient_id = ${patientId}
              ORDER BY created_at DESC`,
      );
      return reply.send({ success: true, data: rows ?? [] });
    } catch (err) {
      logger.error({ err }, "Failed to fetch notes");
      return reply.code(500).send({ success: false, error: "Database error" });
    }
  });

  // POST /notes
  app.post("/", { preHandler: requireAuth(app) }, async (req, reply) => {
    const jwtUser = req.user as any;
    const body = NoteBodySchema.parse(req.body);
    const tablePrefix = await getTablePrefix(jwtUser.tenantId);
    if (!tablePrefix)
      return reply
        .code(400)
        .send({ success: false, error: "Tenant schema not found" });

    const db = getDb() as any;
    await ensureTable(db, tablePrefix);
    const newId = createId();

    try {
      await db.run(
        sql`INSERT INTO ${sql.raw(`"${tablePrefix}_patient_notes"`)}
            (id, patient_id, content, type, created_by)
          VALUES
            (${newId}, ${body.patientId}, ${body.content}, ${body.type}, ${jwtUser.userId ?? null})`,
      );
      return reply.code(201).send({
        success: true,
        data: {
          id: newId,
          patient_id: body.patientId,
          content: body.content,
          type: body.type,
          created_at: new Date().toISOString(),
        },
      });
    } catch (err) {
      logger.error({ err }, "Failed to create note");
      return reply.code(500).send({ success: false, error: "Database error" });
    }
  });

  // DELETE /notes/:id
  app.delete("/:id", { preHandler: requireAuth(app) }, async (req, reply) => {
    const jwtUser = req.user as any;
    const { id } = req.params as { id: string };

    const tablePrefix = await getTablePrefix(jwtUser.tenantId);
    if (!tablePrefix)
      return reply
        .code(400)
        .send({ success: false, error: "Tenant schema not found" });

    const db = getDb() as any;
    try {
      await db.run(
        sql`DELETE FROM ${sql.raw(`"${tablePrefix}_patient_notes"`)} WHERE id = ${id}`,
      );
      return reply.send({ success: true });
    } catch (err) {
      logger.error({ err }, "Failed to delete note");
      return reply.code(500).send({ success: false, error: "Database error" });
    }
  });
}

async function ensureTable(db: any, prefix: string) {
  try {
    await db.run(sql.raw(NOTES_TABLE_DDL(prefix)));
  } catch {
    /* already exists */
  }
}

async function getTablePrefix(tenantId: string): Promise<string | null> {
  const db = getDb();
  try {
    const rows = await db
      .select({ schemaName: tenants.schemaName })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    return rows[0]?.schemaName ?? null;
  } catch (err) {
    logger.error({ err }, "getTablePrefix failed");
    return null;
  }
}
