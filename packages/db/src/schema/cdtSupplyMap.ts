import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

export const cdtSupplyMap = sqliteTable("cdt_supply_map", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  cdtPrefix: text("cdt_prefix").notNull().unique(),
  supplies: text("supplies").notNull(),
  notes: text("notes"),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type CdtSupplyMapEntry = typeof cdtSupplyMap.$inferSelect;
