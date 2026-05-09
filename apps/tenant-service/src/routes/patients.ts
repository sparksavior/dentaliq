import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { getDb, tenants } from "@dentaliq/db";
import { sql, eq } from "drizzle-orm";
import { requireAuth } from "../middleware/requireAuth";
import { createLogger } from "@dentaliq/logger";

const logger = createLogger("patients-routes");

const PatientBodySchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  insuranceProvider: z.string().optional(),
  clinicId: z.string().optional(),
});

export async function patientsRoutes(app: FastifyInstance) {
  // GET /patients — list all patients for the tenant
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
          .send({ success: false, error: "Tenant schema not found" });

      const db = getDb() as any;
      // clinicId comes from a trusted header set by auth middleware or the client
      const clinicId = req.headers["x-clinic-id"] as string | undefined;

      // Migrate: add clinic_id column for tenants provisioned before this feature
      try {
        await db.run(
          sql.raw(
            `ALTER TABLE "${tablePrefix}_patients" ADD COLUMN clinic_id TEXT`,
          ),
        );
      } catch {
        /* column already exists — expected */
      }

      try {
        // Use parameterized query — clinicId is user-controlled, must not be interpolated
        const rows = clinicId
          ? await db.all(
              sql`SELECT * FROM ${sql.raw(`"${tablePrefix}_patients"`)} WHERE clinic_id = ${clinicId} ORDER BY created_at DESC`,
            )
          : await db.all(
              sql`SELECT * FROM ${sql.raw(`"${tablePrefix}_patients"`)} ORDER BY created_at DESC`,
            );

        return reply.send({ success: true, data: rows ?? [] });
      } catch (err) {
        logger.error({ err }, "Failed to fetch patients");
        return reply
          .code(500)
          .send({ success: false, error: "Database error" });
      }
    },
  );

  // POST /patients — create a new patient
  app.post(
    "/",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const jwtUser = req.user as any;
      const body = PatientBodySchema.parse(req.body);

      const tablePrefix = await getTablePrefix(jwtUser.tenantId);
      if (!tablePrefix)
        return reply
          .code(400)
          .send({ success: false, error: "Tenant schema not found" });

      const db = getDb() as any;
      const newId = createId();
      const clinicId = (req.headers["x-clinic-id"] as string) ?? null;

      // Migrate: add clinic_id column for tenants provisioned before this feature
      try {
        await db.run(
          sql.raw(
            `ALTER TABLE "${tablePrefix}_patients" ADD COLUMN clinic_id TEXT`,
          ),
        );
      } catch {
        /* column already exists */
      }

      try {
        await db.run(
          sql`INSERT INTO ${sql.raw(`"${tablePrefix}_patients"`)}
          (id, first_name, last_name, date_of_birth, phone, email, insurance_plan_id, clinic_id)
        VALUES
          (${newId}, ${body.firstName}, ${body.lastName}, ${body.dateOfBirth ?? null},
           ${body.phone ?? null}, ${body.email ?? null}, ${body.insuranceProvider ?? null}, ${clinicId})`,
        );
        return reply
          .code(201)
          .send({ success: true, data: { id: newId, ...body } });
      } catch (err) {
        logger.error({ err }, "Failed to create patient");
        return reply
          .code(500)
          .send({ success: false, error: "Database error" });
      }
    },
  );

  // PATCH /patients/:id — update patient
  app.patch(
    "/:id",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const jwtUser = req.user as any;
      const { id } = req.params as { id: string };
      const body = PatientBodySchema.partial().parse(req.body);

      const tablePrefix = await getTablePrefix(jwtUser.tenantId);
      if (!tablePrefix)
        return reply
          .code(400)
          .send({ success: false, error: "Tenant schema not found" });

      const db = getDb() as any;
      try {
        await db.run(
          sql`UPDATE ${sql.raw(`"${tablePrefix}_patients"`)} SET
          first_name        = COALESCE(${body.firstName ?? null}, first_name),
          last_name         = COALESCE(${body.lastName ?? null}, last_name),
          date_of_birth     = COALESCE(${body.dateOfBirth ?? null}, date_of_birth),
          phone             = COALESCE(${body.phone ?? null}, phone),
          email             = COALESCE(${body.email ?? null}, email),
          insurance_plan_id = COALESCE(${body.insuranceProvider ?? null}, insurance_plan_id),
          clinic_id         = COALESCE(${body.clinicId ?? null}, clinic_id),
          updated_at        = ${new Date().toISOString()}
        WHERE id = ${id}`,
        );
        return reply.send({ success: true });
      } catch (err) {
        logger.error({ err }, "Failed to update patient");
        return reply
          .code(500)
          .send({ success: false, error: "Database error" });
      }
    },
  );

  // GET /patients/:id — get patient detail with estimate history
  app.get(
    "/:id",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const jwtUser = req.user as any;
      const tablePrefix = await getTablePrefix(jwtUser.tenantId);
      if (!tablePrefix)
        return reply
          .code(400)
          .send({ success: false, error: "Tenant schema not found" });

      const db = getDb() as any;
      try {
        // Both id and tablePrefix are safe — tablePrefix from DB, id is bound as param
        const pResult = await db.all(
          sql`SELECT * FROM ${sql.raw(`"${tablePrefix}_patients"`)} WHERE id = ${id} LIMIT 1`,
        );
        const patient = pResult?.[0];
        if (!patient)
          return reply
            .code(404)
            .send({ success: false, error: "Patient not found" });

        const history = await db.all(
          sql`SELECT * FROM ${sql.raw(`"${tablePrefix}_estimates"`)} WHERE patient_id = ${id} ORDER BY created_at DESC`,
        );

        return reply.send({
          success: true,
          data: { ...patient, history: history ?? [] },
        });
      } catch (err) {
        logger.error({ err }, "Failed to fetch patient detail");
        return reply
          .code(500)
          .send({ success: false, error: "Database error" });
      }
    },
  );

  // DELETE /patients/:id
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
          .send({ success: false, error: "Tenant schema not found" });

      const db = getDb() as any;
      try {
        await db.run(
          sql`DELETE FROM ${sql.raw(`"${tablePrefix}_patients"`)} WHERE id = ${id}`,
        );
        return reply.send({ success: true });
      } catch (err) {
        logger.error({ err }, "Failed to delete patient");
        return reply
          .code(500)
          .send({ success: false, error: "Database error" });
      }
    },
  );
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
