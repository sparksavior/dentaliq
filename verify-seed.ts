import { getDb, tenants } from "@dentaliq/db";
import { eq, sql } from "drizzle-orm";
import { createLogger } from "@dentaliq/logger";

const logger = createLogger("verify-seed");

async function main() {
  try {
    const db = getDb();

    // Get the demo tenant
    const demoTenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, "demo-clinic"))
      .limit(1);

    if (!demoTenant || demoTenant.length === 0) {
      console.log("❌ Demo tenant not found");
      process.exit(1);
    }

    const tenant = demoTenant[0];
    const tablePrefix = tenant.schemaName;

    console.log(`\n📊 Demo Tenant: ${tenant.name}`);
    console.log(`   Plan: ${tenant.plan}`);
    console.log(`   Schema: ${tablePrefix}`);

    const dbAny = db as any;

    // Count patients
    const patientResult = await dbAny.run(
      sql.raw(`SELECT COUNT(*) as count FROM "${tablePrefix}_patients"`),
    );
    const patientCount = patientResult?.[0]?.count ?? 0;
    console.log(`\n✅ Patients: ${patientCount}`);

    // Count estimates
    const estimateResult = await dbAny.run(
      sql.raw(`SELECT COUNT(*) as count FROM "${tablePrefix}_estimates"`),
    );
    const estimateCount = estimateResult?.[0]?.count ?? 0;
    console.log(`✅ Estimates: ${estimateCount}`);

    // Check columns in estimates table
    const columnsResult = await dbAny.run(
      sql.raw(`PRAGMA table_info("${tablePrefix}_estimates")`),
    );
    console.log(`\n📋 Estimate table columns:`);
    columnsResult?.forEach((col: any) => {
      console.log(`   - ${col.name} (${col.type})`);
    });

    // Sample data
    console.log(`\n👥 Sample patients:`);
    const samplePatients = await dbAny.run(
      sql.raw(
        `SELECT id, first_name, last_name, email FROM "${tablePrefix}_patients" LIMIT 3`,
      ),
    );
    samplePatients?.forEach((p: any) => {
      console.log(`   ${p.first_name} ${p.last_name} (${p.email})`);
    });

    console.log(`\n📋 Sample estimates:`);
    const sampleEstimates = await dbAny.run(
      sql.raw(
        `SELECT id, patient_id, cdt_code, patient_cost, insurer_pays, clinic_id FROM "${tablePrefix}_estimates" LIMIT 3`,
      ),
    );
    sampleEstimates?.forEach((e: any) => {
      console.log(
        `   ${e.cdt_code}: $${e.patient_cost} (insurer pays $${e.insurer_pays}, clinic_id: ${e.clinic_id})`,
      );
    });

    console.log(`\n✨ Data verification complete!\n`);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();
