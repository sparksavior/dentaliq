#!/usr/bin/env node
const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "dentaliq.db"));

try {
  // Get table names to find the tenant-specific tables
  const tables = db
    .prepare(
      `
    SELECT name FROM sqlite_master
    WHERE type='table' AND name LIKE 'tenant_%'
    ORDER BY name
  `,
    )
    .all();

  console.log(
    "Available tenant tables:",
    tables.map((t) => t.name),
  );

  // Find the demo tenant
  const demoTenantTable = tables.find((t) => t.name.endsWith("_patients"));

  if (demoTenantTable) {
    const tablePrefix = demoTenantTable.name.replace("_patients", "");
    console.log(`\n📊 Using table prefix: ${tablePrefix}`);

    // Count patients
    const patientCount = db
      .prepare(`SELECT COUNT(*) as count FROM "${tablePrefix}_patients"`)
      .get();
    console.log(`✅ Patients: ${patientCount.count}`);

    // Count estimates
    const estimateCount = db
      .prepare(`SELECT COUNT(*) as count FROM "${tablePrefix}_estimates"`)
      .get();
    console.log(`✅ Estimates: ${estimateCount.count}`);

    // Check columns in estimates table
    const estimateColumns = db
      .prepare(`PRAGMA table_info("${tablePrefix}_estimates")`)
      .all();
    console.log(`\n📋 Estimate table columns:`);
    estimateColumns.forEach((col) => {
      console.log(`   - ${col.name} (${col.type})`);
    });

    // Sample data
    console.log(`\n👥 Sample patients:`);
    const samplePatients = db
      .prepare(
        `SELECT id, first_name, last_name, email FROM "${tablePrefix}_patients" LIMIT 3`,
      )
      .all();
    samplePatients.forEach((p) => {
      console.log(`   ${p.first_name} ${p.last_name} (${p.email})`);
    });

    console.log(`\n📋 Sample estimates:`);
    const sampleEstimates = db
      .prepare(
        `SELECT id, patient_id, cdt_code, patient_cost, insurer_pays FROM "${tablePrefix}_estimates" LIMIT 3`,
      )
      .all();
    sampleEstimates.forEach((e) => {
      console.log(
        `   ${e.cdt_code}: $${e.patient_cost} (insurer pays $${e.insurer_pays})`,
      );
    });
  } else {
    console.log("❌ No tenant tables found");
  }
} catch (err) {
  console.error("Error:", err.message);
} finally {
  db.close();
}
