"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useClinic } from "@/contexts/clinic-context";
import {
  authApi,
  estimateApi,
  patientsApi,
  tenantsApi,
  type EstimateHistoryItem,
  type Patient,
  type Tenant,
} from "@/lib/api";
import { useNotifications } from "@/contexts/notification-context";
import {
  Search,
  Bell,
  History,
  User,
  CreditCard,
  ChevronRight,
  X as CloseIcon,
} from "lucide-react";

/* ── Utility ── */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ── Sparkline charts ── */
function BarSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const W = 76,
    H = 32;
  const barW = Math.floor((W - (data.length - 1) * 2) / data.length);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {data.map((v, i) => {
        const barH = Math.max(3, (v / max) * H);
        return (
          <rect
            key={i}
            x={i * (barW + 2)}
            y={H - barH}
            width={barW}
            height={barH}
            rx={2}
            fill={i === data.length - 1 ? color : `${color}40`}
          />
        );
      })}
    </svg>
  );
}

function LineSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 76,
    H = 32;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const areaPoints = `0,${H} ${points} ${W},${H}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient
          id={`lg-${color.replace("#", "")}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#lg-${color.replace("#", "")})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SemiGauge({ percent, color }: { percent: number; color: string }) {
  const r = 38,
    cx = 50,
    cy = 48;
  const circ = Math.PI * r;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;
  return (
    <svg width="100" height="54" viewBox="0 0 100 54">
      <path
        d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
        fill="none"
        stroke="var(--color-border-secondary)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${circ}`}
        strokeDashoffset={`${offset}`}
      />
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fontSize="14"
        fontWeight="800"
        fill={color}
        fontFamily="system-ui"
      >
        {Math.round(percent)}%
      </text>
    </svg>
  );
}

function RevenueTrendChart({ data }: { data: number[] }) {
  if (data.length < 2) {
    data = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  }
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 500,
    H = 100;
  const toCoord = (v: number, i: number) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((v - min) / range) * (H - 10) - 5,
  });
  const pathD = data
    .map((v, i) => {
      const { x, y } = toCoord(v, i);
      return i === 0 ? `M ${x},${y}` : `L ${x},${y}`;
    })
    .join(" ");
  const firstPt = toCoord(data[0], 0);
  const lastPt = toCoord(data[data.length - 1], data.length - 1);
  const areaD = `M ${firstPt.x},${H} ${pathD.slice(2)} L ${lastPt.x},${H} Z`;
  return (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f766e" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#0f766e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#revGrad)" />
      <path
        d={pathD}
        fill="none"
        stroke="#0f766e"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastPt.x} cy={lastPt.y} r="4" fill="#0f766e" />
    </svg>
  );
}

/* ── AI Insight ── */
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
          "linear-gradient(135deg, rgba(15,118,110,0.07), rgba(13,148,136,0.03))",
        border: "1px solid rgba(15,118,110,0.15)",
        borderRadius: 14,
        padding: "12px 16px",
        marginBottom: "1.25rem",
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
              fontSize: 11,
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

