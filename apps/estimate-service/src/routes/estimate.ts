import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createId } from '@paralleldrive/cuid2'
import { getDb } from '@dentaliq/db'
import { sql } from 'drizzle-orm'
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
    await persistEstimate(jwtUser.tenantId, jwtUser.sub, body.patientId, result)

    return reply.code(201).send({ success: true, data: result })
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
    try {
      const rows = await db.all(sql.raw(`
        SELECT * FROM "${tablePrefix}_estimates"
        ORDER BY created_at DESC
        LIMIT 50
      `))
      return reply.send({ success: true, data: rows })
    } catch {
      return reply.send({ success: true, data: [] })
    }
  })
}

async function persistEstimate(
  tenantId: string,
  userId: string,
  patientId: string | undefined,
  result: Awaited<ReturnType<typeof runEstimate>>,
) {
  const tablePrefix = await getTablePrefix(tenantId)
  if (!tablePrefix) return

  // tablePrefix comes from our own DB so it is trusted; all other values are
  // bound as parameters via drizzle's sql template tag (prevents injection).
  const db = getDb() as any
  try {
    await db.run(
      sql`INSERT INTO ${sql.raw(`"${tablePrefix}_estimates"`)}
        (id, patient_id, cdt_code, coverage_percent, patient_cost, insurer_pays, claim_risk, plain_explanation, created_by)
      VALUES
        (${createId()}, ${patientId ?? null}, ${result.cdtCode},
         ${result.coveragePercent}, ${result.patientCost}, ${result.insurerPays},
         ${result.claimRisk}, ${result.plainExplanation}, ${userId})`,
    )
  } catch {
    // Non-fatal — estimate is still returned even if persistence fails
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
