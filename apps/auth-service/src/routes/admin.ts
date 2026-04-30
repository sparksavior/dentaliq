import type { FastifyInstance } from 'fastify'
import { getDb, tenants } from '@dentaliq/db'
import { eq, sql } from 'drizzle-orm'
import { requireAuth } from '../middleware/requireAuth'

export async function adminRoutes(app: FastifyInstance) {
  // All routes here require auth and admin role
  app.addHook('preHandler', requireAuth(app))
  app.addHook('preHandler', async (req, reply) => {
    if (req.user?.role !== 'admin') {
      return reply.code(403).send({ message: 'Forbidden: Admin access only' })
    }
  })

  // GET /admin/tenants — list all clinics
  app.get('/tenants', async () => {
    const db = getDb()
    const allTenants = await db.select().from(tenants)
    return { success: true, data: allTenants }
  })

  // PATCH /admin/tenants/:id — update clinic status/plan/billing
  app.patch('/tenants/:id', async (req: any, reply) => {
    const { id } = req.params
    const { plan, status, billingDate, trialEndsAt } = req.body

    const db = getDb()
    await db
      .update(tenants)
      .set({
        plan: plan || undefined,
        status: status || undefined,
        billingDate: billingDate || undefined,
        trialEndsAt: trialEndsAt || undefined,
        updatedAt: new Date().toISOString()
      })
      .where(eq(tenants.id, id))

    return { success: true }
  })

  // GET /admin/tickets — list all support tickets
  app.get('/tickets', async (_req, reply) => {
    const db = getDb() as any
    const rows = await db.all(sql.raw(`
      SELECT * FROM support_tickets ORDER BY created_at DESC
    `))
    return reply.send({ success: true, data: rows ?? [] })
  })

  // PATCH /admin/tickets/:id — update ticket status
  app.patch('/tickets/:id', async (req: any, reply) => {
    const { id } = req.params
    const { status } = req.body
    const db = getDb() as any
    await db.run(sql.raw(`
      UPDATE support_tickets SET status = '${status}', updated_at = datetime('now') WHERE id = '${id}'
    `))
    return reply.send({ success: true })
  })
}
