import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createId } from '@paralleldrive/cuid2'
import { getDb, tenants } from '@dentaliq/db'
import { sql, eq } from 'drizzle-orm'
import { requireAuth } from '../middleware/requireAuth'

const PatientBodySchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  insuranceProvider: z.string().optional(),
})

export async function patientsRoutes(app: FastifyInstance) {
  // GET /patients — list all patients for the tenant
  app.get('/', {
    preHandler: requireAuth(app),
  }, async (req, reply) => {
    const jwtUser = req.user as any
    const tablePrefix = await getTablePrefix(jwtUser.tenantId)
    if (!tablePrefix) return reply.code(400).send({ success: false, error: 'Tenant schema not found' })

    const db = getDb() as any
    try {
      const result = await db.run(sql.raw(`
        SELECT * FROM "${tablePrefix}_patients"
        ORDER BY created_at DESC
      `))
      const rows = result?.rows || result || []
      return reply.send({ success: true, data: rows })
    } catch (err) {
      req.log.error(err)
      return reply.code(500).send({ success: false, error: 'Database error' })
    }
  })

  // GET /patients/ai-context — full data snapshot for AI chatbot
  // IMPORTANT: must be registered BEFORE /:id wildcard routes
  app.get('/ai-context', {
    preHandler: requireAuth(app),
  }, async (req, reply) => {
    const jwtUser = req.user as any
    const tablePrefix = await getTablePrefix(jwtUser.tenantId)
    if (!tablePrefix) return reply.code(400).send({ success: false, error: 'Tenant schema not found' })

    const db = getDb() as any
    try {
      const patientsResult  = await db.run(sql.raw(`SELECT * FROM "${tablePrefix}_patients" ORDER BY created_at DESC`))
      const estimatesResult = await db.run(sql.raw(`SELECT * FROM "${tablePrefix}_estimates" ORDER BY created_at DESC`))
      const plansResult     = await db.run(sql.raw(`SELECT * FROM "${tablePrefix}_insurance_plans"`))

      const patients  = (patientsResult?.rows  || patientsResult  || []) as any[]
      const estimates = (estimatesResult?.rows || estimatesResult || []) as any[]
      const plans     = (plansResult?.rows     || plansResult     || []) as any[]

      const enriched = patients.map((p: any) => {
        const patientClaims = estimates.filter((e: any) => e.patient_id === p.id)
        const latest = patientClaims[0] ?? null
        const plan   = plans.find((pl: any) => pl.id === p.insurance_plan_id) ?? null
        return {
          name:             `${p.first_name} ${p.last_name}`,
          date_of_birth:    p.date_of_birth        ?? 'Not recorded',
          phone:            p.phone                 ?? 'Not recorded',
          email:            p.email                 ?? 'Not recorded',
          health_card:      p.health_card_number    ?? 'Not recorded',
          registered_since: p.created_at,
          insurance: plan ? {
            insurer:             plan.insurer_name,
            plan_name:           plan.plan_name,
            group_number:        plan.group_number,
            annual_max:          plan.annual_max,
            preventive_coverage: `${plan.preventive_coverage}%`,
            basic_coverage:      `${plan.basic_coverage}%`,
            major_coverage:      `${plan.major_coverage}%`,
          } : 'None on file',
          total_claims: patientClaims.length,
          latest_claim: latest ? {
            date:             latest.created_at,
            cdt_code:         latest.cdt_code,
            risk:             latest.claim_risk,
            patient_cost:     `$${latest.patient_cost ?? 0}`,
            insurer_pays:     `$${latest.insurer_pays ?? 0}`,
            coverage_percent: `${latest.coverage_percent ?? 0}%`,
            explanation:      latest.plain_explanation,
          } : 'No claims yet',
          all_claims: patientClaims.map((e: any) => ({
            date:         e.created_at,
            cdt_code:     e.cdt_code,
            risk:         e.claim_risk,
            patient_cost: `$${e.patient_cost ?? 0}`,
            insurer_pays: `$${e.insurer_pays ?? 0}`,
            explanation:  e.plain_explanation,
          })),
        }
      })

      const totalRevenue = estimates.reduce((s: number, e: any) => s + (e.insurer_pays ?? 0), 0)
      const byRisk = estimates.reduce((acc: any, e: any) => {
        const r = e.claim_risk ?? 'unknown'; acc[r] = (acc[r] ?? 0) + 1; return acc
      }, {})

      return reply.send({
        success: true,
        data: {
          summary: {
            total_patients:          patients.length,
            total_claims:            estimates.length,
            total_insurance_revenue: `$${totalRevenue.toFixed(2)}`,
            claims_by_risk:          byRisk,
          },
          patients: enriched,
        },
      })
    } catch (err) {
      req.log.error(err)
      return reply.code(500).send({ success: false, error: 'Database error' })
    }
  })

  // POST /patients — create a new patient
  app.post('/', {
    preHandler: requireAuth(app),
  }, async (req, reply) => {
    const jwtUser = req.user as any
    const body = PatientBodySchema.parse(req.body)

    const tablePrefix = await getTablePrefix(jwtUser.tenantId)
    if (!tablePrefix) return reply.code(400).send({ success: false, error: 'Tenant schema not found' })

    const db = getDb() as any
    const newId = createId()

    try {
      await db.run(
        sql`INSERT INTO ${sql.raw(`"${tablePrefix}_patients"`)}
          (id, first_name, last_name, date_of_birth, phone, email, insurance_plan_id)
        VALUES
          (${newId}, ${body.firstName}, ${body.lastName}, ${body.dateOfBirth ?? null},
           ${body.phone ?? null}, ${body.email ?? null}, ${body.insuranceProvider ?? null})`
      )
      return reply.code(201).send({ success: true, data: { id: newId, ...body } })
    } catch (err) {
      req.log.error(err)
      return reply.code(500).send({ success: false, error: 'Database error' })
    }
  })

  // DELETE /patients/:id
  app.delete('/:id', {
    preHandler: requireAuth(app),
  }, async (req, reply) => {
    const jwtUser = req.user as any
    const { id } = req.params as { id: string }

    const tablePrefix = await getTablePrefix(jwtUser.tenantId)
    if (!tablePrefix) return reply.code(400).send({ success: false, error: 'Tenant schema not found' })

    const db = getDb() as any
    try {
      await db.run(sql`DELETE FROM ${sql.raw(`"${tablePrefix}_patients"`)} WHERE id = ${id}`)
      return reply.send({ success: true })
    } catch (err) {
      req.log.error(err)
      return reply.code(500).send({ success: false, error: 'Database error' })
    }
  })
}

async function getTablePrefix(tenantId: string): Promise<string | null> {
  console.log(`[getTablePrefix] Looking up tenantId: ${tenantId}`);
  const db = getDb()
  try {
    const tenantsList = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1)
    console.log(`[getTablePrefix] Found:`, tenantsList)
    return tenantsList[0]?.schemaName ?? null
  } catch (err) {
    console.error('[getTablePrefix] error:', err)
    return null
  }
}
