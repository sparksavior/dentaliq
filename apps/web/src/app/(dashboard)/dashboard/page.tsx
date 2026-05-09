"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useClinic } from "@/contexts/clinic-context";
import {
  estimateApi,
  patientsApi,
  tenantsApi,
  type EstimateHistoryItem,
  type Patient,
  type Tenant,
} from "@/lib/api";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const riskStyle = {
  low: {
    bg: "rgba(16, 185, 129, 0.1)",
    text: "#10b981",
    dot: "#10b981",
    badge: "rgba(16,185,129,0.12)",
  },
  medium: {
    bg: "rgba(245, 158, 11, 0.1)",
    text: "#f59e0b",
    dot: "#f59e0b",
    badge: "rgba(245,158,11,0.12)",
  },
  high: {
    bg: "rgba(239, 68, 68, 0.1)",
    text: "#ef4444",
    dot: "#ef4444",
    badge: "rgba(239,68,68,0.12)",
  },
};

function StatCard({
  label,
  value,
  sub,
  icon,
  accentColor,
  delay = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accentColor?: string;
  delay?: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      style={{
        background: "var(--color-background-primary)",
        border: "1px solid var(--color-border-secondary)",
        borderRadius: 14,
        padding: "1.25rem 1.4rem",
        boxShadow: "var(--shadow-sm)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition:
          "opacity 0.4s ease, transform 0.4s ease, box-shadow 0.2s ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--color-text-secondary)",
          }}
        >
          {label}
        </div>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: accentColor
              ? `${accentColor}14`
              : "var(--color-accent-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 800,
          color: "var(--color-text-primary)",
          letterSpacing: "-0.04em",
          marginBottom: 3,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function AiInsightStrip({
  patients,
  history,
  loading,
}: {
  patients: Patient[];
  history: EstimateHistoryItem[];
  loading: boolean;
}) {
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const generate = useCallback(async () => {
    if (loading) return;
    setInsightLoading(true);
    const now = new Date();
    const thisMonth = history.filter((h) => {
      const d = new Date(h.created_at);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    });
    const highRisk = history.filter((h) => h.claim_risk === "high").length;
    const revenue = thisMonth.reduce(
      (sum, h) => sum + (h.insurer_pays || 0),
      0,
    );
    const codeCounts: Record<string, number> = {};
    thisMonth.forEach((h) => {
      codeCounts[h.cdt_code] = (codeCounts[h.cdt_code] || 0) + 1;
    });
    const topCode = Object.entries(codeCounts).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];

    const fallback = () => {
      if (history.length === 0)
        return "No estimates yet — run your first insurance estimate to start tracking coverage and revenue recovery.";
      if (highRisk > 0)
        return `${highRisk} high-risk claim${highRisk !== 1 ? "s" : ""} need${highRisk === 1 ? "s" : ""} attention this period. Review them in Claims to avoid denial.`;
      if (revenue > 0)
        return `Your clinic has recovered $${Math.round(revenue).toLocaleString()} from insurers this month across ${thisMonth.length} estimate${thisMonth.length !== 1 ? "s" : ""}.`;
      return `${patients.length} patient${patients.length !== 1 ? "s" : ""} on file. Run estimates to track coverage and revenue recovery.`;
    };

    try {
      const res = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "phi3",
          prompt: `You are a dental clinic AI assistant. In ONE concise sentence (max 22 words), give the single most actionable insight for this clinic right now. Be specific with numbers. No preamble.\n\nPatients: ${patients.length}\nEstimates this month: ${thisMonth.length}\nRevenue this month: $${Math.round(revenue).toLocaleString()} CAD\nHigh-risk claims: ${highRisk}\nMost common procedure this month: ${topCode || "none yet"}`,
          stream: false,
        }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();
      setInsight(data.response?.trim() || fallback());
    } catch {
      setInsight(fallback());
    } finally {
      setInsightLoading(false);
    }
  }, [loading, history, patients]);

  useEffect(() => {
    if (!loading) generate();
  }, [loading, generate]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background:
          "linear-gradient(135deg, rgba(15,118,110,0.06), rgba(13,148,136,0.03))",
        border: "1px solid rgba(15,118,110,0.16)",
        borderRadius: 12,
        padding: "12px 16px",
        marginBottom: "1.5rem",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: "linear-gradient(135deg, #0f766e, #0d9488)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 2px 8px rgba(15,118,110,0.25)",
        }}
      >
        <Sparkles size={15} color="#fff" />
      </div>
      {insightLoading || loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {[0, 0.15, 0.3].map((delay, i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--color-accent)",
                  animation: `aiPulse 1.2s ease-in-out ${delay}s infinite`,
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
            AI is analyzing your clinic data…
          </span>
        </div>
      ) : (
        <div style={{ flex: 1 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--color-accent)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginRight: 8,
            }}
          >
            AI Insight
          </span>
          <span
            style={{
              fontSize: 13.5,
              color: "var(--color-text-primary)",
              lineHeight: 1.5,
            }}
          >
            {insight}
          </span>
        </div>
      )}
      {!insightLoading && !loading && (
        <button
          onClick={generate}
          title="Refresh insight"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-tertiary)",
            padding: 5,
            borderRadius: 7,
            fontSize: 15,
            flexShrink: 0,
            transition: "color 0.15s, background 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-accent-subtle)";
            e.currentTarget.style.color = "var(--color-accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
            e.currentTarget.style.color = "var(--color-text-tertiary)";
          }}
        >
          ↻
        </button>
      )}
    </div>
  );
}

