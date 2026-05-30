import { getDb, tenants } from "@dentaliq/db";
import { sql } from "drizzle-orm";
import { createLogger } from "@dentaliq/logger";

const logger = createLogger("check-schemas");

async function main() {
  try {
    const db = getDb();
    const dbAny = db as any;

    // Get all tenants
    const allTenants = await db.select().from(tenants);

    console.log("\n📊 All Tenants:");
    for (const t of allTenants) {
      console.log(`\n   ${t.name}`);
      console.log(`   - ID: ${t.id}`);
      console.log(`   - Schema: ${t.schemaName}`);
      console.log(`   - Plan: ${t.plan}`);

      // Check if tables exist and count data
      const patientTable = `${t.schemaName}_patients`;
      const estimateTable = `${t.schemaName}_estimates`;

      try {
        const patientResult = await dbAny.run(
          sql.raw(`SELECT COUNT(*) as count FROM "${patientTable}" LIMIT 1`),
        );
        const patientCount = patientResult?.[0]?.count ?? 0;
        const estimateResult = await dbAny.run(
          sql.raw(`SELECT COUNT(*) as count FROM "${estimateTable}" LIMIT 1`),
        );
        const estimateCount = estimateResult?.[0]?.count ?? 0;

        console.log(`   - Patients: ${patientCount}`);
        console.log(`   - Estimates: ${estimateCount}`);
      } catch (err: any) {
        console.log(`   - Tables: Not found (${err.message?.split("\n")[0]})`);
      }
    }

    console.log(`\n✨ Schema check complete!\n`);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();
