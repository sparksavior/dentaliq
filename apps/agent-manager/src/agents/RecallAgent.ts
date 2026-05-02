import { getDb } from "@dentaliq/db";
import { sql } from "drizzle-orm";

export async function runRecallAgent(
  tenantId: string,
  tablePrefix: string,
): Promise<number> {
  console.log(`[RecallAgent] Starting scan for clinic: ${tablePrefix}`);
  const db = getDb() as any;

  try {
    const rows = await db.all(
      sql.raw(`SELECT id, first_name FROM "${tablePrefix}_patients" LIMIT 5`),
    );

    // Simulate finding overdue patients and sending recall SMS/Email
    let processed = 0;
    for (const patient of rows) {
      console.log(
        `[RecallAgent] drafting recall message for ${patient.first_name}...`,
      );
      processed++;
    }

    console.log(
      `[RecallAgent] Scan complete for ${tablePrefix}: ${processed} patients processed`,
    );
    return processed;
  } catch (err) {
    console.log(
      `[RecallAgent] Error or no patients table found for ${tablePrefix}`,
    );
    return 0;
  }
}
