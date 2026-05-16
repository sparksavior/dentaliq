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

  // ── Send Welcome Email ─────────────────────────────────────
  app.post('/welcome', async (req, reply) => {
    const me = req.user as any
    const [user] = await db
      .select({
        name: users.name,
        email: users.email,
        clinicName: tenants.name,
        plan: tenants.plan,
      })
      .from(users)
      .innerJoin(tenants, eq(users.tenantId, tenants.id))
      .where(eq(users.id, me.sub))
      .limit(1)

    if (!user) return reply.code(404).send({ success: false, error: 'User not found' })

    const { EmailService } = await import('../services/emailService')
    const emailService = new EmailService()

    console.log(`[WelcomeRoute] Triggering emails for ${user.email} (${user.plan})`)

    // Welcome email
    emailService.sendWelcomeEmail(user.email, user.name, user.clinicName, user.plan)
      .then(() => console.log(`[WelcomeRoute] Welcome email sent to ${user.email}`))
      .catch((err) => console.error(`[WelcomeRoute] Welcome email failed for ${user.email}:`, err))

    // Legal agreement email — sent once, when user first launches the dashboard
    emailService.sendAgreementEmail(user.email, user.name)
      .then(() => console.log(`[WelcomeRoute] Agreement email sent to ${user.email}`))
      .catch((err) => console.error(`[WelcomeRoute] Agreement email failed for ${user.email}:`, err))

    return reply.send({ success: true, message: 'Welcome email triggered' })
  })
}
