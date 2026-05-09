import { getDb, procedures } from "@dentaliq/db";
import { CDT_DATABASE } from "../src/data/cdt-codes";

async function seed() {
  const db = getDb() as any;
  console.log("Seeding procedure codes from hardcoded data...");

  // Ensure table exists
  await db.run(`
    CREATE TABLE IF NOT EXISTS procedures (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      typical_fee REAL NOT NULL,
      requires_xray INTEGER NOT NULL DEFAULT 0,
      requires_pre_auth INTEGER NOT NULL DEFAULT 0,
      frequency_limit_months INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const codes = Object.values(CDT_DATABASE);
  let count = 0;

  for (const item of codes) {
    try {
      await db
        .insert(procedures)
        .values({
          code: item.code,
          description: item.description,
          category: item.category as any,
          typicalFee: item.typicalFee,
          requiresXray: item.requiresXray,
          requiresPreAuth: item.requiresPreAuth,
          frequencyLimitMonths: item.frequencyLimitMonths,
          notes: item.notes,
        })
        .onConflictDoUpdate({
          target: procedures.code,
          set: {
            description: item.description,
            typicalFee: item.typicalFee,
            updatedAt: new Date().toISOString(),
          },
        });
      count++;
    } catch (err) {
      console.error(`Failed to seed ${item.code}:`, err);
    }
  }

  console.log(`Successfully seeded ${count} procedure codes.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
