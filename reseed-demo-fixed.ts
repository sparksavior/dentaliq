import bcrypt from "bcryptjs";
import { createId } from "@paralleldrive/cuid2";
import { createClient } from "@libsql/client";
import { getDb, users, tenants, refreshTokens } from "@dentaliq/db";
import { getEnv } from "@dentaliq/config";
import { createLogger } from "@dentaliq/logger";
import { eq } from "drizzle-orm";
import path from "path";

const logger = createLogger("reseed-demo-fixed");

async function main() {
  try {
    const db = getDb();

    // Get demo tenant
    const [demoTenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, "demo-clinic"))
      .limit(1);

    if (!demoTenant) {
      logger.error("Demo tenant not found");
      process.exit(1);
    }

    const tablePrefix = demoTenant.schemaName;
    logger.info(`📊 Using tenant: ${demoTenant.name} (${tablePrefix})`);

    // Create libsql client directly for reliable inserts
    const dbPath = path.resolve(__dirname, "./dentaliq.db");
    const url = `file:${dbPath}`;
    const client = createClient({ url });

    const patientTableName = `${tablePrefix}_patients`;
    const estimateTableName = `${tablePrefix}_estimates`;

    // Clear existing data
    logger.info("🗑️  Clearing existing data...");
    try {
      await client.execute(`DELETE FROM "${estimateTableName}"`);
      logger.info("✓ Cleared estimates");
    } catch (err: any) {
      logger.info("✓ Estimates already empty");
    }

    try {
      await client.execute(`DELETE FROM "${patientTableName}"`);
      logger.info("✓ Cleared patients");
    } catch (err: any) {
      logger.info("✓ Patients already empty");
    }

    // Sample data
    const INSURERS = [
      "Sun Life Financial",
      "Manulife",
      "Canada Life",
      "Green Shield Canada",
      "Desjardins",
      "OTIP/RAEO",
      "Empire Life",
      "Intact Insurance",
      "Co-operators",
      "TD Insurance",
    ];

    const CDT_CODES = [
      "D0120",
      "D1110",
      "D1120",
      "D1206",
      "D2391",
      "D2392",
      "D2393",
      "D2394",
      "D3110",
      "D3310",
      "D4341",
      "D4342",
      "D5110",
      "D5120",
      "D5210",
      "D5220",
      "D7140",
      "D7210",
      "D9012",
      "D9020",
      "D0210",
      "D0310",
      "D1320",
      "D2150",
      "D2160",
      "D2170",
      "D2161",
      "D2162",
      "D2240",
      "D2250",
      "D2260",
      "D2261",
      "D2262",
      "D2330",
      "D2331",
      "D2332",
      "D2333",
      "D2340",
      "D2341",
      "D2342",
      "D2350",
      "D2351",
      "D2352",
      "D2353",
      "D2354",
      "D2355",
      "D2360",
      "D2361",
      "D2362",
      "D2363",
      "D2364",
      "D2365",
      "D2366",
      "D2367",
      "D2368",
      "D2369",
    ];

    const FIRST_NAMES = [
      "James",
      "John",
      "Robert",
      "Michael",
      "William",
      "David",
      "Richard",
      "Joseph",
      "Thomas",
      "Charles",
      "Mary",
      "Patricia",
      "Jennifer",
      "Linda",
      "Barbara",
      "Elizabeth",
      "Susan",
      "Jessica",
      "Sarah",
      "Karen",
      "Nancy",
      "Lisa",
      "Betty",
      "Margaret",
      "Sandra",
      "Sarah",
      "Mohammed",
      "Ahmed",
      "Ali",
      "Chen",
      "Kumar",
      "Lopez",
      "Garcia",
      "Rodriguez",
      "Martinez",
    ];

    const LAST_NAMES = [
      "Smith",
      "Johnson",
      "Williams",
      "Brown",
      "Jones",
      "Garcia",
      "Miller",
      "Davis",
      "Rodriguez",
      "Martinez",
      "Hernandez",
      "Lopez",
      "Gonzalez",
      "Wilson",
      "Anderson",
      "Thomas",
      "Taylor",
      "Moore",
      "Jackson",
      "Martin",
      "Lee",
      "Perez",
      "Thompson",
      "White",
      "Harris",
      "Sanchez",
      "Clark",
      "Ramirez",
      "Lewis",
      "Robinson",
      "Walker",
      "Young",
      "Allen",
      "King",
    ];

    // Create 800 sample patients
    logger.info("👥 Creating 800 sample patients...");
    const patients = [];

    for (let i = 0; i < 800; i++) {
      const firstName =
        FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const lastName =
        LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const age = Math.floor(Math.random() * 80) + 6;
      const today = new Date();
      const dob = new Date(
        today.getFullYear() - age,
        Math.floor(Math.random() * 12),
        Math.floor(Math.random() * 28) + 1,
      );

      const insurer = INSURERS[Math.floor(Math.random() * INSURERS.length)];
      const patientId = createId();
      const phone = `+1 (${String(Math.floor(Math.random() * 900) + 100).padStart(3, "0")}) ${String(Math.floor(Math.random() * 900) + 100).padStart(3, "0")}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0")}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
      const dobStr = dob.toISOString().split("T")[0];

      try {
        await client.execute({
          sql: `INSERT INTO "${patientTableName}"
            (id, first_name, last_name, date_of_birth, phone, email, insurance_plan_id, clinic_id, created_at, updated_at)
          VALUES
            (?, ?, ?, ?, ?, ?, ?, NULL, datetime('now'), datetime('now'))`,
          args: [patientId, firstName, lastName, dobStr, phone, email, insurer],
        });
        patients.push(patientId);
      } catch (err: any) {
        logger.error({ err: err.message }, `Failed to insert patient ${i}`);
      }
    }

    logger.info(`✓ Created ${patients.length} patients`);

    // Create estimates for each patient
    logger.info("📋 Creating 3-5 estimates per patient...");
    let estimateCount = 0;

    for (const patientId of patients) {
      const estimatesPerPatient = Math.floor(Math.random() * 3) + 3;

      for (let e = 0; e < estimatesPerPatient; e++) {
        const daysAgo = Math.floor(Math.random() * 180);
        const estimateDate = new Date();
        estimateDate.setDate(estimateDate.getDate() - daysAgo);
        const createdAt = estimateDate.toISOString();

        const cdtCode = CDT_CODES[Math.floor(Math.random() * CDT_CODES.length)];
        const coveragePercent = Math.floor(Math.random() * 50) + 50;
        const patientCost = Math.floor(Math.random() * 2900) + 100;
        const insurerPays = Math.floor((patientCost * coveragePercent) / 100);
        const riskChoices = ["low", "medium", "high"];
        const claimRisk = riskChoices[Math.floor(Math.random() * 3)];
        const explanations = [
          `Standard ${cdtCode} procedure with typical coverage`,
          `Complex case requiring pre-authorization`,
          `Routine preventive procedure`,
          `Major restorative work`,
          `Cosmetic procedure with reduced coverage`,
          `Emergency treatment`,
        ];
        const explanation =
          explanations[Math.floor(Math.random() * explanations.length)];
        const estimateId = createId();

        try {
          await client.execute({
            sql: `INSERT INTO "${estimateTableName}"
              (id, patient_id, cdt_code, coverage_percent, patient_cost, insurer_pays, claim_risk, plain_explanation, pre_auth_letter, created_by, clinic_id, created_at, updated_at)
            VALUES
              (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, datetime('now'))`,
            args: [
              estimateId,
              patientId,
              cdtCode,
              coveragePercent,
              patientCost,
              insurerPays,
              claimRisk,
              explanation,
              createdAt,
            ],
          });
          estimateCount++;
        } catch (err: any) {
          logger.error({ err: err.message }, "Failed to insert estimate");
        }
      }
    }

    logger.info(`✓ Created ${estimateCount} estimates`);

    // Verify data using client.execute()
    const patientCheck = await client.execute(
      `SELECT COUNT(*) as count FROM "${patientTableName}"`,
    );
    const patientCount = patientCheck.rows[0]?.[0] ?? 0;

    const estimateCheck = await client.execute(
      `SELECT COUNT(*) as count FROM "${estimateTableName}"`,
    );
    const estimateCountResult = estimateCheck.rows[0]?.[0] ?? 0;

    logger.info("\n🎉 Reseed complete!\n");
    logger.info(`   Patients in DB: ${patientCount}`);
    logger.info(`   Estimates in DB: ${estimateCountResult}\n`);

    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Reseed failed");
    process.exit(1);
  }
}

main();
