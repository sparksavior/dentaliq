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

  // PATCH /patients/:id — update patient
  app.patch('/:id', {
    preHandler: requireAuth(app),
  }, async (req, reply) => {
    const jwtUser = req.user as any
    const { id } = req.params as { id: string }
    const body = PatientBodySchema.partial().parse(req.body)

    const tablePrefix = await getTablePrefix(jwtUser.tenantId)
    if (!tablePrefix) return reply.code(400).send({ success: false, error: 'Tenant schema not found' })

    const db = getDb() as any
    try {
      await db.run(
        sql`UPDATE ${sql.raw(`"${tablePrefix}_patients"`)} SET
          first_name   = COALESCE(${body.firstName ?? null}, first_name),
          last_name    = COALESCE(${body.lastName ?? null}, last_name),
          date_of_birth = COALESCE(${body.dateOfBirth ?? null}, date_of_birth),
          phone        = COALESCE(${body.phone ?? null}, phone),
          email        = COALESCE(${body.email ?? null}, email),
          insurance_plan_id = COALESCE(${body.insuranceProvider ?? null}, insurance_plan_id),
          updated_at   = ${new Date().toISOString()}
        WHERE id = ${id}`
      )
      return reply.send({ success: true })
    } catch (err) {
      req.log.error(err)
      return reply.code(500).send({ success: false, error: 'Database error' })
    }
  })

  // GET /patients/:id — get patient detail with history
  app.get('/:id', {
    preHandler: requireAuth(app),
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    console.log(`[GET /patients/:id] Fetching data for patient: ${id}`)
    const jwtUser = req.user as any
    const tablePrefix = await getTablePrefix(jwtUser.tenantId)
    if (!tablePrefix) return reply.code(400).send({ success: false, error: 'Tenant schema not found' })

    const db = getDb() as any
    try {
      const pResult = await db.run(sql.raw(`SELECT * FROM "${tablePrefix}_patients" WHERE id = '${id}' LIMIT 1`))
      const patient = pResult?.rows?.[0] || pResult?.[0]
      if (!patient) return reply.code(404).send({ success: false, error: 'Patient not found' })

      const hResult = await db.run(sql.raw(`
        SELECT * FROM "${tablePrefix}_estimates" 
        WHERE patient_id = '${id}' 
        ORDER BY created_at DESC
      `))
      const history = hResult?.rows || hResult || []
      console.log(`[GET /patients/:id] History rows for ${id}:`, history)

      return reply.send({ success: true, data: { ...patient, history } })
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