export default function OverviewPage() {
  const { user, accessToken } = useAuth();
  const [history, setHistory] = useState<EstimateHistoryItem[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const { selectedClinicId } = useClinic();

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [hist, pts, t] = await Promise.all([
        estimateApi
          .getHistory(accessToken)
          .catch(() => [] as EstimateHistoryItem[]),
        patientsApi.getPatients(accessToken).catch(() => [] as Patient[]),
        tenantsApi.getTenant(accessToken).catch(() => null),
      ]);
      setHistory(hist);
      setPatients(pts);
      setTenant(t);
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedClinicId]);

  useEffect(() => {
    loadData();
  }, [loadData, selectedClinicId]);

  const now = new Date();
  const thisMonth = history.filter((h) => {
    const d = new Date(h.created_at);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  });
  const revenueRecovered = thisMonth.reduce(
    (sum, h) => sum + (h.insurer_pays || 0),
    0,
  );
  const highRiskCount = history.filter((h) => h.claim_risk === "high").length;
  const recent = history.slice(0, 8);
  const lastMonthEstimates = history.filter((h) => {
    const d = new Date(h.created_at);
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return (
      d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear()
    );
  }).length;
  const monthDelta = thisMonth.length - lastMonthEstimates;

  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: 1120,
        margin: "0 auto",
        color: "var(--color-text-primary)",
        animation: "fadeInUp 0.35s ease-out",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "var(--color-text-primary)",
            letterSpacing: "-0.04em",
            marginBottom: 4,
          }}
        >
          {greeting}, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-text-tertiary)" }}>
          {now.toLocaleDateString("en-CA", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* AI Insight — Pro/Enterprise only */}
      {tenant?.plan !== "starter" && (
        <AiInsightStrip
          patients={patients}
          history={history}
          loading={loading}
        />
      )}

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginBottom: "1.75rem",
        }}
      >
        {loading ? (
          Array(4)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: 116, borderRadius: 14 }}
              />
            ))
        ) : (
          <>
            <StatCard
              label="Total Patients"
              value={patients.length.toString()}
              sub={
                patients.length === 0
                  ? "Add your first patient"
                  : `${patients.length} registered`
              }
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0f766e"
                  strokeWidth="1.8"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
              delay={0}
            />
            <StatCard
              label="Estimates This Month"
              value={thisMonth.length.toString()}
              sub={
                monthDelta > 0
                  ? `+${monthDelta} vs last month`
                  : monthDelta < 0
                    ? `${monthDelta} vs last month`
                    : "Same as last month"
              }
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0e7490"
                  strokeWidth="1.8"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              }
              accentColor="#0e7490"
              delay={60}
            />
            <StatCard
              label="Revenue Recovered"
              value={`$${revenueRecovered.toLocaleString("en-CA", { maximumFractionDigits: 0 })}`}
              sub={
                thisMonth.length > 0
                  ? `avg $${Math.round(revenueRecovered / thisMonth.length).toLocaleString()}/estimate`
                  : "insurer payments this month"
              }
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1.8"
                >
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              }
              accentColor="#10b981"
              delay={120}
            />
            <StatCard
              label="High-Risk Claims"
              value={highRiskCount.toString()}
              sub={
                highRiskCount === 0
                  ? "No high-risk flags"
                  : `${highRiskCount} need attention`
              }
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={highRiskCount > 0 ? "#ef4444" : "#10b981"}
                  strokeWidth="1.8"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              }
              accentColor={highRiskCount > 0 ? "#ef4444" : "#10b981"}
              delay={180}
            />
          </>
        )}
      </div>

      {/* Quick actions + activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
        {/* Quick actions */}
        <div
          style={{
            background: "var(--color-background-primary)",
            border: "1px solid var(--color-border-secondary)",
            borderRadius: 14,
            padding: "1.25rem 1.25rem",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <h2
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--color-text-primary)",
              marginBottom: "1rem",
              letterSpacing: "-0.01em",
            }}
          >
            Quick actions
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              {
                href: "/dashboard/estimates",
                icon: "⚡",
                label: "Run an estimate",
                desc: "Check coverage instantly",
                color: "#0f766e",
              },
              {
                href: "/dashboard/patients",
                icon: "👤",
                label: "Add a patient",
                desc: "Register new patient",
                color: "#0e7490",
              },
              {
                href: "/dashboard/claims",
                icon: "🛡",
                label: "Review claims",
                desc: "Check risk flags",
                color: "#6366f1",
              },
              {
                href: "/dashboard/settings",
                icon: "⚙️",
                label: "Settings",
                desc: "Clinic & integrations",
                color: "#64748b",
              },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "10px 11px",
                  borderRadius: 10,
                  border: "1px solid var(--color-border-tertiary)",
                  textDecoration: "none",
                  background: "var(--color-background-secondary)",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    "var(--color-background-primary)";
                  e.currentTarget.style.borderColor =
                    "var(--color-border-secondary)";
                  e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                  e.currentTarget.style.transform = "translateX(2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    "var(--color-background-secondary)";
                  e.currentTarget.style.borderColor =
                    "var(--color-border-tertiary)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateX(0)";
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: `${a.color}14`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  {a.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                      marginBottom: 1,
                    }}
                  >
                    {a.label}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--color-text-tertiary)",
                    }}
                  >
                    {a.desc}
                  </div>
                </div>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-text-tertiary)"
                  strokeWidth="2"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div
          style={{
            background: "var(--color-background-primary)",
            border: "1px solid var(--color-border-secondary)",
            borderRadius: 14,
            padding: "1.25rem",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <h2
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              Recent activity
            </h2>
            <Link
              href="/dashboard/estimates"
              style={{
                fontSize: 12,
                color: "var(--color-accent)",
                textDecoration: "none",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              View all
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>

          {loading ? (
            Array(5)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className="skeleton"
                  style={{ height: 50, borderRadius: 10, marginBottom: 8 }}
                />
              ))
          ) : recent.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 0" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: "var(--color-background-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                  fontSize: 28,
                }}
              >
                📋
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                  marginBottom: 6,
                }}
              >
                No activity yet
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--color-text-secondary)",
                  marginBottom: 16,
                }}
              >
                Run your first insurance estimate to get started.
              </div>
              <Link
                href="/dashboard/estimates"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 20px",
                  background: "linear-gradient(135deg, #0f766e, #0d9488)",
                  color: "#fff",
                  borderRadius: 9,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  boxShadow: "var(--shadow-accent)",
                }}
              >
                Run first estimate →
              </Link>
            </div>
          ) : (
            <div>
              {recent.map((item, idx) => {
                const rs =
                  riskStyle[item.claim_risk as keyof typeof riskStyle] ??
                  riskStyle.low;
                const patientLabel = item.first_name
                  ? `${item.first_name} ${item.last_name ?? ""}`.trim()
                  : null;
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "9px 10px",
                      borderRadius: 9,
                      marginBottom: 3,
                      transition: "background 0.12s",
                      cursor: "default",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "var(--color-background-secondary)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: rs.dot,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 2,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--color-text-primary)",
                          }}
                        >
                          {item.cdt_code}
                        </span>
                        {patientLabel && (
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--color-text-tertiary)",
                            }}
                          >
                            · {patientLabel}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: 11,
                            padding: "1px 8px",
                            borderRadius: 20,
                            background: rs.badge,
                            color: rs.text,
                            fontWeight: 600,
                          }}
                        >
                          {item.claim_risk}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--color-text-tertiary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.coverage_percent}% covered · Patient $
                        {(item.patient_cost || 0).toLocaleString("en-CA", {
                          maximumFractionDigits: 0,
                        })}{" "}
                        · Insurer $
                        {(item.insurer_pays || 0).toLocaleString("en-CA", {
                          maximumFractionDigits: 0,
                        })}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--color-text-tertiary)",
                        flexShrink: 0,
                      }}
                    >
                      {timeAgo(item.created_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Getting started banner */}
      {!loading && history.length === 0 && (
        <div
          style={{
            marginTop: 16,
            background:
              "linear-gradient(135deg, #0c4a44, #0f766e 40%, #0d9488)",
            borderRadius: 14,
            padding: "1.5rem 2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "var(--shadow-accent-lg)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: "-5%",
              top: "-30%",
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
            }}
          />
          <div style={{ position: "relative" }}>
            <div
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: "#fff",
                marginBottom: 4,
                letterSpacing: "-0.02em",
              }}
            >
              Ready to recover revenue?
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.78)" }}>
              Clinics using DentalIQ recover an average of $6,400/month.
            </div>
          </div>
          <Link
            href="/dashboard/estimates"
            style={{
              padding: "11px 24px",
              background: "#fff",
              color: "#0f766e",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
              flexShrink: 0,
              boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
              position: "relative",
              whiteSpace: "nowrap",
            }}
          >
            Run first estimate →
          </Link>
        </div>
      )}
    </div>
  );
}
