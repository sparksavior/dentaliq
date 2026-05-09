// ─────────────────────────────────────────────────────────
// Cortex Supply Agent
//
// Analyses procedure volume from estimates to identify
// high-frequency CDT codes (proxy for supply consumption),
// then generates reorder recommendations as agent tasks.
// ─────────────────────────────────────────────────────────

import { getDb, agentTasks } from "@dentaliq/db";
import { getLLMWithFallback } from "@dentaliq/llm-interface";
import { sql } from "drizzle-orm";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Supply categories inferred from CDT code prefixes
const SUPPLY_MAP: Record<string, string[]> = {
  D1: ["Prophylaxis paste", "Fluoride varnish", "Prophy cups"],
  D2: ["Composite resin", "Bonding agent", "Matrix bands"],
  D3: ["Endodontic files", "Irrigation syringes", "Gutta-percha"],
  D4: ["Periodontal dressings", "Sutures", "Retraction cord"],
  D5: ["Denture base resin", "Impression trays"],
  D6: ["Implant components", "Abutment screws"],
  D7: ["Surgical sutures", "Hemostatic gauze", "Burs"],
  D8: ["Elastic ligatures", "Brackets", "Archwires"],
};

export async function runSupplyAgent(
  tenantId: string,
  tablePrefix: string,
): Promise<number> {
  const db = getDb() as any;
  const since = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

  let procedureVolume: any[] = [];
  try {
    procedureVolume = await db.all(
      sql`SELECT cdt_code, COUNT(*) as count
          FROM ${sql.raw(`"${tablePrefix}_estimates"`)}
          WHERE created_at >= ${since}
          GROUP BY cdt_code
          ORDER BY count DESC
          LIMIT 20`,
    );
  } catch {
    return 0;
  }

  if (procedureVolume.length === 0) return 0;

  // Identify top categories by volume
  const categoryCounts: Record<string, number> = {};
  for (const row of procedureVolume) {
    const prefix = (row.cdt_code as string).substring(0, 2).toUpperCase();
    categoryCounts[prefix] = (categoryCounts[prefix] ?? 0) + row.count;
  }

  // Flag categories with >10 procedures as potentially needing restock
  const highVolume = Object.entries(categoryCounts)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (highVolume.length === 0) return 0;

  let llm: Awaited<ReturnType<typeof getLLMWithFallback>> | null = null;
  try {
    llm = await getLLMWithFallback();
  } catch {
    /* use template */
  }

  const globalDb = getDb();
  let processed = 0;

  for (const [prefix, count] of highVolume) {
    const supplies = SUPPLY_MAP[prefix] ?? [`${prefix}-series supplies`];
    let recommendation: string;

    if (llm) {
      try {
        const resp = await llm.complete({
          system:
            "You are a dental supply coordinator. Write a brief supply reorder recommendation.",
          prompt: `Based on ${count} ${prefix}-series procedures performed in the last 30 days, recommend which supplies to reorder.
Common supplies for this category: ${supplies.join(", ")}.
Write 2–3 sentences with specific quantities.`,
          maxTokens: 150,
          temperature: 0.3,
        });
        recommendation = resp.content;
      } catch {
        recommendation = buildTemplateSupply(prefix, count, supplies);
      }
    } else {
      recommendation = buildTemplateSupply(prefix, count, supplies);
    }

    try {
      await globalDb.insert(agentTasks).values({
        tenantId,
        agentId: "supply",
        taskType: "supply_order",
        content: recommendation,
        status: "pending",
        metadata: JSON.stringify({
          tablePrefix,
          cdtPrefix: prefix,
          procedureCount: count,
          supplies,
          period: "30d",
        }),
      });
      processed++;
    } catch (err) {
      console.error("[SupplyAgent] Failed to save task:", err);
    }
  }

  return processed;
}

function buildTemplateSupply(
  prefix: string,
  count: number,
  supplies: string[],
): string {
  return `Based on ${count} ${prefix}-series procedures in the last 30 days, consider restocking: ${supplies.join(", ")}. Review current inventory levels and place orders for items below minimum threshold. Contact your preferred supplier for next-day delivery if stock is critically low.`;
}
