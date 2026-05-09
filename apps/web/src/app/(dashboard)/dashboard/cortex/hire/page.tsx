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
    color: "#6366f1",
    tagline:
      "Turns high-risk claims into approved revenue before they're denied.",
    bullets: [
      "Scans estimates for pre-auth risk nightly",
      "Drafts professional pre-authorization letters using AI",
      "Saves hours of manual billing staff time per week",
    ],
    marketValue:
      "Pre-auth denials cost practices $25–50K/year. ROI is immediate.",
  },
  {
    id: "recall",
    name: "Recall Agent",
    role: "Patient Reactivation",
    price: 99,
    avatar: "📞",
    gradient: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
    color: "#0ea5e9",
    tagline:
      "Wins back patients who've gone quiet — without staff lifting a finger.",
    bullets: [
      "Finds patients 6+ months overdue for a visit",
      "Writes personalized (not template) reactivation messages",
      "Recovers 3–8 patients per month on average",
    ],
    marketValue:
      "Each recovered patient = ~$500–1,200/year. Pays for itself with 1 patient/month.",
  },
  {
    id: "review",
    name: "Review Agent",
    role: "Reputation Manager",
    price: 99,
    avatar: "⭐",
    gradient: "linear-gradient(135deg, #f59e0b, #f97316)",
    color: "#f59e0b",
    tagline:
      "Grows your Google rating on autopilot after every completed visit.",
    bullets: [
      "Identifies patients seen in the last 7 days",
      "Sends personalized review requests at the right moment",
      "Avoids re-messaging the same patient twice",
    ],
    marketValue:
      "Each 0.1★ increase in rating drives measurable new patient volume.",
  },
  {
    id: "supply",
    name: "Supply Agent",
    role: "Inventory Optimizer",
    price: 99,
    avatar: "📦",
    gradient: "linear-gradient(135deg, #10b981, #059669)",
    color: "#10b981",
    tagline: "Predicts what you'll run out of before you run out of it.",
    bullets: [
      "Analyzes 30-day procedure volume by CDT category",
      "Maps procedures to supply categories automatically",
      "Flags high-volume categories before stock runs low",
    ],
    marketValue:
      "Prevents emergency orders (2–3× markup) and appointment-cancelling outages.",
  },
  {
    id: "treatment",
    name: "Treatment Coordinator",
    role: "Case Acceptance",
    price: 99,
    avatar: "🦷",
    gradient: "linear-gradient(135deg, #ec4899, #f43f5e)",
    color: "#ec4899",
    tagline:
      "Follows up on declined treatment plans so your team doesn't have to.",
    bullets: [
      "Tracks high-value estimates unaccepted for 14+ days",
      "Drafts empathetic, non-pushy re-engagement messages",
      "One follow-up per patient — no duplicates or spam",
    ],
    marketValue:
      "30–40% of declined plans can be recovered. Average case value $1,500–5,000.",
  },
  {
    id: "hygienist",
    name: "Hygienist Agent",
    role: "Schedule Optimizer",
    price: 99,
    avatar: "📅",
    gradient: "linear-gradient(135deg, #14b8a6, #0d9488)",
    color: "#14b8a6",
    tagline:
      "Fills your hygiene schedule gaps before they become lost revenue.",
    bullets: [
      "Identifies patients 9+ months overdue for preventive care",
      "Generates a prioritized scheduling report each morning",
      "Recommends tactics to fill same-week cancellations",
    ],
    marketValue:
      "An empty hygiene chair costs $150–300/hr. Keeping it full is the highest-ROI move in dentistry.",
  },
];

