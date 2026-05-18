"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { tenantsApi, type Tenant } from "@/lib/api";
import {
  Sparkles,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  RefreshCw,
  AlertCircle,
  Loader2,
  Inbox,
  ArrowLeft,
} from "lucide-react";

const AGENT_MANAGER_URL =
  process.env.NEXT_PUBLIC_AGENT_MANAGER_URL ?? "http://localhost:3006";

const AGENT_META: Record<
  string,
  { name: string; avatar: string; color: string; bg: string }
> = {
  billing: {
    name: "Billing Agent",
    avatar: "💰",
    color: "#6366f1",
    bg: "rgba(99,102,241,0.08)",
  },
  recall: {
    name: "Recall Agent",
    avatar: "📞",
    color: "#0ea5e9",
    bg: "rgba(14,165,233,0.08)",
  },
  review: {
    name: "Review Agent",
    avatar: "⭐",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
  },
  supply: {
    name: "Supply Agent",
    avatar: "📦",
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
  },
  treatment: {
    name: "Treatment Agent",
    avatar: "🦷",
    color: "#ec4899",
    bg: "rgba(236,72,153,0.08)",
  },
  hygienist: {
    name: "Hygienist Agent",
    avatar: "🪥",
    color: "#14b8a6",
    bg: "rgba(20,184,166,0.08)",
  },
};

const RISK_META = {
  high: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    label: "High Risk",
  },
  medium: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    label: "Medium Risk",
  },
  low: {
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.25)",
    label: "Low Risk",
  },
};

const TASK_TYPE_LABELS: Record<string, string> = {
  pre_auth_letter: "Pre-Auth Letter",
  recall_message: "Recall Message",
  review_request: "Review Request",
  supply_order: "Supply Order",
  treatment_followup: "Treatment Follow-up",
  schedule_optimization: "Schedule Optimisation",
};

interface AgentTask {
  id: string;
  agentId: string;
  taskType: string;
  cdtCode: string | null;
  patientName: string | null;
  riskLevel: "high" | "medium" | "low" | null;
  content: string;
  status: "pending" | "approved" | "rejected" | "sent";
  createdAt: string;
}

