import { getDb, agentTasks } from "@dentaliq/db";
import { getLLMWithFallback } from "@dentaliq/llm-interface";
import { sql } from "drizzle-orm";
import type { AgentDefinition, AgentContext } from "@dentaliq/agent-core";

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export const treatmentCoordinatorAgent: AgentDefinition = {
  id: "treatment",
  name: "Treatment Coordinator Agent",
  version: "1.0.0",
  priority: 40,
  triggers: ["high_risk_unaccepted_treatment"],
  async run(ctx: AgentContext): Promise<{ tasksCreated: number }> {
    const { tenantId, tablePrefix } = ctx;
    const db = getDb() as any;
    const cutoff = new Date(Date.now() - FOURTEEN_DAYS_MS).toISOString();

    // If BillingAgent already surfaced high-risk items, skip patients already in that set
    const billingEvents = ctx.getEvents("high_risk_unaccepted_treatment");
    const billingPatientIds = new Set<string>(
      billingEvents
        .flatMap((e) => (e.payload.items as any[]) ?? [])
        .map((i: any) => i.patientId)
        .filter(Boolean),
    );

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
      return { tasksCreated: 0 };
    }

    if (unacceptedPlans.length === 0) return { tasksCreated: 0 };

    // One follow-up per patient; skip patients already handled by BillingAgent this cycle
    const seenPatients = new Set<string>();
    const toProcess = unacceptedPlans.filter((row: any) => {
      if (!row.patient_id || seenPatients.has(row.patient_id)) return false;
      if (billingPatientIds.has(row.patient_id)) return false;
      seenPatients.add(row.patient_id);
      return true;
    });

    if (toProcess.length === 0) return { tasksCreated: 0 };

    let llm: any = null;
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
          patientName:
            `${plan.first_name ?? ""} ${plan.last_name ?? ""}`.trim(),
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

    return { tasksCreated: processed };
  },
};

/** @deprecated Use treatmentCoordinatorAgent.run() via the registry */
export async function runTreatmentCoordinatorAgent(
  tenantId: string,
  tablePrefix: string,
): Promise<number> {
  const bus = new (await import("@dentaliq/agent-core")).CycleEventBus();
  const result = await treatmentCoordinatorAgent.run({
    tenantId,
    tablePrefix,
    clinicId: "default",
    db: null,
    llm: null,
    emit: (type, payload) =>
      bus.emit(type, "treatment", tenantId, "default", payload),
    getEvents: (type) => bus.getEvents(type),
  });
  return result.tasksCreated;
}

function buildTemplateFollowup(
  name: string,
  cdtCode: string,
  cost: string,
): string {
  return `Hi ${name}, we wanted to follow up on the treatment plan we discussed for procedure ${cdtCode}. We understand that dental decisions take time, and we're here to answer any questions you may have about the procedure or your estimated cost of ${cost}. Please don't hesitate to reach out — we'd be happy to walk you through your options.`;
}
