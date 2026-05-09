// ─────────────────────────────────────────────────────────
// CDT DB Service
//
// Owns the in-memory cache of active CDT codes. On startup,
// seeds the `procedures` table from the static fallback if
// empty, then loads all active (non-superseded) codes into
// memory. After each upload the cache is refreshed.
// ─────────────────────────────────────────────────────────

import { getDb, procedures, cdtUploads } from "@dentaliq/db";
import { sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { CDT_DATABASE, type CdtCode } from "../data/cdt-codes";

let _cache: Record<string, CdtCode> | null = null;

async function runMigrations(db: any): Promise<void> {
  const cols = [
    "version_label TEXT DEFAULT 'ODA 2024'",
    "effective_date TEXT DEFAULT '2024-01-01'",
    "superseded_by TEXT",
  ];
  for (const col of cols) {
    try {
      await db.run(sql.raw(`ALTER TABLE procedures ADD COLUMN ${col}`));
    } catch {
      /* column already exists */
    }
  }

  // Create cdt_uploads table
  await db.run(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS cdt_uploads (
      id TEXT PRIMARY KEY,
      uploaded_by TEXT NOT NULL,
      filename TEXT NOT NULL,
      format TEXT NOT NULL,
      version_label TEXT NOT NULL,
      effective_date TEXT NOT NULL,
      record_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `),
  );

  // Create cdt_supply_map table
  await db.run(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS cdt_supply_map (
      id TEXT PRIMARY KEY,
      cdt_prefix TEXT NOT NULL UNIQUE,
      supplies TEXT NOT NULL,
      notes TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `),
  );
}

export async function ensureCdtSeeded(): Promise<void> {
  const db = getDb();
  const rawDb = db as any;

  await runMigrations(rawDb);

  // Check if already seeded
  let existing: any[] = [];
  try {
    existing = await rawDb.all(sql.raw(`SELECT id FROM procedures LIMIT 1`));
  } catch {
    /* table may not exist yet — Drizzle will create on first insert */
  }

  if ((existing ?? []).length === 0) {
    const entries = Object.values(CDT_DATABASE);
    for (const entry of entries) {
      try {
        await rawDb.run(
          sql.raw(`
          INSERT OR IGNORE INTO procedures
            (id, code, description, category, typical_fee,
             requires_xray, requires_pre_auth, frequency_limit_months,
             notes, version_label, effective_date,
             created_at, updated_at)
          VALUES (
            '${createId()}',
            '${entry.code}',
            ${sqlStr(entry.description)},
            '${entry.category}',
            ${entry.typicalFee},
            ${entry.requiresXray ? 1 : 0},
            ${entry.requiresPreAuth ? 1 : 0},
            ${entry.frequencyLimitMonths ?? "NULL"},
            ${entry.notes ? sqlStr(entry.notes) : "NULL"},
            'ODA 2024',
            '2024-01-01',
            '${new Date().toISOString()}',
            '${new Date().toISOString()}'
          )
        `),
        );
      } catch {
        /* skip duplicates */
      }
    }

    // Record the seed as first upload
    try {
      await rawDb.run(
        sql.raw(`
        INSERT OR IGNORE INTO cdt_uploads
          (id, uploaded_by, filename, format, version_label,
           effective_date, record_count, status, created_at)
        VALUES (
          '${createId()}',
          'system',
          'cdt-codes.ts',
          'seed',
          'ODA 2024',
          '2024-01-01',
          ${entries.length},
          'active',
          '${new Date().toISOString()}'
        )
      `),
      );
    } catch {
      /* already seeded */
    }
  }

  await refreshCache();
}

export async function refreshCache(): Promise<void> {
  const rawDb = getDb() as any;
  let rows: any[] = [];
  try {
    rows = await rawDb.all(
      sql.raw(
        `SELECT * FROM procedures WHERE superseded_by IS NULL ORDER BY code ASC`,
      ),
    );
  } catch {
    return;
  }

  _cache = {};
  for (const row of rows) {
    _cache[row.code] = {
      code: row.code,
      description: row.description,
      category: row.category,
      typicalFee: row.typical_fee,
      requiresXray: Boolean(row.requires_xray),
      requiresPreAuth: Boolean(row.requires_pre_auth),
      frequencyLimitMonths: row.frequency_limit_months ?? undefined,
      notes: row.notes ?? undefined,
    };
  }
}

export function getCdtCodeCached(code: string): CdtCode | undefined {
  return (_cache ?? CDT_DATABASE)[code.toUpperCase()];
}

export function getAllCdtCodesCached(): CdtCode[] {
  return Object.values(_cache ?? CDT_DATABASE);
}

// Upsert a new version of CDT codes from parsed data.
// Supersedes all current active codes (marks them with the new version label),
// then inserts the new set. Old rows are kept for historical estimates.
export async function applyNewCdtVersion(
  entries: CdtCode[],
  versionLabel: string,
  effectiveDate: string,
  uploadedBy: string,
  filename: string,
  format: "csv" | "json",
): Promise<{ inserted: number; superseded: number }> {
  const rawDb = getDb() as any;

  // Mark all current active codes as superseded
  let superseded = 0;
  try {
    const result = await rawDb.run(
      sql.raw(
        `UPDATE procedures SET superseded_by = '${versionLabel}', updated_at = '${new Date().toISOString()}' WHERE superseded_by IS NULL`,
      ),
    );
    superseded = result?.rowsAffected ?? 0;
  } catch {
    /* noop */
  }

  // Mark previous upload records as superseded
  try {
    await rawDb.run(
      sql.raw(
        `UPDATE cdt_uploads SET status = 'superseded' WHERE status = 'active'`,
      ),
    );
  } catch {
    /* noop */
  }

  // Insert new codes
  let inserted = 0;
  const now = new Date().toISOString();
  for (const entry of entries) {
    try {
      await rawDb.run(
        sql.raw(`
        INSERT INTO procedures
          (id, code, description, category, typical_fee,
           requires_xray, requires_pre_auth, frequency_limit_months,
           notes, version_label, effective_date, created_at, updated_at)
        VALUES (
          '${createId()}',
          '${entry.code}',
          ${sqlStr(entry.description)},
          '${entry.category}',
          ${entry.typicalFee},
          ${entry.requiresXray ? 1 : 0},
          ${entry.requiresPreAuth ? 1 : 0},
          ${entry.frequencyLimitMonths ?? "NULL"},
          ${entry.notes ? sqlStr(entry.notes) : "NULL"},
          '${versionLabel}',
          '${effectiveDate}',
          '${now}',
          '${now}'
        )
      `),
      );
      inserted++;
    } catch {
      /* skip bad rows */
    }
  }

  // Record the upload
  try {
    await rawDb.run(
      sql.raw(`
      INSERT INTO cdt_uploads
        (id, uploaded_by, filename, format, version_label,
         effective_date, record_count, status, created_at)
      VALUES (
        '${createId()}',
        ${sqlStr(uploadedBy)},
        ${sqlStr(filename)},
        '${format}',
        ${sqlStr(versionLabel)},
        '${effectiveDate}',
        ${inserted},
        'active',
        '${now}'
      )
    `),
    );
  } catch {
    /* noop */
  }

  await refreshCache();
  return { inserted, superseded };
}

export async function listCdtVersions(): Promise<any[]> {
  const rawDb = getDb() as any;
  try {
    return await rawDb.all(
      sql.raw(`SELECT * FROM cdt_uploads ORDER BY created_at DESC`),
    );
  } catch {
    return [];
  }
}

function sqlStr(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}
