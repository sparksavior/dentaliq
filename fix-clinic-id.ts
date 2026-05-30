import { createClient } from "@libsql/client";
import { getDb, tenants } from "@dentaliq/db";
import { eq } from "drizzle-orm";
import path from "path";

async function main() {
  const db = getDb();

  // 1. Get the demo tenant
  const [demoTenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, "demo-clinic"))
    .limit(1);

  if (!demoTenant) {
    console.error("Demo tenant not found");
    process.exit(1);
  }

  const dbPath = path.resolve(__dirname, "./dentaliq.db");
  const client = createClient({ url: `file:${dbPath}` });

  // 2. Check if the tenant has a clinic in the clinics table
  try {
    const tablePrefix = demoTenant.schemaName;
    const clinicsRes = await client.execute(
      `SELECT id FROM "${tablePrefix}_clinic_locations" LIMIT 1`,
    );
    const clinicId = clinicsRes.rows[0]?.id;

    if (!clinicId) {
      console.log("No clinic found for tenant, data will remain NULL");
      process.exit(0);
    }

    console.log("Found clinic ID:", clinicId);

    await client.execute(
      `UPDATE "${tablePrefix}_patients" SET clinic_id = '${clinicId}' WHERE clinic_id IS NULL`,
    );
    console.log("Updated patients");

    await client.execute(
      `UPDATE "${tablePrefix}_estimates" SET clinic_id = '${clinicId}' WHERE clinic_id IS NULL`,
    );
    console.log("Updated estimates");

    console.log("Successfully fixed orphaned data!");
  } catch (error) {
    console.error("Error:", error);
  }
}
main();
