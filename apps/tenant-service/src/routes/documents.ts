import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { getDb, tenants } from "@dentaliq/db";
import { sql, eq } from "drizzle-orm";
import { requireAuth } from "../middleware/requireAuth";
import { createLogger } from "@dentaliq/logger";

const logger = createLogger("documents-routes");

const DocumentBodySchema = z.object({
  patientId: z.string().min(1),
  name: z.string().min(1).max(255),
  type: z.enum([
    "xray",
    "treatment_plan",
    "insurance_card",
    "consent_form",
    "lab_report",
    "photo",
    "other",
  ]),
  /** Base64-encoded file content */
  content: z.string().min(1),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.number().int().positive().max(10_000_000), // 10 MB max
  notes: z.string().max(500).optional(),
});

const DOCUMENTS_TABLE_DDL = (prefix: string) => `
  CREATE TABLE IF NOT EXISTS "${prefix}_documents" (
    id            TEXT PRIMARY KEY,
    patient_id    TEXT NOT NULL,
    name          TEXT NOT NULL,
    type          TEXT NOT NULL DEFAULT 'other',
    content       TEXT NOT NULL,
    mime_type     TEXT NOT NULL,
    size_bytes    INTEGER NOT NULL DEFAULT 0,
    notes         TEXT,
    uploaded_by   TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  )
`;

export async function documentsRoutes(app: FastifyInstance) {
  // GET /documents?patientId=xxx — list documents for a patient
  app.get("/", { preHandler: requireAuth(app) }, async (req, reply) => {
    const jwtUser = req.user as any;
    const { patientId } = req.query as { patientId?: string };
    const tablePrefix = await getTablePrefix(jwtUser.tenantId);
    if (!tablePrefix)
      return reply
        .code(400)
        .send({ success: false, error: "Tenant schema not found" });

    const db = getDb() as any;
    await ensureTable(db, tablePrefix);

    try {
      // Return metadata only (no content blob) for listing
      const rows = patientId
        ? await db.all(
            sql`SELECT id, patient_id, name, type, mime_type, size_bytes, notes, uploaded_by, created_at, updated_at
                  FROM ${sql.raw(`"${tablePrefix}_documents"`)}
                  WHERE patient_id = ${patientId}
                  ORDER BY created_at DESC`,
          )
        : await db.all(
            sql`SELECT id, patient_id, name, type, mime_type, size_bytes, notes, uploaded_by, created_at, updated_at
                  FROM ${sql.raw(`"${tablePrefix}_documents"`)}
                  ORDER BY created_at DESC`,
          );

      return reply.send({ success: true, data: rows ?? [] });
    } catch (err) {
      logger.error({ err }, "Failed to fetch documents");
      return reply.code(500).send({ success: false, error: "Database error" });
    }
  });

  // GET /documents/:id — get single document with content
  app.get("/:id", { preHandler: requireAuth(app) }, async (req, reply) => {
    const jwtUser = req.user as any;
    const { id } = req.params as { id: string };
    const tablePrefix = await getTablePrefix(jwtUser.tenantId);
    if (!tablePrefix)
      return reply
        .code(400)
        .send({ success: false, error: "Tenant schema not found" });

    const db = getDb() as any;
    await ensureTable(db, tablePrefix);

    try {
      const rows = await db.all(
        sql`SELECT * FROM ${sql.raw(`"${tablePrefix}_documents"`)} WHERE id = ${id} LIMIT 1`,
      );
      const doc = rows?.[0];
      if (!doc)
        return reply
          .code(404)
          .send({ success: false, error: "Document not found" });

      return reply.send({ success: true, data: doc });
    } catch (err) {
      logger.error({ err }, "Failed to fetch document");
      return reply.code(500).send({ success: false, error: "Database error" });
    }
  });

  // POST /documents — upload a new document
  app.post("/", { preHandler: requireAuth(app) }, async (req, reply) => {
    const jwtUser = req.user as any;
    const body = DocumentBodySchema.parse(req.body);
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
        sql`INSERT INTO ${sql.raw(`"${tablePrefix}_documents"`)}
            (id, patient_id, name, type, content, mime_type, size_bytes, notes, uploaded_by)
          VALUES
            (${newId}, ${body.patientId}, ${body.name}, ${body.type},
             ${body.content}, ${body.mimeType}, ${body.sizeBytes},
             ${body.notes ?? null}, ${jwtUser.userId ?? null})`,
      );

      return reply.code(201).send({
        success: true,
        data: { id: newId, name: body.name, type: body.type },
      });
    } catch (err) {
      logger.error({ err }, "Failed to upload document");
      return reply.code(500).send({ success: false, error: "Database error" });
    }
  });

  // PATCH /documents/:id — update metadata (name, type, notes)
  app.patch("/:id", { preHandler: requireAuth(app) }, async (req, reply) => {
    const jwtUser = req.user as any;
    const { id } = req.params as { id: string };
    const body = z
      .object({
        name: z.string().min(1).max(255).optional(),
        type: z
          .enum([
            "xray",
            "treatment_plan",
            "insurance_card",
            "consent_form",
            "lab_report",
            "photo",
            "other",
          ])
          .optional(),
        notes: z.string().max(500).optional(),
      })
      .parse(req.body);

    const tablePrefix = await getTablePrefix(jwtUser.tenantId);
    if (!tablePrefix)
      return reply
        .code(400)
        .send({ success: false, error: "Tenant schema not found" });

    const db = getDb() as any;
    try {
      await db.run(
        sql`UPDATE ${sql.raw(`"${tablePrefix}_documents"`)} SET
            name       = COALESCE(${body.name ?? null}, name),
            type       = COALESCE(${body.type ?? null}, type),
            notes      = COALESCE(${body.notes ?? null}, notes),
            updated_at = ${new Date().toISOString()}
          WHERE id = ${id}`,
      );
      return reply.send({ success: true });
    } catch (err) {
      logger.error({ err }, "Failed to update document");
      return reply.code(500).send({ success: false, error: "Database error" });
    }
  });

  // DELETE /documents/:id
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
        sql`DELETE FROM ${sql.raw(`"${tablePrefix}_documents"`)} WHERE id = ${id}`,
      );
      return reply.send({ success: true });
    } catch (err) {
      logger.error({ err }, "Failed to delete document");
      return reply.code(500).send({ success: false, error: "Database error" });
    }
  });
}

// ── Helpers ─────────────────────────────────────────────────

async function ensureTable(db: any, prefix: string) {
  try {
    await db.run(sql.raw(DOCUMENTS_TABLE_DDL(prefix)));
  } catch {
    /* table already exists */
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
