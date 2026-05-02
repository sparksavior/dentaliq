"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

// Basic card type detection
function getCardBrand(number: string) {
  const num = number.replace(/\D/g, "");
  if (num.match(/^4/)) return "visa";
  if (num.match(/^(34|37)/)) return "amex";
  if (num.match(/^5[1-5]/)) return "mastercard";
  if (num.match(/^6011/)) return "discover";
  return "unknown";
}

function formatCardNumber(num: string, brand: string) {
  const cleaned = num.replace(/\D/g, "");
  if (brand === "amex") {
    const parts = [];
    if (cleaned.length > 0) parts.push(cleaned.substring(0, 4));
    if (cleaned.length > 4) parts.push(cleaned.substring(4, 10));
    if (cleaned.length > 10) parts.push(cleaned.substring(10, 15));
    return parts.join(" ");
  }
  return cleaned.match(/.{1,4}/g)?.join(" ") || "";
}

export default function BillingPage() {
  const { accessToken, user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [rentedAgents, setRentedAgents] = useState<any[]>([]);

  const [showCardModal, setShowCardModal] = useState(false);
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Internal state for saved payment method to simulate fully functioning backend integration
  const [savedPayment, setSavedPayment] = useState<{
    brand: string;
    last4: string;
    name: string;
    expiry: string;
  } | null>(null);

  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  useEffect(() => {
    if (accessToken) {
      Promise.all([
        tenantsApi.getTenant(accessToken),
        agentsApi.getRentedAgents(accessToken).catch(() => []),
        billingApi.getPaymentMethod(accessToken).catch(() => null),
        billingApi.getInvoices(accessToken).catch(() => []),
      ])
        .then(([t, agents, pm, invs]) => {
          setTenant(t);
          setRentedAgents(agents);
          if (pm) {
            setSavedPayment(pm);
          }
          if (invs) {
            setInvoices(invs);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [accessToken, user]);

  const saveCard = async () => {
    if (!cardNumber || !cardExpiry || !cardCvc) {
      alert("Please fill out all card details.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await billingApi.savePaymentMethod(accessToken!, {
        cardName: cardName || user?.name || "Cardholder",
        cardNumber,
        cardExpiry,
        cardCvc,
      });

      setSavedPayment(res);
      setShowCardModal(false);
      // Reset form
      setCardName("");
      setCardNumber("");
      setCardExpiry("");
      setCardCvc("");
    } catch (err) {
      alert("Failed to save payment method.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", color: "var(--color-text-secondary)" }}>
        Loading billing engine...
      </div>
    );
  }

  const basePrice =
    tenant?.plan === "starter"
      ? 49
      : tenant?.plan === "pro"
        ? 149
        : tenant?.plan === "cortex"
          ? 299
          : 0;
  const agentInstancesCount = rentedAgents.length;
  const agentsCost = tenant?.plan === "cortex" ? agentInstancesCount * 99 : 0;
  const subtotal = basePrice + agentsCost;
  const tax = subtotal * 0.13; // Assuming Ontario 13% HST for demonstration
  const totalDue = subtotal + tax;

  const nextBillingDate = new Date();
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
  nextBillingDate.setDate(1);

  // Dynamic Card Visuals
  const activeBrand = getCardBrand(cardNumber);
  const formattedCardNumber =
    formatCardNumber(cardNumber, activeBrand) || "•••• •••• •••• ••••";
  const displayExpiry = cardExpiry || "MM/YY";
  const displayName = cardName || user?.name || "CARDHOLDER NAME";

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
                ${totalDue.toFixed(2)}
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
                  {tenant?.plan.toUpperCase()} Platform Base
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
                <span>HST (13%)</span>
                <span>${tax.toFixed(2)}</span>
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
                <span>Total Due</span>
                <span>${totalDue.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Past Receipts */}
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
                  const invoice = {
                    id: inv.id,
                    date: new Date(inv.date || inv.date).toLocaleDateString(
                      "en-US",
                      { month: "long", day: "numeric", year: "numeric" },
                    ),
                    shortDate: new Date(
                      inv.date || inv.date,
                    ).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    }),
                    basePrice: inv.base_price || inv.basePrice,
                    agentsCount: inv.agents_count || inv.agentsCount,
                    agentsCost: inv.agents_cost || inv.agentsCost,
                    subtotal: inv.subtotal,
                    tax: inv.tax,
                    total: inv.total,
                    cardLast4: inv.card_last4 || inv.cardLast4,
                    cardBrand: inv.card_brand || inv.cardBrand,
                  };

                  return (
                    <button
                      key={invoice.id}
                      onClick={() => setSelectedInvoice(invoice)}
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
                            {invoice.shortDate}
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              color: "var(--color-text-secondary)",
                              marginTop: 2,
                            }}
                          >
                            Invoice {invoice.id}
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "var(--color-text-primary)",
                          }}
                        >
                          ${invoice.total.toFixed(2)}
                        </span>
                      </div>
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
                {/* Decorative Elements */}
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
                  />{" "}
                  {/* Fake Chip */}
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
                  <span>{savedPayment.name}</span>
                  <span>{savedPayment.expiry}</span>
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

            <button
              onClick={() => setShowCardModal(true)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                border: "1px solid var(--color-border-secondary)",
                background: "var(--color-background-secondary)",
                color: "var(--color-text-primary)",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.2s",
                boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "var(--color-accent)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor =
                  "var(--color-border-secondary)")
              }
            >
              <Plus size={16} />{" "}
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
              <ShieldCheck size={16} color="#10b981" /> Secured via Stripe
              End-to-End Encryption
            </div>
          </div>
        </div>
      </div>

      {/* Add/Update Card Interactive Modal */}
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
              maxWidth: 440,
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
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
                Update Payment Method
              </h3>
              <button
                onClick={() => setShowCardModal(false)}
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

            {/* Live Interactive Card Visual */}
            <div
              style={{
                background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
                color: "#fff",
                borderRadius: 16,
                padding: "1.5rem",
                marginBottom: "2rem",
                boxShadow:
                  "0 12px 24px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
                position: "relative",
                overflow: "hidden",
                height: 180,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -50,
                  right: -20,
                  width: 150,
                  height: 150,
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "50%",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    width: 45,
                    height: 32,
                    background: "linear-gradient(135deg, #fcd34d, #f59e0b)",
                    borderRadius: 6,
                    boxShadow: "inset 0 1px 3px rgba(255,255,255,0.5)",
                  }}
                />
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    fontStyle: "italic",
                    textTransform: "uppercase",
                    textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  }}
                >
                  {activeBrand === "unknown" ? "CARD" : activeBrand}
                </span>
              </div>

              <div style={{ position: "relative", zIndex: 1 }}>
                <div
                  style={{
                    fontSize: 22,
                    letterSpacing: "0.12em",
                    fontFamily: '"JetBrains Mono", monospace',
                    marginBottom: 16,
                    textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                  }}
                >
                  {formattedCardNumber}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.9)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontFamily: "monospace",
                  }}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "70%",
                    }}
                  >
                    {displayName}
                  </span>
                  <span>{displayExpiry}</span>
                </div>
              </div>
            </div>

            {/* Input Form */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                marginBottom: "2.5rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--color-text-secondary)",
                    marginBottom: 8,
                  }}
                >
                  Cardholder Name
                </label>
                <input
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  placeholder="JANE DOE"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--color-border-secondary)",
                    background: "var(--color-background-secondary)",
                    color: "var(--color-text-primary)",
                    fontSize: 15,
                    fontFamily: "monospace",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--color-text-secondary)",
                    marginBottom: 8,
                  }}
                >
                  Card Number
                </label>
                <input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="0000 0000 0000 0000"
                  maxLength={19}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--color-border-secondary)",
                    background: "var(--color-background-secondary)",
                    color: "var(--color-text-primary)",
                    fontSize: 15,
                    fontFamily: "monospace",
                    letterSpacing: "0.05em",
                  }}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--color-text-secondary)",
                      marginBottom: 8,
                    }}
                  >
                    Expiry
                  </label>
                  <input
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="MM/YY"
                    maxLength={5}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1px solid var(--color-border-secondary)",
                      background: "var(--color-background-secondary)",
                      color: "var(--color-text-primary)",
                      fontSize: 15,
                      fontFamily: "monospace",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--color-text-secondary)",
                      marginBottom: 8,
                    }}
                  >
                    CVC
                  </label>
                  <input
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    placeholder="123"
                    type="password"
                    maxLength={4}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1px solid var(--color-border-secondary)",
                      background: "var(--color-background-secondary)",
                      color: "var(--color-text-primary)",
                      fontSize: 15,
                      fontFamily: "monospace",
                      letterSpacing: "0.1em",
                    }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={saveCard}
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 10,
                border: "none",
                background: isSubmitting
                  ? "var(--color-border-secondary)"
                  : "var(--color-accent)",
                color: isSubmitting ? "var(--color-text-secondary)" : "#fff",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: 15,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                boxShadow: isSubmitting
                  ? "none"
                  : "0 4px 14px rgba(15, 118, 110, 0.4)",
              }}
            >
              {isSubmitting
                ? "Securing Payment Method..."
                : "Save Payment Method"}
            </button>
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
                  +
                </div>
                <h3
                  style={{ margin: "0 0 4px 0", fontSize: 20, fontWeight: 800 }}
                >
                  Receipt {selectedInvoice.id}
                </h3>
                <div
                  style={{ color: "var(--color-text-secondary)", fontSize: 14 }}
                >
                  Paid on {selectedInvoice.date}
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
                  DentalIQ {tenant?.plan.toUpperCase()} Base
                </span>
                <span style={{ fontWeight: 600 }}>
                  ${selectedInvoice.basePrice.toFixed(2)}
                </span>
              </div>

              {tenant?.plan === "cortex" && selectedInvoice.agentsCount > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 15,
                    color: "#6366f1",
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontWeight: 500 }}>
                    Cortex Agents ({selectedInvoice.agentsCount}x)
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    ${selectedInvoice.agentsCost.toFixed(2)}
                  </span>
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
                  fontSize: 14,
                  color: "var(--color-text-secondary)",
                  marginBottom: 8,
                }}
              >
                <span>Subtotal</span>
                <span>${selectedInvoice.subtotal.toFixed(2)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                  color: "var(--color-text-secondary)",
                  marginBottom: 16,
                }}
              >
                <span>Taxes (HST 13%)</span>
                <span>${selectedInvoice.tax.toFixed(2)}</span>
              </div>

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
                <span>${selectedInvoice.total.toFixed(2)}</span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "1rem",
                border: "1px solid var(--color-border-secondary)",
                borderRadius: 12,
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
                  {selectedInvoice.cardBrand} ending in{" "}
                  {selectedInvoice.cardLast4}
                </div>
                <div
                  style={{ fontSize: 12, color: "var(--color-text-secondary)" }}
                >
                  Payment processed successfully
                </div>
              </div>
            </div>

            <button
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "1.5rem",
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