export default function HireAgentsPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [clinics, setClinics] = useState<any[]>([]);
  const [tooltipOpen, setTooltipOpen] = useState<string | null>(null);

  // Current selections — pre-populated from DB on load
  const [selected, setSelected] = useState<
    { agentId: string; clinicId: string }[]
  >([]);
  // Snapshot of what was active when the page loaded, for diffing on save
  const [initialSelected, setInitialSelected] = useState<
    { agentId: string; clinicId: string }[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    Promise.all([
      tenantsApi.getClinics(accessToken).catch(() => []),
      agentsApi.getRentedAgents(accessToken).catch(() => []),
    ]).then(([clinicList, rented]) => {
      setClinics(clinicList as any[]);
      const existing = (rented as any[]).map((r: any) => ({
        agentId: r.agent_id,
        clinicId: r.clinic_id,
      }));
      setSelected(existing);
      setInitialSelected(existing);
      setLoading(false);
    });
  }, [accessToken]);

  function isSelected(agentId: string, clinicId: string) {
    return selected.some(
      (s) => s.agentId === agentId && s.clinicId === clinicId,
    );
  }

  function toggle(agentId: string, clinicId: string) {
    setSelected((prev) =>
      isSelected(agentId, clinicId)
        ? prev.filter(
            (s) => !(s.agentId === agentId && s.clinicId === clinicId),
          )
        : [...prev, { agentId, clinicId }],
    );
  }

  const toAdd = selected.filter(
    (s) =>
      !initialSelected.some(
        (i) => i.agentId === s.agentId && i.clinicId === s.clinicId,
      ),
  );
  const toRemove = initialSelected.filter(
    (i) =>
      !selected.some(
        (s) => s.agentId === i.agentId && s.clinicId === i.clinicId,
      ),
  );
  const hasChanges = toAdd.length > 0 || toRemove.length > 0;
  const totalCost = selected.length * 99;

  async function saveChanges() {
    if (!accessToken || !hasChanges) return;
    setIsSubmitting(true);
    try {
      await Promise.all([
        toAdd.length > 0
          ? agentsApi.rentAgent(accessToken, { assignments: toAdd })
          : Promise.resolve(),
        ...toRemove.map((r) => agentsApi.removeAgent(accessToken, r)),
      ]);
      router.push("/dashboard/cortex");
    } catch (err: any) {
      console.error(err);
      if (err.status === 401) {
        alert(
          "Your session has expired. Please refresh the page to securely renew your session.",
        );
      } else {
        alert("Failed to save changes.");
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
          Check agents to deploy, uncheck to remove. Changes save when you click
          below.
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
                  alignItems: "flex-start",
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
                    flexShrink: 0,
                  }}
                >
                  {agent.avatar}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "var(--color-text-primary)",
                      }}
                    >
                      {agent.name}
                    </div>
                    {/* Tooltip trigger */}
                    <div style={{ position: "relative" }}>
                      <button
                        onMouseEnter={() => setTooltipOpen(agent.id)}
                        onMouseLeave={() => setTooltipOpen(null)}
                        onFocus={() => setTooltipOpen(agent.id)}
                        onBlur={() => setTooltipOpen(null)}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          border: `1.5px solid ${agent.color}60`,
                          background: `${agent.color}12`,
                          color: agent.color,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "default",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          lineHeight: 1,
                          flexShrink: 0,
                        }}
                        aria-label={`What ${agent.name} does`}
                      >
                        ?
                      </button>
                      {tooltipOpen === agent.id && (
                        <div
                          style={{
                            position: "absolute",
                            left: "calc(100% + 10px)",
                            top: "50%",
                            transform: "translateY(-50%)",
                            zIndex: 100,
                            width: 280,
                            background: "var(--color-background-primary)",
                            border: `1px solid ${agent.color}30`,
                            borderRadius: 12,
                            padding: "1rem",
                            boxShadow: `0 8px 32px rgba(0,0,0,0.18), 0 0 0 1px ${agent.color}15`,
                            pointerEvents: "none",
                          }}
                        >
                          {/* Arrow */}
                          <div
                            style={{
                              position: "absolute",
                              left: -6,
                              top: "50%",
                              transform: "translateY(-50%) rotate(45deg)",
                              width: 10,
                              height: 10,
                              background: "var(--color-background-primary)",
                              border: `1px solid ${agent.color}30`,
                              borderRight: "none",
                              borderTop: "none",
                            }}
                          />
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: "var(--color-text-primary)",
                              marginBottom: 8,
                              lineHeight: 1.4,
                            }}
                          >
                            {agent.tagline}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 5,
                              marginBottom: 10,
                            }}
                          >
                            {agent.bullets.map((b) => (
                              <div
                                key={b}
                                style={{
                                  display: "flex",
                                  gap: 7,
                                  fontSize: 11,
                                  color: "var(--color-text-secondary)",
                                  alignItems: "flex-start",
                                }}
                              >
                                <span
                                  style={{
                                    color: agent.color,
                                    flexShrink: 0,
                                    marginTop: 1,
                                  }}
                                >
                                  →
                                </span>
                                <span style={{ lineHeight: 1.4 }}>{b}</span>
                              </div>
                            ))}
                          </div>
                          <div
                            style={{
                              borderTop: `1px solid ${agent.color}20`,
                              paddingTop: 8,
                              fontSize: 11,
                              color: agent.color,
                              fontWeight: 600,
                              lineHeight: 1.4,
                            }}
                          >
                            💡 {agent.marketValue}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-secondary)",
                      marginTop: 2,
                    }}
                  >
                    {agent.role} · ${agent.price}/mo
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-secondary)",
                      marginTop: 4,
                      lineHeight: 1.4,
                      opacity: 0.8,
                    }}
                  >
                    {agent.tagline}
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
                {loading ? (
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    Loading…
                  </div>
                ) : (
                  clinics.map((clinic) => {
                    const checked = isSelected(agent.id, clinic.id);
                    const wasActive = initialSelected.some(
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
                          checked={checked}
                          onChange={() => toggle(agent.id, clinic.id)}
                          style={{
                            width: 18,
                            height: 18,
                            accentColor: agent.color,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 14,
                            color: "var(--color-text-primary)",
                            flex: 1,
                          }}
                        >
                          {clinic.name}
                        </span>
                        {wasActive && checked && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#10b981",
                              background: "rgba(16,185,129,0.1)",
                              border: "1px solid rgba(16,185,129,0.2)",
                              padding: "2px 7px",
                              borderRadius: 20,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            Active
                          </span>
                        )}
                        {wasActive && !checked && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#ef4444",
                              background: "rgba(239,68,68,0.08)",
                              border: "1px solid rgba(239,68,68,0.2)",
                              padding: "2px 7px",
                              borderRadius: 20,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            Will remove
                          </span>
                        )}
                        {!wasActive && checked && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: agent.color,
                              background: `${agent.color}15`,
                              border: `1px solid ${agent.color}30`,
                              padding: "2px 7px",
                              borderRadius: 20,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            Will add
                          </span>
                        )}
                      </label>
                    );
                  })
                )}
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
              {selected.length === 0 ? (
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-secondary)",
                    fontStyle: "italic",
                  }}
                >
                  No agents selected.
                </div>
              ) : (
                selected.map((item, idx) => {
                  const a = CORTEX_AGENTS.find((x) => x.id === item.agentId);
                  const c = clinics.find((x) => x.id === item.clinicId);
                  const isNew = !initialSelected.some(
                    (i) =>
                      i.agentId === item.agentId &&
                      i.clinicId === item.clinicId,
                  );
                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: "var(--color-text-primary)" }}>
                        {a?.name} ({c?.name})
                      </span>
                      <span
                        style={{
                          color: isNew
                            ? a?.color
                            : "var(--color-text-secondary)",
                        }}
                      >
                        ${a?.price}/mo{isNew ? " ✦" : ""}
                      </span>
                    </div>
                  );
                })
              )}
              {toRemove.length > 0 && (
                <div
                  style={{
                    borderTop: "1px dashed rgba(239,68,68,0.25)",
                    paddingTop: 8,
                    marginTop: 4,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {toRemove.map((item, idx) => {
                    const a = CORTEX_AGENTS.find((x) => x.id === item.agentId);
                    const c = clinics.find((x) => x.id === item.clinicId);
                    return (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 13,
                          opacity: 0.6,
                          textDecoration: "line-through",
                        }}
                      >
                        <span style={{ color: "#ef4444" }}>
                          {a?.name} ({c?.name})
                        </span>
                        <span style={{ color: "#ef4444" }}>removed</span>
                      </div>
                    );
                  })}
                </div>
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
              onClick={saveChanges}
              disabled={!hasChanges || isSubmitting}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 8,
                border: "none",
                background:
                  !hasChanges || isSubmitting
                    ? "var(--color-text-secondary)"
                    : toRemove.length > 0 && toAdd.length === 0
                      ? "#ef4444"
                      : "#6366f1",
                color: "#fff",
                fontWeight: 600,
                cursor: !hasChanges || isSubmitting ? "not-allowed" : "pointer",
                transition: "background 0.2s",
              }}
            >
              {isSubmitting
                ? "Saving…"
                : !hasChanges
                  ? "No Changes"
                  : toAdd.length > 0 && toRemove.length > 0
                    ? `Add ${toAdd.length} · Remove ${toRemove.length}`
                    : toAdd.length > 0
                      ? `Hire ${toAdd.length} Agent${toAdd.length > 1 ? "s" : ""}`
                      : `Remove ${toRemove.length} Agent${toRemove.length > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
