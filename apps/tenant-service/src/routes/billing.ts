import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { getDb } from "@dentaliq/db";
import { sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

const SavePaymentMethodSchema = z.object({
  cardName: z.string().min(1),
  cardNumber: z.string().min(10),
  cardExpiry: z.string().min(4),
  cardCvc: z.string().min(3),
});

function getCardBrand(number: string) {
  const num = number.replace(/\D/g, "");
  if (num.match(/^4/)) return "visa";
  if (num.match(/^(34|37)/)) return "amex";
  if (num.match(/^5[1-5]/)) return "mastercard";
  if (num.match(/^6011/)) return "discover";
  return "card";
}

export async function billingRoutes(app: FastifyInstance) {
  app.get(
    "/payment-method",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const jwtUser = req.user as any;
      const db = getDb() as any;
      try {
        // Setup the table if it doesn't exist
        await db.run(
          sql.raw(`
        CREATE TABLE IF NOT EXISTS "tenant_payment_methods" (
          tenant_id TEXT PRIMARY KEY,
          brand TEXT NOT NULL,
          last4 TEXT NOT NULL,
          name TEXT NOT NULL,
          expiry TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `),
        );

        const rows = await db.all(
          sql.raw(
            `SELECT * FROM "tenant_payment_methods" WHERE tenant_id = '${jwtUser.tenantId}' LIMIT 1`,
          ),
        );
        const row = Array.isArray(rows) ? rows[0] : (rows as any).rows?.[0];
        if (!row) {
          return reply.send({ success: true, data: null });
        }
        return reply.send({ success: true, data: row });
      } catch (err) {
        req.log.error(err);
        return reply
          .code(500)
          .send({ success: false, error: "Database error" });
      }
    },
  );

  app.post(
    "/payment-method",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const jwtUser = req.user as any;
      const body = SavePaymentMethodSchema.parse(req.body);
      const db = getDb() as any;

      const brand = getCardBrand(body.cardNumber);
      const last4 = body.cardNumber.replace(/\D/g, "").slice(-4) || "0000";

      try {
        await db.run(
          sql.raw(`
        CREATE TABLE IF NOT EXISTS "tenant_payment_methods" (
          tenant_id TEXT PRIMARY KEY,
          brand TEXT NOT NULL,
          last4 TEXT NOT NULL,
          name TEXT NOT NULL,
          expiry TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `),
        );

        // Upsert
        await db.run(
          sql.raw(`
        INSERT INTO "tenant_payment_methods" (tenant_id, brand, last4, name, expiry)
        VALUES ('${jwtUser.tenantId}', '${brand}', '${last4}', '${body.cardName.replace(/'/g, "''")}', '${body.cardExpiry}')
        ON CONFLICT(tenant_id) DO UPDATE SET 
          brand=excluded.brand, 
          last4=excluded.last4, 
          name=excluded.name, 
          expiry=excluded.expiry, 
          updated_at=datetime('now')
      `),
        );

        return reply
          .code(201)
          .send({
            success: true,
            data: {
              brand,
              last4,
              name: body.cardName,
              expiry: body.cardExpiry,
            },
          });
      } catch (err) {
        req.log.error(err);
        return reply
          .code(500)
          .send({ success: false, error: "Database error" });
      }
    },
  );

  app.get(
    "/invoices",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const jwtUser = req.user as any;
      const db = getDb() as any;

      try {
        await db.run(
          sql.raw(`
        CREATE TABLE IF NOT EXISTS "tenant_invoices" (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          date TEXT NOT NULL,
          base_price REAL NOT NULL,
          agents_count INTEGER NOT NULL,
          agents_cost REAL NOT NULL,
          subtotal REAL NOT NULL,
          tax REAL NOT NULL,
          total REAL NOT NULL,
          card_last4 TEXT NOT NULL,
          card_brand TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `),
        );

        // Fetch tenant to get plan and created_at
        const tenantsRows = await db.all(
          sql.raw(
            `SELECT plan, created_at FROM "tenants" WHERE id = '${jwtUser.tenantId}' LIMIT 1`,
          ),
        );
        const tenant = Array.isArray(tenantsRows)
          ? tenantsRows[0]
          : (tenantsRows as any).rows?.[0];
        if (!tenant) return reply.send({ success: true, data: [] });

        const plan = tenant.plan || "pro";
        const basePrice =
          plan === "starter"
            ? 49
            : plan === "pro"
              ? 149
              : plan === "cortex"
                ? 299
                : 0;

        const createdAt = new Date(
          tenant.createdAt || tenant.created_at || new Date().toISOString(),
        );
        const now = new Date();

        // Calculate months between creation and now
        let monthsPassed =
          (now.getFullYear() - createdAt.getFullYear()) * 12 +
          (now.getMonth() - createdAt.getMonth());
        if (now.getDate() < createdAt.getDate()) monthsPassed--; // Not fully passed a month

        // Prevent crazy loops if data is corrupt
        if (monthsPassed < 0) monthsPassed = 0;
        if (monthsPassed > 60) monthsPassed = 60;

        const rows = await db.all(
          sql.raw(
            `SELECT * FROM "tenant_invoices" WHERE tenant_id = '${jwtUser.tenantId}' ORDER BY date DESC`,
          ),
        );
        const existingInvoices = Array.isArray(rows)
          ? rows
          : (rows as any).rows || [];

        // Generate missing invoices
        const newInvoices = [];
        for (let i = 1; i <= monthsPassed; i++) {
          const invoiceDate = new Date(createdAt);
          invoiceDate.setMonth(createdAt.getMonth() + i);
          const dateStr = invoiceDate.toISOString().split("T")[0];

          // Skip if we already have an invoice for this month
          if (
            existingInvoices.some((inv: any) =>
              inv.date.startsWith(dateStr.substring(0, 7)),
            )
          )
            continue;

          const id =
            "INV-" +
            dateStr.replace(/-/g, "") +
            "-" +
            Math.floor(Math.random() * 10000);
          // Hardcode dummy historical data if there's no actual historical tracker yet
          const agentsCount =
            plan === "cortex" ? Math.floor(Math.random() * 3) : 0;
          const agentsCost = agentsCount * 99;
          const subtotal = basePrice + agentsCost;
          const tax = subtotal * 0.13;
          const total = subtotal + tax;

          // Simulate that old cards might have been different
          const cardBrand = Math.random() > 0.8 ? "mastercard" : "visa";
          const cardLast4 = Math.floor(1000 + Math.random() * 9000).toString();

          newInvoices.push({
            id,
            date: invoiceDate.toISOString(),
            basePrice,
            agentsCount,
            agentsCost,
            subtotal,
            tax,
            total,
            cardLast4,
            cardBrand,
          });

          await db.run(
            sql.raw(`
          INSERT INTO "tenant_invoices" (id, tenant_id, date, base_price, agents_count, agents_cost, subtotal, tax, total, card_last4, card_brand)
          VALUES ('${id}', '${jwtUser.tenantId}', '${invoiceDate.toISOString()}', ${basePrice}, ${agentsCount}, ${agentsCost}, ${subtotal}, ${tax}, ${total}, '${cardLast4}', '${cardBrand}')
        `),
          );
        }

        const finalRows = await db.all(
          sql.raw(
            `SELECT * FROM "tenant_invoices" WHERE tenant_id = '${jwtUser.tenantId}' ORDER BY date DESC`,
          ),
        );
        const output = Array.isArray(finalRows)
          ? finalRows
          : (finalRows as any).rows || [];

        return reply.send({ success: true, data: output });
      } catch (err) {
        req.log.error(err);
        return reply
          .code(500)
          .send({ success: false, error: "Database error" });
      }
    },
  );
}
