"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { agentsApi, tenantsApi } from "@/lib/api";

const CORTEX_AGENTS = [
  {
    id: "billing",
    name: "Billing Agent",
    role: "Revenue Compliance",
    price: 99,
    avatar: "💰",
    gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  },
  {
    id: "recall",
    name: "Recall Agent",
    role: "Patient Reactivation",
    price: 99,
    avatar: "📞",
    gradient: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
  },
  {
    id: "review",
    name: "Review Agent",
    role: "Reputation Manager",
    price: 99,
    avatar: "⭐",
    gradient: "linear-gradient(135deg, #f59e0b, #f97316)",
  },
  {
    id: "supply",
    name: "Supply Agent",
    role: "Inventory Optimizer",
    price: 99,
    avatar: "📦",
    gradient: "linear-gradient(135deg, #10b981, #059669)",
  },
  {
    id: "treatment",
    name: "Treatment Coordinator",
    role: "Case Acceptance",
    price: 99,
    avatar: "🦷",
    gradient: "linear-gradient(135deg, #ec4899, #f43f5e)",
  },
  {
    id: "hygienist",
    name: "Hygienist Agent",
    role: "Schedule Optimizer",
    price: 99,
    avatar: "📅",
    gradient: "linear-gradient(135deg, #14b8a6, #0d9488)",
  },
];

export default function HireAgentsPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [clinics, setClinics] = useState<any[]>([]);

  // Array of { agentId, clinicId }
  const [cart, setCart] = useState<{ agentId: string; clinicId: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (accessToken) {
      tenantsApi
        .getClinics(accessToken)
        .then(setClinics)
        .catch(() => {});
    }
  }, [accessToken]);

  function toggleInCart(agentId: string, clinicId: string) {
    setCart((prev) => {
      const exists = prev.find(
        (item) => item.agentId === agentId && item.clinicId === clinicId,
      );
      if (exists)
        return prev.filter(
          (item) => !(item.agentId === agentId && item.clinicId === clinicId),
        );
      return [...prev, { agentId, clinicId }];
    });
  }

  const totalCost = cart.length * 99;

  async function submitHire() {
    if (cart.length === 0 || !accessToken) return;
    setIsSubmitting(true);
    try {
      await agentsApi.rentAgent(accessToken, { assignments: cart });
      router.push("/dashboard/cortex");
    } catch (err: any) {
      console.error(err);
      if (err.status === 401) {
        alert(
          "Your session has expired. Please refresh the page to securely renew your session.",
        );
      } else {
        alert("Failed to hire agents.");
      }
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <button
          onClick={() => router.push("/dashboard/cortex")}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            marginBottom: 16,
          }}
        >
          ← Back to Command Center
        </button>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            margin: 0,
            color: "var(--color-text-primary)",
          }}
        >
          Hire Digital Employees
        </h1>
        <p style={{ color: "var(--color-text-secondary)", marginTop: 8 }}>
          Select the agents you want to deploy to your clinics.
        </p>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem" }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {CORTEX_AGENTS.map((agent) => (
            <div
              key={agent.id}
              style={{
                background: "var(--color-background-primary)",
                border: "1px solid var(--color-border-secondary)",
                borderRadius: 16,
                padding: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: agent.gradient,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                  }}
                >
                  {agent.avatar}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {agent.name}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {agent.role} · ${agent.price}/mo
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "var(--color-background-secondary)",
                  padding: "1rem",
                  borderRadius: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-text-secondary)",
                    marginBottom: 12,
                    textTransform: "uppercase",
                  }}
                >
                  Deploy to Clinics
                </div>
                {clinics.map((clinic) => {
                  const isSelected = cart.some(
                    (i) => i.agentId === agent.id && i.clinicId === clinic.id,
                  );
                  return (
                    <label
                      key={clinic.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 8,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleInCart(agent.id, clinic.id)}
                        style={{
                          width: 18,
                          height: 18,
                          accentColor: "#6366f1",
                        }}
                      />
                      <span
                        style={{
                          fontSize: 14,
                          color: "var(--color-text-primary)",
                        }}
                      >
                        {clinic.name}
                      </span>
                    </label>
                  );
                })}
                {clinics.length === 0 && (
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    No clinics available.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div>
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.05), rgba(139,92,246,0.05))",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: 16,
              padding: "1.5rem",
              position: "sticky",
              top: "2rem",
            }}
          >
            <h3 style={{ marginTop: 0, color: "var(--color-text-primary)" }}>
              Order Summary
            </h3>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                margin: "1rem 0",
                minHeight: 100,
              }}
            >
              {cart.length === 0 ? (
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-secondary)",
                    fontStyle: "italic",
                  }}
                >
                  No agents selected yet.
                </div>
              ) : (
                cart.map((item, idx) => {
                  const a = CORTEX_AGENTS.find((x) => x.id === item.agentId);
                  const c = clinics.find((x) => x.id === item.clinicId);
                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: "var(--color-text-primary)" }}>
                        {a?.name} ({c?.name})
                      </span>
                      <span style={{ color: "var(--color-text-secondary)" }}>
                        ${a?.price}/mo
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div
              style={{
                borderTop: "1px solid var(--color-border-secondary)",
                paddingTop: "1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <span
                style={{ fontWeight: 600, color: "var(--color-text-primary)" }}
              >
                Total
              </span>
              <span style={{ fontSize: 24, fontWeight: 800, color: "#6366f1" }}>
                ${totalCost}/mo
              </span>
            </div>

            <button
              onClick={submitHire}
              disabled={cart.length === 0 || isSubmitting}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 8,
                border: "none",
                background:
                  cart.length === 0 || isSubmitting
                    ? "var(--color-text-secondary)"
                    : "#6366f1",
                color: "#fff",
                fontWeight: 600,
                cursor:
                  cart.length === 0 || isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              {isSubmitting ? "Processing..." : "Hire Agents & Bill Next Cycle"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
