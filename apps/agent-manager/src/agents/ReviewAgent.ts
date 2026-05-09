import { getDb, agentTasks } from "@dentaliq/db";
import { getLLMWithFallback } from "@dentaliq/llm-interface";
import { sql } from "drizzle-orm";
import type { AgentDefinition, AgentContext } from "@dentaliq/agent-core";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const reviewAgent: AgentDefinition = {
  id: "review",
  name: "Review Agent",
  version: "1.0.0",
  priority: 40,
  triggers: ["patient_recalled"],
  async run(ctx: AgentContext): Promise<{ tasksCreated: number }> {
    const { tenantId, tablePrefix } = ctx;
    const db = getDb() as any;
    const since = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

    // Patients recalled this cycle are good candidates for a review request too
    const recalledEvents = ctx.getEvents("patient_recalled");
    const recalledIds = new Set<string>(
      recalledEvents.flatMap((e) => (e.payload.patientIds as string[]) ?? []),
    );

    let recentPatients: any[] = [];
    try {
      recentPatients = await db.all(
        sql`SELECT DISTINCT p.id, p.first_name, p.last_name, p.email, MAX(e.created_at) as last_visit
            FROM ${sql.raw(`"${tablePrefix}_patients"`)} p
            INNER JOIN ${sql.raw(`"${tablePrefix}_estimates"`)} e ON e.patient_id = p.id
            WHERE e.created_at >= ${since}
            GROUP BY p.id
            ORDER BY last_visit DESC
            LIMIT 30`,
      );
    } catch {
      return { tasksCreated: 0 };
    }

    if (recentPatients.length === 0) return { tasksCreated: 0 };

    // Avoid sending duplicates — skip patients already queued this week
    let existingTaskPatientIds: string[] = [];
    try {
      const existing = await db.all(
        sql`SELECT patient_id FROM agent_tasks
            WHERE tenant_id = ${tenantId} AND task_type = 'review_request'
              AND created_at >= ${since}`,
      );
      existingTaskPatientIds = (existing ?? [])
        .map((r: any) => r.patient_id)
        .filter(Boolean);
    } catch {
      /* agent_tasks may not exist yet */
    }

    // Skip patients recalled this cycle — they're mid-funnel, not post-visit
    const toProcess = recentPatients.filter(
      (p: any) =>
        !existingTaskPatientIds.includes(p.id) && !recalledIds.has(p.id),
    );
    if (toProcess.length === 0) return { tasksCreated: 0 };

    let llm: any = null;
    try {
      llm = await getLLMWithFallback();
    } catch {
      /* use template */
    }

    let processed = 0;
    const globalDb = getDb();

    for (const patient of toProcess) {
      const name = patient.first_name ?? "Valued Patient";
      let message: string;

      if (llm) {
        try {
          const resp = await llm.complete({
            system: `You are a friendly dental clinic coordinator writing a review request.
Keep it warm, brief (2–3 sentences). Do not beg — just express that feedback is appreciated.
Output only the message text.`,
            prompt: `Write a short review request for patient ${name} who recently visited our dental clinic.`,
            maxTokens: 120,
            temperature: 0.6,
          });
          message = resp.content;
        } catch {
          message = buildTemplateReview(name);
        }
      } else {
        message = buildTemplateReview(name);
      }

      try {
        await globalDb.insert(agentTasks).values({
          tenantId,
          agentId: "review",
          taskType: "review_request",
          patientId: patient.id,
          patientName:
            `${patient.first_name ?? ""} ${patient.last_name ?? ""}`.trim(),
          content: message,
          status: "pending",
          metadata: JSON.stringify({ tablePrefix, email: patient.email }),
        });
        processed++;
      } catch (err) {
        console.error("[ReviewAgent] Failed to save task:", err);
      }
    }

    return { tasksCreated: processed };
  },
};

/** @deprecated Use reviewAgent.run() via the registry */
export async function runReviewAgent(
  tenantId: string,
  tablePrefix: string,
): Promise<number> {
  const bus = new (await import("@dentaliq/agent-core")).CycleEventBus();
  const result = await reviewAgent.run({
    tenantId,
    tablePrefix,
    clinicId: "default",
    db: null,
    llm: null,
    emit: (type, payload) =>
      bus.emit(type, "review", tenantId, "default", payload),
    getEvents: (type) => bus.getEvents(type),
  });
  return result.tasksCreated;
}

function buildTemplateReview(name: string): string {
  return `Hi ${name}, thank you for visiting us! We'd really appreciate it if you could take a moment to share your experience. Your feedback helps us improve and helps other patients find quality dental care. Thank you so much!`;
}