export default function CortexInbox() {
  const { accessToken, user } = useAuth();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantLoading, setTenantLoading] = useState(true);

  const [items, setItems] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editDrafts, setEditDrafts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"pending" | "completed">("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch tenant (for plan gating)
  useEffect(() => {
    if (!accessToken) return;
    tenantsApi
      .getTenant(accessToken)
      .then(setTenant)
      .catch(() => {})
      .finally(() => setTenantLoading(false));
  }, [accessToken]);

  const fetchTasks = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${AGENT_MANAGER_URL}/tasks?status=${filter === "pending" ? "pending" : "approved"}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      setError("Could not load inbox. Make sure the agent manager is running.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, filter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleAction = async (
    id: string,
    action: "approved" | "rejected",
    editedContent?: string,
  ) => {
    if (!accessToken) return;
    setActionLoading(id);
    try {
      const res = await fetch(`${AGENT_MANAGER_URL}/tasks/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: action,
          userId: user?.id,
          content: editedContent,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setExpandedId(null);
    } catch {
      alert("Action failed. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = items.filter((i) => i.status === "pending").length;
  const displayItems =
    filter === "pending"
      ? items.filter((i) => i.status === "pending")
      : items.filter((i) => i.status !== "pending");

  // ── Plan gate ──────────────────────────────────────────────
  if (tenantLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid var(--color-border)",
            borderTopColor: "#6366f1",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (tenant?.plan !== "cortex") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: "1.5rem",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 56 }}>📥</div>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            margin: 0,
          }}
        >
          Cortex Plan Required
        </h1>
        <p
          style={{
            fontSize: "1rem",
            color: "var(--color-text-secondary)",
            maxWidth: 480,
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          The Approval Inbox is available exclusively on the{" "}
          <strong>Cortex</strong> plan. Upgrade to review and approve
          AI-generated agent actions before they execute.
        </p>
        <Link
          href="/dashboard/billing"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "0.75rem 1.75rem",
            borderRadius: 10,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.95rem",
            textDecoration: "none",
            boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
          }}
        >
          Upgrade to Cortex →
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: 900,
        margin: "0 auto",
        color: "var(--color-text-primary)",
        animation: "fadeInUp 0.35s ease-out",
      }}
    >
      {/* Premium Header */}
      <div
        style={{
          background:
            "linear-gradient(135deg, var(--color-background-primary) 0%, rgba(99,102,241,0.05) 100%)",
          borderBottom: "1px solid var(--color-border-secondary)",
          padding: "1.75rem 2rem",
          marginBottom: "1.75rem",
          marginLeft: "-2rem",
          marginRight: "-2rem",
          marginTop: "-2rem",
        }}
      >
        <Link
          href="/dashboard/cortex"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 12,
            color: "var(--color-text-secondary)",
            textDecoration: "none",
            marginBottom: 16,
            fontWeight: 500,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLAnchorElement).style.color = "#6366f1")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLAnchorElement).style.color =
              "var(--color-text-secondary)")
          }
        >
          <ArrowLeft size={13} /> Cortex Command Center
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              📥
            </div>
            <div>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  margin: "0 0 3px",
                  letterSpacing: "-0.03em",
                  background:
                    "linear-gradient(135deg, var(--color-text-primary) 60%, #6366f1)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Approval Inbox
              </h1>
              <p
                style={{
                  margin: 0,
                  color: "var(--color-text-secondary)",
                  fontSize: 13,
                }}
              >
                Review and approve actions proposed by your Cortex Agents.
              </p>
            </div>
          </div>

          <button
            onClick={fetchTasks}
            disabled={loading}
            style={{
              background: "var(--color-background-secondary)",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: 10,
              padding: "8px 14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-text-primary)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                "var(--color-background-primary)";
              e.currentTarget.style.borderColor = "var(--color-border-primary)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                "var(--color-background-secondary)";
              e.currentTarget.style.borderColor =
                "var(--color-border-secondary)";
              e.currentTarget.style.transform = "";
            }}
          >
            <RefreshCw
              size={13}
              style={{
                animation: loading ? "spin 0.8s linear infinite" : undefined,
              }}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: "1.5rem",
          background: "var(--color-background-secondary)",
          padding: 4,
          borderRadius: 12,
          border: "1px solid var(--color-border-secondary)",
          width: "fit-content",
        }}
      >
        {(["pending", "completed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "7px 18px",
              background:
                filter === f
                  ? "var(--color-background-primary)"
                  : "transparent",
              border:
                filter === f
                  ? "1px solid var(--color-border-secondary)"
                  : "1px solid transparent",
              color:
                filter === f
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
              fontWeight: filter === f ? 700 : 500,
              fontSize: 13,
              cursor: "pointer",
              borderRadius: 9,
              display: "flex",
              alignItems: "center",
              gap: 7,
              transition: "all 0.15s",
              boxShadow: filter === f ? "var(--shadow-xs)" : "none",
            }}
          >
            {f === "pending" ? "Pending" : "Completed"}
            {f === "pending" && pendingCount > 0 && (
              <span
                style={{
                  background: "var(--color-accent)",
                  color: "#fff",
                  padding: "1px 7px",
                  borderRadius: 20,
                  fontSize: 10,
                  fontWeight: 700,
                  lineHeight: 1.6,
                }}
              >
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: "5rem",
            color: "var(--color-text-secondary)",
          }}
        >
          <Loader2
            size={28}
            style={{
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
              display: "block",
            }}
          />
          <p style={{ margin: 0, fontSize: 14 }}>Loading inbox…</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div
          style={{
            background: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 14,
            padding: "1.25rem 1.5rem",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <AlertCircle
            size={18}
            style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }}
          />
          <div>
            <p
              style={{
                margin: "0 0 4px",
                fontWeight: 700,
                color: "#ef4444",
                fontSize: 14,
              }}
            >
              Inbox unavailable
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "var(--color-text-secondary)",
              }}
            >
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && displayItems.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "5rem 2rem",
            background: "var(--color-background-primary)",
            borderRadius: 24,
            border: "1px solid var(--color-border-secondary)",
            animation: "scaleIn 0.25s ease-out",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))",
              border: "1.5px solid rgba(99,102,241,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
              fontSize: 32,
            }}
          >
            ✨
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>
            {filter === "pending" ? "Inbox Zero" : "No Completed Tasks"}
          </h2>
          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: 14,
              maxWidth: 380,
              margin: "0 auto 24px",
              lineHeight: 1.6,
            }}
          >
            {filter === "pending"
              ? "Your agents are scanning clinic data. New tasks will appear here after the nightly run."
              : "Completed tasks will appear here once you approve or reject items."}
          </p>
          {filter === "pending" && (
            <Link
              href="/dashboard/cortex"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 20px",
                background: "var(--color-background-secondary)",
                border: "1px solid var(--color-border-secondary)",
                color: "var(--color-text-primary)",
                borderRadius: 10,
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Go to Command Center
            </Link>
          )}
        </div>
      )}

      {/* Task list */}
      {!loading && !error && displayItems.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {displayItems.map((item, idx) => {
            const isExpanded = expandedId === item.id;
            const meta = AGENT_META[item.agentId] ?? {
              name: item.agentId,
              avatar: "🤖",
              color: "#6366f1",
              bg: "rgba(99,102,241,0.08)",
            };
            const typeLabel = TASK_TYPE_LABELS[item.taskType] ?? item.taskType;
            const draft = editDrafts[item.id] ?? item.content;
            const isActioning = actionLoading === item.id;
            const risk = item.riskLevel ? RISK_META[item.riskLevel] : null;

            return (
              <div
                key={item.id}
                style={{
                  background: "var(--color-background-primary)",
                  border: `1px solid ${isExpanded ? `${meta.color}30` : "var(--color-border-secondary)"}`,
                  borderRadius: 18,
                  overflow: "hidden",
                  boxShadow: isExpanded
                    ? `var(--shadow-md), 0 0 0 1px ${meta.color}15`
                    : "var(--shadow-xs)",
                  transition: "all 0.25s ease",
                  animation: `fadeInUp 0.35s ease-out ${idx * 0.05}s both`,
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  if (!isExpanded) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = `var(--shadow-md)`;
                    e.currentTarget.style.borderColor = `${meta.color}30`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isExpanded) {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = "var(--shadow-xs)";
                    e.currentTarget.style.borderColor =
                      "var(--color-border-secondary)";
                  }
                }}
              >
                {/* Left accent bar — color-coded by agent type */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    background:
                      item.status === "pending" && risk
                        ? risk.color
                        : item.status === "approved"
                          ? "#10b981"
                          : item.status === "rejected"
                            ? "#ef4444"
                            : meta.color,
                    borderRadius: "18px 0 0 18px",
                  }}
                />

                {/* Card header */}
                <div
                  style={{
                    padding: "1.25rem 1.5rem 1.25rem 1.75rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Badges row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        marginBottom: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      {/* Agent badge */}
                      <span
                        style={{
                          fontSize: 11,
                          padding: "3px 10px",
                          borderRadius: 20,
                          background: meta.bg,
                          color: meta.color,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          border: `1px solid ${meta.color}20`,
                        }}
                      >
                        <span style={{ fontSize: 12 }}>{meta.avatar}</span>
                        {meta.name}
                      </span>

                      {/* Task type badge */}
                      <span
                        style={{
                          fontSize: 11,
                          padding: "3px 10px",
                          borderRadius: 20,
                          background: "var(--color-background-secondary)",
                          color: "var(--color-text-secondary)",
                          fontWeight: 600,
                          border: "1px solid var(--color-border-secondary)",
                        }}
                      >
                        {typeLabel}
                      </span>

                      {/* Risk badge */}
                      {risk && item.status === "pending" && (
                        <span
                          style={{
                            fontSize: 11,
                            padding: "3px 10px",
                            borderRadius: 20,
                            background: risk.bg,
                            color: risk.color,
                            fontWeight: 700,
                            border: `1px solid ${risk.border}`,
                          }}
                        >
                          {risk.label}
                        </span>
                      )}

                      {/* Status badge for completed */}
                      {item.status !== "pending" && (
                        <span
                          style={{
                            fontSize: 11,
                            padding: "3px 10px",
                            borderRadius: 20,
                            background:
                              item.status === "approved"
                                ? "rgba(16,185,129,0.1)"
                                : "rgba(239,68,68,0.1)",
                            color:
                              item.status === "approved"
                                ? "#10b981"
                                : "#ef4444",
                            fontWeight: 700,
                          }}
                        >
                          {item.status === "approved"
                            ? "✓ Approved"
                            : "✕ Rejected"}
                        </span>
                      )}

                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--color-text-secondary)",
                          marginLeft: "auto",
                        }}
                      >
                        {new Date(item.createdAt).toLocaleString("en-CA", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <h3
                      style={{
                        margin: "0 0 4px",
                        fontSize: 16,
                        fontWeight: 700,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {item.cdtCode
                        ? `${typeLabel}: ${item.cdtCode}`
                        : typeLabel}
                      {item.patientName ? (
                        <span
                          style={{
                            fontWeight: 500,
                            color: "var(--color-text-secondary)",
                            fontSize: 15,
                          }}
                        >
                          {" — "}
                          {item.patientName}
                        </span>
                      ) : null}
                    </h3>

                    <p
                      style={{
                        margin: "0 0 14px",
                        color: "var(--color-text-secondary)",
                        fontSize: 13,
                        lineHeight: 1.4,
                      }}
                    >
                      Generated by Cortex {meta.name}
                    </p>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      style={{
                        background: "var(--color-background-secondary)",
                        border: "1px solid var(--color-border-secondary)",
                        borderRadius: 8,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--color-text-secondary)",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color =
                          "var(--color-text-primary)";
                        e.currentTarget.style.borderColor =
                          "var(--color-border-primary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color =
                          "var(--color-text-secondary)";
                        e.currentTarget.style.borderColor =
                          "var(--color-border-secondary)";
                      }}
                    >
                      <FileText size={12} />
                      {isExpanded ? "Hide content" : "Review content"}
                      {isExpanded ? (
                        <ChevronUp size={12} />
                      ) : (
                        <ChevronDown size={12} />
                      )}
                    </button>
                  </div>

                  {item.status === "pending" && (
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexShrink: 0,
                        marginLeft: 20,
                      }}
                    >
                      <button
                        onClick={() => handleAction(item.id, "rejected")}
                        disabled={isActioning}
                        title="Reject"
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          border: "1.5px solid var(--color-border-secondary)",
                          background: "transparent",
                          color: "var(--color-text-secondary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#ef4444";
                          e.currentTarget.style.color = "#ef4444";
                          e.currentTarget.style.background =
                            "rgba(239,68,68,0.06)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor =
                            "var(--color-border-secondary)";
                          e.currentTarget.style.color =
                            "var(--color-text-secondary)";
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        {isActioning ? (
                          <Loader2
                            size={16}
                            style={{ animation: "spin 0.8s linear infinite" }}
                          />
                        ) : (
                          <X size={18} />
                        )}
                      </button>
                      <button
                        onClick={() => handleAction(item.id, "approved", draft)}
                        disabled={isActioning}
                        style={{
                          padding: "0 20px",
                          height: 42,
                          borderRadius: 12,
                          border: "none",
                          background:
                            "linear-gradient(135deg, #10b981, #059669)",
                          color: "#fff",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          boxShadow: "0 2px 8px rgba(16,185,129,0.3)",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow =
                            "0 6px 16px rgba(16,185,129,0.4)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "none";
                          e.currentTarget.style.boxShadow =
                            "0 2px 8px rgba(16,185,129,0.3)";
                        }}
                      >
                        {isActioning ? (
                          <Loader2
                            size={15}
                            style={{ animation: "spin 0.8s linear infinite" }}
                          />
                        ) : (
                          <Check size={15} />
                        )}
                        Approve
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div
                    style={{
                      borderTop: "1px solid var(--color-border-secondary)",
                      padding: "1.25rem 1.75rem",
                      background: "var(--color-background-secondary)",
                      animation: "fadeIn 0.2s ease-out",
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
                      <h4
                        style={{
                          margin: 0,
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--color-text-secondary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Agent-Generated Content
                      </h4>
                      {item.status === "pending" && (
                        <button
                          onClick={() =>
                            setEditDrafts((prev) =>
                              prev[item.id] !== undefined
                                ? (({ [item.id]: _, ...rest }) => rest)(prev)
                                : { ...prev, [item.id]: item.content },
                            )
                          }
                          style={{
                            background: "none",
                            border: "1px solid var(--color-border-secondary)",
                            borderRadius: 7,
                            padding: "4px 11px",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--color-text-secondary)",
                            cursor: "pointer",
                          }}
                        >
                          {editDrafts[item.id] !== undefined
                            ? "✕ Cancel Edit"
                            : "✎ Edit Draft"}
                        </button>
                      )}
                    </div>

                    {editDrafts[item.id] !== undefined ? (
                      <textarea
                        value={editDrafts[item.id]}
                        onChange={(e) =>
                          setEditDrafts((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        style={{
                          width: "100%",
                          minHeight: 260,
                          padding: "14px 16px",
                          border: "1.5px solid var(--color-accent)",
                          borderRadius: 12,
                          background: "var(--color-background-primary)",
                          color: "var(--color-text-primary)",
                          fontSize: 13,
                          fontFamily: "system-ui",
                          lineHeight: 1.6,
                          resize: "vertical",
                          outline: "none",
                          boxSizing: "border-box",
                          boxShadow: "0 0 0 3px var(--color-accent-subtle)",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          background: "var(--color-background-primary)",
                          padding: "16px 18px",
                          borderRadius: 12,
                          border: "1px solid var(--color-border-secondary)",
                          fontSize: 13,
                          lineHeight: 1.7,
                          color: "var(--color-text-primary)",
                          fontFamily: "system-ui",
                          whiteSpace: "pre-wrap",
                          maxHeight: 320,
                          overflowY: "auto",
                        }}
                      >
                        {item.content}
                      </div>
                    )}

                    {item.status === "pending" && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          marginTop: 14,
                          gap: 8,
                        }}
                      >
                        <button
                          onClick={() => handleAction(item.id, "rejected")}
                          disabled={isActioning}
                          style={{
                            padding: "9px 20px",
                            borderRadius: 10,
                            border: "1.5px solid var(--color-border-secondary)",
                            background: "transparent",
                            color: "var(--color-text-secondary)",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Reject
                        </button>
                        <button
                          onClick={() =>
                            handleAction(item.id, "approved", draft)
                          }
                          disabled={isActioning}
                          style={{
                            padding: "9px 24px",
                            borderRadius: 10,
                            border: "none",
                            background:
                              "linear-gradient(135deg, #10b981, #059669)",
                            color: "#fff",
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            boxShadow: "0 2px 8px rgba(16,185,129,0.3)",
                          }}
                        >
                          {isActioning && (
                            <Loader2
                              size={14}
                              style={{ animation: "spin 0.8s linear infinite" }}
                            />
                          )}
                          ✓ Approve & Send
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
