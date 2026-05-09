import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

export const supportTickets = sqliteTable("support_tickets", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull(),
  clinicName: text("clinic_name").notNull().default(""),
  userName: text("user_name").notNull().default(""),
  userEmail: text("user_email").notNull().default(""),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status", { enum: ["open", "in_progress", "resolved"] })
    .notNull()
    .default("open"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const supportMessages = sqliteTable("support_messages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  ticketId: text("ticket_id").notNull(),
  senderType: text("sender_type", { enum: ["user", "admin"] }).notNull(),
  senderName: text("sender_name").notNull(),
  message: text("message").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type SupportTicket = typeof supportTickets.$inferSelect;
export type NewSupportTicket = typeof supportTickets.$inferInsert;
export type SupportMessage = typeof supportMessages.$inferSelect;
export type NewSupportMessage = typeof supportMessages.$inferInsert;