/* ── Global Search ── */
function GlobalSearch({
  patients,
  history,
}: {
  patients: Patient[];
  history: EstimateHistoryItem[];
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const results = query.trim()
    ? [
        ...patients
          .filter((p) =>
            `${p.first_name} ${p.last_name}`
              .toLowerCase()
              .includes(query.toLowerCase()),
          )
          .map((p) => ({
            type: "patient" as const,
            id: p.id,
            title: `${p.first_name} ${p.last_name}`,
            subtitle: p.email,
          })),
        ...history
          .filter(
            (h) =>
              h.cdt_code.toLowerCase().includes(query.toLowerCase()) ||
              ((h as any).procedure_name || "")
                .toLowerCase()
                .includes(query.toLowerCase()),
          )
          .map((h) => ({
            type: "estimate" as const,
            id: h.id,
            title: (h as any).procedure_name,
            subtitle: `${h.cdt_code} · $${h.insurer_pays} recovered`,
          })),
        ...(query.toLowerCase().includes("rev") ||
        query.toLowerCase().includes("earn")
          ? [
              {
                type: "revenue" as const,
                id: "rev",
                title: "Revenue Report",
                subtitle: "View detailed analytics",
              },
            ]
          : []),
      ].slice(0, 8)
    : [];

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--color-background-primary)",
          border: "1px solid var(--color-border-secondary)",
          borderRadius: 100,
          padding: "8px 16px",
          boxShadow: "var(--shadow-xs)",
          width: 220,
          transition: "all 0.2s",
        }}
      >
        <Search size={14} color="var(--color-text-tertiary)" />
        <input
          placeholder="Search anything..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          style={{
            border: "none",
            background: "transparent",
            outline: "none",
            fontSize: 13,
            color: "var(--color-text-primary)",
            width: "100%",
          }}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-tertiary)",
              padding: 0,
            }}
          >
            <CloseIcon size={12} />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 100 }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              width: 320,
              background: "var(--color-background-primary)",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: 14,
              boxShadow: "var(--shadow-lg)",
              zIndex: 101,
              overflow: "hidden",
              animation: "slideInDown 0.15s ease-out",
            }}
          >
            {results.map((res, i) => (
              <Link
                key={`${res.type}-${res.id}-${i}`}
                href={
                  res.type === "patient"
                    ? `/dashboard/patients/${res.id}`
                    : res.type === "estimate"
                      ? `/dashboard/claims/${res.id}`
                      : "/dashboard/analytics"
                }
                onClick={() => setIsOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  textDecoration: "none",
                  borderBottom:
                    i === results.length - 1
                      ? "none"
                      : "1px solid var(--color-border-tertiary)",
                  transition: "background 0.1s",
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
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      res.type === "patient"
                        ? "rgba(14,116,144,0.1)"
                        : res.type === "estimate"
                          ? "rgba(16,185,129,0.1)"
                          : "rgba(245,158,11,0.1)",
                    color:
                      res.type === "patient"
                        ? "#0e7490"
                        : res.type === "estimate"
                          ? "#10b981"
                          : "#f59e0b",
                  }}
                >
                  {res.type === "patient" ? (
                    <User size={16} />
                  ) : res.type === "estimate" ? (
                    <History size={16} />
                  ) : (
                    <CreditCard size={16} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {res.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--color-text-tertiary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {res.subtitle}
                  </div>
                </div>
                <ChevronRight size={14} color="var(--color-text-tertiary)" />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Notification Tray ── */
function NotificationTray() {
  const { notifications, unreadCount, markAllAsRead, clearNotifications } =
    useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && unreadCount > 0) markAllAsRead();
        }}
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: "var(--color-background-primary)",
          border: "1px solid var(--color-border-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--shadow-xs)",
          cursor: "pointer",
          position: "relative",
          color: "var(--color-text-secondary)",
          transition: "all 0.15s",
        }}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <div
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              background: "#ef4444",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              border: "2px solid var(--color-background-primary)",
            }}
          >
            {unreadCount}
          </div>
        )}
      </button>

      {isOpen && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 100 }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              width: 340,
              maxHeight: 480,
              background: "var(--color-background-primary)",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: 18,
              boxShadow: "var(--shadow-xl)",
              zIndex: 101,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              animation: "slideInDown 0.18s ease-out",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--color-border-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                Notifications
              </h3>
              <button
                onClick={clearNotifications}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 11,
                  color: "var(--color-accent)",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Clear all
              </button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {notifications.length === 0 ? (
                <div
                  style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  <div style={{ marginBottom: 12, opacity: 0.3 }}>
                    <Bell size={40} style={{ margin: "0 auto" }} />
                  </div>
                  <div style={{ fontSize: 14 }}>No notifications yet</div>
                </div>
              ) : (
                notifications.map((n, i) => (
                  <div
                    key={n.id}
                    style={{
                      padding: "14px 20px",
                      borderBottom:
                        i === notifications.length - 1
                          ? "none"
                          : "1px solid var(--color-border-tertiary)",
                      background: n.read
                        ? "transparent"
                        : "var(--color-background-secondary)",
                      display: "flex",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background:
                          n.type === "success"
                            ? "#10b981"
                            : n.type === "warning"
                              ? "#f59e0b"
                              : "#3b82f6",
                        marginTop: 5,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--color-text-primary)",
                          marginBottom: 2,
                        }}
                      >
                        {n.title}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--color-text-secondary)",
                          lineHeight: 1.4,
                        }}
                      >
                        {n.message}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--color-text-tertiary)",
                          marginTop: 6,
                        }}
                      >
                        {timeAgo(n.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Main Page ── */
export default function OverviewPage() {
  const { user, accessToken } = useAuth();
  const { addNotification } = useNotifications();
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

  // Trigger welcome email on first dashboard visit
  useEffect(() => {
    if (!accessToken) return;
    const isFreshLogin = sessionStorage.getItem("diq_fresh_login");
    console.log("[WelcomeTrigger] Checking for fresh login:", isFreshLogin);
    if (isFreshLogin === "1") {
      sessionStorage.removeItem("diq_fresh_login");
      console.log("[WelcomeTrigger] Triggering welcome email...");
      authApi
        .triggerWelcomeEmail(accessToken)
        .then(() => {
          console.log("[WelcomeTrigger] Success");
          addNotification({
            title: "Welcome to DentalIQ!",
            message:
              "We've sent a welcome guide to your email. Explore your new dashboard!",
            type: "success",
          });
        })
        .catch((err) => console.error("[WelcomeTrigger] Failed:", err));
    }
  }, [accessToken]);

  /* ── Derived data ── */
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
  const recent = history.slice(0, 6);

  const lastMonthEstimates = history.filter((h) => {
    const d = new Date(h.created_at);
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return (
      d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear()
    );
  }).length;
  const monthDelta = thisMonth.length - lastMonthEstimates;

  const coverageRate =
    history.length > 0
      ? Math.round(
          history.reduce((sum, h) => sum + (h.coverage_percent || 0), 0) /
            history.length,
        )
      : 0;

  /* Build 12-month revenue data for trend chart */
  const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
    const m = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return history
      .filter((h) => {
        const d = new Date(h.created_at);
        return (
          d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear()
        );
      })
      .reduce((sum, h) => sum + (h.insurer_pays || 0), 0);
  });

  /* Sparkline data (last 7 months estimates count) */
  const estimatesByMonth = Array.from({ length: 7 }, (_, i) => {
    const m = new Date(now.getFullYear(), now.getMonth() - 6 + i, 1);
    return history.filter((h) => {
      const d = new Date(h.created_at);
      return (
        d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear()
      );
    }).length;
  });

  const patientGrowth = [
    Math.max(0, patients.length - 6),
    Math.max(0, patients.length - 4),
    Math.max(0, patients.length - 5),
    Math.max(0, patients.length - 2),
    Math.max(0, patients.length - 3),
    Math.max(0, patients.length - 1),
    patients.length,
  ];

  const revenueByMonth7 = monthlyRevenue.slice(-7);
  const riskTrend = Array.from({ length: 7 }, (_, i) =>
    Math.max(0, highRiskCount - i * 0.5),
  ).reverse();

  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const riskStyle = {
    low: { dot: "#10b981", badge: "rgba(16,185,129,0.12)", text: "#10b981" },
    medium: { dot: "#f59e0b", badge: "rgba(245,158,11,0.12)", text: "#f59e0b" },
    high: { dot: "#ef4444", badge: "rgba(239,68,68,0.12)", text: "#ef4444" },
  };

  return (
    <div
      style={{
        padding: "2rem 2rem 3rem",
        maxWidth: 1200,
        margin: "0 auto",
        color: "var(--color-text-primary)",
        animation: "fadeInUp 0.35s ease-out",
      }}
    >
      {/* ── HEADER ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "1.75rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.04em",
              marginBottom: 4,
              lineHeight: 1.2,
            }}
          >
            {greeting}, {user?.name?.split(" ")[0]}!
          </h1>
          <p style={{ fontSize: 14, color: "var(--color-text-tertiary)" }}>
            Explore information and activity about your clinic
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Global Search */}
          <GlobalSearch patients={patients} history={history} />

          {/* Chat icon (for Pro+) */}
          {tenant?.plan !== "starter" && (
            <div
              onClick={() => {
                const chatBtn = document.getElementById("ai-chat-toggle");
                chatBtn?.click();
              }}
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "var(--color-background-primary)",
                border: "1px solid var(--color-border-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "var(--shadow-xs)",
                cursor: "pointer",
                position: "relative",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-text-secondary)"
                strokeWidth="1.8"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
          )}

          {/* Notification Tray */}
          <NotificationTray />
        </div>
      </div>

      {/* ── AI INSIGHT (Pro+) ── */}
      {tenant?.plan !== "starter" && (
        <AiInsightStrip
          patients={patients}
          history={history}
          loading={loading}
        />
      )}

      {/* ── STAT CARDS ROW ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginBottom: "1.25rem",
        }}
      >
        {loading ? (
          Array(4)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: 120, borderRadius: 18 }}
              />
            ))
        ) : (
          <>
            {/* Card 1: Estimates this month */}
            <div
              style={{
                background: "var(--color-background-primary)",
                borderRadius: 18,
                padding: "18px 20px",
                border: "1px solid var(--color-border-secondary)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "var(--color-text-secondary)",
                  marginBottom: 10,
                  fontWeight: 500,
                }}
              >
                Estimates this month
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "var(--color-text-primary)",
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                  }}
                >
                  {thisMonth.length}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <BarSparkline data={estimatesByMonth} color="#0f766e" />
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: monthDelta >= 0 ? "#10b981" : "#ef4444",
                  fontWeight: 600,
                }}
              >
                {monthDelta >= 0 ? "+" : ""}
                {monthDelta} vs last month
              </div>
            </div>

            {/* Card 2: New patients */}
            <div
              style={{
                background: "var(--color-background-primary)",
                borderRadius: 18,
                padding: "18px 20px",
                border: "1px solid var(--color-border-secondary)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "var(--color-text-secondary)",
                  marginBottom: 10,
                  fontWeight: 500,
                }}
              >
                New clients
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "var(--color-text-primary)",
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                  }}
                >
                  {patients.length}
                </div>
                <LineSparkline data={patientGrowth} color="#0e7490" />
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--color-text-tertiary)",
                  fontWeight: 500,
                }}
              >
                {patients.length === 0
                  ? "Add your first patient"
                  : `${patients.length} registered`}
              </div>
            </div>

            {/* Card 3: Revenue recovered */}
            <div
              style={{
                background: "var(--color-background-primary)",
                borderRadius: 18,
                padding: "18px 20px",
                border: "1px solid var(--color-border-secondary)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "var(--color-text-secondary)",
                  marginBottom: 10,
                  fontWeight: 500,
                }}
              >
                Earnings
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: "var(--color-text-primary)",
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                  }}
                >
                  $
                  {revenueRecovered.toLocaleString("en-CA", {
                    maximumFractionDigits: 0,
                  })}
                </div>
                <LineSparkline data={revenueByMonth7} color="#10b981" />
              </div>
              <div style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>
                {thisMonth.length > 0
                  ? `avg $${Math.round(revenueRecovered / thisMonth.length).toLocaleString()}/estimate`
                  : "insurer payments this month"}
              </div>
            </div>

            {/* Card 4: Activity — highlighted dark green (like reference) */}
            <div
              style={{
                background: "#1a3a30",
                borderRadius: 18,
                padding: "18px 20px",
                border: "none",
                boxShadow: "0 4px 20px rgba(15,60,40,0.25)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.55)",
                  marginBottom: 10,
                  fontWeight: 500,
                }}
              >
                Activity
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "#fff",
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                  }}
                >
                  {highRiskCount}
                </div>
                <LineSparkline data={riskTrend} color="rgba(255,255,255,0.5)" />
              </div>
              <div
                style={{
                  fontSize: 11,
                  color:
                    highRiskCount === 0 ? "rgba(255,255,255,0.45)" : "#fca5a5",
                  fontWeight: 600,
                }}
              >
                {highRiskCount === 0
                  ? "No risk flags"
                  : `${highRiskCount} need attention`}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── MIDDLE ROW: Revenue trend + Coverage gauge + Profile ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 280px 220px",
          gap: 14,
          marginBottom: "1.25rem",
        }}
      >
        {/* Revenue Balance card */}
        <div
          style={{
            background: "var(--color-background-primary)",
            borderRadius: 18,
            padding: "20px 22px",
            border: "1px solid var(--color-border-secondary)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                  letterSpacing: "-0.02em",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                Revenue Recovery
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    background: "rgba(16,185,129,0.1)",
                    borderRadius: 100,
                    padding: "2px 9px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#10b981",
                  }}
                >
                  <svg
                    width="9"
                    height="9"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  On track
                </div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--color-text-tertiary)",
                  marginTop: 2,
                }}
              >
                Last 12 months insurance recovery
              </div>
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--color-text-tertiary)",
                background: "var(--color-background-secondary)",
                borderRadius: 8,
                padding: "5px 12px",
                border: "1px solid var(--color-border-secondary)",
                cursor: "default",
              }}
            >
              Monthly ▾
            </div>
          </div>

          {/* Two stats */}
          <div style={{ display: "flex", gap: 32, marginBottom: 16 }}>
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--color-text-tertiary)",
                  marginBottom: 2,
                }}
              >
                Saves
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: "var(--color-text-primary)",
                    letterSpacing: "-0.03em",
                  }}
                >
                  {coverageRate.toFixed(1)}%
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#10b981",
                    background: "rgba(16,185,129,0.1)",
                    borderRadius: 100,
                    padding: "1px 7px",
                  }}
                >
                  +{Math.max(0, coverageRate - 60).toFixed(1)}%
                </span>
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--color-text-tertiary)",
                  marginBottom: 2,
                }}
              >
                Total recovered
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: "var(--color-text-primary)",
                    letterSpacing: "-0.03em",
                  }}
                >
                  $
                  {history
                    .reduce((s, h) => s + (h.insurer_pays || 0), 0)
                    .toLocaleString("en-CA", { maximumFractionDigits: 0 })}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color:
                      monthlyRevenue[monthlyRevenue.length - 1] >
                      monthlyRevenue[monthlyRevenue.length - 2]
                        ? "#10b981"
                        : "#ef4444",
                    background:
                      monthlyRevenue[monthlyRevenue.length - 1] >
                      monthlyRevenue[monthlyRevenue.length - 2]
                        ? "rgba(16,185,129,0.1)"
                        : "rgba(239,68,68,0.1)",
                    borderRadius: 100,
                    padding: "1px 7px",
                  }}
                >
                  this period
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div
              className="skeleton"
              style={{ height: 100, borderRadius: 8 }}
            />
          ) : (
            <RevenueTrendChart data={monthlyRevenue} />
          )}
        </div>

        {/* Coverage gauge card */}
        <div
          style={{
            background: "var(--color-background-primary)",
            borderRadius: 18,
            padding: "20px 22px",
            border: "1px solid var(--color-border-secondary)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.02em",
              marginBottom: 4,
            }}
          >
            Earnings
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--color-text-tertiary)",
              marginBottom: 16,
            }}
          >
            Total Expense
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.04em",
              marginBottom: 6,
            }}
          >
            $
            {revenueRecovered.toLocaleString("en-CA", {
              maximumFractionDigits: 2,
              minimumFractionDigits: 2,
            })}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--color-text-secondary)",
              marginBottom: 20,
            }}
          >
            Coverage rate is{" "}
            <span style={{ color: "#10b981", fontWeight: 600 }}>
              {coverageRate}%
            </span>{" "}
            avg this month
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            {loading ? (
              <div
                className="skeleton"
                style={{ width: 100, height: 54, borderRadius: 8 }}
              />
            ) : (
              <div style={{ textAlign: "center" }}>
                <SemiGauge percent={coverageRate || 0} color="#0f766e" />
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--color-text-tertiary)",
                    marginTop: 4,
                  }}
                >
                  Coverage Rate
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Clinic / User profile card */}
        <div
          style={{
            background: "var(--color-background-primary)",
            borderRadius: 18,
            padding: "20px 22px",
            border: "1px solid var(--color-border-secondary)",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #0f766e, #0d9488)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 800,
              color: "#fff",
              marginBottom: 12,
              boxShadow: "0 4px 16px rgba(15,118,110,0.25)",
            }}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.02em",
              marginBottom: 2,
            }}
          >
            {user?.name}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--color-text-tertiary)",
              marginBottom: 16,
            }}
          >
            {user?.role?.replace("_", " ")} · {tenant?.name || "Your Clinic"}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              width: "100%",
            }}
          >
            {[
              { label: "Plan", value: tenant?.plan || "—" },
              { label: "Patients", value: patients.length.toString() },
              { label: "Estimates", value: thisMonth.length.toString() },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "var(--color-text-primary)",
                    letterSpacing: "-0.02em",
                    textTransform: "capitalize",
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--color-text-tertiary)",
                    fontWeight: 500,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BOTTOM ROW: Quick actions + Recent activity + AI/Security ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr 220px",
          gap: 14,
        }}
      >
        {/* Quick actions (credit card style section) */}
        <div
          style={{
            background: "var(--color-background-primary)",
            borderRadius: 18,
            padding: "20px",
            border: "1px solid var(--color-border-secondary)",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.02em",
              marginBottom: 14,
            }}
          >
            Quick actions
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              flex: 1,
            }}
          >
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
                  gap: 10,
                  padding: "9px 10px",
                  borderRadius: 11,
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
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: `${a.color}14`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {a.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                      marginBottom: 1,
                    }}
                  >
                    {a.label}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--color-text-tertiary)",
                    }}
                  >
                    {a.desc}
                  </div>
                </div>
                <svg
                  width="12"
                  height="12"
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
          <Link
            href="/dashboard/estimates"
            style={{
              display: "block",
              marginTop: 12,
              textAlign: "center",
              padding: "10px",
              borderRadius: 11,
              background: "linear-gradient(135deg, #0f766e, #0d9488)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "var(--shadow-accent)",
            }}
          >
            New Estimate +
          </Link>
        </div>

        {/* Recent activity / transfers */}
        <div
          style={{
            background: "var(--color-background-primary)",
            borderRadius: 18,
            padding: "20px 22px",
            border: "1px solid var(--color-border-secondary)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              Your Transfers
            </h3>
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
                width="11"
                height="11"
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
                  style={{ height: 48, borderRadius: 10, marginBottom: 8 }}
                />
              ))
          ) : recent.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "var(--color-background-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                  fontSize: 26,
                }}
              >
                📋
              </div>
              <div
                style={{
                  fontSize: 14,
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
                }}
              >
                Run first estimate →
              </Link>
            </div>
          ) : (
            recent.map((item, idx) => {
              const rs =
                riskStyle[item.claim_risk as keyof typeof riskStyle] ??
                riskStyle.low;
              const patientLabel = item.first_name
                ? `${item.first_name} ${item.last_name ?? ""}`.trim()
                : null;
              return (
                <Link
                  href={`/dashboard/claims/${item.id}`}
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "11px 10px",
                    borderRadius: 10,
                    marginBottom: 4,
                    transition: "background 0.12s",
                    cursor: "pointer",
                    textDecoration: "none",
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
                      width: 4,
                      height: 32,
                      borderRadius: 99,
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
                        {patientLabel || item.cdt_code}
                      </span>
                      {patientLabel && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--color-text-tertiary)",
                          }}
                        >
                          · {item.cdt_code}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--color-text-tertiary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {timeAgo(item.created_at)},{" "}
                      {String(item.coverage_percent ?? 0)}% covered
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: rs.text,
                      }}
                    >
                      +$
                      {(item.insurer_pays || 0).toLocaleString("en-CA", {
                        maximumFractionDigits: 0,
                      })}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        padding: "1px 7px",
                        borderRadius: 20,
                        background: rs.badge,
                        color: rs.text,
                        fontWeight: 600,
                        marginTop: 2,
                      }}
                    >
                      {item.claim_risk}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* Security / AI card */}
        <div
          style={{
            background: "var(--color-background-primary)",
            borderRadius: 18,
            padding: "20px 22px",
            border: "1px solid var(--color-border-secondary)",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 12,
          }}
        >
          {/* AI/fingerprint icon */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, rgba(15,118,110,0.1), rgba(13,148,136,0.05))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              marginTop: 8,
            }}
          >
            🔒
          </div>
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                marginBottom: 6,
              }}
            >
              Keep you safe!
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--color-text-secondary)",
                lineHeight: 1.55,
              }}
            >
              Update your security settings and review clinic access
              permissions.
            </div>
          </div>
          <Link
            href="/dashboard/settings"
            style={{
              display: "block",
              width: "100%",
              padding: "12px",
              borderRadius: 11,
              background: "#1a1a1a",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Update Your Security
          </Link>
          {tenant?.plan === "cortex" && (
            <Link
              href="/dashboard/cortex"
              style={{
                display: "block",
                width: "100%",
                padding: "11px",
                borderRadius: 11,
                background: "rgba(99,102,241,0.08)",
                color: "#6366f1",
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
                border: "1px solid rgba(99,102,241,0.15)",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(99,102,241,0.14)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(99,102,241,0.08)")
              }
            >
              🧠 Open Cortex
            </Link>
          )}
        </div>
      </div>

      {/* Getting started banner (empty state) */}
      {!loading && history.length === 0 && (
        <div
          style={{
            marginTop: 16,
            background:
              "linear-gradient(135deg, #0c4a44, #0f766e 40%, #0d9488)",
            borderRadius: 18,
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
              background: "rgba(255,255,255,0.04)",
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
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
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
