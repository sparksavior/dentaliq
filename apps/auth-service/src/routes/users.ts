import type { FastifyInstance } from 'fastify'
import { requireAuth, requireRole } from '../middleware/requireAuth'
import { getDb, users, tenants } from '@dentaliq/db'
import { eq, and } from 'drizzle-orm'

// ... (existing comments)

export async function userRoutes(app: FastifyInstance) {
  const db = getDb()

  app.addHook('onRequest', requireAuth(app))

  // ── Current user ──────────────────────────────────────────
  app.get('/me', async (req, reply) => {
    const me = req.user as any
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        tenantId: users.tenantId,
        mfaEnabled: users.mfaEnabled,
        emailVerified: users.emailVerified,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        plan: tenants.plan,
        status: tenants.status,
      })
      .from(users)
      .innerJoin(tenants, eq(users.tenantId, tenants.id))
      .where(eq(users.id, me.sub))
      .limit(1)

    if (!user) return reply.code(404).send({ success: false, error: 'User not found' })
    return reply.send({ success: true, data: user })
  })

  // ── List users in tenant (admin only) ─────────────────────
  app.get('/', {
    preHandler: requireRole('admin'),
  }, async (req, reply) => {
    const me = req.user as any
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        mfaEnabled: users.mfaEnabled,
        emailVerified: users.emailVerified,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.tenantId, me.tenantId))

    return reply.send({ success: true, data: allUsers })
  })
}
