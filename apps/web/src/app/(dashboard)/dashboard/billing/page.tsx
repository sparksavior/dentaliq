"use client";

import { useState, useEffect, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useAuth } from "@/contexts/auth-context";
import { tenantsApi, agentsApi, billingApi, type Tenant } from "@/lib/api";
import {
  CreditCard,
  Receipt,
  Calendar,
  ShieldCheck,
  Download,
  Plus,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";

// ─── Stripe card setup form (rendered inside Elements provider) ───────────────
function CardSetupForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (paymentMethodId: string) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setError(null);

    const { setupIntent, error: stripeError } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Card setup failed.");
      setIsSubmitting(false);
      return;
    }

    if (setupIntent?.status === "succeeded" && setupIntent.payment_method) {
      onSuccess(setupIntent.payment_method as string);
    } else {
      setError("Setup did not complete. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: "1.5rem" }}>
        <PaymentElement
          options={{
            layout: "tabs",
            fields: { billingDetails: { name: "auto" } },
          }}
        />
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 14px",
            borderRadius: 10,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#ef4444",
            fontSize: 14,
            marginBottom: "1rem",
          }}
        >
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: 10,
            border: "1px solid var(--color-border-secondary)",
            background: "transparent",
            color: "var(--color-text-primary)",
            fontWeight: 600,
            cursor: isSubmitting ? "not-allowed" : "pointer",
            fontSize: 15,
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isSubmitting}
          style={{
            flex: 2,
            padding: "12px",
            borderRadius: 10,
            border: "none",
            background:
              !stripe || isSubmitting
                ? "var(--color-border-secondary)"
                : "var(--color-accent)",
            color:
              !stripe || isSubmitting ? "var(--color-text-secondary)" : "#fff",
            cursor: !stripe || isSubmitting ? "not-allowed" : "pointer",
            fontWeight: 700,
            fontSize: 15,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow:
              !stripe || isSubmitting
                ? "none"
                : "0 4px 14px rgba(15,118,110,0.4)",
          }}
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {isSubmitting ? "Saving..." : "Save Payment Method"}
        </button>
      </div>
    </form>
  );
}

