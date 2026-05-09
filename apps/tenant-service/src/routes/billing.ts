import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { getDb, tenants } from "@dentaliq/db";
import { requireAuth } from "../middleware/requireAuth";
import { createLogger } from "@dentaliq/logger";
import { getEnv } from "@dentaliq/config";

const logger = createLogger("billing-routes");

// ─────────────────────────────────────────────────────────
// Plan pricing — single source of truth
// ─────────────────────────────────────────────────────────
export const PLAN_PRICES: Record<string, number> = {
  starter: 49,
  pro: 149,
  enterprise: 249,
  cortex: 299,
};
export const AGENT_PRICE_PER_MONTH = 99;

// ─────────────────────────────────────────────────────────
// Stripe client — lazy singleton, gracefully disabled when
// STRIPE_SECRET_KEY is not set
// ─────────────────────────────────────────────────────────
let _stripe: any = null;

function getStripe() {
  const env = getEnv();
  if (!env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) {
    const Stripe = require("stripe");
    _stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });
  }
  return _stripe;
}

const ConfirmPaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(2),
});

const ChangePlanSchema = z.object({
  plan: z.enum(["starter", "pro", "enterprise", "cortex"]),
});

export async function billingRoutes(app: FastifyInstance) {
  const db = getDb();
  await ensureBillingTables();

  // ── GET /billing/config — Stripe publishable key for frontend ──
  app.get("/config", async (_req, reply) => {
    const env = getEnv();
    return reply.send({
      success: true,
      data: {
        stripePublishableKey: env.STRIPE_PUBLISHABLE_KEY ?? null,
        stripeEnabled: !!env.STRIPE_SECRET_KEY,
        plans: PLAN_PRICES,
        agentPrice: AGENT_PRICE_PER_MONTH,
      },
    });
  });

  // ── POST /billing/setup-intent — Stripe SetupIntent for card collection ─
  app.post(
    "/setup-intent",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const stripe = getStripe();
      if (!stripe) {
        return reply
          .code(503)
          .send({
            success: false,
            error: "Payment processing not configured. Contact support.",
          });
      }

      const jwtUser = req.user as any;
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, jwtUser.tenantId))
        .limit(1);
      if (!tenant)
        return reply
          .code(404)
          .send({ success: false, error: "Tenant not found" });

      let customerId = tenant.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: jwtUser.email,
          name: tenant.name,
          metadata: { tenantId: tenant.id, plan: tenant.plan },
        });
        customerId = customer.id;
        await db
          .update(tenants)
          .set({ stripeCustomerId: customerId })
          .where(eq(tenants.id, tenant.id));
      }

      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
      });

      return reply.send({
        success: true,
        data: { clientSecret: setupIntent.client_secret },
      });
    },
  );

  // ── POST /billing/payment-method — attach tokenized Stripe card ──
  app.post(
    "/payment-method",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const stripe = getStripe();
      const jwtUser = req.user as any;
      const { paymentMethodId } = ConfirmPaymentMethodSchema.parse(req.body);
      const db2 = getDb() as any;

      if (!stripe) {
        await db2.run(
          sql`INSERT INTO tenant_payment_methods (tenant_id, stripe_pm_id, brand, last4, exp_month, exp_year, name)
            VALUES (${jwtUser.tenantId}, ${paymentMethodId}, 'card', '****', 0, 0, 'Card on file')
            ON CONFLICT(tenant_id) DO UPDATE SET stripe_pm_id=excluded.stripe_pm_id, updated_at=datetime('now')`,
        );
        return reply
          .code(201)
          .send({ success: true, data: { message: "Payment method saved" } });
      }

      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, jwtUser.tenantId))
        .limit(1);
      if (!tenant || !tenant.stripeCustomerId) {
        return reply
          .code(400)
          .send({
            success: false,
            error: "No Stripe customer. Create a setup intent first.",
          });
      }

      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: tenant.stripeCustomerId,
      });
      await stripe.customers.update(tenant.stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
      const card = pm.card ?? {};

      await db2.run(
        sql`INSERT INTO tenant_payment_methods (tenant_id, stripe_pm_id, brand, last4, exp_month, exp_year, name)
          VALUES (${jwtUser.tenantId}, ${paymentMethodId}, ${card.brand ?? "card"}, ${card.last4 ?? "****"},
                  ${card.exp_month ?? 0}, ${card.exp_year ?? 0}, ${pm.billing_details?.name ?? ""})
          ON CONFLICT(tenant_id) DO UPDATE SET
            stripe_pm_id=excluded.stripe_pm_id, brand=excluded.brand, last4=excluded.last4,
            exp_month=excluded.exp_month, exp_year=excluded.exp_year, name=excluded.name,
            updated_at=datetime('now')`,
      );

      return reply.code(201).send({
        success: true,
        data: {
          brand: card.brand,
          last4: card.last4,
          expMonth: card.exp_month,
          expYear: card.exp_year,
        },
      });
    },
  );

  // ── GET /billing/payment-method ──────────────────────────────
  app.get(
    "/payment-method",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const jwtUser = req.user as any;
      const db2 = getDb() as any;
      const rows = await db2.all(
        sql`SELECT brand, last4, exp_month, exp_year, name FROM tenant_payment_methods WHERE tenant_id = ${jwtUser.tenantId} LIMIT 1`,
      );
      return reply.send({
        success: true,
        data: (Array.isArray(rows) ? rows[0] : null) ?? null,
      });
    },
  );

  // ── POST /billing/subscribe — create/update subscription ─────
  app.post(
    "/subscribe",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const stripe = getStripe();
      if (!stripe) {
        return reply
          .code(503)
          .send({
            success: false,
            error: "Stripe not configured. Set STRIPE_SECRET_KEY.",
          });
      }

      const jwtUser = req.user as any;
      const { plan } = ChangePlanSchema.parse(req.body);

      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, jwtUser.tenantId))
        .limit(1);
      if (!tenant || !tenant.stripeCustomerId) {
        return reply
          .code(400)
          .send({
            success: false,
            error: "No payment method on file. Add a card first.",
          });
      }

      const env = getEnv() as any;
      const priceId = env[`STRIPE_PRICE_${plan.toUpperCase()}`];
      if (!priceId) {
        return reply.code(503).send({
          success: false,
          error: `Stripe price ID for plan "${plan}" not configured. Set STRIPE_PRICE_${plan.toUpperCase()}.`,
        });
      }

      const subs = await stripe.subscriptions.list({
        customer: tenant.stripeCustomerId,
        status: "active",
        limit: 1,
      });
      let subscription;

      if (subs.data.length > 0) {
        const existing = subs.data[0];
        subscription = await stripe.subscriptions.update(existing.id, {
          items: [{ id: existing.items.data[0].id, price: priceId }],
          proration_behavior: "create_prorations",
        });
      } else {
        subscription = await stripe.subscriptions.create({
          customer: tenant.stripeCustomerId,
          items: [{ price: priceId }],
          payment_behavior: "default_incomplete",
          expand: ["latest_invoice.payment_intent"],
        });
      }

      await db
        .update(tenants)
        .set({ plan, updatedAt: new Date().toISOString() })
        .where(eq(tenants.id, jwtUser.tenantId));

      return reply.send({
        success: true,
        data: { subscriptionId: subscription.id, plan },
      });
    },
  );

  // ── GET /billing/subscription ────────────────────────────────
  app.get(
    "/subscription",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const jwtUser = req.user as any;
      const stripe = getStripe();
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, jwtUser.tenantId))
        .limit(1);
      if (!tenant)
        return reply
          .code(404)
          .send({ success: false, error: "Tenant not found" });

      if (stripe && tenant.stripeCustomerId) {
        const subs = await stripe.subscriptions.list({
          customer: tenant.stripeCustomerId,
          status: "active",
          limit: 1,
        });
        const sub = subs.data[0];
        return reply.send({
          success: true,
          data: {
            plan: tenant.plan,
            status: tenant.status,
            subscription: sub
              ? {
                  id: sub.id,
                  currentPeriodEnd: new Date(
                    sub.current_period_end * 1000,
                  ).toISOString(),
                }
              : null,
          },
        });
      }

      return reply.send({
        success: true,
        data: { plan: tenant.plan, status: tenant.status, subscription: null },
      });
    },
  );

  // ── GET /billing/invoices ────────────────────────────────────
  app.get(
    "/invoices",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const jwtUser = req.user as any;
      const stripe = getStripe();

      if (stripe) {
        const [tenant] = await db
          .select({ stripeCustomerId: tenants.stripeCustomerId })
          .from(tenants)
          .where(eq(tenants.id, jwtUser.tenantId))
          .limit(1);

        if (tenant?.stripeCustomerId) {
          const invoices = await stripe.invoices.list({
            customer: tenant.stripeCustomerId,
            limit: 24,
          });
          const data = invoices.data.map((inv: any) => ({
            id: inv.id,
            date: new Date(inv.created * 1000).toISOString(),
            total: inv.total / 100,
            subtotal: inv.subtotal / 100,
            tax: (inv.tax ?? 0) / 100,
            status: inv.status,
            pdfUrl: inv.invoice_pdf,
            hostedUrl: inv.hosted_invoice_url,
          }));
          return reply.send({ success: true, data });
        }
      }

      // Fallback: local records
      const db2 = getDb() as any;
      const rows = await db2.all(
        sql`SELECT * FROM tenant_invoices WHERE tenant_id = ${jwtUser.tenantId} ORDER BY date DESC LIMIT 24`,
      );
      return reply.send({
        success: true,
        data: Array.isArray(rows) ? rows : [],
      });
    },
  );

  // ── GET /billing/usage — real usage tracking ─────────────────
  app.get(
    "/usage",
    {
      preHandler: requireAuth(app),
    },
    async (req, reply) => {
      const jwtUser = req.user as any;

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthEnd = new Date();
      monthEnd.setMonth(monthEnd.getMonth() + 1, 1);
      monthEnd.setHours(0, 0, 0, 0);

      const [tenantRow] = await db
        .select({ plan: tenants.plan, schemaName: tenants.schemaName })
        .from(tenants)
        .where(eq(tenants.id, jwtUser.tenantId))
        .limit(1);

      let estimateCount = 0;
      if (tenantRow?.schemaName) {
        try {
          const db2 = getDb() as any;
          const rows = await db2.all(
            sql`SELECT COUNT(*) as cnt FROM ${sql.raw(`"${tenantRow.schemaName}_estimates"`)}
              WHERE created_at >= ${monthStart.toISOString()} AND created_at < ${monthEnd.toISOString()}`,
          );
          estimateCount = rows?.[0]?.cnt ?? 0;
        } catch {
          /* estimates table may not exist yet */
        }
      }

      const limits: Record<string, number> = {
        starter: 100,
        pro: 500,
        enterprise: 2000,
        cortex: 5000,
      };
      const limit = limits[tenantRow?.plan ?? "pro"] ?? 500;

      return reply.send({
        success: true,
        data: {
          estimates: {
            current: estimateCount,
            limit,
            resetAt: monthEnd.toISOString(),
          },
          period: {
            start: monthStart.toISOString(),
            end: monthEnd.toISOString(),
          },
        },
      });
    },
  );

  // ── POST /billing/webhooks — Stripe event receiver ───────────
  app.post("/webhooks", async (req, reply) => {
    const stripe = getStripe();
    if (!stripe) return reply.code(200).send({ received: true });

    const env = getEnv();
    const sig = req.headers["stripe-signature"] as string;

    let event: any;
    try {
      event = stripe.webhooks.constructEvent(
        (req as any).rawBody ?? JSON.stringify(req.body),
        sig,
        env.STRIPE_WEBHOOK_SECRET ?? "",
      );
    } catch (err: any) {
      logger.error({ err }, "Stripe webhook signature validation failed");
      return reply.code(400).send({ error: `Webhook error: ${err.message}` });
    }

    switch (event.type) {
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object;
        const plan =
          sub.metadata?.plan ?? sub.items?.data?.[0]?.price?.metadata?.plan;
        if (plan) {
          await db
            .update(tenants)
            .set({
              plan,
              status: "active",
              updatedAt: new Date().toISOString(),
            })
            .where(eq(tenants.stripeCustomerId, sub.customer));
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await db
          .update(tenants)
          .set({ status: "suspended", updatedAt: new Date().toISOString() })
          .where(eq(tenants.stripeCustomerId, sub.customer));
        break;
      }
      case "invoice.payment_failed": {
        logger.warn(
          { customerId: event.data.object.customer },
          "Invoice payment failed",
        );
        break;
      }
    }

    return reply.send({ received: true });
  });
}

async function ensureBillingTables() {
  const db = getDb() as any;
  try {
    await db.run(
      sql.raw(`
      CREATE TABLE IF NOT EXISTS tenant_payment_methods (
        tenant_id    TEXT PRIMARY KEY,
        stripe_pm_id TEXT,
        brand        TEXT NOT NULL DEFAULT 'card',
        last4        TEXT NOT NULL DEFAULT '****',
        exp_month    INTEGER NOT NULL DEFAULT 0,
        exp_year     INTEGER NOT NULL DEFAULT 0,
        name         TEXT NOT NULL DEFAULT '',
        created_at   TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `),
    );
    await db.run(
      sql.raw(`
      CREATE TABLE IF NOT EXISTS tenant_invoices (
        id         TEXT PRIMARY KEY,
        tenant_id  TEXT NOT NULL,
        date       TEXT NOT NULL,
        subtotal   REAL NOT NULL,
        tax        REAL NOT NULL DEFAULT 0,
        total      REAL NOT NULL,
        status     TEXT NOT NULL DEFAULT 'paid',
        pdf_url    TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `),
    );
  } catch {
    /* tables already exist */
  }
}
