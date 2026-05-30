import { createClient } from "@libsql/client";
import path from "path";

async function main() {
  const dbPath = path.resolve(__dirname, "./dentaliq.db");
  const client = createClient({ url: `file:${dbPath}` });

  try {
    const patientsRes = await client.execute(
      `SELECT COUNT(*) as c FROM "tenant_demo0001_patients"`,
    );
    console.log("Patients in DB:", patientsRes.rows[0].c);

    const estimatesRes = await client.execute(
      `SELECT COUNT(*) as c FROM "tenant_demo0001_estimates"`,
    );
    console.log("Estimates in DB:", estimatesRes.rows[0].c);

    // Let's also check if there's a clinic_id filter applied by the app
    const clinicCheck = await client.execute(
      `SELECT DISTINCT clinic_id FROM "tenant_demo0001_patients"`,
    );
    console.log(
      "Distinct clinic IDs in patients:",
      clinicCheck.rows.map((r) => r.clinic_id),
    );

    const clinicCheckEst = await client.execute(
      `SELECT DISTINCT clinic_id FROM "tenant_demo0001_estimates"`,
    );
    console.log(
      "Distinct clinic IDs in estimates:",
      clinicCheckEst.rows.map((r) => r.clinic_id),
    );
  } catch (error) {
    console.error("Query failed:", error);
  }
}
main();
