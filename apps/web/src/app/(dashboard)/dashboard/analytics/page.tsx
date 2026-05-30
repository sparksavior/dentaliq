"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/contexts/auth-context";
import { analyticsApi, type AnalyticsOverview } from "@/lib/api";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  BarChart3,
  AlertCircle,
  RefreshCw,
  Info,
} from "lucide-react";

// Recharts must be client-only — no SSR
const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), {
  ssr: false,
});
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), {
  ssr: false,
});
const LineChart = dynamic(() => import("recharts").then((m) => m.LineChart), {
  ssr: false,
});
const Line = dynamic(() => import("recharts").then((m) => m.Line), {
  ssr: false,
});
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), {
  ssr: false,
});
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), {
  ssr: false,
});
const CartesianGrid = dynamic(
  () => import("recharts").then((m) => m.CartesianGrid),
  { ssr: false },
);
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), {
  ssr: false,
});
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false },
);
const ReferenceLine = dynamic(
  () => import("recharts").then((m) => m.ReferenceLine),
  { ssr: false },
);

// ── helpers ───────────────────────────────────────────────
function fmt$(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtMonth(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleString("en-CA", {
    month: "short",
  });
}

const AR_COLORS = {
  current: {
    bar: "#10b981",
    text: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.2)",
  },
  watch: {
    bar: "#f59e0b",
    text: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
  },
  overdue: {
    bar: "#f97316",
    text: "#f97316",
    bg: "rgba(249,115,22,0.08)",
    border: "rgba(249,115,22,0.2)",
  },
  critical: {
    bar: "#ef4444",
    text: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.2)",
  },
};

