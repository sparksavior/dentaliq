import type { FastifyInstance } from 'fastify'
import { requireAuth, requireRole } from '../middleware/requireAuth'
import { getDb, users, tenants, inviteTokens } from '@dentaliq/db'
import { eq, and, isNull, gt } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import bcrypt from 'bcryptjs'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import { getEnv } from '@dentaliq/config'

export const PERMISSION_KEYS = [
  'dashboard',
  'estimates',
  'claims',
  'patients',
  'analytics',
  'cortex_agents',
  'cortex_inbox',
  'support',
  'settings',
] as const

export type PermissionKey = typeof PERMISSION_KEYS[number]

export async function userRoutes(app: FastifyInstance) {
  const db = getDb()
  const env = getEnv()

  // ── Public invite routes (no auth required) ───────────────────────
  app.register(async (publicApi) => {
    // Validate an invite token and return invite details
    publicApi.get('/invite/:token', async (req, reply) => {
      const { token } = req.params as { token: string }
      const now = new Date().toISOString()

      const [invite] = await db
        .select()
        .from(inviteTokens)
        .where(eq(inviteTokens.token, token))
        .limit(1)

      if (!invite) return reply.code(404).send({ success: false, error: 'Invite not found or expired' })
      if (invite.expiresAt < now) return reply.code(410).send({ success: false, error: 'This invite link has expired. Ask your admin to send a new one.' })
      if (invite.acceptedAt) return reply.code(409).send({ success: false, error: 'This invite has already been accepted.' })

      // Fetch clinic name + admin name
      const [tenant] = await db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, invite.tenantId)).limit(1)
      const [admin] = await db.select({ name: users.name }).from(users).where(eq(users.id, invite.invitedByUserId)).limit(1)

      return reply.send({
        success: true,
        data: {
          email: invite.email,
          name: invite.name,
          clinicName: tenant?.name ?? 'Your clinic',
          adminName: admin?.name ?? 'Your admin',
          permissions: JSON.parse(invite.permissions ?? '[]') as PermissionKey[],
          hasMfaSecret: !!invite.mfaSetupSecret,
        },
      })
    })

    // Generate TOTP secret for MFA setup during onboarding
    publicApi.post('/invite/:token/setup-mfa', async (req, reply) => {
      const { token } = req.params as { token: string }
      const now = new Date().toISOString()

      const [invite] = await db
        .select()
        .from(inviteTokens)
        .where(and(eq(inviteTokens.token, token), isNull(inviteTokens.acceptedAt)))
        .limit(1)

      if (!invite || invite.expiresAt < now) {
        return reply.code(404).send({ success: false, error: 'Invalid or expired invite' })
      }

      let secret = invite.mfaSetupSecret
      let backupCodes: string[]

      if (!secret) {
        secret = authenticator.generateSecret(20)
        backupCodes = Array.from({ length: 8 }, () =>
          (createId().slice(0, 4) + '-' + createId().slice(0, 4)).toUpperCase()
        )
        await db
          .update(inviteTokens)
          .set({ mfaSetupSecret: secret, mfaBackupCodes: JSON.stringify(backupCodes) })
          .where(eq(inviteTokens.token, token))
      } else {
        backupCodes = JSON.parse(invite.mfaBackupCodes ?? '[]')
      }

      const otpAuthUrl = authenticator.keyuri(invite.email, env.TOTP_ISSUER, secret)
      const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl)

      return reply.send({ success: true, data: { secret, qrCodeDataUrl, backupCodes } })
    })

    // Complete onboarding: set password + verify MFA + agree TOS → create user account
    publicApi.post('/invite/:token/complete', async (req, reply) => {
      const { token } = req.params as { token: string }
      const { password, mfaCode, tosAgreed } = req.body as {
        password: string
        mfaCode: string
        tosAgreed: boolean
      }
      const now = new Date().toISOString()

      if (!password || password.length < 8) {
        return reply.code(400).send({ success: false, error: 'Password must be at least 8 characters' })
      }
      if (!mfaCode || !tosAgreed) {
        return reply.code(400).send({ success: false, error: 'MFA verification and ToS agreement are required' })
      }

      const [invite] = await db
        .select()
        .from(inviteTokens)
        .where(and(eq(inviteTokens.token, token), isNull(inviteTokens.acceptedAt)))
        .limit(1)

      if (!invite || invite.expiresAt < now) {
        return reply.code(404).send({ success: false, error: 'Invalid or expired invite' })
      }

      if (!invite.mfaSetupSecret) {
        return reply.code(400).send({ success: false, error: 'MFA setup not started. Please go back and set up authenticator.' })
      }

      const validMfa = authenticator.verify({ token: mfaCode, secret: invite.mfaSetupSecret })
      if (!validMfa) {
        return reply.code(400).send({ success: false, error: 'Invalid authenticator code. Please try again.' })
      }

      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, invite.email.toLowerCase()))
        .limit(1)
      if (existing) {
        return reply.code(409).send({ success: false, error: 'An account with this email already exists.' })
      }

      const passwordHash = await bcrypt.hash(password, 12)
      const [newUser] = await db
        .insert(users)
        .values({
          tenantId: invite.tenantId,
          email: invite.email.toLowerCase(),
          name: invite.name,
          passwordHash,
          role: 'front_desk',
          mfaEnabled: true,
          mfaSecret: invite.mfaSetupSecret,
          mfaBackupCodes: invite.mfaBackupCodes,
          emailVerified: true,
          permissions: invite.permissions,
          invitedBy: invite.invitedByUserId,
        })
        .returning()

      await db
        .update(inviteTokens)
        .set({ acceptedAt: now, createdUserId: newUser.id })
        .where(eq(inviteTokens.id, invite.id))

      const { AuthController } = await import('../controllers/authController')
      const ctrl = new AuthController(app)
      const tokens = await (ctrl as any).issueTokens(newUser)

      let permissions: string[] = []
      try { permissions = JSON.parse(newUser.permissions ?? '[]') } catch {}

      return reply.send({
        success: true,
        data: {
          accessToken: tokens.accessToken,
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            tenantId: newUser.tenantId,
            mfaEnabled: true,
            permissions,
            invitedBy: newUser.invitedBy,
          },
        },
      })
    })
  })

  // ── Authenticated routes (requireAuth hook applied here) ─────────
  app.register(async (auth) => {
    auth.addHook('onRequest', requireAuth(auth))

    // ── Current user ──────────────────────────────────────────
    auth.get('/me', async (req, reply) => {
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
          permissions: users.permissions,
          invitedBy: users.invitedBy,
          createdAt: users.createdAt,
          plan: tenants.plan,
          status: tenants.status,
        })
        .from(users)
        .innerJoin(tenants, eq(users.tenantId, tenants.id))
        .where(eq(users.id, me.sub))
        .limit(1)

      if (!user) return reply.code(404).send({ success: false, error: 'User not found' })

      let permissions: string[] = []
      try { permissions = JSON.parse(user.permissions ?? '[]') } catch {}

      return reply.send({
        success: true,
        data: { ...user, permissions },
      })
    })

    // ── List users in tenant (admin only) ─────────────────────
    auth.get('/', {
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
          permissions: users.permissions,
          invitedBy: users.invitedBy,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.tenantId, me.tenantId))

      const usersWithParsedPerms = allUsers.map(u => {
        let permissions: string[] = []
        try { permissions = JSON.parse(u.permissions ?? '[]') } catch {}
        return { ...u, permissions }
      })

      return reply.send({ success: true, data: usersWithParsedPerms })
    })

    // ── List pending invites (admin only) ─────────────────────
    auth.get('/invites/pending', {
      preHandler: requireRole('admin'),
    }, async (req, reply) => {
      const me = req.user as any
      const now = new Date().toISOString()
      const pending = await db
        .select()
        .from(inviteTokens)
        .where(
          and(
            eq(inviteTokens.tenantId, me.tenantId),
            isNull(inviteTokens.acceptedAt),
            gt(inviteTokens.expiresAt, now),
          )
        )

      const withPerms = pending.map(i => ({
        id: i.id,
        email: i.email,
        name: i.name,
        permissions: (() => { try { return JSON.parse(i.permissions ?? '[]') } catch { return [] } })(),
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
        status: 'pending',
      }))

      return reply.send({ success: true, data: withPerms })
    })

    // ── Invite a new team member (admin only) ─────────────────
    auth.post('/invite', {
      preHandler: requireRole('admin'),
    }, async (req, reply) => {
      const me = req.user as any
      const { email, name, permissions } = req.body as {
        email: string
        name: string
        permissions: string[]
      }

      if (!email || !name) {
        return reply.code(400).send({ success: false, error: 'Email and name are required' })
      }

      const validPerms = (permissions ?? []).filter(p => PERMISSION_KEYS.includes(p as PermissionKey))

      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, email.toLowerCase()), eq(users.tenantId, me.tenantId)))
        .limit(1)
      if (existingUser) {
        return reply.code(409).send({ success: false, error: 'A team member with this email already exists.' })
      }

      const now = new Date().toISOString()
      const [existingInvite] = await db
        .select({ id: inviteTokens.id })
        .from(inviteTokens)
        .where(
          and(
            eq(inviteTokens.email, email.toLowerCase()),
            eq(inviteTokens.tenantId, me.tenantId),
            isNull(inviteTokens.acceptedAt),
            gt(inviteTokens.expiresAt, now),
          )
        )
        .limit(1)
      if (existingInvite) {
        return reply.code(409).send({ success: false, error: 'An invite has already been sent to this email and is still pending.' })
      }

      const token = createId() + createId()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      await db.insert(inviteTokens).values({
        token,
        email: email.toLowerCase(),
        name: name.trim(),
        tenantId: me.tenantId,
        invitedByUserId: me.sub,
        permissions: JSON.stringify(validPerms),
        expiresAt,
      })

      const [tenant] = await db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, me.tenantId)).limit(1)
      const [admin] = await db.select({ name: users.name }).from(users).where(eq(users.id, me.sub)).limit(1)

      const inviteUrl = `${env.APP_URL}/invite/${token}`
      const { EmailService } = await import('../services/emailService')
      const emailService = new EmailService()
      emailService
        .sendInviteEmail(email.toLowerCase(), name.trim(), tenant?.name ?? 'your clinic', admin?.name ?? 'your admin', inviteUrl)
        .catch(err => console.error('[InviteRoute] Failed to send invite email:', err))

      return reply.code(201).send({ success: true, data: { email, name, expiresAt } })
    })

    // ── Update team member permissions (admin only) ───────────
    auth.patch('/:id/permissions', {
      preHandler: requireRole('admin'),
    }, async (req, reply) => {
      const me = req.user as any
      const { id } = req.params as { id: string }
      const { permissions } = req.body as { permissions: string[] }

      const [target] = await db
        .select({ id: users.id, role: users.role, tenantId: users.tenantId })
        .from(users)
        .where(eq(users.id, id))
        .limit(1)

      if (!target || target.tenantId !== me.tenantId) {
        return reply.code(404).send({ success: false, error: 'Team member not found' })
      }
      if (target.role === 'admin') {
        return reply.code(403).send({ success: false, error: 'Cannot modify permissions for admin accounts' })
      }
      if (id === me.sub) {
        return reply.code(403).send({ success: false, error: 'You cannot modify your own permissions' })
      }

      const validPerms = (permissions ?? []).filter(p => PERMISSION_KEYS.includes(p as PermissionKey))
      await db.update(users).set({ permissions: JSON.stringify(validPerms), updatedAt: new Date().toISOString() }).where(eq(users.id, id))

      return reply.send({ success: true, data: { id, permissions: validPerms } })
    })

    // ── Remove team member (admin only) ──────────────────────
    auth.delete('/:id', {
      preHandler: requireRole('admin'),
    }, async (req, reply) => {
      const me = req.user as any
      const { id } = req.params as { id: string }

      if (id === me.sub) {
        return reply.code(403).send({ success: false, error: 'You cannot remove yourself from the team' })
      }

      const [target] = await db
        .select({ id: users.id, role: users.role, tenantId: users.tenantId })
        .from(users)
        .where(eq(users.id, id))
        .limit(1)

      if (!target || target.tenantId !== me.tenantId) {
        return reply.code(404).send({ success: false, error: 'Team member not found' })
      }
      if (target.role === 'admin') {
        return reply.code(403).send({ success: false, error: 'Cannot remove admin accounts via this endpoint' })
      }

      await db.delete(users).where(eq(users.id, id))

      return reply.send({ success: true })
    })

    // ── Revoke pending invite (admin only) ───────────────────
    auth.delete('/invites/:inviteId', {
      preHandler: requireRole('admin'),
    }, async (req, reply) => {
      const me = req.user as any
      const { inviteId } = req.params as { inviteId: string }

      const [invite] = await db
        .select({ id: inviteTokens.id, tenantId: inviteTokens.tenantId })
        .from(inviteTokens)
        .where(eq(inviteTokens.id, inviteId))
        .limit(1)

      if (!invite || invite.tenantId !== me.tenantId) {
        return reply.code(404).send({ success: false, error: 'Invite not found' })
      }

      await db.delete(inviteTokens).where(eq(inviteTokens.id, inviteId))
      return reply.send({ success: true })
    })

    // ── Send Welcome Email ─────────────────────────────────────
    auth.post('/welcome', async (req, reply) => {
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

      emailService.sendWelcomeEmail(user.email, user.name, user.clinicName, user.plan)
        .catch((err) => console.error(`[WelcomeRoute] Welcome email failed:`, err))

      emailService.sendAgreementEmail(user.email, user.name)
        .catch((err) => console.error(`[WelcomeRoute] Agreement email failed:`, err))

      return reply.send({ success: true, message: 'Welcome email triggered' })
    })
  })
}
