import { getDb, tenants } from '@dentaliq/db'
import { createLogger } from '@dentaliq/logger'
import type { PlanTier } from '@dentaliq/types'
import { eq, sql } from 'drizzle-orm'

const logger = createLogger('tenant-service')

interface ProvisionInput {
  name: string
  plan: PlanTier
}

export class TenantService {
  private db = getDb()

  async provision(input: ProvisionInput, _tx?: any) {
    const { name, plan } = input

    const slug = this.toSlug(name)
    const uniqueSlug = await this.ensureUniqueSlug(slug)
    const tablePrefix = `t_${uniqueSlug.replace(/-/g, '_')}`

    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

    const result = await this.db
      .insert(tenants)
      .values({
        name,
        slug: uniqueSlug,
        schemaName: tablePrefix,
        plan,
        status: 'trial',
        trialEndsAt,
      })
      .returning()

    const tenant = result[0]

    // Create per-tenant tables (prefixed, async for libsql)
    await this.createTenantTables(tablePrefix)

    logger.info({ tenantId: tenant.id, tablePrefix, plan }, 'Tenant provisioned')
    return tenant
  }

  private async createTenantTables(p: string) {
    const db = this.db as any

    await db.run(sql.raw(`
      CREATE TABLE IF NOT EXISTS "${p}_patients" (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        date_of_birth TEXT,
        health_card_number TEXT,
        phone TEXT,
        email TEXT,
        insurance_plan_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `))

    await db.run(sql.raw(`
      CREATE TABLE IF NOT EXISTS "${p}_insurance_plans" (
        id TEXT PRIMARY KEY,
        insurer_name TEXT NOT NULL,
        plan_name TEXT,
        group_number TEXT,
        annual_max REAL,
        preventive_coverage INTEGER DEFAULT 100,
        basic_coverage INTEGER DEFAULT 80,
        major_coverage INTEGER DEFAULT 50,
        ortho_coverage INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `))

    await db.run(sql.raw(`
      CREATE TABLE IF NOT EXISTS "${p}_estimates" (
        id TEXT PRIMARY KEY,
        patient_id TEXT,
        cdt_code TEXT NOT NULL,
        insurance_plan_id TEXT,
        coverage_percent INTEGER,
        patient_cost REAL,
        insurer_pays REAL,
        claim_risk TEXT,
        plain_explanation TEXT,
        pre_auth_letter TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `))

    await db.run(sql.raw(`
      CREATE TABLE IF NOT EXISTS "${p}_clinic_locations" (
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
    `))
  }

  private toSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40)
  }

  private async ensureUniqueSlug(slug: string): Promise<string> {
    let candidate = slug
    let suffix = 1
    while (true) {
      const existing = await this.db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.slug, candidate))
        .limit(1)
      if (existing.length === 0) return candidate
      candidate = `${slug}-${suffix++}`
    }
  }
}
