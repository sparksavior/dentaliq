/**
 * DentalIQ Demo Data Seeder — STANDALONE
 *
 * Deletes the database file, runs db:push to recreate schema,
 * then uses libsql client.execute() directly (proven reliable)
 * to hardcode:
 *   - Admin account (port 3005 access)
 *   - Demo client account (Cortex plan, MFA DISABLED) with 800 patients
 *   - ~3,200 realistic estimates across 6 months
 *
 * Usage: pnpm seed:demo
 */

import bcrypt from "bcryptjs";
import { createId } from "@paralleldrive/cuid2";
import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";

// ── Config ──────────────────────────────────────────────

const DB_PATH = path.resolve(__dirname, "../dentaliq.db");
const DB_URL = `file:${DB_PATH}`;

const DEMO_EMAIL = "demo@dentaliq.ca";
const DEMO_PASSWORD = "demo";
const ADMIN_EMAIL = "admin@dentaliq.ca";
const ADMIN_PASSWORD = "admin";

// Fixed IDs so everything is deterministic
const ADMIN_TENANT_ID = "admin_tenant_001";
const ADMIN_USER_ID = "admin_user_001";
const DEMO_TENANT_ID = "demo_tenant_001";
const DEMO_USER_ID = "demo_user_001";
const DEMO_SCHEMA = "tenant_demo0001";

// ── Data arrays ─────────────────────────────────────────

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
  "Mohammed",
  "Ahmed",
  "Ali",
  "Chen",
  "Kumar",
  "Lopez",
  "Garcia",
  "Rodriguez",
  "Martinez",
  "Olivia",
  "Emma",
  "Ava",
  "Sophia",
  "Isabella",
  "Mia",
  "Charlotte",
  "Amelia",
  "Harper",
  "Evelyn",
  "Abigail",
  "Emily",
  "Ella",
  "Scarlett",
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
  "Wright",
  "Scott",
  "Torres",
  "Nguyen",
  "Hill",
  "Flores",
  "Green",
];

const RISK_WEIGHTS = { low: 0.6, medium: 0.3, high: 0.1 };
const RISK_KEYS = Object.keys(RISK_WEIGHTS) as ("low" | "medium" | "high")[];

const EXPLANATIONS = [
  "Standard procedure with typical coverage",
  "Complex case requiring pre-authorization",
  "Routine preventive procedure",
  "Major restorative work",
  "Cosmetic procedure with reduced coverage",
  "Emergency treatment",
  "Follow-up procedure from prior treatment",
  "Age-appropriate preventive care",
];

// ── Helpers ─────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedRisk(): string {
  const r = Math.random();
  let acc = 0;
  for (const k of RISK_KEYS) {
    acc += RISK_WEIGHTS[k];
    if (r <= acc) return k;
  }
  return "low";
}

// ── Main ────────────────────────────────────────────────

