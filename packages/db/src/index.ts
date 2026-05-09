// ─────────────────────────────────────────────────────────
// DentalIQ — Database layer
//
// DB_TYPE=sqlite   (default) — no Docker, file at DATABASE_PATH
// DB_TYPE=postgres           — requires DATABASE_URL
//
// Switch by setting DB_TYPE in .env. Everything else is the same.
// ─────────────────────────────────────────────────────────

import * as tenantsSchema from "./schema/tenants";
import * as usersSchema from "./schema/users";
import * as auditSchema from "./schema/audit";
import * as proceduresSchema from "./schema/procedures";
import * as agentTasksSchema from "./schema/agentTasks";
import * as supportTicketsSchema from "./schema/supportTickets";

export const schema = {
  ...tenantsSchema,
  ...usersSchema,
  ...auditSchema,
  ...proceduresSchema,
  ...agentTasksSchema,
  ...supportTicketsSchema,
};

export type Db = ReturnType<typeof getDb>;

let _db: ReturnType<typeof buildDb> | undefined;

function buildDb() {
  const type = (process.env.DB_TYPE ?? "sqlite") as "sqlite" | "postgres";

  if (type === "postgres") {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DB_TYPE=postgres requires DATABASE_URL in .env");

    // Dynamic import so pg is only loaded when actually needed
    const { Pool } = require("pg");
    const { drizzle } = require("drizzle-orm/node-postgres");
    const pool = new Pool({ connectionString: url });
    return drizzle(pool, { schema }) as ReturnType<
      typeof import("drizzle-orm/node-postgres").drizzle
    >;
  }

  // SQLite via @libsql/client (default — works without Docker)
  const { createClient } = require("@libsql/client");
  const { drizzle } = require("drizzle-orm/libsql");
  const path = require("path");
  const dbPath = process.env.DATABASE_PATH ?? "dentaliq.db";
  const absolutePath = path.isAbsolute(dbPath)
    ? dbPath
    : path.join(__dirname, "../../../", dbPath);
  console.log(
    `[DATABASE_INIT] Service ${process.env.SERVICE_NAME || "unknown"} using DB at: ${absolutePath}`,
  );
  const url = absolutePath.startsWith("file:")
    ? absolutePath
    : `file:${absolutePath}`;
  const client = createClient({ url });
  return drizzle(client, { schema }) as ReturnType<
    typeof import("drizzle-orm/libsql").drizzle
  >;
}

export function getDb() {
  if (!_db) _db = buildDb();
  return _db;
}

export * from "./schema/tenants";
export * from "./schema/users";
export * from "./schema/audit";
export * from "./schema/procedures";
export * from "./schema/agentTasks";
export * from "./schema/supportTickets";
