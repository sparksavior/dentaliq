import { getDb, agentTasks } from "@dentaliq/db";
import { getLLMWithFallback } from "@dentaliq/llm-interface";
import { sql } from "drizzle-orm";
import type { AgentDefinition, AgentContext } from "@dentaliq/agent-core";

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

export const recallAgent: AgentDefinition = {
  id: "recall",
  name: "Recall Agent",
  version: "1.0.0",
  priority: 30,
  triggers: ["overdue_hygiene_patients"],
  emits: ["patient_recalled"],
  async run(ctx: AgentContext): Promise<{ tasksCreated: number }> {
    const { tenantId, tablePrefix } = ctx;
    const db = getDb() as any;
    const cutoff = new Date(Date.now() - SIX_MONTHS_MS).toISOString();

    // If HygienistAgent ran first, prefer its pre-filtered overdue list
    const hygieneEvents = ctx.getEvents("overdue_hygiene_patients");
    let overduePatients: any[] = [];

    if (hygieneEvents.length > 0) {
      // Use patient data already surfaced by the hygienist agent
      const hygienePayload = hygieneEvents[0].payload as any;
      overduePatients = (hygienePayload.patients ?? []).map((p: any) => ({
        id: p.id,
        first_name: p.firstName,
        last_name: p.lastName,
        email: p.email,
        phone: null,
        last_visit: p.lastPreventive,
      }));
    } else {
      // Standalone fallback: full overdue scan
      try {
        overduePatients = await db.all(
          sql`SELECT p.id, p.first_name, p.last_name, p.email, p.phone,
                 MAX(e.created_at) as last_visit
              FROM ${sql.raw(`"${tablePrefix}_patients"`)} p
              LEFT JOIN ${sql.raw(`"${tablePrefix}_estimates"`)} e ON e.patient_id = p.id
              GROUP BY p.id
              HAVING last_visit < ${cutoff} OR last_visit IS NULL
              ORDER BY last_visit ASC
              LIMIT 50`,
        );
      } catch {
        return { tasksCreated: 0 };
      }
    }

    if (overduePatients.length === 0) return { tasksCreated: 0 };

    let llm: any = null;
    try {
      llm = await getLLMWithFallback();
    } catch {
      /* use template */
    }

    let processed = 0;
    const globalDb = getDb();
    const recalledPatientIds: string[] = [];

    for (const patient of overduePatients) {
      const name = patient.first_name ?? "Valued Patient";
      const monthsAgo = patient.last_visit
        ? Math.floor(
            (Date.now() - new Date(patient.last_visit).getTime()) /
              (30 * 24 * 60 * 60 * 1000),
          )
        : null;

      let message: string;
      if (llm) {
        try {
          const resp = await llm.complete({
            system: `You are a friendly dental receptionist writing a personalized patient recall message.
Keep it warm, brief (2–3 sentences), and professional. Do not be pushy.
Output only the message text.`,
            prompt: `Write a recall SMS/email for patient ${name}${monthsAgo ? ` (last visit ~${monthsAgo} months ago)` : " (no prior visit on record)"}.
Ask them to book their next hygiene appointment.`,
            maxTokens: 150,
            temperature: 0.5,
          });
          message = resp.content;
        } catch {
          message = buildTemplateRecall(name);
        }
      } else {
        message = buildTemplateRecall(name);
      }

      try {
        await globalDb.insert(agentTasks).values({
          tenantId,
          agentId: "recall",
          taskType: "recall_message",
          patientId: patient.id,
          patientName:
            `${patient.first_name ?? ""} ${patient.last_name ?? ""}`.trim(),
          content: message,
          status: "pending",
          metadata: JSON.stringify({
            tablePrefix,
            email: patient.email,
            phone: patient.phone,
            lastVisit: patient.last_visit,
          }),
        });
        recalledPatientIds.push(patient.id);
        processed++;
      } catch (err) {
        console.error("[RecallAgent] Failed to save task:", err);
      }
    }

    if (recalledPatientIds.length > 0) {
      ctx.emit("patient_recalled", { patientIds: recalledPatientIds });
    }

    return { tasksCreated: processed };
  },
};

/** @deprecated Use recallAgent.run() via the registry */
export async function runRecallAgent(
  tenantId: string,
  tablePrefix: string,
): Promise<number> {
  const bus = new (await import("@dentaliq/agent-core")).CycleEventBus();
  const result = await recallAgent.run({
    tenantId,
    tablePrefix,
    clinicId: "default",
    db: null,
    llm: null,
    emit: (type, payload) =>
      bus.emit(type, "recall", tenantId, "default", payload),
    getEvents: (type) => bus.getEvents(type),
  });
  return result.tasksCreated;
}

function buildTemplateRecall(name: string): string {
  return `Hi ${name}, it's time for your hygiene check-up at our clinic! We'd love to see you again — please call us or visit our website to book your next appointment. We hope to see you soon!`;
}
