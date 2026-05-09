import { getDb, agentTasks } from "@dentaliq/db";
import { getLLMWithFallback } from "@dentaliq/llm-interface";
import { sql } from "drizzle-orm";
import type { AgentDefinition, AgentContext } from "@dentaliq/agent-core";

const NINE_MONTHS_MS = 9 * 30 * 24 * 60 * 60 * 1000;

export const hygienistAgent: AgentDefinition = {
  id: "hygienist",
  name: "Hygienist Agent",
  version: "1.0.0",
  priority: 10,
  emits: ["overdue_hygiene_patients"],
  async run(ctx: AgentContext): Promise<{ tasksCreated: number }> {
    const { tenantId, tablePrefix } = ctx;
    const db = getDb() as any;
    const cutoff = new Date(Date.now() - NINE_MONTHS_MS).toISOString();

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
      return { tasksCreated: 0 };
    }

    if (overduePreventive.length === 0) return { tasksCreated: 0 };

    // Emit so RecallAgent can personalise outreach for these specific patients
    ctx.emit("overdue_hygiene_patients", {
      patientIds: overduePreventive.map((p: any) => p.id),
      count: overduePreventive.length,
      patients: overduePreventive.map((p: any) => ({
        id: p.id,
        firstName: p.first_name,
        lastName: p.last_name,
        email: p.email,
        lastPreventive: p.last_preventive,
      })),
    });

    let llm: any = null;
    try {
      llm = await getLLMWithFallback();
    } catch {
      /* use template */
    }

    const globalDb = getDb();
    const patientList = overduePreventive
      .slice(0, 10)
      .map((p: any) =>
        `${p.first_name ?? "Unknown"} ${p.last_name ?? ""}`.trim(),
      )
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
      return { tasksCreated: 1 };
    } catch (err) {
      console.error("[HygienistAgent] Failed to save task:", err);
      return { tasksCreated: 0 };
    }
  },
};

/** @deprecated Use hygienistAgent.run() via the registry */
export async function runHygienistAgent(
  tenantId: string,
  tablePrefix: string,
): Promise<number> {
  const bus = new (await import("@dentaliq/agent-core")).CycleEventBus();
  const result = await hygienistAgent.run({
    tenantId,
    tablePrefix,
    clinicId: "default",
    db: null,
    llm: null,
    emit: (type, payload) =>
      bus.emit(type, "hygienist", tenantId, "default", payload),
    getEvents: (type) => bus.getEvents(type),
  });
  return result.tasksCreated;
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
