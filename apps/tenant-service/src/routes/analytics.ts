// ─────────────────────────────────────────────────────────
// Analytics Routes  GET /analytics/overview
//
// Returns three clinic-owner metrics computed live from the
// tenant's dynamic tables:
//   caseAcceptance  — monthly estimate volume + % advanced
//   newPatients     — monthly new-patient counts + MoM delta
//   arAging         — outstanding patient_cost by age band
// ─────────────────────────────────────────────────────────

import type { FastifyInstance } from "fastify";
import { getDb, tenants } from "@dentaliq/db";
import { sql, eq } from "drizzle-orm";
import { requireAuth } from "../middleware/requireAuth";
import { createLogger } from "@dentaliq/logger";

const logger = createLogger("analytics-routes");

export async function analyticsRoutes(app: FastifyInstance) {
  app.get("/overview", { preHandler: requireAuth(app) }, async (req, reply) => {
    const jwtUser = req.user as any;
    const tablePrefix = await getTablePrefix(jwtUser.tenantId);
    if (!tablePrefix)
      return reply
        .code(400)
        .send({ success: false, error: "Tenant schema not found" });

    const db = getDb() as any;
    const clinicId = req.headers["x-clinic-id"] as string | undefined;
    const clinicFilter = clinicId
      ? `AND clinic_id = '${clinicId.replace(/'/g, "''")}'`
      : "";

    // Accept optional date range query params
    const { startDate, endDate } = req.query as {
      startDate?: string;
      endDate?: string;
    };
    // Default to last 6 months if no range supplied
    const dateFrom = startDate
      ? `'${startDate.replace(/'/g, "''")}'`
      : "date('now', '-6 months')";
    const dateTo = endDate
      ? `'${endDate.replace(/'/g, "''")}'`
      : "date('now', '+1 day')";
    const dateFilter = `AND created_at >= ${dateFrom} AND created_at <= ${dateTo}`;

    try {
      // ── 1. Case acceptance ──────────────────────────────────
      const caseRows: any[] = await db
        .all(
          sql.raw(`
              SELECT
                strftime('%Y-%m', created_at)          AS month,
                COUNT(*)                               AS total,
                SUM(CASE WHEN pre_auth_letter IS NOT NULL
                              AND pre_auth_letter != ''
                         THEN 1 ELSE 0 END)            AS advanced
              FROM "${tablePrefix}_estimates"
              WHERE 1=1
                ${dateFilter}
                ${clinicFilter}
              GROUP BY month
              ORDER BY month ASC
            `),
        )
        .catch(() => []);

      const caseAcceptance = caseRows.map((r: any) => ({
        month: r.month as string,
        total: Number(r.total),
        advanced: Number(r.advanced),
        rate:
          Number(r.total) > 0
            ? Math.round((Number(r.advanced) / Number(r.total)) * 100)
            : 0,
      }));

      // ── 2. New patients — last 6 full months ─────────────────
      // Ensure created_at column exists (older tenants may not have it)
      const patientRows: any[] = await db
        .all(
          sql.raw(`
              SELECT
                strftime('%Y-%m', created_at) AS month,
                COUNT(*)                      AS count
              FROM "${tablePrefix}_patients"
              WHERE 1=1
                ${dateFilter}
                ${clinicFilter}
              GROUP BY month
              ORDER BY month ASC
            `),
        )
        .catch(() => []);

      const newPatients = patientRows.map((r: any) => ({
        month: r.month as string,
        count: Number(r.count),
      }));

      // MoM delta: current calendar month vs previous calendar month
      const momRow: any[] = await db
        .all(
          sql.raw(`
              SELECT
                SUM(CASE WHEN created_at >= date('now','start of month')
                         THEN 1 ELSE 0 END)                          AS current_month,
                SUM(CASE WHEN created_at >= date('now','start of month','-1 month')
                              AND created_at <  date('now','start of month')
                         THEN 1 ELSE 0 END)                          AS prior_month,
                COUNT(*)                                              AS total
              FROM "${tablePrefix}_patients"
              ${clinicFilter ? `WHERE 1=1 ${clinicFilter}` : ""}
            `),
        )
        .catch(() => []);

      const mom = momRow[0] ?? {};
      const patientSummary = {
        currentMonth: Number(mom.current_month ?? 0),
        priorMonth: Number(mom.prior_month ?? 0),
        total: Number(mom.total ?? 0),
        momDelta:
          Number(mom.prior_month ?? 0) > 0
            ? Math.round(
                ((Number(mom.current_month ?? 0) -
                  Number(mom.prior_month ?? 0)) /
                  Number(mom.prior_month)) *
                  100,
              )
            : null,
      };

      // ── 3. AR aging — unprocessed estimates by age band ──────
      // "Outstanding" = no pre_auth_letter drafted yet
      const agingRow: any[] = await db
        .all(
          sql.raw(`
              SELECT
                SUM(CASE WHEN julianday('now') - julianday(created_at) <= 30
                         THEN COALESCE(patient_cost, 0) ELSE 0 END)  AS amount_0_30,
                SUM(CASE WHEN julianday('now') - julianday(created_at) > 30
                              AND julianday('now') - julianday(created_at) <= 60
                         THEN COALESCE(patient_cost, 0) ELSE 0 END)  AS amount_31_60,
                SUM(CASE WHEN julianday('now') - julianday(created_at) > 60
                              AND julianday('now') - julianday(created_at) <= 90
                         THEN COALESCE(patient_cost, 0) ELSE 0 END)  AS amount_61_90,
                SUM(CASE WHEN julianday('now') - julianday(created_at) > 90
                         THEN COALESCE(patient_cost, 0) ELSE 0 END)  AS amount_90plus,
                COUNT(CASE WHEN julianday('now') - julianday(created_at) <= 30
                           THEN 1 END)                                AS count_0_30,
                COUNT(CASE WHEN julianday('now') - julianday(created_at) > 30
                                AND julianday('now') - julianday(created_at) <= 60
                           THEN 1 END)                                AS count_31_60,
                COUNT(CASE WHEN julianday('now') - julianday(created_at) > 60
                                AND julianday('now') - julianday(created_at) <= 90
                           THEN 1 END)                                AS count_61_90,
                COUNT(CASE WHEN julianday('now') - julianday(created_at) > 90
                           THEN 1 END)                                AS count_90plus
              FROM "${tablePrefix}_estimates"
              WHERE (pre_auth_letter IS NULL OR pre_auth_letter = '')
                ${clinicFilter}
            `),
        )
        .catch(() => []);

      const ar = agingRow[0] ?? {};
      const arAging = [
        {
          band: "0–30 days",
          days: "0-30",
          amount: Math.round(Number(ar.amount_0_30 ?? 0)),
          count: Number(ar.count_0_30 ?? 0),
          severity: "current" as const,
        },
        {
          band: "31–60 days",
          days: "31-60",
          amount: Math.round(Number(ar.amount_31_60 ?? 0)),
          count: Number(ar.count_31_60 ?? 0),
          severity: "watch" as const,
        },
        {
          band: "61–90 days",
          days: "61-90",
          amount: Math.round(Number(ar.amount_61_90 ?? 0)),
          count: Number(ar.count_61_90 ?? 0),
          severity: "overdue" as const,
        },
        {
          band: "90+ days",
          days: "90+",
          amount: Math.round(Number(ar.amount_90plus ?? 0)),
          count: Number(ar.count_90plus ?? 0),
          severity: "critical" as const,
        },
      ];

      const arTotal = arAging.reduce((s, b) => s + b.amount, 0);

      return reply.send({
        success: true,
        data: {
          caseAcceptance,
          newPatients,
          patientSummary,
          arAging,
          arTotal,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      logger.error({ err }, "Analytics overview failed");
      return reply
        .code(500)
        .send({ success: false, error: "Failed to compute analytics" });
    }
  });
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
