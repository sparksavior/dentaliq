/**
 * Seed a demo clinic + admin account directly into the SQLite database.
 * Run:  node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/seed-demo.ts
 *
 * Demo credentials printed at the end — no server needed.
 */

import bcrypt from 'bcryptjs'
import { createId } from '@paralleldrive/cuid2'
import { getDb } from '@dentaliq/db'
import { sql } from 'drizzle-orm'

const DEMO = {
  clinicName: 'Riverside Dental Group',
  adminName:  'Dr. Demo Admin',
  email:      'demo@dentaliq.dev',
  password:   'Demo1234!',
  plan:       'pro',
}

async function main() {
  const db = getDb() as any
  const dbPath = process.env.DATABASE_PATH ?? 'dentaliq.db'

  // Ensure tables exist
  await db.run(sql.raw(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
      schema_name TEXT NOT NULL UNIQUE, plan TEXT NOT NULL DEFAULT 'pro',
      status TEXT NOT NULL DEFAULT 'trial', pms_type TEXT NOT NULL DEFAULT 'none',
      pms_connected INTEGER NOT NULL DEFAULT 0, pms_api_key TEXT,
      stripe_customer_id TEXT, trial_ends_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `))
  await db.run(sql.raw(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'front_desk', mfa_enabled INTEGER NOT NULL DEFAULT 0,
      mfa_secret TEXT, mfa_backup_codes TEXT,
      email_verified INTEGER NOT NULL DEFAULT 1,
      email_verify_token TEXT, password_reset_token TEXT, password_reset_expires TEXT,
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `))
  await db.run(sql.raw(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `))
  await db.run(sql.raw(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, user_id TEXT, service TEXT NOT NULL,
      action TEXT NOT NULL, resource_type TEXT, resource_id TEXT,
      ip_address TEXT, user_agent TEXT, metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `))

  // Check for existing demo account
  const existing = await db.run(sql.raw(`SELECT id FROM users WHERE email = '${DEMO.email}'`))
  if ((existing as any).rows?.length > 0) {
    console.log('\n✓ Demo account already exists — you can log in:\n')
    printCreds()
    return
  }

  // Create tenant
  const tenantId = createId()
  const slug = 'riverside-dental-group'
  const tablePrefix = `t_${slug.replace(/-/g, '_')}`
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  await db.run(sql.raw(`
    INSERT INTO tenants (id, name, slug, schema_name, plan, status, trial_ends_at)
    VALUES ('${tenantId}', '${DEMO.clinicName}', '${slug}', '${tablePrefix}', '${DEMO.plan}', 'trial', '${trialEndsAt}')
  `))

  // Create per-tenant tables
  await db.run(sql.raw(`CREATE TABLE IF NOT EXISTS "${tablePrefix}_patients" (
    id TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
    date_of_birth TEXT, health_card_number TEXT, phone TEXT, email TEXT,
    insurance_plan_id TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`))
  await db.run(sql.raw(`CREATE TABLE IF NOT EXISTS "${tablePrefix}_insurance_plans" (
    id TEXT PRIMARY KEY, insurer_name TEXT NOT NULL, plan_name TEXT, group_number TEXT,
    annual_max REAL, preventive_coverage INTEGER DEFAULT 100, basic_coverage INTEGER DEFAULT 80,
    major_coverage INTEGER DEFAULT 50, ortho_coverage INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`))
  await db.run(sql.raw(`CREATE TABLE IF NOT EXISTS "${tablePrefix}_estimates" (
    id TEXT PRIMARY KEY, patient_id TEXT, cdt_code TEXT NOT NULL, insurance_plan_id TEXT,
    coverage_percent INTEGER, patient_cost REAL, insurer_pays REAL, claim_risk TEXT,
    plain_explanation TEXT, created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`))

  // Create admin user (email pre-verified for demo)
  const userId = createId()
  const passwordHash = await bcrypt.hash(DEMO.password, 12)

  await db.run(sql.raw(`
    INSERT INTO users (id, tenant_id, email, name, password_hash, role, email_verified)
    VALUES ('${userId}', '${tenantId}', '${DEMO.email}', '${DEMO.adminName}', '${passwordHash}', 'admin', 1)
  `))

  // Seed sample insurance plans for demo estimates
  const plans = [
    { id: createId(), insurer: 'Sun Life Financial',    plan: 'Group Benefits Basic',      prev: 100, basic: 80, major: 50 },
    { id: createId(), insurer: 'Manulife',              plan: 'Flexcare Dental',            prev: 100, basic: 70, major: 40 },
    { id: createId(), insurer: 'Canada Life',           plan: 'Enhanced Dental',            prev: 100, basic: 80, major: 60 },
    { id: createId(), insurer: 'Green Shield Canada',   plan: 'Dental Assist',              prev: 80,  basic: 70, major: 50 },
  ]
  for (const p of plans) {
    await db.run(sql.raw(`
      INSERT INTO "${tablePrefix}_insurance_plans"
        (id, insurer_name, plan_name, annual_max, preventive_coverage, basic_coverage, major_coverage)
      VALUES ('${p.id}', '${p.insurer}', '${p.plan}', 1500, ${p.prev}, ${p.basic}, ${p.major})
    `))
  }

  console.log('\n✅ Demo clinic seeded successfully!\n')
  printCreds()
  console.log(`   Tenant ID  : ${tenantId}`)
  console.log(`   User ID    : ${userId}`)
  console.log(`   DB file   : ${dbPath}\n`)
}

function printCreds() {
  console.log('─────────────────────────────────────')
  console.log('  URL      : http://localhost:3000/login')
  console.log(`  Email    : ${DEMO.email}`)
  console.log(`  Password : ${DEMO.password}`)
  console.log('─────────────────────────────────────\n')
}

main().catch((e) => { console.error(e); process.exit(1) })
