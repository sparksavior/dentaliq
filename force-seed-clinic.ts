import { createClient } from "@libsql/client";
import { getDb, tenants } from "@dentaliq/db";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
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
  const tablePrefix = demoTenant.schemaName;

  // 2. Ensure clinic exists
  let clinicId;
  try {
    const clinicsRes = await client.execute(
      `SELECT id FROM "${tablePrefix}_clinic_locations" LIMIT 1`,
    );
    clinicId = clinicsRes.rows[0]?.id;
  } catch (err) {
    // table might not exist
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "${tablePrefix}_clinic_locations" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        email TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        operating_hours TEXT,
        pms_type TEXT DEFAULT 'none',
        pms_connected INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  if (!clinicId) {
    clinicId = createId();
    await client.execute(`
      INSERT INTO "${tablePrefix}_clinic_locations" (id, name, status) 
      VALUES ('${clinicId}', 'Demo Dental Clinic', 'active')
    `);
    console.log("Created missing clinic:", clinicId);
  } else {
    console.log("Found existing clinic:", clinicId);
  }

  // 3. Update all NULL clinic_ids to this clinicId
  await client.execute(
    `UPDATE "${tablePrefix}_patients" SET clinic_id = '${clinicId}'`,
  );
  console.log("Updated patients with clinic_id");

  await client.execute(
    `UPDATE "${tablePrefix}_estimates" SET clinic_id = '${clinicId}'`,
  );
  console.log("Updated estimates with clinic_id");

  console.log(
    "Successfully fixed orphaned data! All data is now linked to the clinic.",
  );
}

main();
