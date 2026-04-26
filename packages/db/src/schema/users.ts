import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { createId } from '@paralleldrive/cuid2'
import { tenants } from './tenants'

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'dentist', 'front_desk'] }).notNull().default('front_desk'),
  mfaEnabled: integer('mfa_enabled', { mode: 'boolean' }).notNull().default(false),
  mfaSecret: text('mfa_secret'),
  mfaBackupCodes: text('mfa_backup_codes'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  emailVerifyToken: text('email_verify_token'),
  passwordResetToken: text('password_reset_token'),
  passwordResetExpires: text('password_reset_expires'),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: text('expires_at').notNull(),
  revokedAt: text('revoked_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export type RefreshToken = typeof refreshTokens.$inferSelect
