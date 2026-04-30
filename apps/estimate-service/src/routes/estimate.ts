import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createId } from '@paralleldrive/cuid2'
import { getDb, tenants } from '@dentaliq/db'
import { sql, eq } from 'drizzle-orm'
import { runEstimate } from '../services/rulesEngine'
import { requireAuth } from '../middleware/requireAuth'

const EstimateBodySchema = z.object({
  cdtCode:           z.string().min(4).max(10).toUpperCase(),
  insurerName:       z.string().min(1),
  patientId:         z.string().optional(),
  patientAge:        z.number().int().min(0).max(120).optional(),
  codesOnSameVisit:  z.array(z.string()).optional(),
  skipLlm:           z.boolean().optional(),
})

export async function estimateRoutes(app: FastifyInstance) {
  // POST /estimate
  app.post('/estimate', {
    preHandler: requireAuth(app),
  }, async (req, reply) => {
    const jwtUser = req.user as any
    const body = EstimateBodySchema.parse(req.body)

    const result = await runEstimate({
      cdtCode:          body.cdtCode,
      insurerName:      body.insurerName,
      patientId:        body.patientId ?? '',
      insurerId:        body.insurerName,
      tenantId:         jwtUser.tenantId,
      patientAge:       body.patientAge,
      codesOnSameVisit: body.codesOnSameVisit,
      skipLlm:          body.skipLlm,
    })

    // Persist estimate to per-tenant table
    const id = await persistEstimate(jwtUser.tenantId, jwtUser.sub, body.patientId, result, req.headers['x-clinic-id'] as string)

    return reply.code(201).send({ success: true, data: { ...result, id } })
  })

  // POST /estimate/narrative — generates pre-auth letter
  const NarrativeBodySchema = z.object({
    cdtCode: z.string(),
    insurerName: z.string(),
    patientName: z.string().optional(),
    patientAge: z.number().int().min(0).max(120).optional(),
    clinicalNotes: z.string().optional(),
    previousNarrative: z.string().optional(),
    revisionInstructions: z.string().optional(),
  })

  app.post('/estimate/narrative', {
    preHandler: requireAuth(app),
  }, async (req, reply) => {
    const jwtUser = req.user as any
    // Narrative generation is a Pro/Enterprise-only feature
    const db = getDb()
    const tenantRows = await db.select({ plan: tenants.plan }).from(tenants).where(eq(tenants.id, jwtUser.tenantId)).limit(1)
    if (tenantRows[0]?.plan === 'starter') {
      return reply.code(403).send({ success: false, error: 'AI pre-authorization letters require a Pro plan. Please upgrade.' })
    }

    const body = NarrativeBodySchema.parse(req.body)
    const { generateNarrative } = await import('../services/llmNarrativeGenerator')
    
    const narrative = await generateNarrative({
      cdtCode: body.cdtCode,
      insurerName: body.insurerName,
      patientName: body.patientName,
      patientAge: body.patientAge,
      clinicalNotes: body.clinicalNotes,
      previousNarrative: body.previousNarrative,
      revisionInstructions: body.revisionInstructions,
    })
    
    return reply.code(201).send({ success: true, data: narrative })
  })

  // GET /estimate/codes — list all CDT codes (for frontend dropdowns)
  app.get('/estimate/codes', {
    preHandler: requireAuth(app),
  }, async (_req, reply) => {
    const { getAllCdtCodes } = await import('../data/cdt-codes')
    const codes = getAllCdtCodes().map((c) => ({
      code: c.code,
      description: c.description,
      category: c.category,
      typicalFee: c.typicalFee,
      requiresPreAuth: c.requiresPreAuth,
    }))
    return reply.send({ success: true, data: codes })
  })

  // GET /estimate/history — recent estimates for this tenant
  app.get('/estimate/history', {
    preHandler: requireAuth(app),
  }, async (req, reply) => {
    const jwtUser = req.user as any
    const tablePrefix = await getTablePrefix(jwtUser.tenantId)
    if (!tablePrefix) return reply.send({ success: true, data: [] })

    const db = getDb() as any
    const clinicId = req.headers['x-clinic-id'] as string

    try {
      const whereClause = clinicId ? `WHERE e.clinic_id = '${clinicId}'` : ''
      const rows = await (db as any).all(sql.raw(`
        SELECT e.*, p.first_name, p.last_name 
        FROM "${tablePrefix}_estimates" e
        LEFT JOIN "${tablePrefix}_patients" p ON e.patient_id = p.id
        ${whereClause}
        ORDER BY e.created_at DESC
        LIMIT 50
      `))
      return reply.send({ success: true, data: rows })
    } catch (err) {
      console.error('History fetch failed:', err)
      return reply.send({ success: true, data: [] })
    }
  })

  // PATCH /estimate/:id/letter — saves pre-auth letter to an estimate
  const LetterBodySchema = z.object({
    letter: z.string().min(1),
  })

  app.patch('/estimate/:id/letter', {
    preHandler: requireAuth(app),
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { letter } = LetterBodySchema.parse(req.body)
    const jwtUser = req.user as any
    const tablePrefix = await getTablePrefix(jwtUser.tenantId)
    
    if (!tablePrefix) return reply.code(404).send({ success: false, message: 'Tenant not found' })

    const db = getDb() as any
    try {
      const cleanId = id.trim()
      await (db as any).run(
        sql`UPDATE ${sql.raw(`"${tablePrefix}_estimates"`)} 
            SET pre_auth_letter = ${letter} 
            WHERE id = ${cleanId}`
      )
      
      return reply.send({ 
        success: true, 
        debug: { 
          id: cleanId,
          table: `${tablePrefix}_estimates`
        } 
      })
    } catch (err) {
      console.error(`[saveLetter] Failsafe error:`, err)
      return reply.code(500).send({ success: false, error: (err as any).message })
    }
  })
}

async function persistEstimate(
  tenantId: string,
  userId: string,
  patientId: string | undefined,
  result: Awaited<ReturnType<typeof runEstimate>>,
  clinicId: string | null = null,
) {
  const tablePrefix = await getTablePrefix(tenantId)
  if (!tablePrefix) return null

  const db = getDb() as any
  const id = createId()

  // Migrate: add clinic_id column for tenants provisioned before this feature
  try {
    await (db as any).run(sql.raw(`ALTER TABLE "${tablePrefix}_estimates" ADD COLUMN clinic_id TEXT`))
  } catch { /* column already exists */ }

  try {
    await (db as any).run(
      sql`INSERT INTO ${sql.raw(`"${tablePrefix}_estimates"`)}
        (id, patient_id, cdt_code, coverage_percent, patient_cost, insurer_pays, claim_risk, plain_explanation, created_by, clinic_id)
      VALUES
        (${id}, ${patientId ?? null}, ${result.cdtCode},
         ${result.coveragePercent}, ${result.patientCost}, ${result.insurerPays},
         ${result.claimRisk}, ${result.plainExplanation}, ${userId}, ${clinicId})`,
    )
    return id
  } catch (err) {
    console.error('Persistence failed:', err)
    return null
  }
}

async function getTablePrefix(tenantId: string): Promise<string | null> {
  // tenantId comes from a verified JWT — still bind it as a parameter
  const db = getDb() as any
  try {
    const rows = await db.all(sql`SELECT schema_name FROM tenants WHERE id = ${tenantId} LIMIT 1`)
    return rows?.[0]?.schema_name ?? null
  } catch {
    return null
  }
}
