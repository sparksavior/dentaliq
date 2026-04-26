import { sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createId } from '@paralleldrive/cuid2'

// Audit log — PHIPA required, append-only
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  tenantId: text('tenant_id').notNull(),
  userId: text('user_id'),
  service: text('service').notNull(),
  action: text('action').notNull(),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: text('metadata'),   // JSON string in SQLite
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert
