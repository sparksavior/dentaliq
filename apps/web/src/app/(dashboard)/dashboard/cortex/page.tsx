"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useClinic } from "@/contexts/clinic-context";
import { agentsApi, tenantsApi } from "@/lib/api";
import {
  Activity,
  Zap,
  Shield,
  BrainCircuit,
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  Users,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  XCircle,
  Terminal,
} from "lucide-react";

// ── Agent catalogue ───────────────────────────────────────
const CORTEX_AGENTS = [
  {
    id: "billing",
    name: "Billing Agent",
    codename: "CORTEX-01",
    role: "Revenue Compliance Specialist",
    avatar: "💰",
    color: "#6366f1",
    glow: "rgba(99,102,241,0.25)",
    bg: "rgba(99,102,241,0.08)",
    capabilities: [
      "Nightly scan of high-risk estimates",
      "AI-drafted pre-authorization letters",
      "Prevents $25–50K/yr in denied claims",
      "Human review before any submission",
    ],
  },
  {
    id: "recall",
    name: "Recall Agent",
    codename: "CORTEX-02",
    role: "Patient Reactivation Specialist",
    avatar: "📞",
    color: "#0ea5e9",
    glow: "rgba(14,165,233,0.25)",
    bg: "rgba(14,165,233,0.08)",
    capabilities: [
      "Finds patients 6+ months overdue",
      "Personalized (not template) messages",
      "Recovers 3–8 patients per month",
      "Each patient = ~$500–1,200/year",
    ],
  },
  {
    id: "review",
    name: "Review Agent",
    codename: "CORTEX-03",
    role: "Reputation Manager",
    avatar: "⭐",
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.25)",
    bg: "rgba(245,158,11,0.08)",
    capabilities: [
      "Targets recently-completed patients",
      "Personalized review requests per visit",
      "No duplicate requests — smart dedup",
      "Each 0.1★ gain drives new patients",
    ],
  },
  {
    id: "supply",
    name: "Supply Agent",
    codename: "CORTEX-04",
    role: "Inventory Optimizer",
    avatar: "📦",
    color: "#10b981",
    glow: "rgba(16,185,129,0.25)",
    bg: "rgba(16,185,129,0.08)",
    capabilities: [
      "Analyzes 30-day CDT procedure volume",
      "Predicts supply shortages before they hit",
      "Flags high-volume categories for reorder",
      "Prevents costly emergency orders",
    ],
  },
  {
    id: "treatment",
    name: "Treatment Coordinator",
    codename: "CORTEX-05",
    role: "Case Acceptance Specialist",
    avatar: "🦷",
    color: "#ec4899",
    glow: "rgba(236,72,153,0.25)",
    bg: "rgba(236,72,153,0.08)",
    capabilities: [
      "Tracks unaccepted estimates 14+ days old",
      "Empathetic follow-ups, not sales scripts",
      "30–40% of declined plans can be recovered",
      "Average case value $1,500–5,000",
    ],
  },
  {
    id: "hygienist",
    name: "Hygienist Agent",
    codename: "CORTEX-06",
    role: "Schedule Optimizer",
    avatar: "📅",
    color: "#14b8a6",
    glow: "rgba(20,184,166,0.25)",
    bg: "rgba(20,184,166,0.08)",
    capabilities: [
      "Finds patients 9+ months overdue for hygiene",
      "Morning scheduling report with priorities",
      "Fills same-week cancellation gaps",
      "Empty chair = $150–300/hr lost revenue",
    ],
  },
];

const AGENT_MAP = Object.fromEntries(CORTEX_AGENTS.map((a) => [a.id, a]));

// ── Task-type → human label ───────────────────────────────
const TASK_LABELS: Record<string, string> = {
  pre_auth_letter: "Drafted pre-auth letter",
  recall_message: "Drafted recall message",
  review_request: "Drafted review request",
  supply_order: "Created supply reorder",
  treatment_followup: "Drafted treatment follow-up",
  schedule_optimization: "Created schedule report",
  cdt_version_reminder: "Created CDT staleness reminder",
};

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

