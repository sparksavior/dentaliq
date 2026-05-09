import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { listCdtVersions, applyNewCdtVersion } from "../services/cdtDb";
import type { CdtCode, ProcedureCategory } from "../data/cdt-codes";

const VALID_CATEGORIES = new Set([
  "diagnostic",
  "preventive",
  "basic",
  "major",
  "ortho",
  "implant",
]);

const CdtEntrySchema = z.object({
  code: z.string().min(4).max(10).toUpperCase(),
  description: z.string().min(1),
  category: z.enum([
    "diagnostic",
    "preventive",
    "basic",
    "major",
    "ortho",
    "implant",
  ]),
  typicalFee: z.number().positive(),
  requiresXray: z.boolean().default(false),
  requiresPreAuth: z.boolean().default(false),
  frequencyLimitMonths: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

const UploadBodySchema = z.object({
  versionLabel: z.string().min(1),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  filename: z.string().min(1),
  format: z.enum(["csv", "json"]),
  data: z.string().min(1),
});

export async function cdtRoutes(app: FastifyInstance) {
  // GET /cdt/versions — list all uploaded versions
  app.get(
    "/cdt/versions",
    { preHandler: requireAuth(app) },
    async (_req, reply) => {
      const versions = await listCdtVersions();
      return reply.send({ success: true, data: versions });
    },
  );

  // POST /cdt/upload — parse and apply a new CDT version
  app.post(
    "/cdt/upload",
    { preHandler: requireAuth(app) },
    async (req, reply) => {
      const jwtUser = req.user as any;
      const body = UploadBodySchema.parse(req.body);

      let entries: CdtCode[];
      try {
        entries =
          body.format === "json" ? parseJson(body.data) : parseCsv(body.data);
      } catch (err: any) {
        return reply
          .code(400)
          .send({ success: false, error: `Parse error: ${err.message}` });
      }

      if (entries.length === 0) {
        return reply
          .code(400)
          .send({
            success: false,
            error: "No valid CDT codes found in upload.",
          });
      }

      const result = await applyNewCdtVersion(
        entries,
        body.versionLabel,
        body.effectiveDate,
        jwtUser.email ?? jwtUser.sub ?? "admin",
        body.filename,
        body.format,
      );

      return reply.code(201).send({ success: true, data: result });
    },
  );
}

// ── Parsers ───────────────────────────────────────────────

function parseJson(raw: string): CdtCode[] {
  const arr = JSON.parse(raw);
  if (!Array.isArray(arr)) throw new Error("JSON must be an array of objects");
  return arr
    .map((item: unknown) => {
      const parsed = CdtEntrySchema.safeParse(item);
      return parsed.success ? parsed.data : null;
    })
    .filter((x): x is CdtCode => x !== null);
}

function parseCsv(raw: string): CdtCode[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) throw new Error("CSV must have a header row and data");

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const required = ["code", "description", "category", "typicalfee"];
  for (const req of required) {
    if (!header.includes(req))
      throw new Error(`CSV missing required column: ${req}`);
  }

  const idx = (name: string) => header.indexOf(name);

  const entries: CdtCode[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const raw = {
      code: cells[idx("code")]?.trim().toUpperCase(),
      description: cells[idx("description")]?.trim(),
      category: cells[idx("category")]?.trim().toLowerCase(),
      typicalFee: parseFloat(cells[idx("typicalfee")] ?? "0"),
      requiresXray:
        (cells[idx("requiresxray")] ?? "false").toLowerCase() === "true",
      requiresPreAuth:
        (cells[idx("requirespreauth")] ?? "false").toLowerCase() === "true",
      frequencyLimitMonths: cells[idx("frequencylimitmonths")]
        ? parseInt(cells[idx("frequencylimitmonths")], 10) || undefined
        : undefined,
      notes: cells[idx("notes")]?.trim() || undefined,
    };

    if (
      raw.code &&
      raw.description &&
      VALID_CATEGORIES.has(raw.category ?? "")
    ) {
      entries.push(raw as CdtCode);
    }
  }

  return entries;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
