import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createId } from '@paralleldrive/cuid2'
import { getDb, tenants } from '@dentaliq/db'
import { sql, eq } from 'drizzle-orm'
import { requireAuth } from '../middleware/requireAuth'

const InsurancePlanSchema = z.object({
  insurerName:         z.string().min(1),
  planName:            z.string().optional(),
  groupNumber:         z.string().optional(),
  annualMax:           z.number().positive().optional(),
  preventiveCoverage:  z.number().int().min(0).max(100).optional(),
  basicCoverage:       z.number().int().min(0).max(100).optional(),
  majorCoverage:       z.number().int().min(0).max(100).optional(),
  orthoCoverage:       z.number().int().min(0).max(100).optional(),
})

export async function insurancePlansRoutes(app: FastifyInstance) {
  // GET /insurance-plans
  app.get('/', {
    preHandler: requireAuth(app),
  }, async (req, reply) => {
    const jwtUser = req.user as any
    const tablePrefix = await getTablePrefix(jwtUser.tenantId)
    if (!tablePrefix) return reply.code(400).send({ success: false, error: 'Tenant schema not found' })

    const db = getDb() as any
    try {
      const rows = await (db as any).all(sql.raw(`
        SELECT * FROM "${tablePrefix}_insurance_plans"
        ORDER BY created_at ASC
      `))
      return reply.send({ success: true, data: rows })
    } catch {
      return reply.send({ success: true, data: [] })
    }
  })

  // POST /insurance-plans
  app.post('/', {
    preHandler: requireAuth(app),
  }, async (req, reply) => {
    const jwtUser = req.user as any
    const body = InsurancePlanSchema.parse(req.body)

    const tablePrefix = await getTablePrefix(jwtUser.tenantId)
    if (!tablePrefix) return reply.code(400).send({ success: false, error: 'Tenant schema not found' })

    const db = getDb() as any
    const newId = createId()
    try {
      await (db as any).run(
        sql`INSERT INTO ${sql.raw(`"${tablePrefix}_insurance_plans"`)}
          (id, insurer_name, plan_name, group_number, annual_max,
           preventive_coverage, basic_coverage, major_coverage, ortho_coverage)
        VALUES
          (${newId}, ${body.insurerName}, ${body.planName ?? null}, ${body.groupNumber ?? null},
           ${body.annualMax ?? null}, ${body.preventiveCoverage ?? 100},
           ${body.basicCoverage ?? 80}, ${body.majorCoverage ?? 50}, ${body.orthoCoverage ?? 50})`
      )
      return reply.code(201).send({ success: true, data: { id: newId, ...body } })
    } catch (err) {
      req.log.error(err)
      return reply.code(500).send({ success: false, error: 'Database error' })
    }
  })

  // PATCH /insurance-plans/:id
  app.patch('/:id', {
    preHandler: requireAuth(app),
  }, async (req, reply) => {
    const jwtUser = req.user as any
    const { id } = req.params as { id: string }
    const body = InsurancePlanSchema.partial().parse(req.body)

    const tablePrefix = await getTablePrefix(jwtUser.tenantId)
    if (!tablePrefix) return reply.code(400).send({ success: false, error: 'Tenant schema not found' })

    const db = getDb() as any
    try {
      await (db as any).run(
        sql`UPDATE ${sql.raw(`"${tablePrefix}_insurance_plans"`)} SET
          insurer_name         = COALESCE(${body.insurerName ?? null},         insurer_name),
          plan_name            = COALESCE(${body.planName ?? null},             plan_name),
          group_number         = COALESCE(${body.groupNumber ?? null},          group_number),
          annual_max           = COALESCE(${body.annualMax ?? null},            annual_max),
          preventive_coverage  = COALESCE(${body.preventiveCoverage ?? null},  preventive_coverage),
          basic_coverage       = COALESCE(${body.basicCoverage ?? null},        basic_coverage),
          major_coverage       = COALESCE(${body.majorCoverage ?? null},        major_coverage),
          ortho_coverage       = COALESCE(${body.orthoCoverage ?? null},        ortho_coverage)
        WHERE id = ${id}`
      )
      return reply.send({ success: true })
    } catch (err) {
      req.log.error(err)
      return reply.code(500).send({ success: false, error: 'Database error' })
    }
  })

  // DELETE /insurance-plans/:id
  app.delete('/:id', {
    preHandler: requireAuth(app),
  }, async (req, reply) => {
    const jwtUser = req.user as any
    const { id } = req.params as { id: string }

    const tablePrefix = await getTablePrefix(jwtUser.tenantId)
    if (!tablePrefix) return reply.code(400).send({ success: false, error: 'Tenant schema not found' })

    const db = getDb() as any
    try {
      await (db as any).run(sql`DELETE FROM ${sql.raw(`"${tablePrefix}_insurance_plans"`)} WHERE id = ${id}`)
      return reply.send({ success: true })
    } catch (err) {
      req.log.error(err)
      return reply.code(500).send({ success: false, error: 'Database error' })
    }
  })
}

async function getTablePrefix(tenantId: string): Promise<string | null> {
  const db = getDb()
  try {
    const rows = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1)
    return rows[0]?.schemaName ?? null
  } catch {
    return null
  }
}
