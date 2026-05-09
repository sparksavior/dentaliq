// ─────────────────────────────────────────────────────────
// Cortex Recall Agent
//
// Finds patients whose last estimate was > 6 months ago
// (hygiene recall window), generates personalised recall
// messages via LLM, and queues them as PENDING REVIEW tasks.
// ─────────────────────────────────────────────────────────

import { getDb, agentTasks } from "@dentaliq/db";
import { getLLMWithFallback } from "@dentaliq/llm-interface";
import { sql } from "drizzle-orm";

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

export async function runRecallAgent(
  tenantId: string,
  tablePrefix: string,
): Promise<number> {
  const db = getDb() as any;
  const cutoff = new Date(Date.now() - SIX_MONTHS_MS).toISOString();

  let overduePatients: any[] = [];
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
    return 0;
  }

  if (overduePatients.length === 0) return 0;

  let llm: Awaited<ReturnType<typeof getLLMWithFallback>> | null = null;
  try {
    llm = await getLLMWithFallback();
  } catch {
    /* use template */
  }

  let processed = 0;
  const globalDb = getDb();

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
      processed++;
    } catch (err) {
      console.error("[RecallAgent] Failed to save task:", err);
    }
  }

  return processed;
}

function buildTemplateRecall(name: string): string {
  return `Hi ${name}, it's time for your hygiene check-up at our clinic! We'd love to see you again — please call us or visit our website to book your next appointment. We hope to see you soon!`;
}
