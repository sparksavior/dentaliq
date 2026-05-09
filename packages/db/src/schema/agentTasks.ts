import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

// Global agent_tasks table — shared across tenants with tenantId isolation
export const agentTasks = sqliteTable("agent_tasks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull(),
  clinicId: text("clinic_id"),
  agentId: text("agent_id", {
    enum: ["billing", "recall", "review", "supply", "treatment", "hygienist"],
  }).notNull(),
  taskType: text("task_type").notNull(), // pre_auth_letter | recall_message | review_request | supply_order | treatment_followup
  cdtCode: text("cdt_code"),
  patientId: text("patient_id"),
  patientName: text("patient_name"),
  riskLevel: text("risk_level", { enum: ["high", "medium", "low"] }),
  content: text("content").notNull(), // AI-generated narrative / message
  status: text("status", { enum: ["pending", "approved", "rejected", "sent"] })
    .notNull()
    .default("pending"),
  approvedBy: text("approved_by"),
  approvedAt: text("approved_at"),
  metadata: text("metadata"), // JSON string for additional context
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type AgentTask = typeof agentTasks.$inferSelect;
export type NewAgentTask = typeof agentTasks.$inferInsert;
