// ─────────────────────────────────────────────────────────
// Cortex Treatment Coordinator Agent
//
// Finds high-value estimates (major/ortho/implant) that were
// created but have no follow-up activity in the last 14 days,
// then drafts personalised follow-up messages to re-engage patients.
// ─────────────────────────────────────────────────────────

import { getDb, agentTasks } from "@dentaliq/db";
import { getLLMWithFallback } from "@dentaliq/llm-interface";
import { sql } from "drizzle-orm";

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export async function runTreatmentCoordinatorAgent(
  tenantId: string,
  tablePrefix: string,
): Promise<number> {
  const db = getDb() as any;
  const cutoff = new Date(Date.now() - FOURTEEN_DAYS_MS).toISOString();

  // Find high-value unaccepted estimates (no pre_auth_letter set = not started)
  let unacceptedPlans: any[] = [];
  try {
    unacceptedPlans = await db.all(
      sql`SELECT e.id, e.cdt_code, e.patient_cost, e.claim_risk, e.plain_explanation,
               p.id as patient_id, p.first_name, p.last_name, p.email,
               e.created_at
          FROM ${sql.raw(`"${tablePrefix}_estimates"`)} e
          LEFT JOIN ${sql.raw(`"${tablePrefix}_patients"`)} p ON e.patient_id = p.id
          WHERE e.created_at <= ${cutoff}
            AND e.claim_risk IN ('high', 'medium')
            AND (e.pre_auth_letter IS NULL OR e.pre_auth_letter = '')
          ORDER BY e.patient_cost DESC
          LIMIT 20`,
    );
  } catch {
    return 0;
  }

  if (unacceptedPlans.length === 0) return 0;

  // Deduplicate by patient (one follow-up per patient)
  const seenPatients = new Set<string>();
  const toProcess = unacceptedPlans.filter((row: any) => {
    if (!row.patient_id || seenPatients.has(row.patient_id)) return false;
    seenPatients.add(row.patient_id);
    return true;
  });

  let llm: Awaited<ReturnType<typeof getLLMWithFallback>> | null = null;
  try {
    llm = await getLLMWithFallback();
  } catch {
    /* use template */
  }

  let processed = 0;
  const globalDb = getDb();

  for (const plan of toProcess) {
    const name = plan.first_name ?? "Valued Patient";
    const estimatedCost = plan.patient_cost
      ? `$${Math.round(plan.patient_cost)}`
      : "the estimated cost";
    let message: string;

    if (llm) {
      try {
        const resp = await llm.complete({
          system: `You are a warm dental treatment coordinator following up on a patient's treatment plan.
Be empathetic, informative, and never pushy. Output only the message text.`,
          prompt: `Write a follow-up message for patient ${name} about CDT procedure ${plan.cdt_code}
(their estimated out-of-pocket cost is ${estimatedCost}). The estimate is 2 weeks old.
Context: ${plan.plain_explanation || "Dental treatment requiring attention"}`,
          maxTokens: 180,
          temperature: 0.5,
        });
        message = resp.content;
      } catch {
        message = buildTemplateFollowup(name, plan.cdt_code, estimatedCost);
      }
    } else {
      message = buildTemplateFollowup(name, plan.cdt_code, estimatedCost);
    }

    try {
      await globalDb.insert(agentTasks).values({
        tenantId,
        agentId: "treatment",
        taskType: "treatment_followup",
        cdtCode: plan.cdt_code,
        patientId: plan.patient_id,
        patientName: `${plan.first_name ?? ""} ${plan.last_name ?? ""}`.trim(),
        riskLevel: plan.claim_risk,
        content: message,
        status: "pending",
        metadata: JSON.stringify({
          tablePrefix,
          estimateId: plan.id,
          patientCost: plan.patient_cost,
          email: plan.email,
        }),
      });
      processed++;
    } catch (err) {
      console.error("[TreatmentCoordinatorAgent] Failed to save task:", err);
    }
  }

  return processed;
}

function buildTemplateFollowup(
  name: string,
  cdtCode: string,
  cost: string,
): string {
  return `Hi ${name}, we wanted to follow up on the treatment plan we discussed for procedure ${cdtCode}. We understand that dental decisions take time, and we're here to answer any questions you may have about the procedure or your estimated cost of ${cost}. Please don't hesitate to reach out — we'd be happy to walk you through your options.`;
}
