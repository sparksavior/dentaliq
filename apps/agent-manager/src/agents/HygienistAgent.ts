// ─────────────────────────────────────────────────────────
// Cortex Hygienist Agent
//
// Identifies patients overdue for preventive care (D1-series
// procedures) and generates optimisation reports with specific
// patient lists and scheduling recommendations.
// ─────────────────────────────────────────────────────────

import { getDb, agentTasks } from "@dentaliq/db";
import { getLLMWithFallback } from "@dentaliq/llm-interface";
import { sql } from "drizzle-orm";

const NINE_MONTHS_MS = 9 * 30 * 24 * 60 * 60 * 1000;

export async function runHygienistAgent(
  tenantId: string,
  tablePrefix: string,
): Promise<number> {
  const db = getDb() as any;
  const cutoff = new Date(Date.now() - NINE_MONTHS_MS).toISOString();

  // Patients whose last preventive estimate (D1xxx) was > 9 months ago
  let overduePreventive: any[] = [];
  try {
    overduePreventive = await db.all(
      sql`SELECT p.id, p.first_name, p.last_name, p.email,
               MAX(e.created_at) as last_preventive
          FROM ${sql.raw(`"${tablePrefix}_patients"`)} p
          LEFT JOIN ${sql.raw(`"${tablePrefix}_estimates"`)} e
            ON e.patient_id = p.id AND e.cdt_code LIKE 'D1%'
          GROUP BY p.id
          HAVING last_preventive < ${cutoff} OR last_preventive IS NULL
          ORDER BY last_preventive ASC
          LIMIT 30`,
    );
  } catch {
    return 0;
  }

  if (overduePreventive.length === 0) return 0;

  let llm: Awaited<ReturnType<typeof getLLMWithFallback>> | null = null;
  try {
    llm = await getLLMWithFallback();
  } catch {
    /* use template */
  }

  const globalDb = getDb();
  let processed = 0;

  // Create a single batch report task (not per-patient — schedule optimisation is a summary)
  const patientList = overduePreventive
    .slice(0, 10)
    .map((p: any) => `${p.first_name ?? "Unknown"} ${p.last_name ?? ""}`.trim())
    .join(", ");

  let report: string;

  if (llm) {
    try {
      const resp = await llm.complete({
        system:
          "You are a dental hygiene coordinator writing a scheduling optimisation report.",
        prompt: `Write a hygiene schedule optimisation report:
- ${overduePreventive.length} patients are overdue for preventive care (>9 months since last prophylaxis)
- Top patients: ${patientList}

Provide 3 actionable scheduling recommendations to maximise hygiene chair utilisation this month.`,
        maxTokens: 300,
        temperature: 0.4,
      });
      report = resp.content;
    } catch {
      report = buildTemplateReport(overduePreventive.length, patientList);
    }
  } else {
    report = buildTemplateReport(overduePreventive.length, patientList);
  }

  try {
    await globalDb.insert(agentTasks).values({
      tenantId,
      agentId: "hygienist",
      taskType: "schedule_optimization",
      content: report,
      status: "pending",
      metadata: JSON.stringify({
        tablePrefix,
        overdueCount: overduePreventive.length,
        patientIds: overduePreventive.map((p: any) => p.id),
      }),
    });
    processed = 1;
  } catch (err) {
    console.error("[HygienistAgent] Failed to save task:", err);
  }

  return processed;
}

function buildTemplateReport(count: number, patients: string): string {
  return `Hygiene Schedule Optimisation Report

${count} patient(s) are overdue for preventive care (last prophylaxis > 9 months ago).

Priority patients: ${patients}

Recommendations:
1. Block morning hygiene slots for recall patients — contact overdue patients via phone or SMS this week.
2. Schedule double-booking during peak cancellation hours (Mon/Tue 9–11 AM) to absorb last-minute gaps.
3. Use Cortex Recall Agent to auto-send appointment reminders to the patients listed above.

Review and action in the Cortex Inbox.`;
}
