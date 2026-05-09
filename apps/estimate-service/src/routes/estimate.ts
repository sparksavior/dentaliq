import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { getDb, tenants } from "@dentaliq/db";
import { sql, eq } from "drizzle-orm";
import { runEstimate } from "../services/rulesEngine";
import { requireAuth } from "../middleware/requireAuth";
import { createLogger } from "@dentaliq/logger";

const logger = createLogger("estimate-routes");

const EstimateBodySchema = z.object({
  cdtCode: z.string().min(4).max(10).toUpperCase(),
  insurerName: z.string().min(1),
  patientId: z.string().optional(),
  patientAge: z.number().int().min(0).max(120).optional(),
  codesOnSameVisit: z.array(z.string()).optional(),
  skipLlm: z.boolean().optional(),
});

export async function estimateRoutes(app: FastifyInstance) {
  // POST /estimate
  app.post(
    "/estimate",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const jwtUser = req.user as any;
      const body = EstimateBodySchema.parse(req.body);

      const result = await runEstimate({
        cdtCode: body.cdtCode,
        insurerName: body.insurerName,
        patientId: body.patientId ?? "",
        insurerId: body.insurerName,
        tenantId: jwtUser.tenantId,
        patientAge: body.patientAge,
        codesOnSameVisit: body.codesOnSameVisit,
        skipLlm: body.skipLlm,
      });

      const id = await persistEstimate(
        jwtUser.tenantId,
        jwtUser.sub,
        body.patientId,
        result,
        (req.headers["x-clinic-id"] as string) ?? null,
      );

      return reply.code(201).send({ success: true, data: { ...result, id } });
    },
  );

  // POST /estimate/narrative — AI pre-auth letter (Pro+ only)
  const NarrativeBodySchema = z.object({
    cdtCode: z.string(),
    insurerName: z.string(),
    patientName: z.string().optional(),
    patientAge: z.number().int().min(0).max(120).optional(),
    clinicalNotes: z.string().optional(),
    previousNarrative: z.string().optional(),
    revisionInstructions: z.string().optional(),
  });

  app.post(
    "/estimate/narrative",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const jwtUser = req.user as any;
      const db = getDb();
      const [tenantRow] = await db
        .select({ plan: tenants.plan })
        .from(tenants)
        .where(eq(tenants.id, jwtUser.tenantId))
        .limit(1);

      if (tenantRow?.plan === "starter") {
        return reply.code(403).send({
          success: false,
          error:
            "AI pre-authorization letters require a Pro plan. Please upgrade.",
        });
      }

      const body = NarrativeBodySchema.parse(req.body);
      const { generateNarrative } =
        await import("../services/llmNarrativeGenerator");

      const narrative = await generateNarrative({
        cdtCode: body.cdtCode,
        insurerName: body.insurerName,
        patientName: body.patientName,
        patientAge: body.patientAge,
        clinicalNotes: body.clinicalNotes,
        previousNarrative: body.previousNarrative,
        revisionInstructions: body.revisionInstructions,
      });

      return reply.code(201).send({ success: true, data: narrative });
    },
  );

  // GET /estimate/codes — CDT code reference list
  app.get(
    "/estimate/codes",
    {
      preHandler: requireAuth(app),
    },
    async (_req, reply) => {
      const { getAllCdtCodes } = await import("../data/cdt-codes");
      const codes = getAllCdtCodes().map((c) => ({
        code: c.code,
        description: c.description,
        category: c.category,
        typicalFee: c.typicalFee,
        requiresPreAuth: c.requiresPreAuth,
      }));
      return reply.send({ success: true, data: codes });
    },
  );

  // GET /estimate/history — recent estimates for this tenant/clinic
  app.get(
    "/estimate/history",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const jwtUser = req.user as any;
      const tablePrefix = await getTablePrefix(jwtUser.tenantId);
      if (!tablePrefix) return reply.send({ success: true, data: [] });

      const db = getDb() as any;
      const clinicId = (req.headers["x-clinic-id"] as string) || null;

      try {
        const rows = clinicId
          ? await db.all(
              sql`SELECT e.*, p.first_name, p.last_name
                FROM ${sql.raw(`"${tablePrefix}_estimates"`)} e
                LEFT JOIN ${sql.raw(`"${tablePrefix}_patients"`)} p ON e.patient_id = p.id
                WHERE e.clinic_id = ${clinicId}
                ORDER BY e.created_at DESC
                LIMIT 50`,
            )
          : await db.all(
              sql`SELECT e.*, p.first_name, p.last_name
                FROM ${sql.raw(`"${tablePrefix}_estimates"`)} e
                LEFT JOIN ${sql.raw(`"${tablePrefix}_patients"`)} p ON e.patient_id = p.id
                ORDER BY e.created_at DESC
                LIMIT 50`,
            );

        return reply.send({ success: true, data: rows ?? [] });
      } catch (err) {
        logger.error({ err }, "Estimate history fetch failed");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to load estimate history" });
      }
    },
  );

  // PATCH /estimate/:id/letter — save pre-auth letter
  const LetterBodySchema = z.object({
    letter: z.string().min(1),
  });

  app.patch(
    "/estimate/:id/letter",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { letter } = LetterBodySchema.parse(req.body);
      const jwtUser = req.user as any;
      const tablePrefix = await getTablePrefix(jwtUser.tenantId);

      if (!tablePrefix)
        return reply
          .code(404)
          .send({ success: false, error: "Tenant not found" });

      const db = getDb() as any;
      try {
        await db.run(
          sql`UPDATE ${sql.raw(`"${tablePrefix}_estimates"`)}
            SET pre_auth_letter = ${letter}
            WHERE id = ${id.trim()}`,
        );
        return reply.send({ success: true });
      } catch (err) {
        logger.error({ err, id }, "Failed to save pre-auth letter");
        return reply
          .code(500)
          .send({ success: false, error: "Failed to save letter" });
      }
    },
  );
}

async function persistEstimate(
  tenantId: string,
  userId: string,
  patientId: string | undefined,
  result: Awaited<ReturnType<typeof runEstimate>>,
  clinicId: string | null,
) {
  const tablePrefix = await getTablePrefix(tenantId);
  if (!tablePrefix) return null;

  const db = getDb() as any;
  const id = createId();

  // Migrate: add clinic_id column if missing
  try {
    await db.run(
      sql.raw(
        `ALTER TABLE "${tablePrefix}_estimates" ADD COLUMN clinic_id TEXT`,
      ),
    );
  } catch {
    /* column already exists */
  }

  try {
    await db.run(
      sql`INSERT INTO ${sql.raw(`"${tablePrefix}_estimates"`)}
        (id, patient_id, cdt_code, coverage_percent, patient_cost, insurer_pays, claim_risk, plain_explanation, created_by, clinic_id)
      VALUES
        (${id}, ${patientId ?? null}, ${result.cdtCode},
         ${result.coveragePercent}, ${result.patientCost}, ${result.insurerPays},
         ${result.claimRisk}, ${result.plainExplanation}, ${userId}, ${clinicId})`,
    );
    return id;
  } catch (err) {
    logger.error({ err }, "Estimate persistence failed");
    return null;
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
  } catch {
    return null;
  }
}