// ─────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState("6m");

  const DATE_RANGES = [
    { label: "7 days", value: "7d" },
    { label: "30 days", value: "30d" },
    { label: "3 months", value: "3m" },
    { label: "6 months", value: "6m" },
    { label: "1 year", value: "1y" },
  ];

  const getDateRange = (
    range: string,
  ): { startDate: string; endDate: string } => {
    const end = new Date();
    const start = new Date();
    switch (range) {
      case "7d":
        start.setDate(end.getDate() - 7);
        break;
      case "30d":
        start.setDate(end.getDate() - 30);
        break;
      case "3m":
        start.setMonth(end.getMonth() - 3);
        break;
      case "6m":
        start.setMonth(end.getMonth() - 6);
        break;
      case "1y":
        start.setFullYear(end.getFullYear() - 1);
        break;
    }
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  };

  const load = async (quiet = false, range?: string) => {
    if (!accessToken) return;
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const dates = getDateRange(range ?? dateRange);
      const overview = await analyticsApi.getOverview(accessToken, dates);
      setData(overview);
    } catch {
      setError(
        "Could not load analytics. Make sure the tenant service is running.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [accessToken]);

  // ── loading skeleton ─────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: "2rem", maxWidth: 1300, margin: "0 auto" }}>
        <div
          style={{
            height: 36,
            width: 240,
            background: "var(--color-background-secondary)",
            borderRadius: 8,
            marginBottom: "2rem",
            animation: "pulse 1.5s infinite",
          }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 16,
            marginBottom: "2rem",
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 90,
                background: "var(--color-background-secondary)",
                borderRadius: 16,
                animation: "pulse 1.5s infinite",
              }}
            />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 260,
              background: "var(--color-background-secondary)",
              borderRadius: 16,
              marginBottom: 16,
              animation: "pulse 1.5s infinite",
            }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", maxWidth: 1300, margin: "0 auto" }}>
        <div
          style={{
            padding: "2rem",
            background: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "#ef4444",
          }}
        >
          <AlertCircle size={20} />
          <span style={{ fontSize: 14 }}>{error}</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { caseAcceptance, newPatients, patientSummary, arAging, arTotal } =
    data;

  // Overall acceptance rate (last full month or average)
  const lastCaseMonth = caseAcceptance[caseAcceptance.length - 1];
  const avgRate = caseAcceptance.length
    ? Math.round(
        caseAcceptance.reduce((s, r) => s + r.rate, 0) / caseAcceptance.length,
      )
    : 0;

  // New-patient MoM badge
  const { momDelta, currentMonth, total } = patientSummary;
  const TrendIcon =
    momDelta === null ? Minus : momDelta >= 0 ? TrendingUp : TrendingDown;
  const trendColor =
    momDelta === null
      ? "var(--color-text-tertiary)"
      : momDelta >= 0
        ? "#10b981"
        : "#ef4444";

  // AR critical share
  const criticalAr = arAging.find((b) => b.severity === "critical");
  const criticalPct =
    arTotal > 0 && criticalAr
      ? Math.round((criticalAr.amount / arTotal) * 100)
      : 0;

  return (
    <div
      style={{
        color: "var(--color-text-primary)",
        animation: "fadeInUp 0.35s ease-out",
      }}
    >
      {/* ── Premium page header ─────────────────────────────── */}
      <div
        style={{
          padding: "1.75rem 2rem 1.5rem",
          background:
            "linear-gradient(135deg, var(--color-background-primary) 0%, var(--color-accent-muted) 100%)",
          borderBottom: "1px solid var(--color-border-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "linear-gradient(135deg, #0f766e, #0d9488)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(15,118,110,0.3)",
              flexShrink: 0,
            }}
          >
            <BarChart3 size={22} color="white" />
          </div>
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                margin: 0,
                letterSpacing: "-0.03em",
              }}
            >
              Practice Analytics
            </h1>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 13,
                color: "var(--color-text-secondary)",
              }}
            >
              Live metrics from your patient and estimate data
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Date range selector */}
          <div
            style={{
              display: "flex",
              background: "var(--color-background-secondary)",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {DATE_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => {
                  setDateRange(r.value);
                  load(true, r.value);
                }}
                style={{
                  padding: "8px 12px",
                  border: "none",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.12s",
                  background:
                    dateRange === r.value
                      ? "var(--color-accent)"
                      : "transparent",
                  color:
                    dateRange === r.value
                      ? "#fff"
                      : "var(--color-text-secondary)",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 16px",
              background: "var(--color-background-primary)",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              color: "var(--color-text-secondary)",
              transition: "all 0.15s",
              boxShadow: "var(--shadow-xs)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "var(--color-accent)";
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--color-accent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "var(--color-border-secondary)";
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--color-text-secondary)";
            }}
          >
            <RefreshCw
              size={14}
              style={{
                animation: refreshing ? "spin 0.7s linear infinite" : "none",
              }}
            />
            Refresh
          </button>
        </div>
      </div>

      <div
        style={{ padding: "1.75rem 2rem", maxWidth: 1300, margin: "0 auto" }}
      >
        {/* ── Summary KPI row ─────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 16,
            marginBottom: "2rem",
          }}
        >
          {/* Total AR outstanding */}
          <div
            style={{
              background: "var(--color-background-primary)",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: 16,
              padding: "1.4rem",
              position: "relative",
              overflow: "hidden",
              transition: "all 0.18s ease",
              boxShadow: "var(--shadow-sm)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.transform = "translateY(-2px)";
              el.style.boxShadow = "var(--shadow-md)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.transform = "translateY(0)";
              el.style.boxShadow = "var(--shadow-sm)";
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background:
                  "linear-gradient(90deg, transparent, #f59e0b, transparent)",
              }}
            />
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--color-text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 10,
              }}
            >
              Total Outstanding AR
            </div>
            <div
              style={{
                fontSize: 34,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: arTotal > 5000 ? "#f59e0b" : "var(--color-text-primary)",
              }}
            >
              {fmt$(arTotal)}
            </div>
            {criticalPct > 0 && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <AlertCircle size={12} />
                {criticalPct}% is 90+ days old
              </div>
            )}
          </div>

          {/* Avg case advancement */}
          <div
            style={{
              background: "var(--color-background-primary)",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: 16,
              padding: "1.4rem",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background:
                  "linear-gradient(90deg, transparent, #6366f1, transparent)",
              }}
            />
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--color-text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 10,
              }}
            >
              Avg Case Advancement
            </div>
            <div
              style={{
                fontSize: 34,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#6366f1",
              }}
            >
              {avgRate}%
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: "var(--color-text-tertiary)",
              }}
            >
              {lastCaseMonth
                ? `${lastCaseMonth.advanced} of ${lastCaseMonth.total} this month`
                : "No data yet"}
            </div>
          </div>

          {/* Total patients */}
          <div
            style={{
              background: "var(--color-background-primary)",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: 16,
              padding: "1.4rem",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background:
                  "linear-gradient(90deg, transparent, #0ea5e9, transparent)",
              }}
            />
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--color-text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 10,
              }}
            >
              Total Patients
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: "#0ea5e9",
                }}
              >
                {total.toLocaleString()}
              </div>
              {momDelta !== null && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 13,
                    fontWeight: 600,
                    color: trendColor,
                  }}
                >
                  <TrendIcon size={14} />
                  {Math.abs(momDelta)}% MoM
                </div>
              )}
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: "var(--color-text-tertiary)",
              }}
            >
              {currentMonth} new this month
            </div>
          </div>
        </div>

        {/* ── AR Aging ─────────────────────────────────────────── */}
        <Section
          title="Accounts Receivable — Aging"
          icon={<AlertCircle size={17} color="#f59e0b" />}
          tooltip="Outstanding patient cost (estimates with no pre-auth filed yet), grouped by how old the estimate is. 90+ day items need urgent follow-up."
        >
          {/* Summary bar */}
          {arTotal > 0 && (
            <div
              style={{
                display: "flex",
                height: 10,
                borderRadius: 99,
                overflow: "hidden",
                marginBottom: "1.5rem",
                gap: 2,
              }}
            >
              {arAging.map((b) => {
                const pct = arTotal > 0 ? (b.amount / arTotal) * 100 : 0;
                return pct > 0 ? (
                  <div
                    key={b.days}
                    title={`${b.band}: ${fmt$(b.amount)}`}
                    style={{
                      width: `${pct}%`,
                      background: AR_COLORS[b.severity].bar,
                      borderRadius: 99,
                      transition: "width 0.6s ease",
                    }}
                  />
                ) : null;
              })}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 12,
            }}
          >
            {arAging.map((band) => {
              const c = AR_COLORS[band.severity];
              const pct =
                arTotal > 0 ? Math.round((band.amount / arTotal) * 100) : 0;
              return (
                <div
                  key={band.days}
                  style={{
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                    borderRadius: 14,
                    padding: "1.1rem 1.25rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: c.text,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 8,
                    }}
                  >
                    {band.band}
                  </div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: c.text,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {fmt$(band.amount)}
                  </div>
                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 12,
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {band.count} estimate{band.count !== 1 ? "s" : ""} · {pct}%
                    of total
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ── Case Acceptance ──────────────────────────────────── */}
        <Section
          title="Case Advancement — Last 6 Months"
          icon={<BarChart3 size={17} color="#6366f1" />}
          tooltip="'Advanced' = estimates where a pre-authorization letter was drafted (by staff or Billing Agent). Use as a proxy for cases actively moving forward."
        >
          {caseAcceptance.length === 0 ? (
            <EmptyState message="No estimate data yet. Run a few estimates to see trends." />
          ) : (
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={caseAcceptance.map((r) => ({
                    ...r,
                    month: fmtMonth(r.month),
                  }))}
                  barGap={4}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border-tertiary)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: "var(--color-text-tertiary)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "var(--color-text-tertiary)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-background-primary)",
                      border: "1px solid var(--color-border-secondary)",
                      borderRadius: 10,
                      fontSize: 13,
                    }}
                    formatter={(val: any, name: any) =>
                      [val, name === "total" ? "Presented" : "Advanced"] as any
                    }
                  />
                  <Bar
                    dataKey="total"
                    fill="rgba(99,102,241,0.18)"
                    radius={[6, 6, 0, 0]}
                    name="total"
                  />
                  <Bar
                    dataKey="advanced"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                    name="advanced"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {caseAcceptance.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 20,
                marginTop: "1rem",
                paddingTop: "1rem",
                borderTop: "1px solid var(--color-border-tertiary)",
              }}
            >
              <LegendDot color="rgba(99,102,241,0.5)" label="Presented" />
              <LegendDot color="#6366f1" label="Advanced (pre-auth filed)" />
            </div>
          )}
        </Section>

        {/* ── New Patients ─────────────────────────────────────── */}
        <Section
          title="New Patients — Last 6 Months"
          icon={<Users size={17} color="#0ea5e9" />}
          tooltip="Patients added to your practice each month. Sustained growth of 10–20% MoM is a healthy target for most dental practices."
        >
          {newPatients.length === 0 ? (
            <EmptyState message="No patient data yet. Add your first patient to start tracking growth." />
          ) : (
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={newPatients.map((r) => ({
                    ...r,
                    month: fmtMonth(r.month),
                  }))}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border-tertiary)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: "var(--color-text-tertiary)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "var(--color-text-tertiary)" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-background-primary)",
                      border: "1px solid var(--color-border-secondary)",
                      borderRadius: 10,
                      fontSize: 13,
                    }}
                    formatter={(val: any) => [val, "New patients"]}
                  />
                  <ReferenceLine
                    y={
                      newPatients.reduce((s, r) => s + r.count, 0) /
                      (newPatients.length || 1)
                    }
                    stroke="#0ea5e9"
                    strokeDasharray="4 4"
                    strokeOpacity={0.4}
                    label={{
                      value: "avg",
                      position: "right",
                      fill: "#0ea5e9",
                      fontSize: 11,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#0ea5e9"
                    strokeWidth={2.5}
                    dot={{ fill: "#0ea5e9", r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* MoM comparison strip */}
          {(patientSummary.currentMonth > 0 ||
            patientSummary.priorMonth > 0) && (
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: "1rem",
                paddingTop: "1rem",
                borderTop: "1px solid var(--color-border-tertiary)",
              }}
            >
              <MomCard
                label="This month"
                value={patientSummary.currentMonth}
                color="#0ea5e9"
              />
              <MomCard
                label="Last month"
                value={patientSummary.priorMonth}
                color="var(--color-text-tertiary)"
              />
              {momDelta !== null && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    background:
                      momDelta >= 0
                        ? "rgba(16,185,129,0.08)"
                        : "rgba(239,68,68,0.08)",
                    borderRadius: 10,
                    border: `1px solid ${momDelta >= 0 ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                  }}
                >
                  <TrendIcon size={14} color={trendColor} />
                  <span
                    style={{ fontSize: 13, fontWeight: 700, color: trendColor }}
                  >
                    {momDelta >= 0 ? "+" : ""}
                    {momDelta}% MoM
                  </span>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* ── Data note ────────────────────────────────────────── */}
        <p
          style={{
            marginTop: "1.5rem",
            fontSize: 12,
            color: "var(--color-text-tertiary)",
            textAlign: "center",
          }}
        >
          Data reflects estimates and patients recorded in DentalIQ. AR aging is
          based on patient-responsible cost from estimates with no pre-auth on
          file — not actual payment records.
        </p>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────

function Section({
  title,
  icon,
  tooltip,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  tooltip: string;
  children: React.ReactNode;
}) {
  const [tip, setTip] = useState(false);

  return (
    <div
      style={{
        background: "var(--color-background-primary)",
        border: "1px solid var(--color-border-secondary)",
        borderRadius: 18,
        padding: "1.5rem",
        marginBottom: "1.5rem",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: "1.25rem",
        }}
      >
        {icon}
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h2>
        <div style={{ position: "relative", marginLeft: 4 }}>
          <button
            onMouseEnter={() => setTip(true)}
            onMouseLeave={() => setTip(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              color: "var(--color-text-tertiary)",
              padding: 2,
            }}
          >
            <Info size={13} />
          </button>
          {tip && (
            <div
              style={{
                position: "absolute",
                left: 0,
                top: "calc(100% + 6px)",
                width: 280,
                background: "var(--color-background-primary)",
                border: "1px solid var(--color-border-secondary)",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 12,
                lineHeight: 1.55,
                color: "var(--color-text-secondary)",
                boxShadow: "var(--shadow-lg)",
                zIndex: 50,
                pointerEvents: "none",
              }}
            >
              {tooltip}
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "2.5rem",
        textAlign: "center",
        color: "var(--color-text-tertiary)",
        fontSize: 13,
      }}
    >
      {message}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        color: "var(--color-text-secondary)",
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: 3,
          background: color,
          flexShrink: 0,
        }}
      />
      {label}
    </div>
  );
}

function MomCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        padding: "8px 14px",
        background: "var(--color-background-secondary)",
        borderRadius: 10,
        border: "1px solid var(--color-border-tertiary)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "var(--color-text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          color,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
    </div>
  );
}
