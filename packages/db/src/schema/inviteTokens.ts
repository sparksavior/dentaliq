import { sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createId } from '@paralleldrive/cuid2'
import { tenants } from './tenants'

export const inviteTokens = sqliteTable('invite_tokens', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  // The URL-safe token mailed to the invitee
  token: text('token').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  invitedByUserId: text('invited_by_user_id').notNull(),
  // JSON array of permission keys e.g. '["dashboard","patients","estimates"]'
  permissions: text('permissions').notNull().default('[]'),
  // MFA method chosen during onboarding ('totp' | 'email')
  mfaMethod: text('mfa_method').notNull().default('totp'),
  // Temporary TOTP secret stored during onboarding (also used as OTP code for email method)
  mfaSetupSecret: text('mfa_setup_secret'),
  mfaBackupCodes: text('mfa_backup_codes'), // JSON array
  expiresAt: text('expires_at').notNull(),
  acceptedAt: text('accepted_at'),
  createdUserId: text('created_user_id'), // set once the user account is created
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export type InviteToken = typeof inviteTokens.$inferSelect
export type NewInviteToken = typeof inviteTokens.$inferInsert
