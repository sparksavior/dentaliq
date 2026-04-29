import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { createId } from '@paralleldrive/cuid2'

export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  schemaName: text('schema_name').notNull().unique(),
  plan: text('plan', { enum: ['starter', 'pro', 'enterprise'] }).notNull().default('pro'),
  status: text('status', { enum: ['trial', 'active', 'suspended'] }).notNull().default('trial'),
  pmsType: text('pms_type', { enum: ['open_dental', 'dentrix', 'cleardent', 'none'] }).notNull().default('none'),
  pmsConnected: integer('pms_connected', { mode: 'boolean' }).notNull().default(false),
  pmsApiKey: text('pms_api_key'),
  stripeCustomerId: text('stripe_customer_id'),
  trialEndsAt: text('trial_ends_at'),
  billingDate: text('billing_date'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert
