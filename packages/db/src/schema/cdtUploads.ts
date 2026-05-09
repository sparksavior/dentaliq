import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

export const cdtUploads = sqliteTable("cdt_uploads", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  uploadedBy: text("uploaded_by").notNull(),
  filename: text("filename").notNull(),
  format: text("format", { enum: ["csv", "json", "seed"] }).notNull(),
  versionLabel: text("version_label").notNull(),
  effectiveDate: text("effective_date").notNull(),
  recordCount: integer("record_count").notNull().default(0),
  status: text("status", { enum: ["active", "superseded"] })
    .notNull()
    .default("active"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type CdtUpload = typeof cdtUploads.$inferSelect;
export type NewCdtUpload = typeof cdtUploads.$inferInsert;
