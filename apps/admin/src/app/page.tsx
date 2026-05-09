"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { adminApi, type Tenant, type SupportTicket } from "@/lib/api";
import {
  Users,
  Building2,
  Activity,
  LogOut,
  LifeBuoy,
  BarChart3,
  Cpu,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Clock,
} from "lucide-react";

type NavTab = "clinics" | "tickets" | "metrics" | "health" | "audit";

const PLAN_PRICES: Record<string, number> = {
  starter: 49,
  pro: 149,
  enterprise: 249,
  cortex: 299,
};

const STATUS_COLORS: Record<
  string,
  { bg: string; color: string; border: string; label: string }
> = {
  open: { bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe", label: "Open" },
  in_progress: {
    bg: "#fffbeb",
    color: "#92400e",
    border: "#fde68a",
    label: "In Progress",
  },
  resolved: {
    bg: "#f0fdf4",
    color: "#166534",
    border: "#bbf7d0",
    label: "Resolved",
  },
};

const PLAN_COLORS: Record<string, { bg: string; color: string }> = {
  starter: { bg: "#f0f9ff", color: "#0369a1" },
  pro: { bg: "#faf5ff", color: "#7c3aed" },
  enterprise: { bg: "#fff7ed", color: "#c2410c" },
  cortex: { bg: "#f0fdf4", color: "#15803d" },
};

const AGENT_LABELS: Record<string, string> = {
  billing: "Billing",
  recall: "Recall",
  review: "Review",
  supply: "Supply",
  treatment: "Treatment",
  hygienist: "Hygienist",
};

const TASK_STATUS_COLORS: Record<string, string> = {
  pending: "#ca8a04",
  approved: "#16a34a",
  rejected: "#dc2626",
  sent: "#2563eb",
};

// ─── KPI Card ────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "#0f766e",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  color?: string;
}) {
  return (
    <div
      style={{
        background: "var(--color-background-primary)",
        border: "1px solid var(--color-border-secondary)",
        borderRadius: 16,
        padding: "1.5rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </span>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `${color}18`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={18} color={color} />
        </div>
      </div>
      <div
        style={{
          fontSize: 36,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "var(--color-text-primary)",
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 13,
            color: "var(--color-text-secondary)",
            marginTop: 4,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────
export default function AdminDashboard() {
  const [tab, setTab] = useState<NavTab>("clinics");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [healthData, setHealthData] = useState<any[]>([]);
  const [auditRows, setAuditRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replying, setReplying] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const healthIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadTickets = useCallback(async (t: string) => {
    try {
      const res = await adminApi.listTickets(t);
      if (res.success) setTickets(res.data);
    } catch {
      /* noop */
    }
  }, []);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const data = await adminApi.getServiceHealth();
      setHealthData(data);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const loadAudit = useCallback(async (t: string) => {
    try {
      const res = await adminApi.getAuditLog(t, 200);
      if (res.success) setAuditRows(res.data);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("token");
    if (!stored) {
      window.location.href = "/login";
      return;
    }
    setToken(stored);

    const load = async () => {
      try {
        const response = await adminApi.getMe(stored);
        const me = response.data;
        if (!me) {
          window.location.href = "/login";
          return;
        }
        if (me.role !== "admin") {
          alert("Access Denied: You must be an admin.");
          window.location.href = "http://localhost:3000/dashboard";
          return;
        }
        setUser(me);
        const [tenantsRes, statsRes] = await Promise.all([
          adminApi.listTenants(stored),
          adminApi.getStats(stored).catch(() => null),
        ]);
        setTenants(Array.isArray(tenantsRes.data) ? tenantsRes.data : []);
        if (statsRes?.success) setStats(statsRes.data);
        await loadTickets(stored);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [loadTickets]);

  // Poll tickets every 8s when on tickets tab
  useEffect(() => {
    if (tab !== "tickets" || !token) return;
    const interval = setInterval(() => loadTickets(token), 8000);
    return () => clearInterval(interval);
  }, [tab, token, loadTickets]);

  // Load health on tab switch; poll every 30s
  useEffect(() => {
    if (tab !== "health") {
      if (healthIntervalRef.current) clearInterval(healthIntervalRef.current);
      return;
    }
    loadHealth();
    healthIntervalRef.current = setInterval(loadHealth, 30000);
    return () => {
      if (healthIntervalRef.current) clearInterval(healthIntervalRef.current);
    };
  }, [tab, loadHealth]);

  // Load audit log when tab opens
  useEffect(() => {
    if (tab === "audit" && token) loadAudit(token);
  }, [tab, token, loadAudit]);

  const updateTicketStatus = async (id: string, status: string) => {
    if (!token) return;
    await adminApi.updateTicket(token, id, status);
    await loadTickets(token);
    if (activeTicket?.id === id) setActiveTicket({ ...activeTicket, status });
  };

  const loadTicketDetail = async (id: string) => {
    if (!token) return;
    try {
      const res = await adminApi.getTicket(token, id);
      if (res.success) setActiveTicket(res.data);
    } catch {}
  };

  const sendAdminReply = async () => {
    if (!token || !activeTicket || !replyMessage.trim()) return;
    setReplying(true);
    try {
      await adminApi.addMessage(token, activeTicket.id, replyMessage.trim());
      setReplyMessage("");
      await loadTicketDetail(activeTicket.id);
    } finally {
      setReplying(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-background-secondary)",
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "2px solid var(--color-accent)",
            borderTopColor: "transparent",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  const openCount = tickets.filter((t) => t.status === "open").length;

  const navItems: { id: NavTab; label: string; icon: any; badge?: number }[] = [
    { id: "clinics", label: "Clinics", icon: Building2 },
    {
      id: "tickets",
      label: "Support",
      icon: LifeBuoy,
      badge: openCount || undefined,
    },
    { id: "metrics", label: "Metrics", icon: BarChart3 },
    { id: "health", label: "System Health", icon: Activity },
    { id: "audit", label: "Audit Log", icon: Clock },
  ];

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--color-background-secondary)",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 260,
          background: "var(--color-background-primary)",
          borderRight: "1px solid var(--color-border-secondary)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #0f766e, #0d9488)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 800,
              fontSize: 18,
            }}
          >
            +
          </div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>
            Dental<span style={{ color: "var(--color-accent)" }}>IQ</span>{" "}
            <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 600 }}>
              ADMIN
            </span>
          </div>
        </div>

        <nav
          style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}
        >
          {navItems.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                setActiveTicket(null);
              }}
              style={{
                background:
                  tab === id ? "var(--color-accent-muted)" : "transparent",
                color:
                  tab === id
                    ? "var(--color-accent)"
                    : "var(--color-text-secondary)",
                padding: "11px 16px",
                borderRadius: 12,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 12,
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                fontSize: 14,
                transition: "background 0.15s, color 0.15s",
              }}
            >
              <Icon size={17} />
              {label}
              {badge != null && badge > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    background: "#ef4444",
                    color: "#fff",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 7px",
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div
          style={{
            borderTop: "1px solid var(--color-border-secondary)",
            paddingTop: 16,
            marginTop: 8,
          }}
        >
          {user && (
            <div style={{ padding: "10px 16px", marginBottom: 8 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                }}
              >
                {user.name}
              </div>
              <div
                style={{ fontSize: 12, color: "var(--color-text-secondary)" }}
              >
                {user.email}
              </div>
            </div>
          )}
          <button
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/login";
            }}
            style={{
              width: "100%",
              padding: "11px 16px",
              borderRadius: 12,
              border: "1px solid var(--color-border-secondary)",
              background: "transparent",
              color: "var(--color-text-primary)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main
        style={{ flex: 1, padding: "40px", overflowY: "auto", minWidth: 0 }}
      >
        {/* ── CLINICS TAB ────────────────────────────────── */}
        {tab === "clinics" && (
          <>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
                Clinic Management
              </h1>
              <p style={{ color: "var(--color-text-secondary)" }}>
                Monitoring {tenants.length} registered clinics across DentalIQ.
              </p>
            </div>
            <div
              style={{
                background: "var(--color-background-primary)",
                borderRadius: 20,
                border: "1px solid var(--color-border-secondary)",
                overflow: "hidden",
                boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--color-border-secondary)",
                      background: "var(--color-background-secondary)",
                    }}
                  >
                    {[
                      "CLINIC NAME",
                      "STATUS",
                      "PLAN",
                      "TRIAL ENDS",
                      "CREATED",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "16px 24px",
                          fontSize: 12,
                          fontWeight: 700,
                          color: "var(--color-text-secondary)",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => {
                    const pc = PLAN_COLORS[t.plan] ?? {
                      bg: "#f8f8f8",
                      color: "#666",
                    };
                    return (
                      <tr
                        key={t.id}
                        style={{
                          borderBottom:
                            "1px solid var(--color-border-secondary)",
                        }}
                      >
                        <td style={{ padding: "18px 24px" }}>
                          <div style={{ fontWeight: 600 }}>{t.name}</div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--color-text-secondary)",
                            }}
                          >
                            {t.slug}.dentaliq.ca
                          </div>
                        </td>
                        <td style={{ padding: "18px 24px" }}>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 600,
                              textTransform: "capitalize",
                              background:
                                t.status === "active"
                                  ? "#f0fdf4"
                                  : t.status === "trial"
                                    ? "#eff6ff"
                                    : "#fef2f2",
                              color:
                                t.status === "active"
                                  ? "#166534"
                                  : t.status === "trial"
                                    ? "#1e40af"
                                    : "#991b1b",
                              border: `1px solid ${t.status === "active" ? "#bbf7d0" : t.status === "trial" ? "#bfdbfe" : "#fecaca"}`,
                            }}
                          >
                            {t.status === "suspended" ? "Suspended" : t.status}
                          </span>
                        </td>
                        <td style={{ padding: "18px 24px" }}>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 600,
                              textTransform: "capitalize",
                              background: pc.bg,
                              color: pc.color,
                            }}
                          >
                            {t.plan}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "18px 24px",
                            fontSize: 14,
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          {t.trialEndsAt
                            ? new Date(t.trialEndsAt).toLocaleDateString()
                            : "—"}
                        </td>
                        <td
                          style={{
                            padding: "18px 24px",
                            fontSize: 14,
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          {new Date(t.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "18px 24px" }}>
                          <span
                            style={{
                              color: "var(--color-accent)",
                              background: "var(--color-accent-muted)",
                              padding: "6px 12px",
                              borderRadius: 8,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: "default",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {t.id.slice(0, 8)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── METRICS TAB ────────────────────────────────── */}
        {tab === "metrics" && (
          <>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
                Platform Metrics
              </h1>
              <p style={{ color: "var(--color-text-secondary)" }}>
                Live snapshot from the database.
              </p>
            </div>

            {stats ? (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 20,
                    marginBottom: 32,
                  }}
                >
                  <KpiCard
                    label="Total Clinics"
                    value={stats.tenants.total}
                    icon={Building2}
                    color="#0f766e"
                  />
                  <KpiCard
                    label="MRR (Active)"
                    value={`$${(stats.mrr ?? 0).toLocaleString()}`}
                    sub="monthly recurring"
                    icon={TrendingUp}
                    color="#7c3aed"
                  />
                  <KpiCard
                    label="Open Tickets"
                    value={stats.support.openTickets}
                    icon={LifeBuoy}
                    color="#dc2626"
                  />
                  <KpiCard
                    label="Agent Tasks (Pending)"
                    value={stats.agentTasks?.pending ?? 0}
                    sub="awaiting approval"
                    icon={Cpu}
                    color="#ca8a04"
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 20,
                  }}
                >
                  {/* Plan Breakdown */}
                  <div
                    style={{
                      background: "var(--color-background-primary)",
                      border: "1px solid var(--color-border-secondary)",
                      borderRadius: 16,
                      padding: "1.5rem",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        marginBottom: 20,
                      }}
                    >
                      Clinics by Plan
                    </h3>
                    {Object.entries(stats.tenants.byPlan ?? {}).map(
                      ([plan, count]) => {
                        const pc = PLAN_COLORS[plan] ?? {
                          bg: "#f8f8f8",
                          color: "#666",
                        };
                        const pct =
                          stats.tenants.total > 0
                            ? Math.round(
                                ((count as number) / stats.tenants.total) * 100,
                              )
                            : 0;
                        return (
                          <div key={plan} style={{ marginBottom: 16 }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 6,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 14,
                                  fontWeight: 600,
                                  textTransform: "capitalize",
                                  color: pc.color,
                                }}
                              >
                                {plan}
                              </span>
                              <span style={{ fontSize: 14, fontWeight: 700 }}>
                                {count as number}{" "}
                                <span
                                  style={{
                                    fontWeight: 400,
                                    color: "var(--color-text-secondary)",
                                  }}
                                >
                                  ({pct}%)
                                </span>
                              </span>
                            </div>
                            <div
                              style={{
                                height: 8,
                                background: "var(--color-background-secondary)",
                                borderRadius: 4,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${pct}%`,
                                  background: pc.color,
                                  borderRadius: 4,
                                  transition: "width 0.5s ease",
                                }}
                              />
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>

                  {/* Status Breakdown */}
                  <div
                    style={{
                      background: "var(--color-background-primary)",
                      border: "1px solid var(--color-border-secondary)",
                      borderRadius: 16,
                      padding: "1.5rem",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        marginBottom: 20,
                      }}
                    >
                      Clinics by Status
                    </h3>
                    {Object.entries(stats.tenants.byStatus ?? {}).map(
                      ([status, count]) => {
                        const colors = {
                          active: "#16a34a",
                          trial: "#2563eb",
                          suspended: "#dc2626",
                        } as Record<string, string>;
                        const color = colors[status] ?? "#666";
                        const pct =
                          stats.tenants.total > 0
                            ? Math.round(
                                ((count as number) / stats.tenants.total) * 100,
                              )
                            : 0;
                        return (
                          <div key={status} style={{ marginBottom: 16 }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 6,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 14,
                                  fontWeight: 600,
                                  textTransform: "capitalize",
                                  color,
                                }}
                              >
                                {status}
                              </span>
                              <span style={{ fontSize: 14, fontWeight: 700 }}>
                                {count as number}{" "}
                                <span
                                  style={{
                                    fontWeight: 400,
                                    color: "var(--color-text-secondary)",
                                  }}
                                >
                                  ({pct}%)
                                </span>
                              </span>
                            </div>
                            <div
                              style={{
                                height: 8,
                                background: "var(--color-background-secondary)",
                                borderRadius: 4,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${pct}%`,
                                  background: color,
                                  borderRadius: 4,
                                }}
                              />
                            </div>
                          </div>
                        );
                      },
                    )}

                    <div
                      style={{
                        marginTop: 24,
                        paddingTop: 20,
                        borderTop: "1px solid var(--color-border-secondary)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--color-text-secondary)",
                          marginBottom: 8,
                        }}
                      >
                        Agent Tasks
                      </div>
                      {Object.entries(stats.agentTasks ?? {}).map(
                        ([status, count]) => (
                          <div
                            key={status}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: 14,
                              marginBottom: 4,
                            }}
                          >
                            <span
                              style={{
                                textTransform: "capitalize",
                                color:
                                  TASK_STATUS_COLORS[status] ??
                                  "var(--color-text-primary)",
                              }}
                            >
                              {status}
                            </span>
                            <span style={{ fontWeight: 600 }}>
                              {count as number}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "4rem",
                  color: "var(--color-text-secondary)",
                }}
              >
                Loading metrics...
              </div>
            )}
          </>
        )}

        {/* ── HEALTH TAB ─────────────────────────────────── */}
        {tab === "health" && (
          <>
            <div
              style={{
                marginBottom: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
                  System Health
                </h1>
                <p style={{ color: "var(--color-text-secondary)" }}>
                  Live status of all DentalIQ services. Auto-refreshes every
                  30s.
                </p>
              </div>
              <button
                onClick={loadHealth}
                disabled={healthLoading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "1px solid var(--color-border-secondary)",
                  background: "var(--color-background-primary)",
                  color: "var(--color-text-primary)",
                  fontSize: 14,
                  cursor: healthLoading ? "not-allowed" : "pointer",
                  fontWeight: 500,
                }}
              >
                <RefreshCw
                  size={15}
                  style={{
                    animation: healthLoading
                      ? "spin 1s linear infinite"
                      : "none",
                  }}
                />
                Refresh
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 20,
              }}
            >
              {(healthData.length > 0
                ? healthData
                : [
                    {
                      name: "Auth Service",
                      status: "unknown",
                      latencyMs: 0,
                      data: {},
                    },
                    {
                      name: "Tenant Service",
                      status: "unknown",
                      latencyMs: 0,
                      data: {},
                    },
                    {
                      name: "Estimate Service",
                      status: "unknown",
                      latencyMs: 0,
                      data: {},
                    },
                    {
                      name: "Agent Manager",
                      status: "unknown",
                      latencyMs: 0,
                      data: {},
                    },
                  ]
              ).map((svc) => {
                const isUp = svc.status === "up";
                const isUnknown = svc.status === "unknown";
                return (
                  <div
                    key={svc.name}
                    style={{
                      background: "var(--color-background-primary)",
                      border: `1px solid ${isUp ? "#bbf7d0" : isUnknown ? "var(--color-border-secondary)" : "#fecaca"}`,
                      borderRadius: 16,
                      padding: "1.5rem",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
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
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                        {svc.name}
                      </h3>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {isUnknown ? (
                          <AlertCircle size={20} color="#ca8a04" />
                        ) : isUp ? (
                          <CheckCircle2 size={20} color="#16a34a" />
                        ) : (
                          <XCircle size={20} color="#dc2626" />
                        )}
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: isUnknown
                              ? "#ca8a04"
                              : isUp
                                ? "#16a34a"
                                : "#dc2626",
                          }}
                        >
                          {isUnknown ? "UNKNOWN" : isUp ? "UP" : "DOWN"}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 20 }}>
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--color-text-secondary)",
                            marginBottom: 4,
                          }}
                        >
                          LATENCY
                        </div>
                        <div
                          style={{
                            fontSize: 20,
                            fontWeight: 700,
                            color:
                              svc.latencyMs > 500
                                ? "#dc2626"
                                : svc.latencyMs > 200
                                  ? "#ca8a04"
                                  : "var(--color-text-primary)",
                          }}
                        >
                          {isUnknown ? "—" : `${svc.latencyMs}ms`}
                        </div>
                      </div>
                      {svc.data?.uptime != null && (
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--color-text-secondary)",
                              marginBottom: 4,
                            }}
                          >
                            UPTIME
                          </div>
                          <div style={{ fontSize: 20, fontWeight: 700 }}>
                            {Math.floor(svc.data.uptime / 3600)}h{" "}
                            {Math.floor((svc.data.uptime % 3600) / 60)}m
                          </div>
                        </div>
                      )}
                      {svc.data?.version && (
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--color-text-secondary)",
                              marginBottom: 4,
                            }}
                          >
                            VERSION
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>
                            {svc.data.version}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── AUDIT LOG TAB ───────────────────────────────── */}
        {tab === "audit" && (
          <>
            <div
              style={{
                marginBottom: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
                  Audit Log
                </h1>
                <p style={{ color: "var(--color-text-secondary)" }}>
                  Recent Cortex agent task activity across all tenants.
                </p>
              </div>
              <button
                onClick={() => token && loadAudit(token)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "1px solid var(--color-border-secondary)",
                  background: "var(--color-background-primary)",
                  color: "var(--color-text-primary)",
                  fontSize: 14,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                <RefreshCw size={15} /> Refresh
              </button>
            </div>

            {auditRows.length === 0 ? (
              <div
                style={{
                  background: "var(--color-background-primary)",
                  borderRadius: 20,
                  border: "1px solid var(--color-border-secondary)",
                  padding: "4rem",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                  No audit entries yet
                </div>
                <div
                  style={{ fontSize: 14, color: "var(--color-text-secondary)" }}
                >
                  Cortex agent tasks will appear here once agents run.
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "var(--color-background-primary)",
                  borderRadius: 20,
                  border: "1px solid var(--color-border-secondary)",
                  overflow: "hidden",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "left",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid var(--color-border-secondary)",
                        background: "var(--color-background-secondary)",
                      }}
                    >
                      {[
                        "TIMESTAMP",
                        "TENANT",
                        "AGENT",
                        "TASK TYPE",
                        "STATUS",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "14px 20px",
                            fontSize: 12,
                            fontWeight: 700,
                            color: "var(--color-text-secondary)",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {auditRows.map((row) => (
                      <tr
                        key={row.id}
                        style={{
                          borderBottom:
                            "1px solid var(--color-border-secondary)",
                        }}
                      >
                        <td
                          style={{
                            padding: "14px 20px",
                            fontSize: 13,
                            color: "var(--color-text-secondary)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {new Date(
                            row.createdAt ?? row.created_at,
                          ).toLocaleString("en-CA", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td
                          style={{
                            padding: "14px 20px",
                            fontSize: 13,
                            fontFamily: "monospace",
                          }}
                        >
                          {String(row.tenantId ?? row.tenant_id ?? "").slice(
                            0,
                            8,
                          )}
                        </td>
                        <td
                          style={{
                            padding: "14px 20px",
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          {AGENT_LABELS[row.agentId ?? row.agent_id] ??
                            row.agentId ??
                            row.agent_id}
                        </td>
                        <td style={{ padding: "14px 20px", fontSize: 13 }}>
                          {(row.taskType ?? row.task_type ?? "").replace(
                            /_/g,
                            " ",
                          )}
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <span
                            style={{
                              padding: "3px 10px",
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 700,
                              textTransform: "capitalize",
                              background: `${TASK_STATUS_COLORS[row.status] ?? "#666"}18`,
                              color: TASK_STATUS_COLORS[row.status] ?? "#666",
                            }}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── TICKETS TAB ────────────────────────────────── */}
        {tab === "tickets" && (
          <>
            {activeTicket ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  height: "calc(100vh - 120px)",
                  maxWidth: 900,
                  background: "var(--color-background-primary)",
                  border: "1px solid var(--color-border-secondary)",
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    padding: "16px 24px",
                    borderBottom: "1px solid var(--color-border-secondary)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "var(--color-background-secondary)",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 16 }}
                  >
                    <button
                      onClick={() => setActiveTicket(null)}
                      style={{
                        padding: "8px",
                        borderRadius: "50%",
                        border: "none",
                        background: "var(--color-background-primary)",
                        color: "var(--color-text-primary)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title="Back to Tickets"
                    >
                      ←
                    </button>
                    <div>
                      <h2
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: "var(--color-text-primary)",
                          marginBottom: 4,
                        }}
                      >
                        {activeTicket.subject}
                      </h2>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--color-text-secondary)",
                          display: "flex",
                          gap: 12,
                        }}
                      >
                        <span>
                          🏥 {activeTicket.clinic_name} (
                          {activeTicket.user_name})
                        </span>
                        <span>✉ {activeTicket.user_email}</span>
                      </div>
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    {activeTicket.status !== "in_progress" && (
                      <button
                        onClick={() =>
                          updateTicketStatus(activeTicket.id, "in_progress")
                        }
                        style={{
                          padding: "6px 12px",
                          borderRadius: 20,
                          border: "1px solid #fde68a",
                          background: "#fffbeb",
                          color: "#92400e",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Set In Progress
                      </button>
                    )}
                    {activeTicket.status !== "resolved" && (
                      <button
                        onClick={() =>
                          updateTicketStatus(activeTicket.id, "resolved")
                        }
                        style={{
                          padding: "6px 12px",
                          borderRadius: 20,
                          border: "1px solid #bbf7d0",
                          background: "#f0fdf4",
                          color: "#166534",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Mark Resolved
                      </button>
                    )}
                    <span
                      style={{
                        marginLeft: 8,
                        padding: "6px 14px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: "capitalize",
                        background:
                          STATUS_COLORS[activeTicket.status]?.bg ?? "#eff6ff",
                        color:
                          STATUS_COLORS[activeTicket.status]?.color ??
                          "#1e40af",
                        border: `1px solid ${STATUS_COLORS[activeTicket.status]?.border ?? "#bfdbfe"}`,
                      }}
                    >
                      {activeTicket.status.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Messages */}
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 24,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--color-text-secondary)",
                        marginBottom: 6,
                        padding: "0 4px",
                        fontWeight: 500,
                      }}
                    >
                      {activeTicket.user_name} (Clinic) ·{" "}
                      {new Date(activeTicket.created_at).toLocaleString([], {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </div>
                    <div
                      style={{
                        maxWidth: "75%",
                        padding: "14px 18px",
                        borderRadius: "18px 18px 18px 4px",
                        fontSize: 14,
                        lineHeight: 1.6,
                        background: "var(--color-background-secondary)",
                        border: "1px solid var(--color-border-secondary)",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {activeTicket.description}
                    </div>
                  </div>
                  {activeTicket.messages?.map((msg: any) => {
                    const isAdmin = msg.sender_type === "admin";
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: isAdmin ? "flex-end" : "flex-start",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--color-text-secondary)",
                            marginBottom: 6,
                            padding: "0 4px",
                            fontWeight: 500,
                          }}
                        >
                          {msg.sender_name} {isAdmin ? "(Admin)" : "(Clinic)"} ·{" "}
                          {new Date(msg.created_at).toLocaleString([], {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </div>
                        <div
                          style={{
                            maxWidth: "75%",
                            padding: "14px 18px",
                            borderRadius: isAdmin
                              ? "18px 18px 4px 18px"
                              : "18px 18px 18px 4px",
                            fontSize: 14,
                            lineHeight: 1.6,
                            background: isAdmin
                              ? "var(--color-accent)"
                              : "var(--color-background-secondary)",
                            color: isAdmin
                              ? "#fff"
                              : "var(--color-text-primary)",
                            border: isAdmin
                              ? "none"
                              : "1px solid var(--color-border-secondary)",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {msg.message}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply */}
                <div
                  style={{
                    padding: "16px 24px",
                    borderTop: "1px solid var(--color-border-secondary)",
                    background: "var(--color-background-primary)",
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-end",
                  }}
                >
                  <textarea
                    style={{
                      flex: 1,
                      minHeight: 50,
                      maxHeight: 150,
                      padding: "14px 20px",
                      borderRadius: 24,
                      border: "1px solid var(--color-border-secondary)",
                      background: "var(--color-background-secondary)",
                      color: "var(--color-text-primary)",
                      fontSize: 14,
                      outline: "none",
                      resize: "none",
                      fontFamily: "system-ui",
                      lineHeight: 1.5,
                    }}
                    placeholder="Type your reply..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (replyMessage.trim()) sendAdminReply();
                      }
                    }}
                  />
                  <button
                    onClick={sendAdminReply}
                    disabled={replying || !replyMessage.trim()}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      border: "none",
                      background:
                        replying || !replyMessage.trim()
                          ? "var(--color-border-secondary)"
                          : "var(--color-accent)",
                      color: "#fff",
                      cursor:
                        replying || !replyMessage.trim()
                          ? "not-allowed"
                          : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    marginBottom: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <h1
                      style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}
                    >
                      Support Tickets
                    </h1>
                    <p style={{ color: "var(--color-text-secondary)" }}>
                      {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} ·{" "}
                      {openCount} open{" "}
                      <span style={{ fontSize: 12, opacity: 0.7 }}>
                        (auto-refreshes every 8s)
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => token && loadTickets(token)}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 10,
                      border: "1px solid var(--color-border-secondary)",
                      background: "var(--color-background-primary)",
                      color: "var(--color-text-primary)",
                      fontSize: 14,
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    ↻ Refresh
                  </button>
                </div>

                {tickets.length === 0 ? (
                  <div
                    style={{
                      background: "var(--color-background-primary)",
                      borderRadius: 20,
                      border: "1px solid var(--color-border-secondary)",
                      padding: "4rem",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🎫</div>
                    <div
                      style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}
                    >
                      No tickets yet
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      Support tickets from clinics will appear here in real
                      time.
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    {tickets.map((ticket) => {
                      const sc =
                        STATUS_COLORS[ticket.status] ?? STATUS_COLORS.open;
                      return (
                        <div
                          key={ticket.id}
                          onClick={() => loadTicketDetail(ticket.id)}
                          style={{
                            background: "var(--color-background-primary)",
                            borderRadius: 16,
                            border: "1px solid var(--color-border-secondary)",
                            padding: "20px 24px",
                            cursor: "pointer",
                            transition: "box-shadow 0.2s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.boxShadow =
                              "0 4px 12px rgba(0,0,0,0.05)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.boxShadow = "none")
                          }
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: 16,
                              marginBottom: 12,
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  marginBottom: 4,
                                }}
                              >
                                <span style={{ fontSize: 16, fontWeight: 700 }}>
                                  {ticket.subject}
                                </span>
                                <span
                                  style={{
                                    fontSize: 11,
                                    padding: "3px 10px",
                                    borderRadius: 20,
                                    background: sc.bg,
                                    color: sc.color,
                                    border: `1px solid ${sc.border}`,
                                    fontWeight: 600,
                                  }}
                                >
                                  {sc.label}
                                </span>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 16,
                                  fontSize: 13,
                                  color: "var(--color-text-secondary)",
                                }}
                              >
                                <span>🏥 {ticket.clinic_name}</span>
                                <span>👤 {ticket.user_name}</span>
                                <span>
                                  🕐{" "}
                                  {new Date(ticket.created_at).toLocaleString(
                                    "en-CA",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </span>
                              </div>
                            </div>
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "var(--color-accent)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              View →
                            </span>
                          </div>
                          <div
                            style={{
                              padding: "10px 14px",
                              background: "var(--color-background-secondary)",
                              borderRadius: 10,
                              fontSize: 14,
                              lineHeight: 1.6,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {ticket.description}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
