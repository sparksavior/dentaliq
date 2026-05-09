import { getDb, agentTasks } from "@dentaliq/db";
import { getLLMWithFallback } from "@dentaliq/llm-interface";
import { sql } from "drizzle-orm";
import type { AgentDefinition, AgentContext } from "@dentaliq/agent-core";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const DEFAULT_SUPPLY_MAP: Record<string, string[]> = {
  D1: ["Prophylaxis paste", "Fluoride varnish", "Prophy cups"],
  D2: ["Composite resin", "Bonding agent", "Matrix bands"],
  D3: ["Endodontic files", "Irrigation syringes", "Gutta-percha"],
  D4: ["Periodontal dressings", "Sutures", "Retraction cord"],
  D5: ["Denture base resin", "Impression trays"],
  D6: ["Implant components", "Abutment screws"],
  D7: ["Surgical sutures", "Hemostatic gauze", "Burs"],
  D8: ["Elastic ligatures", "Brackets", "Archwires"],
};

let _supplyMapCache: Record<string, string[]> | null = null;

async function loadSupplyMap(): Promise<Record<string, string[]>> {
  if (_supplyMapCache) return _supplyMapCache;

  const db = getDb() as any;

  try {
    await db.run(
      sql.raw(`
      CREATE TABLE IF NOT EXISTS cdt_supply_map (
        id TEXT PRIMARY KEY,
        cdt_prefix TEXT NOT NULL UNIQUE,
        supplies TEXT NOT NULL,
        notes TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `),
    );
  } catch {
    /* already exists */
  }

  let rows: any[] = [];
  try {
    rows = await db.all(
      sql.raw(`SELECT cdt_prefix, supplies FROM cdt_supply_map`),
    );
  } catch {
    /* noop */
  }

  if (rows.length === 0) {
    for (const [prefix, supplies] of Object.entries(DEFAULT_SUPPLY_MAP)) {
      try {
        await db.run(
          sql.raw(`
          INSERT OR IGNORE INTO cdt_supply_map (id, cdt_prefix, supplies, updated_at)
          VALUES (
            '${Math.random().toString(36).slice(2)}',
            '${prefix}',
            '${JSON.stringify(supplies)}',
            '${new Date().toISOString()}'
          )
        `),
        );
      } catch {
        /* skip */
      }
    }
    rows = await db
      .all(sql.raw(`SELECT cdt_prefix, supplies FROM cdt_supply_map`))
      .catch(() => []);
  }

  _supplyMapCache = {};
  for (const row of rows) {
    try {
      _supplyMapCache[row.cdt_prefix] = JSON.parse(row.supplies);
    } catch {
      /* malformed JSON — skip */
    }
  }

  return _supplyMapCache;
}

export const supplyAgent: AgentDefinition = {
  id: "supply",
  name: "Supply Agent",
  version: "1.0.0",
  priority: 50,
  async run(ctx: AgentContext): Promise<{ tasksCreated: number }> {
    const { tenantId, tablePrefix } = ctx;
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
      return { tasksCreated: 0 };
    }

    if (procedureVolume.length === 0) return { tasksCreated: 0 };

    const categoryCounts: Record<string, number> = {};
    for (const row of procedureVolume) {
      const prefix = (row.cdt_code as string).substring(0, 2).toUpperCase();
      categoryCounts[prefix] = (categoryCounts[prefix] ?? 0) + row.count;
    }

    const highVolume = Object.entries(categoryCounts)
      .filter(([, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (highVolume.length === 0) return { tasksCreated: 0 };

    let llm: any = null;
    try {
      llm = await getLLMWithFallback();
    } catch {
      /* use template */
    }

    const supplyMap = await loadSupplyMap();
    const globalDb = getDb();
    let processed = 0;

    for (const [prefix, count] of highVolume) {
      const supplies = supplyMap[prefix] ?? [`${prefix}-series supplies`];
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

    return { tasksCreated: processed };
  },
};

/** @deprecated Use supplyAgent.run() via the registry */
export async function runSupplyAgent(
  tenantId: string,
  tablePrefix: string,
): Promise<number> {
  const bus = new (await import("@dentaliq/agent-core")).CycleEventBus();
  const result = await supplyAgent.run({
    tenantId,
    tablePrefix,
    clinicId: "default",
    db: null,
    llm: null,
    emit: (type, payload) =>
      bus.emit(type, "supply", tenantId, "default", payload),
    getEvents: (type) => bus.getEvents(type),
  });
  return result.tasksCreated;
}

function buildTemplateSupply(
  prefix: string,
  count: number,
  supplies: string[],
): string {
  return `Based on ${count} ${prefix}-series procedures in the last 30 days, consider restocking: ${supplies.join(", ")}. Review current inventory levels and place orders for items below minimum threshold. Contact your preferred supplier for next-day delivery if stock is critically low.`;
}