// ─── Main billing page ────────────────────────────────────────────────────────
export default function BillingPage() {
  const { accessToken, user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [rentedAgents, setRentedAgents] = useState<any[]>([]);

  const [stripePublishableKey, setStripePublishableKey] = useState<
    string | null
  >(null);
  const [stripeEnabled, setStripeEnabled] = useState(false);

  const [showCardModal, setShowCardModal] = useState(false);
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(
    null,
  );
  const [loadingSetupIntent, setLoadingSetupIntent] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  const [savedPayment, setSavedPayment] = useState<{
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null>(null);

  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    Promise.all([
      tenantsApi.getTenant(accessToken),
      agentsApi.getRentedAgents(accessToken).catch(() => []),
      billingApi.getPaymentMethod(accessToken).catch(() => null),
      billingApi.getInvoices(accessToken).catch(() => []),
      billingApi.getConfig(accessToken).catch(() => null),
    ])
      .then(([t, agents, pm, invs, config]) => {
        setTenant(t);
        setRentedAgents(agents);
        if (pm) setSavedPayment(pm);
        if (invs) setInvoices(invs);
        if (config) {
          setStripePublishableKey(config.stripePublishableKey);
          setStripeEnabled(config.stripeEnabled);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [accessToken, user]);

  const openCardModal = useCallback(async () => {
    if (!accessToken) return;
    setSetupError(null);
    setSetupClientSecret(null);
    setShowCardModal(true);
    setLoadingSetupIntent(true);
    try {
      const result = await billingApi.createSetupIntent(accessToken);
      setSetupClientSecret(result.clientSecret);
    } catch {
      setSetupError("Could not initialize payment form. Please try again.");
    } finally {
      setLoadingSetupIntent(false);
    }
  }, [accessToken]);

  const handleCardSaved = useCallback(
    async (paymentMethodId: string) => {
      if (!accessToken) return;
      try {
        const pm = await billingApi.savePaymentMethod(accessToken, {
          paymentMethodId,
        });
        setSavedPayment(pm as any);
        setShowCardModal(false);
        setSetupClientSecret(null);
      } catch {
        // Re-open stays open — error shown in form
      }
    },
    [accessToken],
  );

  const closeModal = useCallback(() => {
    setShowCardModal(false);
    setSetupClientSecret(null);
    setSetupError(null);
  }, []);

  if (loading) {
    return (
      <div
        style={{
          padding: "2rem",
          color: "var(--color-text-secondary)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Loader2 size={20} className="animate-spin" /> Loading billing...
      </div>
    );
  }

  const PLAN_PRICES: Record<string, number> = {
    starter: 49,
    pro: 149,
    enterprise: 249,
    cortex: 299,
  };
  const AGENT_PRICE = 99;

  const basePrice = PLAN_PRICES[tenant?.plan ?? ""] ?? 0;
  const agentInstancesCount = rentedAgents.length;
  const agentsCost =
    tenant?.plan === "cortex" ? agentInstancesCount * AGENT_PRICE : 0;
  const subtotal = basePrice + agentsCost;

  const nextBillingDate = new Date();
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
  nextBillingDate.setDate(1);

  const stripePromise = stripePublishableKey
    ? loadStripe(stripePublishableKey)
    : null;

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: 1000,
        margin: "0 auto",
        color: "var(--color-text-primary)",
      }}
    >
      <div style={{ marginBottom: "2rem" }}>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            margin: "0 0 8px 0",
            letterSpacing: "-0.03em",
          }}
        >
          Billing & Subscriptions
        </h1>
        <p
          style={{
            color: "var(--color-text-secondary)",
            margin: 0,
            fontSize: 16,
          }}
        >
          Manage automated billing, payment methods, and tax receipts.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
          gap: "2rem",
        }}
      >
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Current Plan Overview */}
          <div
            style={{
              background: "var(--color-background-primary)",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: 16,
              padding: "2rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 24,
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                Upcoming Cycle
              </h2>
              <div
                style={{
                  background: "var(--color-accent-muted)",
                  color: "var(--color-accent)",
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {tenant?.plan} Plan
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 4,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 48,
                  fontWeight: 800,
                  color: "var(--color-text-primary)",
                  letterSpacing: "-0.03em",
                }}
              >
                ${subtotal.toFixed(2)}
              </span>
              <span
                style={{
                  fontSize: 16,
                  color: "var(--color-text-secondary)",
                  fontWeight: 600,
                }}
              >
                /mo
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--color-text-secondary)",
                fontSize: 14,
                marginBottom: 32,
              }}
            >
              <Calendar size={16} /> Auto-charging on{" "}
              {nextBillingDate.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>

            <div
              style={{
                background: "var(--color-background-secondary)",
                borderRadius: 12,
                padding: "1.5rem",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--color-text-secondary)",
                  textTransform: "uppercase",
                  marginBottom: 16,
                  letterSpacing: "0.05em",
                }}
              >
                Itemized Breakdown
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 15,
                  marginBottom: 12,
                }}
              >
                <span style={{ color: "var(--color-text-primary)" }}>
                  {tenant?.plan?.toUpperCase()} Platform Base
                </span>
                <span style={{ fontWeight: 600 }}>${basePrice.toFixed(2)}</span>
              </div>

              {tenant?.plan === "cortex" && (
                <>
                  {agentInstancesCount > 0 ? (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 15,
                        color: "#6366f1",
                        marginBottom: 12,
                      }}
                    >
                      <span>
                        Active Digital Employees ({agentInstancesCount}x)
                      </span>
                      <span style={{ fontWeight: 600 }}>
                        ${agentsCost.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: 14,
                        color: "var(--color-text-secondary)",
                        fontStyle: "italic",
                        marginBottom: 12,
                      }}
                    >
                      No active agents deployed.
                    </div>
                  )}
                </>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                  color: "var(--color-text-secondary)",
                  marginBottom: 12,
                }}
              >
                <span>Applicable taxes</span>
                <span>Calculated at invoice</span>
              </div>

              <div
                style={{
                  height: 1,
                  background: "var(--color-border-secondary)",
                  margin: "16px 0",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Billing History */}
          <div
            style={{
              background: "var(--color-background-primary)",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: 16,
              padding: "2rem",
            }}
          >
            <h2
              style={{ fontSize: 18, fontWeight: 700, margin: "0 0 1.5rem 0" }}
            >
              Billing History
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {invoices.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    color: "var(--color-text-secondary)",
                    fontStyle: "italic",
                  }}
                >
                  No past invoices. Your first bill will be generated on{" "}
                  {nextBillingDate.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  .
                </div>
              ) : (
                invoices.map((inv) => {
                  const date = new Date(inv.date ?? inv.created ?? Date.now());
                  const shortDate = date.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  });
                  const fullDate = date.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  });
                  const total = inv.total ?? inv.amount_paid ?? 0;

                  return (
                    <button
                      key={inv.id}
                      onClick={() =>
                        setSelectedInvoice({
                          ...inv,
                          shortDate,
                          fullDate,
                          total,
                        })
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "16px",
                        borderRadius: 12,
                        border: "1px solid var(--color-border-secondary)",
                        background: "var(--color-background-secondary)",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "border-color 0.2s, background 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor =
                          "var(--color-accent)";
                        e.currentTarget.style.background =
                          "var(--color-accent-muted)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor =
                          "var(--color-border-secondary)";
                        e.currentTarget.style.background =
                          "var(--color-background-secondary)";
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                        }}
                      >
                        <div
                          style={{
                            background: "var(--color-background-primary)",
                            padding: "10px",
                            borderRadius: 10,
                            color: "var(--color-text-secondary)",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                          }}
                        >
                          <Receipt size={20} />
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 700,
                              color: "var(--color-text-primary)",
                            }}
                          >
                            {shortDate}
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              color: "var(--color-text-secondary)",
                              marginTop: 2,
                            }}
                          >
                            Invoice {inv.id}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: "var(--color-text-primary)",
                        }}
                      >
                        ${(total / 100).toFixed(2)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Payment Method */}
        <div>
          <div
            style={{
              background: "var(--color-background-primary)",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: 16,
              padding: "2rem",
              position: "sticky",
              top: "2rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
            }}
          >
            <h2
              style={{ fontSize: 18, fontWeight: 700, margin: "0 0 1.5rem 0" }}
            >
              Payment Method
            </h2>

            {savedPayment ? (
              <div
                style={{
                  background: "linear-gradient(135deg, #0f172a, #1e293b)",
                  color: "#fff",
                  borderRadius: 16,
                  padding: "1.5rem",
                  marginBottom: "1.5rem",
                  boxShadow:
                    "0 12px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: -50,
                    right: -20,
                    width: 100,
                    height: 100,
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: "50%",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: -30,
                    left: -30,
                    width: 80,
                    height: 80,
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: "50%",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 32,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 28,
                      background: "linear-gradient(135deg, #e2e8f0, #94a3b8)",
                      borderRadius: 4,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      fontStyle: "italic",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {savedPayment.brand}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 20,
                    letterSpacing: "0.15em",
                    fontFamily: '"JetBrains Mono", monospace',
                    marginBottom: 20,
                    position: "relative",
                    zIndex: 1,
                    textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                  }}
                >
                  •••• •••• •••• {savedPayment.last4}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.8)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    position: "relative",
                    zIndex: 1,
                    fontFamily: "monospace",
                  }}
                >
                  <span>Expires</span>
                  <span>
                    {String(savedPayment.expMonth).padStart(2, "0")}/
                    {savedPayment.expYear}
                  </span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "var(--color-background-secondary)",
                  border: "1px dashed var(--color-border-secondary)",
                  borderRadius: 16,
                  padding: "2rem",
                  textAlign: "center",
                  marginBottom: "1.5rem",
                }}
              >
                <CreditCard
                  size={32}
                  color="var(--color-text-secondary)"
                  style={{ margin: "0 auto 12px" }}
                />
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--color-text-primary)",
                    fontWeight: 600,
                  }}
                >
                  No active payment method
                </div>
                <div
                  style={{ fontSize: 13, color: "var(--color-text-secondary)" }}
                >
                  Add a card to automate your billing.
                </div>
              </div>
            )}

            {!stripeEnabled && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(234,179,8,0.08)",
                  border: "1px solid rgba(234,179,8,0.3)",
                  color: "#ca8a04",
                  fontSize: 13,
                  marginBottom: "1rem",
                }}
              >
                <AlertCircle size={14} />
                Stripe is not configured. Contact support to activate billing.
              </div>
            )}

            <button
              onClick={openCardModal}
              disabled={!stripeEnabled}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                border: "1px solid var(--color-border-secondary)",
                background: !stripeEnabled
                  ? "var(--color-background-secondary)"
                  : "var(--color-background-secondary)",
                color: !stripeEnabled
                  ? "var(--color-text-secondary)"
                  : "var(--color-text-primary)",
                fontWeight: 600,
                cursor: !stripeEnabled ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.2s",
                opacity: !stripeEnabled ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (stripeEnabled)
                  e.currentTarget.style.borderColor = "var(--color-accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor =
                  "var(--color-border-secondary)";
              }}
            >
              <Plus size={16} />
              {savedPayment ? "Update Payment Method" : "Add Payment Method"}
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                justifyContent: "center",
                marginTop: 20,
                fontSize: 12,
                color: "var(--color-text-secondary)",
              }}
            >
              <ShieldCheck size={16} color="#10b981" /> Secured via Stripe — PCI
              DSS Level 1
            </div>
          </div>
        </div>
      </div>

      {/* Add/Update Card Modal — Stripe Elements */}
      {showCardModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "var(--color-background-primary)",
              borderRadius: 24,
              padding: "2.5rem",
              width: "100%",
              maxWidth: 480,
              border: "1px solid var(--color-border-secondary)",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2rem",
              }}
            >
              <div>
                <h3
                  style={{ margin: "0 0 4px 0", fontSize: 20, fontWeight: 800 }}
                >
                  {savedPayment
                    ? "Update Payment Method"
                    : "Add Payment Method"}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "var(--color-text-secondary)",
                  }}
                >
                  Your card details are processed securely by Stripe.
                </p>
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-secondary)",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {loadingSetupIntent && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  padding: "3rem 0",
                  color: "var(--color-text-secondary)",
                }}
              >
                <Loader2 size={24} className="animate-spin" />
                Initializing secure payment form...
              </div>
            )}

            {setupError && !loadingSetupIntent && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "14px",
                  borderRadius: 10,
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#ef4444",
                  fontSize: 14,
                  marginBottom: "1rem",
                }}
              >
                <AlertCircle
                  size={16}
                  style={{ flexShrink: 0, marginTop: 1 }}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>
                    Payment form unavailable
                  </div>
                  <div>{setupError}</div>
                  <button
                    onClick={openCardModal}
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      color: "#ef4444",
                      textDecoration: "underline",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {setupClientSecret && stripePromise && !loadingSetupIntent && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: setupClientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: {
                      colorPrimary: "var(--color-accent, #0f766e)",
                      borderRadius: "10px",
                    },
                  },
                }}
              >
                <CardSetupForm
                  onSuccess={handleCardSaved}
                  onCancel={closeModal}
                />
              </Elements>
            )}
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "var(--color-background-primary)",
              borderRadius: 24,
              padding: "2.5rem",
              width: "100%",
              maxWidth: 500,
              border: "1px solid var(--color-border-secondary)",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "2rem",
              }}
            >
              <div>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    background: "linear-gradient(135deg, #0f766e, #0d9488)",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 20,
                    marginBottom: 16,
                  }}
                >
                  <Receipt size={20} />
                </div>
                <h3
                  style={{ margin: "0 0 4px 0", fontSize: 20, fontWeight: 800 }}
                >
                  Invoice {selectedInvoice.id}
                </h3>
                <div
                  style={{ color: "var(--color-text-secondary)", fontSize: 14 }}
                >
                  {selectedInvoice.fullDate}
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-secondary)",
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div
              style={{
                background: "var(--color-background-secondary)",
                padding: "1.5rem",
                borderRadius: 16,
                marginBottom: "2rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 15,
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    color: "var(--color-text-primary)",
                    fontWeight: 500,
                  }}
                >
                  DentalIQ {tenant?.plan?.toUpperCase()} Base
                </span>
                <span style={{ fontWeight: 600 }}>
                  $
                  {(
                    (selectedInvoice.base_price ??
                      selectedInvoice.basePrice ??
                      0) / 100
                  ).toFixed(2)}
                </span>
              </div>

              {selectedInvoice.tax > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 14,
                    color: "var(--color-text-secondary)",
                    marginBottom: 12,
                  }}
                >
                  <span>Taxes</span>
                  <span>${(selectedInvoice.tax / 100).toFixed(2)}</span>
                </div>
              )}

              <div
                style={{
                  height: 1,
                  background: "var(--color-border-secondary)",
                  margin: "16px 0",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 20,
                  fontWeight: 800,
                  color: "var(--color-text-primary)",
                }}
              >
                <span>Total Paid</span>
                <span>${(selectedInvoice.total / 100).toFixed(2)}</span>
              </div>
            </div>

            {(selectedInvoice.card_last4 ?? selectedInvoice.cardLast4) && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "1rem",
                  border: "1px solid var(--color-border-secondary)",
                  borderRadius: 12,
                  marginBottom: "1.5rem",
                }}
              >
                <CreditCard size={24} color="var(--color-text-secondary)" />
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    {selectedInvoice.card_brand ?? selectedInvoice.cardBrand}{" "}
                    ending in{" "}
                    {selectedInvoice.card_last4 ?? selectedInvoice.cardLast4}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    Payment processed successfully
                  </div>
                </div>
              </div>
            )}

            <button
              style={{
                width: "100%",
                padding: "12px",
                background: "transparent",
                border: "1px solid var(--color-border-secondary)",
                borderRadius: 10,
                color: "var(--color-text-primary)",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
              onClick={() => window.print()}
            >
              <Download size={16} /> Download PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