async function main() {
  console.log("\n🌱 DentalIQ Demo Seeder — Standalone\n");

  // Step 1: Delete old database
  console.log("1️⃣  Deleting old database...");
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log("   ✓ Deleted dentaliq.db");
  } else {
    console.log("   ✓ No existing database");
  }
  // Also delete WAL/SHM files
  for (const ext of ["-wal", "-shm", "-journal"]) {
    const p = DB_PATH + ext;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  // Step 2: Create all core schema tables directly
  console.log("\n2️⃣  Creating schema tables...");
  const client0 = createClient({ url: DB_URL });

  await client0.execute(`CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    schema_name TEXT NOT NULL UNIQUE,
    plan TEXT NOT NULL DEFAULT 'pro',
    status TEXT NOT NULL DEFAULT 'trial',
    pms_type TEXT NOT NULL DEFAULT 'none',
    pms_connected INTEGER NOT NULL DEFAULT 0,
    pms_api_key TEXT,
    stripe_customer_id TEXT,
    trial_ends_at TEXT,
    billing_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  await client0.execute(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'front_desk',
    mfa_enabled INTEGER NOT NULL DEFAULT 0,
    mfa_secret TEXT,
    mfa_backup_codes TEXT,
    email_verified INTEGER NOT NULL DEFAULT 0,
    email_verify_token TEXT,
    password_reset_token TEXT,
    password_reset_expires TEXT,
    last_login_at TEXT,
    permissions TEXT NOT NULL DEFAULT '[]',
    invited_by TEXT,
    mfa_methods TEXT NOT NULL DEFAULT '[]',
    mfa_otp_code TEXT,
    mfa_otp_expires TEXT,
    phone_number TEXT,
    demo_account INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  await client0.execute(`CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    created_at TEXT NOT NULL
  )`);

  await client0.execute(`CREATE TABLE IF NOT EXISTS agent_tasks (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    clinic_id TEXT,
    agent_id TEXT NOT NULL,
    task_type TEXT NOT NULL,
    cdt_code TEXT,
    patient_id TEXT,
    patient_name TEXT,
    risk_level TEXT,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    approved_by TEXT,
    approved_at TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  await client0.execute(`CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    ip_address TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL
  )`);

  await client0.execute(`CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'normal',
    admin_notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  await client0.execute(`CREATE TABLE IF NOT EXISTS invite_tokens (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'front_desk',
    permissions TEXT NOT NULL DEFAULT '[]',
    invited_by TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    used INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);

  console.log("   ✓ All schema tables created");

  // Step 3: Connect with libsql and insert everything
  console.log("\n3️⃣  Connecting to database...");
  const client = createClient({ url: DB_URL });
  console.log("   ✓ Connected");

  // Step 4: Create tenants
  console.log("\n4️⃣  Creating tenants...");
  const now = new Date().toISOString();

  await client.execute({
    sql: `INSERT INTO tenants (id, name, slug, schema_name, plan, status, pms_type, pms_connected, trial_ends_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
    args: [
      ADMIN_TENANT_ID,
      "DentalIQ Admin",
      "dentaliq-admin",
      "admin",
      "enterprise",
      "active",
      "none",
      0,
      now,
      now,
    ],
  });
  console.log("   ✓ Admin tenant created");

  await client.execute({
    sql: `INSERT INTO tenants (id, name, slug, schema_name, plan, status, pms_type, pms_connected, trial_ends_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
    args: [
      DEMO_TENANT_ID,
      "Demo Dental Clinic",
      "demo-clinic",
      DEMO_SCHEMA,
      "cortex",
      "active",
      "none",
      0,
      now,
      now,
    ],
  });
  console.log("   ✓ Demo tenant created (Cortex plan)");

  // Step 5: Create users (MFA DISABLED, email verified, demo_account=1)
  console.log("\n5️⃣  Creating users...");
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const demoHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const allPerms =
    '["dashboard","estimates","claims","patients","analytics","cortex_agents","cortex_inbox","support","settings"]';

  await client.execute({
    sql: `INSERT INTO users (id, tenant_id, email, name, password_hash, role, mfa_enabled, email_verified, permissions, mfa_methods, demo_account, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      ADMIN_USER_ID,
      ADMIN_TENANT_ID,
      ADMIN_EMAIL,
      "Admin",
      adminHash,
      "admin",
      0,
      1,
      allPerms,
      "[]",
      1,
      now,
      now,
    ],
  });
  console.log(`   ✓ Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

  await client.execute({
    sql: `INSERT INTO users (id, tenant_id, email, name, password_hash, role, mfa_enabled, email_verified, permissions, mfa_methods, demo_account, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      DEMO_USER_ID,
      DEMO_TENANT_ID,
      DEMO_EMAIL,
      "Demo Admin",
      demoHash,
      "admin",
      0,
      1,
      allPerms,
      "[]",
      1,
      now,
      now,
    ],
  });
  console.log(
    `   ✓ Demo: ${DEMO_EMAIL} / ${DEMO_PASSWORD} (MFA disabled, email verified)`,
  );

  // Step 6: Create tenant-specific tables
  console.log("\n6️⃣  Creating patient & estimate tables...");
  const patientTable = `${DEMO_SCHEMA}_patients`;
  const estimateTable = `${DEMO_SCHEMA}_estimates`;

  await client.execute(`
    CREATE TABLE IF NOT EXISTS "${patientTable}" (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      date_of_birth TEXT,
      phone TEXT,
      email TEXT,
      insurance_plan_id TEXT,
      clinic_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS "${estimateTable}" (
      id TEXT PRIMARY KEY,
      patient_id TEXT,
      cdt_code TEXT NOT NULL,
      coverage_percent INTEGER NOT NULL,
      patient_cost REAL NOT NULL,
      insurer_pays REAL NOT NULL,
      claim_risk TEXT NOT NULL DEFAULT 'low',
      plain_explanation TEXT,
      pre_auth_letter TEXT,
      created_by TEXT,
      clinic_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  console.log("   ✓ Tables created");

  // Step 7: Insert 800 patients
  console.log("\n7️⃣  Inserting 800 patients...");
  const patientIds: string[] = [];

  for (let i = 0; i < 800; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const age = Math.floor(Math.random() * 80) + 6;
    const dob = new Date(
      new Date().getFullYear() - age,
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 28) + 1,
    );
    const insurer = pick(INSURERS);
    const patientId = createId();
    const phone = `+1 (${String(Math.floor(Math.random() * 900) + 100)}) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;

    // Spread created_at across last 12 months so new-patient analytics look good
    const daysAgo = Math.floor(Math.random() * 365);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    await client.execute({
      sql: `INSERT INTO "${patientTable}" (id, first_name, last_name, date_of_birth, phone, email, insurance_plan_id, clinic_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      args: [
        patientId,
        firstName,
        lastName,
        dob.toISOString().split("T")[0],
        phone,
        email,
        insurer,
        createdAt.toISOString(),
        now,
      ],
    });

    patientIds.push(patientId);

    if ((i + 1) % 100 === 0) {
      console.log(`   ... ${i + 1}/800 patients`);
    }
  }
  console.log("   ✓ 800 patients inserted");

  // Step 8: Insert ~3,200 estimates (3-5 per patient)
  console.log("\n8️⃣  Inserting estimates (3-5 per patient)...");
  let estimateCount = 0;

  for (const patientId of patientIds) {
    const count = Math.floor(Math.random() * 3) + 3; // 3-5

    for (let e = 0; e < count; e++) {
      const daysAgo = Math.floor(Math.random() * 180);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);

      const cdtCode = pick(CDT_CODES);
      const coveragePercent = Math.floor(Math.random() * 50) + 50;
      const patientCost = Math.floor(Math.random() * 2900) + 100;
      const insurerPays = Math.floor((patientCost * coveragePercent) / 100);
      const claimRisk = weightedRisk();
      const explanation = `${pick(EXPLANATIONS)} — ${cdtCode}`;

      await client.execute({
        sql: `INSERT INTO "${estimateTable}" (id, patient_id, cdt_code, coverage_percent, patient_cost, insurer_pays, claim_risk, plain_explanation, pre_auth_letter, created_by, clinic_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, ?)`,
        args: [
          createId(),
          patientId,
          cdtCode,
          coveragePercent,
          patientCost,
          insurerPays,
          claimRisk,
          explanation,
          DEMO_USER_ID,
          createdAt.toISOString(),
          now,
        ],
      });
      estimateCount++;
    }

    if (estimateCount % 500 < 5) {
      console.log(`   ... ${estimateCount} estimates so far`);
    }
  }
  console.log(`   ✓ ${estimateCount} estimates inserted`);

  // Step 9: Verify
  console.log("\n9️⃣  Verifying...");
  const pCount = await client.execute(
    `SELECT COUNT(*) as c FROM "${patientTable}"`,
  );
  const eCount = await client.execute(
    `SELECT COUNT(*) as c FROM "${estimateTable}"`,
  );
  const uCount = await client.execute(`SELECT COUNT(*) as c FROM users`);
  const tCount = await client.execute(`SELECT COUNT(*) as c FROM tenants`);

  console.log(`   Users:     ${uCount.rows[0][0]}`);
  console.log(`   Tenants:   ${tCount.rows[0][0]}`);
  console.log(`   Patients:  ${pCount.rows[0][0]}`);
  console.log(`   Estimates: ${eCount.rows[0][0]}`);

  // Done!
  console.log(`
═══════════════════════════════════════════════════════════
🔐 ADMIN CREDENTIALS (port 3005):
   Email:    ${ADMIN_EMAIL}
   Password: ${ADMIN_PASSWORD}
═══════════════════════════════════════════════════════════
🎭 DEMO CLIENT CREDENTIALS (port 3000):
   Email:    ${DEMO_EMAIL}
   Password: ${DEMO_PASSWORD}
   Plan:     Cortex
   MFA:      DISABLED
═══════════════════════════════════════════════════════════
📊 DEMO DATA:
   Patients:  800
   Estimates: ${estimateCount}
   Date Range: Last 6 months
   Insurers:  ${INSURERS.length}
   Age Range: 6-85 years
═══════════════════════════════════════════════════════════

✅ Done! Run: pnpm dev
`);

  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Seed failed:", err);
  process.exit(1);
});
