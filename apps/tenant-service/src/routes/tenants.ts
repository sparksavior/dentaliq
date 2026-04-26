import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { getDb, tenants, users } from '@dentaliq/db'
import { requireAuth, requireRole } from '../middleware/requireAuth'

// ─────────────────────────────────────────────────────────
// Tenant Routes
// GET  /tenants/me           → current tenant details
// PATCH /tenants/me          → update clinic name/plan
// GET  /tenants/me/usage     → API usage metrics (Phase 2)
// POST /tenants/me/pms       → connect PMS
// DELETE /tenants/me/pms     → disconnect PMS
// Admin only:
// GET  /tenants              → list all tenants
// GET  /tenants/:id          → tenant by id
// PATCH /tenants/:id/status  → suspend / activate
// ─────────────────────────────────────────────────────────

const updateTenantSchema = z.object({
  name: z.string().min(2).max(200).optional(),
})

const connectPmsSchema = z.object({
  pmsType: z.enum(['open_dental', 'dentrix', 'cleardent']),
  pmsApiKey: z.string().min(8),
})

const updateStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'trial']),
})

export async function tenantRoutes(app: FastifyInstance) {
  const db = getDb()

  app.addHook('onRequest', requireAuth(app))

  // ── Current tenant ────────────────────────────────────────
  app.get('/me', async (req, reply) => {
    const me = req.user as any
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, me.tenantId))
      .limit(1)

    if (!tenant) return reply.code(404).send({ success: false, error: 'Tenant not found' })

    const memberCount = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.tenantId, me.tenantId))

    return reply.send({
      success: true,
      data: { ...tenant, memberCount: memberCount.length },
    })
  })

  // ── Update clinic name ─────────────────────────────────────
  app.patch('/me', {
    preHandler: requireRole('admin'),
  }, async (req, reply) => {
    const me = req.user as any
    const { name } = updateTenantSchema.parse(req.body)

    const [updated] = await db
      .update(tenants)
      .set({
        ...(name && { name }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tenants.id, me.tenantId))
      .returning()

    return reply.send({ success: true, data: updated })
  })

  // ── Usage metrics (stub for Phase 2) ──────────────────────
  app.get('/me/usage', async (req, reply) => {
    return reply.send({
      success: true,
      data: {
        estimates: { current: 0, limit: 500, resetAt: getMonthEnd() },
        claims: { current: 0, limit: 500 },
        note: 'Live usage tracking available in Phase 2',
      },
    })
  })

  // ── Connect PMS ────────────────────────────────────────────
  app.post('/me/pms', {
    preHandler: requireRole('admin'),
  }, async (req, reply) => {
    const me = req.user as any
    const { pmsType, pmsApiKey } = connectPmsSchema.parse(req.body)

    const [updated] = await db
      .update(tenants)
      .set({ pmsType, pmsApiKey, pmsConnected: true, updatedAt: new Date().toISOString() })
      .where(eq(tenants.id, me.tenantId))
      .returning()

    return reply.send({
      success: true,
      data: updated,
      message: `${pmsType.replace('_', ' ')} connected. Full sync available in Phase 2.`,
    })
  })

  // ── Disconnect PMS ─────────────────────────────────────────
  app.delete('/me/pms', {
    preHandler: requireRole('admin'),
  }, async (req, reply) => {
    const me = req.user as any
    await db
      .update(tenants)
      .set({ pmsType: 'none', pmsApiKey: null, pmsConnected: false, updatedAt: new Date().toISOString() })
      .where(eq(tenants.id, me.tenantId))

    return reply.send({ success: true, message: 'PMS disconnected' })
  })

  // ── Admin: list all tenants ────────────────────────────────
  app.get('/', {
    preHandler: requireRole('admin'),
  }, async (_req, reply) => {
    const all = await db.select().from(tenants)
    return reply.send({ success: true, data: all, total: all.length })
  })

  // ── Admin: tenant by id ────────────────────────────────────
  app.get('/:id', {
    preHandler: requireRole('admin'),
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1)
    if (!tenant) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: tenant })
  })

  // ── Admin: update tenant status ────────────────────────────
  app.patch('/:id/status', {
    preHandler: requireRole('admin'),
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { status } = updateStatusSchema.parse(req.body)
    const [updated] = await db
      .update(tenants)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(eq(tenants.id, id))
      .returning()
    if (!updated) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: updated })
  })
}

function getMonthEnd(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1, 1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
