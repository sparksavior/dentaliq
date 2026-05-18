import { sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createId } from '@paralleldrive/cuid2'
import { users } from './users'

// Additional authenticator devices per user.
// The primary device's secret lives on users.mfa_secret.
// Extra devices (added from Settings) are stored here.
export const mfaDevices = sqliteTable('mfa_devices', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  label: text('label').notNull().default('Authenticator'),
  secret: text('secret').notNull(),
  lastUsedAt: text('last_used_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export type MfaDevice = typeof mfaDevices.$inferSelect
export type NewMfaDevice = typeof mfaDevices.$inferInsert
