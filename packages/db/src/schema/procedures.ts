import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

export const procedures = sqliteTable("procedures", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  category: text("category", {
    enum: ["diagnostic", "preventive", "basic", "major", "ortho", "implant"],
  }).notNull(),
  typicalFee: real("typical_fee").notNull(),
  requiresXray: integer("requires_xray", { mode: "boolean" })
    .notNull()
    .default(false),
  requiresPreAuth: integer("requires_pre_auth", { mode: "boolean" })
    .notNull()
    .default(false),
  frequencyLimitMonths: integer("frequency_limit_months"),
  notes: text("notes"),
  versionLabel: text("version_label").default("ODA 2024"),
  effectiveDate: text("effective_date").default("2024-01-01"),
  supersededBy: text("superseded_by"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type Procedure = typeof procedures.$inferSelect;
export type NewProcedure = typeof procedures.$inferInsert;
