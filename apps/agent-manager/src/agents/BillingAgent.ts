import { getDb, agentTasks } from "@dentaliq/db";
import { getLLMWithFallback } from "@dentaliq/llm-interface";
import { sql } from "drizzle-orm";
import type { AgentDefinition, AgentContext } from "@dentaliq/agent-core";

export const billingAgent: AgentDefinition = {
  id: "billing",
  name: "Billing Agent",
  version: "1.0.0",
  priority: 20,
  emits: ["high_risk_unaccepted_treatment"],
  async run(ctx: AgentContext): Promise<{ tasksCreated: number }> {
    const { tenantId, tablePrefix } = ctx;
    const db = getDb() as any;
    let highRiskItems: any[] = [];

    try {
      highRiskItems = await db.all(
        sql`SELECT e.id, e.cdt_code, e.claim_risk, e.patient_id, e.plain_explanation,
               p.first_name, p.last_name
          FROM ${sql.raw(`"${tablePrefix}_estimates"`)} e
          LEFT JOIN ${sql.raw(`"${tablePrefix}_patients"`)} p ON e.patient_id = p.id
          WHERE e.claim_risk IN ('high', 'medium')
            AND (e.pre_auth_letter IS NULL OR e.pre_auth_letter = '')
          ORDER BY e.created_at DESC
          LIMIT 20`,
      );
    } catch {
      return { tasksCreated: 0 };
    }

    if (highRiskItems.length === 0) return { tasksCreated: 0 };

    // Emit so TreatmentCoordinatorAgent can follow up on high-risk unaccepted plans
    ctx.emit("high_risk_unaccepted_treatment", {
      items: highRiskItems.map((item: any) => ({
        estimateId: item.id,
        cdtCode: item.cdt_code,
        patientId: item.patient_id,
        claimRisk: item.claim_risk,
      })),
    });

    let llm: any = null;
    try {
      llm = await getLLMWithFallback();
    } catch {
      /* use template */
    }

    let processed = 0;
    const globalDb = getDb();

    for (const item of highRiskItems) {
      const patientName =
        item.first_name && item.last_name
          ? `${item.first_name} ${item.last_name}`
          : "the patient";

      let narrative: string;
      if (llm) {
        try {
          const resp = await llm.complete({
            system: `You are a dental insurance billing specialist writing professional pre-authorization letters.
Be concise, clinically accurate, and address the letter to "Claims Review Team".
Output only the letter text — no preamble or extra commentary.`,
            prompt: `Write a pre-authorization letter for:
- CDT Code: ${item.cdt_code}
- Patient: ${patientName}
- Risk Level: ${item.claim_risk}
- Clinical Context: ${item.plain_explanation || "Standard dental procedure"}

Include clinical findings, diagnosis, and medical necessity (200–300 words).`,
            maxTokens: 500,
            temperature: 0.3,
          });
          narrative = resp.content;
        } catch {
          narrative = buildTemplateLetter(item.cdt_code, patientName);
        }
      } else {
        narrative = buildTemplateLetter(item.cdt_code, patientName);
      }

      try {
        await globalDb.insert(agentTasks).values({
          tenantId,
          agentId: "billing",
          taskType: "pre_auth_letter",
          cdtCode: item.cdt_code,
          patientId: item.patient_id ?? null,
          patientName,
          riskLevel: item.claim_risk,
          content: narrative,
          status: "pending",
          metadata: JSON.stringify({ estimateId: item.id, tablePrefix }),
        });

        await db.run(
          sql`UPDATE ${sql.raw(`"${tablePrefix}_estimates"`)}
              SET pre_auth_letter = ${"[CORTEX DRAFT — REVIEW IN INBOX]"}
              WHERE id = ${item.id}`,
        );

        processed++;
      } catch (err) {
        console.error(
          `[BillingAgent] Failed to save task for ${item.cdt_code}:`,
          err,
        );
      }
    }

    return { tasksCreated: processed };
  },
};

/** @deprecated Use billingAgent.run() via the registry */
export async function runBillingAgent(
  tenantId: string,
  tablePrefix: string,
): Promise<number> {
  const bus = new (await import("@dentaliq/agent-core")).CycleEventBus();
  const result = await billingAgent.run({
    tenantId,
    tablePrefix,
    clinicId: "default",
    db: null,
    llm: null,
    emit: (type, payload) =>
      bus.emit(type, "billing", tenantId, "default", payload),
    getEvents: (type) => bus.getEvents(type),
  });
  return result.tasksCreated;
}

function buildTemplateLetter(cdtCode: string, patientName: string): string {
  return `[TEMPLATE — LLM UNAVAILABLE — REQUIRES MANUAL EDIT]

Dear Claims Review Team,

We are submitting a pre-authorization request for procedure ${cdtCode} for our patient, ${patientName}.

Clinical findings and medical necessity documentation are attached with this request. Please refer to the enclosed clinical notes and radiographs for full supporting documentation.

We believe this procedure is clinically necessary and respectfully request your timely review.

Sincerely,
[Treating Dentist — Signature Required]

Generated: ${new Date().toISOString()}`;
}
