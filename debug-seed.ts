import { getDb, tenants } from "@dentaliq/db";
import { eq, sql } from "drizzle-orm";
import { createLogger } from "@dentaliq/logger";

const logger = createLogger("debug-seed");

async function main() {
  try {
    const db = getDb();
    const dbAny = db as any;

    // Get demo tenant
    const [demoTenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, "demo-clinic"))
      .limit(1);

    if (!demoTenant) {
      console.log("❌ Demo tenant not found");
      process.exit(1);
    }

    const tablePrefix = demoTenant.schemaName;
    console.log(`\n📊 Demo Tenant: ${demoTenant.name}`);
    console.log(`   Schema: ${tablePrefix}`);

    // Check if tables exist
    const patientTable = `${tablePrefix}_patients`;
    const estimateTable = `${tablePrefix}_estimates`;

    // Try to query patient table structure
    try {
      const tableInfo = await dbAny.run(
        sql.raw(`PRAGMA table_info("${patientTable}")`),
      );
      console.log(
        `\n✅ Patients table exists with ${tableInfo.length} columns:`,
      );
      tableInfo.forEach((col: any) => {
        console.log(`   - ${col.name}`);
      });
    } catch (err: any) {
      console.log(`\n❌ Patients table error: ${err.message}`);
    }

    try {
      const tableInfo = await dbAny.run(
        sql.raw(`PRAGMA table_info("${estimateTable}")`),
      );
      console.log(
        `\n✅ Estimates table exists with ${tableInfo.length} columns:`,
      );
      tableInfo.forEach((col: any) => {
        console.log(`   - ${col.name}`);
      });
    } catch (err: any) {
      console.log(`\n❌ Estimates table error: ${err.message}`);
    }

    // Try to count records
    const patientCount = await dbAny.run(
      sql.raw(`SELECT COUNT(*) as count FROM "${patientTable}"`),
    );
    console.log(`\n👥 Patient records: ${patientCount?.[0]?.count ?? 0}`);

    const estimateCount = await dbAny.run(
      sql.raw(`SELECT COUNT(*) as count FROM "${estimateTable}"`),
    );
    console.log(`📋 Estimate records: ${estimateCount?.[0]?.count ?? 0}`);

    // Try to insert a test patient
    console.log(`\n🔧 Testing insert...`);
    try {
      const testId = "test-" + Date.now();
      await dbAny.run(
        sql.raw(
          `INSERT INTO "${patientTable}" (id, first_name, last_name) VALUES ('${testId}', 'Test', 'Patient')`,
        ),
      );
      console.log(`✅ Insert succeeded`);

      const count = await dbAny.run(
        sql.raw(`SELECT COUNT(*) as count FROM "${patientTable}"`),
      );
      console.log(`   New count: ${count?.[0]?.count ?? 0}`);
    } catch (err: any) {
      console.log(`❌ Insert failed: ${err.message}`);
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();