// ─────────────────────────────────────────────────────────
export default function CortexCommandCenter() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { selectedClinicId } = useClinic();

  // ── Cortex plan guard ─────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return;
    tenantsApi.getTenant(accessToken).then(t => {
      if (t?.plan !== 'cortex') router.replace('/dashboard');
    }).catch(() => router.replace('/dashboard'));
  }, [accessToken, router]);

  const [rentedAgents, setRentedAgents] = useState<any[]>([]);

  // Activity feed state
  const [tasks, setTasks] = useState<any[]>([]);
  const [agentMeta, setAgentMeta] = useState<
    Record<
      string,
      { lastAt: string; pending: number; approved: number; total: number }
    >
  >({});
  const [activityLoading, setActivityLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [devView, setDevView] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  // KPI stats
  const [agentStats, setAgentStats] = useState<{
    pending: number;
    approved: number;
    byAgent: { agent_id: string; status: string; count: number }[];
  } | null>(null);

  const agentManagerUrl =
    process.env.NEXT_PUBLIC_AGENT_MANAGER_URL ?? "http://localhost:3006";

  // Fetch rented agents
  useEffect(() => {
    if (accessToken)
      agentsApi
        .getRentedAgents(accessToken)
        .then(setRentedAgents)
        .catch(() => {});
  }, [accessToken]);

  // Fetch activity feed + stats
  const fetchActivity = useCallback(
    async (quiet = false) => {
      if (!accessToken) return;
      if (!quiet) setActivityLoading(true);
      try {
        const [actRes, statsRes] = await Promise.all([
          fetch(`${agentManagerUrl}/activity?limit=40`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          fetch(`${agentManagerUrl}/stats`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
        ]);

        if (actRes.ok) {
          const actJson = await actRes.json();
          if (actJson.success) {
            setTasks(actJson.data.tasks ?? []);
            setAgentMeta(actJson.data.agentMeta ?? {});
          }
        }
        if (statsRes.ok) {
          const statsJson = await statsRes.json();
          if (statsJson.success)
            setAgentStats({
              ...statsJson.data.tasks,
              byAgent: statsJson.data.byAgent ?? [],
            });
        }
        setLastFetched(new Date());
      } catch {
        /* service may be down */
      } finally {
        setActivityLoading(false);
      }
    },
    [accessToken, agentManagerUrl],
  );

  useEffect(() => {
    fetchActivity();
    const id = setInterval(() => fetchActivity(true), 30_000);
    return () => clearInterval(id);
  }, [fetchActivity]);

  // Derived
  const clinicAgents = rentedAgents.filter(
    (r) => r.clinic_id === selectedClinicId,
  );
  const activeAgentTypes = CORTEX_AGENTS.filter((a) =>
    clinicAgents.some((r) => r.agent_id === a.id),
  );

  const approvedByAgent: Record<string, number> = {};
  for (const row of agentStats?.byAgent ?? []) {
    if (row.status === "approved")
      approvedByAgent[row.agent_id] =
        (approvedByAgent[row.agent_id] ?? 0) + Number(row.count);
  }

  const HOURS_PER_TASK: Record<string, number> = {
    billing: 0.75,
    recall: 0.33,
    review: 0.08,
    supply: 0.5,
    treatment: 0.5,
    hygienist: 0.25,
  };
  const REVENUE_PER_TASK: Record<string, number> = {
    billing: 800,
    recall: 600,
    treatment: 2500,
    hygienist: 200,
  };

  const hoursSaved = Object.entries(approvedByAgent).reduce(
    (s, [id, n]) => s + n * (HOURS_PER_TASK[id] ?? 0),
    0,
  );
  const revenueImpact = Object.entries(approvedByAgent).reduce(
    (s, [id, n]) => s + n * (REVENUE_PER_TASK[id] ?? 0),
    0,
  );

  const kpiStats = [
    {
      label: "Pending Review",
      value: (agentStats?.pending ?? 0).toString(),
      icon: Clock,
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.08)",
      gradient: "linear-gradient(135deg,#f59e0b,#d97706)",
    },
    {
      label: "Tasks Approved",
      value: (agentStats?.approved ?? 0).toString(),
      icon: CheckCircle2,
      color: "#10b981",
      bg: "rgba(16,185,129,0.08)",
      gradient: "linear-gradient(135deg,#10b981,#059669)",
    },
    {
      label: "Active Agents",
      value: clinicAgents.length.toString(),
      icon: Zap,
      color: "#6366f1",
      bg: "rgba(99,102,241,0.08)",
      gradient: "linear-gradient(135deg,#6366f1,#4f46e5)",
    },
    {
      label: "Total Agents",
      value: CORTEX_AGENTS.length.toString(),
      icon: Users,
      color: "#0ea5e9",
      bg: "rgba(14,165,233,0.08)",
      gradient: "linear-gradient(135deg,#0ea5e9,#0284c7)",
    },
    {
      label: "Hours Saved",
      value: hoursSaved > 0 ? `${hoursSaved.toFixed(1)}h` : "0h",
      icon: TrendingUp,
      color: "#8b5cf6",
      bg: "rgba(139,92,246,0.08)",
      gradient: "linear-gradient(135deg,#8b5cf6,#7c3aed)",
    },
    {
      label: "Revenue Impact",
      value:
        revenueImpact > 0
          ? `$${revenueImpact >= 1000 ? `${(revenueImpact / 1000).toFixed(1)}K` : revenueImpact}`
          : "$0",
      icon: BarChart3,
      color: "#ec4899",
      bg: "rgba(236,72,153,0.08)",
      gradient: "linear-gradient(135deg,#ec4899,#db2777)",
    },
  ];

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: 1400,
        margin: "0 auto",
        color: "var(--color-text-primary)",
        animation: "fadeInUp 0.35s ease-out",
      }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "2rem",
          padding: "1.75rem 2rem",
          background:
            "linear-gradient(135deg,rgba(99,102,241,0.06) 0%,rgba(139,92,246,0.04) 50%,rgba(14,165,233,0.03) 100%)",
          border: "1px solid rgba(99,102,241,0.15)",
          borderRadius: 20,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background:
              "radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
              }}
            >
              <BrainCircuit size={24} color="#fff" />
            </div>
            <div>
              <h1
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  margin: 0,
                  letterSpacing: "-0.03em",
                  background:
                    "linear-gradient(135deg,var(--color-text-primary) 60%,#6366f1)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Cortex Command Center
              </h1>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(16,185,129,0.1)",
                color: "#10b981",
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                border: "1px solid rgba(16,185,129,0.2)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#10b981",
                  display: "inline-block",
                  boxShadow: "0 0 6px #10b981",
                  animation: "pulseDot 2s infinite",
                }}
              />
              Live
            </div>
          </div>
          <p
            style={{
              margin: 0,
              color: "var(--color-text-secondary)",
              fontSize: 14,
              maxWidth: 520,
            }}
          >
            Real-time monitoring of automated clinic operations and your digital
            workforce.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, position: "relative" }}>
          <Link
            href="/dashboard/cortex/inbox"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 18px",
              background: "var(--color-accent)",
              color: "#fff",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
            }}
          >
            Approval Inbox
            {agentStats && agentStats.pending > 0 && (
              <span
                style={{
                  background: "rgba(255,255,255,0.25)",
                  borderRadius: 20,
                  padding: "1px 7px",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {agentStats.pending}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* ── KPI grid ────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6,1fr)",
          gap: 16,
          marginBottom: "2rem",
        }}
      >
        {kpiStats.map((stat, i) => (
          <div
            key={stat.label}
            style={{
              background: "var(--color-background-primary)",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: 16,
              padding: "1.4rem",
              position: "relative",
              overflow: "hidden",
              boxShadow: "var(--shadow-xs)",
              animation: `fadeInUp 0.4s ease-out ${i * 0.06}s both`,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: `linear-gradient(90deg,transparent,${stat.color},transparent)`,
                borderRadius: "16px 16px 0 0",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: stat.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1px solid ${stat.color}25`,
                }}
              >
                <stat.icon size={16} color={stat.color} />
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {stat.label}
              </span>
            </div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                background: stat.gradient,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Main 2-col layout ───────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: "1.5rem",
        }}
      >
        {/* Left — Active Workforce ──────────────────────────── */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Shield size={18} color="var(--color-accent)" /> Active Digital
              Workforce
              {activeAgentTypes.length > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    background: "var(--color-accent-muted)",
                    color: "var(--color-accent)",
                    padding: "2px 8px",
                    borderRadius: 20,
                    fontWeight: 700,
                  }}
                >
                  {activeAgentTypes.length}
                </span>
              )}
            </h2>
          </div>

          {activeAgentTypes.length === 0 ? (
            <div
              style={{
                background: "var(--color-background-primary)",
                border: "1.5px dashed var(--color-border-secondary)",
                padding: "4rem 2rem",
                textAlign: "center",
                borderRadius: 24,
              }}
            >
              <BrainCircuit
                size={32}
                color="var(--color-text-secondary)"
                style={{
                  opacity: 0.4,
                  margin: "0 auto 1.25rem",
                  display: "block",
                }}
              />
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                  margin: "0 0 8px",
                }}
              >
                No Agents Assigned
              </h3>
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  margin: "0 0 20px",
                  fontSize: 14,
                }}
              >
                This clinic doesn't have any active digital employees.
              </p>
              <Link
                href="/dashboard/settings"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 20px",
                  background: "var(--color-accent)",
                  color: "#fff",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Hire Agents <ChevronRight size={14} />
              </Link>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2,1fr)",
                gap: 16,
              }}
            >
              {activeAgentTypes.map((agent, idx) => {
                const meta = agentMeta[agent.id];
                const pending = meta?.pending ?? 0;
                const approved = meta?.approved ?? 0;
                const lastAt = meta?.lastAt;

                return (
                  <div
                    key={agent.id}
                    style={{
                      background: "var(--color-background-primary)",
                      border: "1px solid var(--color-border-secondary)",
                      borderRadius: 20,
                      padding: "1.5rem",
                      position: "relative",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      transition: "all 0.25s ease",
                      boxShadow: "var(--shadow-xs)",
                      animation: `fadeInUp 0.4s ease-out ${0.1 + idx * 0.07}s both`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.borderColor = agent.color + "50";
                      e.currentTarget.style.boxShadow = `0 12px 32px ${agent.glow}`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.borderColor =
                        "var(--color-border-secondary)";
                      e.currentTarget.style.boxShadow = "var(--shadow-xs)";
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        width: 80,
                        height: 80,
                        background: `radial-gradient(circle at top right,${agent.bg},transparent 70%)`,
                        pointerEvents: "none",
                      }}
                    />

                    {/* Last-active badge */}
                    <div
                      style={{
                        position: "absolute",
                        top: 14,
                        right: 14,
                        background: lastAt
                          ? "rgba(16,185,129,0.1)"
                          : "rgba(100,116,139,0.1)",
                        border: `1px solid ${lastAt ? "rgba(16,185,129,0.2)" : "rgba(100,116,139,0.2)"}`,
                        borderRadius: 20,
                        padding: "3px 9px",
                        fontSize: 10,
                        fontWeight: 700,
                        color: lastAt
                          ? "#10b981"
                          : "var(--color-text-tertiary)",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      {lastAt && (
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: "#10b981",
                            display: "inline-block",
                            animation: "pulseDot 2s infinite",
                          }}
                        />
                      )}
                      {lastAt ? timeAgo(lastAt) : "No runs yet"}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        marginBottom: 14,
                      }}
                    >
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 15,
                          background: agent.bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 26,
                          border: `1.5px solid ${agent.color}30`,
                          flexShrink: 0,
                        }}
                      >
                        {agent.avatar}
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 9,
                            fontFamily: "monospace",
                            color: agent.color,
                            marginBottom: 3,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                          }}
                        >
                          {agent.codename}
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "var(--color-text-primary)",
                            lineHeight: 1.3,
                          }}
                        >
                          {agent.name}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        color: agent.color,
                        fontWeight: 600,
                        marginBottom: 14,
                        background: agent.bg,
                        padding: "5px 10px",
                        borderRadius: 8,
                        display: "inline-block",
                        border: `1px solid ${agent.color}20`,
                      }}
                    >
                      {agent.role}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        flex: 1,
                      }}
                    >
                      {agent.capabilities.slice(0, 3).map((cap) => (
                        <div
                          key={cap}
                          style={{
                            fontSize: 12,
                            color: "var(--color-text-secondary)",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 7,
                          }}
                        >
                          <span
                            style={{
                              color: agent.color,
                              fontSize: 10,
                              marginTop: 2,
                              flexShrink: 0,
                            }}
                          >
                            ✓
                          </span>
                          <span style={{ lineHeight: 1.4 }}>{cap}</span>
                        </div>
                      ))}
                    </div>

                    {/* Task count strip */}
                    {meta && (
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          marginTop: 14,
                          paddingTop: 12,
                          borderTop: `1px solid ${agent.color}18`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 11,
                            color: "#f59e0b",
                          }}
                        >
                          <Clock size={11} />
                          {pending} pending
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 11,
                            color: "#10b981",
                          }}
                        >
                          <CheckCircle2 size={11} />
                          {approved} approved
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right — Activity Feed ───────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              background: "#09090b",
              borderRadius: 18,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              height: 560,
              boxShadow: "0 0 0 1px #27272a,0 20px 60px rgba(0,0,0,0.3)",
              position: "relative",
            }}
          >
            {/* Top rainbow line */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background:
                  "linear-gradient(90deg,#6366f1,#0ea5e9,#10b981,#f59e0b,#ec4899)",
              }}
            />

            {/* Header bar */}
            <div
              style={{
                padding: "1.1rem 1.2rem",
                borderBottom: "1px solid #27272a",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 2,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {["#ef4444", "#f59e0b", "#10b981"].map((c) => (
                    <div
                      key={c}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: c,
                        opacity: 0.7,
                      }}
                    />
                  ))}
                </div>
                <h2
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#71717a",
                    margin: 0,
                    fontFamily: "monospace",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  {devView ? "neural.stream" : "agent.activity"}
                </h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* Dev view toggle */}
                <button
                  onClick={() => setDevView(!devView)}
                  title={
                    devView ? "Switch to activity feed" : "Switch to dev view"
                  }
                  style={{
                    background: devView
                      ? "rgba(99,102,241,0.2)"
                      : "transparent",
                    border: `1px solid ${devView ? "rgba(99,102,241,0.4)" : "#3f3f46"}`,
                    borderRadius: 6,
                    padding: "3px 8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    color: devView ? "#818cf8" : "#52525b",
                    fontSize: 10,
                    fontFamily: "monospace",
                    fontWeight: 600,
                  }}
                >
                  <Terminal size={11} />
                  DEV
                </button>
                {/* Refresh */}
                <button
                  onClick={() => fetchActivity(true)}
                  title="Refresh feed"
                  style={{
                    background: "transparent",
                    border: "1px solid #3f3f46",
                    borderRadius: 6,
                    padding: "3px 7px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    color: "#52525b",
                  }}
                >
                  <RefreshCw
                    size={11}
                    style={{
                      animation: activityLoading
                        ? "spin 0.7s linear infinite"
                        : "none",
                    }}
                  />
                </button>
                {/* Live indicator */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    background: "rgba(16,185,129,0.1)",
                    color: "#10b981",
                    padding: "3px 10px",
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    border: "1px solid rgba(16,185,129,0.2)",
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "#10b981",
                      display: "inline-block",
                      boxShadow: "0 0 6px #10b981",
                      animation: "pulseDot 1.5s infinite",
                    }}
                  />
                  LIVE
                </div>
              </div>
            </div>

            {/* Feed body */}
            <div
              ref={feedRef}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "0.75rem 1rem",
                background: "#09090b",
              }}
            >
              {activityLoading && tasks.length === 0 ? (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#3f3f46",
                  }}
                >
                  <RefreshCw
                    size={22}
                    style={{
                      marginBottom: 12,
                      opacity: 0.3,
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <div
                    style={{
                      fontSize: 12,
                      fontFamily: "monospace",
                      letterSpacing: "0.06em",
                    }}
                  >
                    loading activity...
                  </div>
                </div>
              ) : tasks.length === 0 ? (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#3f3f46",
                  }}
                >
                  <Zap size={28} style={{ marginBottom: 12, opacity: 0.3 }} />
                  <div
                    style={{
                      fontSize: 12,
                      fontFamily: "monospace",
                      letterSpacing: "0.06em",
                    }}
                  >
                    awaiting first agent run...
                  </div>
                </div>
              ) : devView ? (
                /* Dev view — raw monospace log style */
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 1 }}
                >
                  {tasks.map((task, i) => {
                    const agent = AGENT_MAP[task.agentId];
                    const color = agent?.color ?? "#71717a";
                    const codename =
                      agent?.codename ?? task.agentId.toUpperCase();
                    const timeStr = new Date(task.createdAt).toLocaleTimeString(
                      "en-US",
                      {
                        hour12: false,
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      },
                    );
                    return (
                      <div
                        key={task.id}
                        style={{
                          display: "flex",
                          gap: 10,
                          padding: "6px 4px",
                          borderBottom: "1px solid #18181b",
                          fontFamily: '"JetBrains Mono","Fira Code",monospace',
                          animation:
                            i === 0 ? "fadeIn 0.3s ease-out" : undefined,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            color: "#3f3f46",
                            flexShrink: 0,
                            marginTop: 3,
                            minWidth: 68,
                          }}
                        >
                          {timeStr}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 1,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 800,
                                color,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                              }}
                            >
                              [{codename}]
                            </span>
                            <span
                              style={{
                                fontSize: 9,
                                color:
                                  task.status === "approved"
                                    ? "#10b981"
                                    : task.status === "rejected"
                                      ? "#ef4444"
                                      : "#f59e0b",
                                opacity: 0.8,
                              }}
                            >
                              {task.status.toUpperCase()}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#a1a1aa",
                              lineHeight: 1.4,
                            }}
                          >
                            {TASK_LABELS[task.taskType] ?? task.taskType}
                            {task.patientName ? ` — ${task.patientName}` : ""}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Default — human-readable activity feed */
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  {tasks.map((task, i) => {
                    const agent = AGENT_MAP[task.agentId];
                    const color = agent?.color ?? "#71717a";
                    const StatusIcon =
                      task.status === "approved"
                        ? CheckCircle2
                        : task.status === "rejected"
                          ? XCircle
                          : Clock;
                    const statusColor =
                      task.status === "approved"
                        ? "#10b981"
                        : task.status === "rejected"
                          ? "#ef4444"
                          : "#f59e0b";

                    return (
                      <div
                        key={task.id}
                        style={{
                          display: "flex",
                          gap: 10,
                          padding: "9px 6px",
                          borderBottom: "1px solid #18181b",
                          animation:
                            i === 0 ? "fadeIn 0.3s ease-out" : undefined,
                        }}
                      >
                        {/* Agent avatar */}
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 9,
                            background: `${color}18`,
                            border: `1px solid ${color}30`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 15,
                            flexShrink: 0,
                          }}
                        >
                          {agent?.avatar ?? "🤖"}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 3,
                            }}
                          >
                            <span
                              style={{ fontSize: 11, fontWeight: 700, color }}
                            >
                              {agent?.name ?? task.agentId}
                            </span>
                            <span style={{ fontSize: 10, color: "#52525b" }}>
                              ·
                            </span>
                            <span style={{ fontSize: 10, color: "#52525b" }}>
                              {timeAgo(task.createdAt)}
                            </span>
                            <div
                              style={{
                                marginLeft: "auto",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                color: statusColor,
                              }}
                            >
                              <StatusIcon size={11} />
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  textTransform: "capitalize",
                                }}
                              >
                                {task.status}
                              </span>
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#a1a1aa",
                              lineHeight: 1.45,
                            }}
                          >
                            {TASK_LABELS[task.taskType] ?? task.taskType}
                            {task.patientName && (
                              <span style={{ color: "#71717a" }}>
                                {" "}
                                — {task.patientName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Status bar */}
            <div
              style={{
                padding: "6px 12px",
                borderTop: "1px solid #27272a",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#0c0c0e",
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  color: "#3f3f46",
                  fontFamily: "monospace",
                }}
              >
                {tasks.length} events
              </span>
              <span
                style={{
                  fontSize: 9,
                  color: "#52525b",
                  fontFamily: "monospace",
                }}
              >
                {lastFetched
                  ? `updated ${timeAgo(lastFetched.toISOString())}`
                  : ""}
              </span>
              <span
                style={{
                  fontSize: 9,
                  color: "#10b981",
                  fontFamily: "monospace",
                  opacity: 0.6,
                }}
              >
                ● auto-refresh 30s
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
