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

  const dbPath = path.resolve(__dirname, "./dentaliq.db");
  const client = createClient({ url: `file:${dbPath}` });
  const tablePrefix = demoTenant.schemaName;

  // Verify clinic ID
  const clinicsRes = await client.execute(
    `SELECT id FROM "${tablePrefix}_clinic_locations"`,
  );
  console.log(
    "Clinics:",
    clinicsRes.rows.map((r) => r.id),
  );

  const p = await client.execute(
    `SELECT clinic_id, COUNT(*) as c FROM "${tablePrefix}_patients" GROUP BY clinic_id`,
  );
  console.log("Patients grouped by clinic_id:", p.rows);

  const e = await client.execute(
    `SELECT clinic_id, COUNT(*) as c FROM "${tablePrefix}_estimates" GROUP BY clinic_id`,
  );
  console.log("Estimates grouped by clinic_id:", e.rows);
}

main();
