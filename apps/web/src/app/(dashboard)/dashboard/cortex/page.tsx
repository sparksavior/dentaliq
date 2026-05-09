"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useClinic } from "@/contexts/clinic-context";
import { estimateApi, agentsApi } from "@/lib/api";
import {
  Activity,
  Zap,
  Shield,
  BrainCircuit,
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  CalendarDays,
  Users,
  ChevronRight,
} from "lucide-react";

const CORTEX_AGENTS = [
  {
    id: "billing",
    name: "Cortex Billing Agent",
    codename: "CORTEX-01",
    role: "Revenue Compliance Specialist",
    avatar: "💰",
    color: "#6366f1",
    glow: "rgba(99,102,241,0.25)",
    bg: "rgba(99,102,241,0.08)",
    status: "available" as const,
    capabilities: [
      "Pre-auth narrative generation",
      "CDCP denial prevention",
      "Claim risk mitigation",
      "Overnight batch processing",
    ],
    actions: [
      "Scanned EOB for patient John D.",
      "Drafted appeal for CDCP denial",
      "Verified insurance breakdown",
      "Submitted pre-determination",
    ],
  },
  {
    id: "recall",
    name: "Cortex Recall Agent",
    codename: "CORTEX-02",
    role: "Patient Reactivation Specialist",
    avatar: "📞",
    color: "#0ea5e9",
    glow: "rgba(14,165,233,0.25)",
    bg: "rgba(14,165,233,0.08)",
    status: "available" as const,
    capabilities: [
      "Hygiene recall automation",
      "SMS/email outreach",
      "Treatment follow-up",
      "Lapsed patient recovery",
    ],
    actions: [
      "Sent 45 hygiene recall SMS",
      "Booked 3 lapsed patients",
      "Analyzed unscheduled treatments",
      "Followed up on unscheduled crown",
    ],
  },
  {
    id: "review",
    name: "Cortex Review Agent",
    codename: "CORTEX-03",
    role: "Reputation Manager",
    avatar: "⭐",
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.25)",
    bg: "rgba(245,158,11,0.08)",
    status: "available" as const,
    capabilities: [
      "Review solicitation",
      "Google review responses",
      "Sentiment analysis",
      "NPS tracking",
    ],
    actions: [
      "Replied to 5-star Google review",
      "Sent NPS survey to 12 patients",
      "Flagged negative feedback for review",
      "Analyzed weekly sentiment trends",
    ],
  },
  {
    id: "supply",
    name: "Cortex Supply Agent",
    codename: "CORTEX-04",
    role: "Inventory Optimizer",
    avatar: "📦",
    color: "#10b981",
    glow: "rgba(16,185,129,0.25)",
    bg: "rgba(16,185,129,0.08)",
    status: "available" as const,
    capabilities: [
      "Inventory monitoring",
      "Price comparison",
      "Auto-reorder triggers",
      "Supplier negotiation",
    ],
    actions: [
      "Reordered lidocaine from Henry Schein",
      "Found 12% cheaper gloves",
      "Logged incoming supply shipment",
      "Audited operatory 3 inventory",
    ],
  },
  {
    id: "treatment",
    name: "Cortex Treatment Coordinator",
    codename: "CORTEX-05",
    role: "Case Acceptance Specialist",
    avatar: "🦷",
    color: "#ec4899",
    glow: "rgba(236,72,153,0.25)",
    bg: "rgba(236,72,153,0.08)",
    status: "available" as const,
    capabilities: [
      "Implant/Invisalign follow-up",
      "Treatment plan nurturing",
      "Patient education",
      "Financial option presentation",
    ],
    actions: [
      "Sent Invisalign financing options",
      "Followed up on implant case",
      "Drafted treatment presentation",
      "Calculated out-of-pocket costs",
    ],
  },
  {
    id: "hygienist",
    name: "Cortex Hygienist Agent",
    codename: "CORTEX-06",
    role: "Schedule Optimizer",
    avatar: "📅",
    color: "#14b8a6",
    glow: "rgba(20,184,166,0.25)",
    bg: "rgba(20,184,166,0.08)",
    status: "available" as const,
    capabilities: [
      "Last-minute fill scheduling",
      "Cancellation recovery",
      "Chair time optimization",
      "Waitlist management",
    ],
    actions: [
      "Filled 2pm hygiene cancellation",
      "Optimized tomorrow's schedule",
      "Contacted 5 waitlisted patients",
      "Resolved double-booking conflict",
    ],
  },
];

export default function CortexCommandCenter() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { selectedClinicId } = useClinic();

  const [rentedAgents, setRentedAgents] = useState<any[]>([]);
  const [agentStats, setAgentStats] = useState<{
    pending: number;
    approved: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [patientsEngaged, setPatientsEngaged] = useState(0);
  const [animatedRevenue, setAnimatedRevenue] = useState(0);

  const [liveLog, setLiveLog] = useState<
    {
      id: string;
      time: string;
      agentId: string;
      agentName: string;
      action: string;
      type: string;
      color: string;
    }[]
  >([]);

  const agentManagerUrl =
    process.env.NEXT_PUBLIC_AGENT_MANAGER_URL ?? "http://localhost:3006";

  useEffect(() => {
    if (accessToken) {
      agentsApi
        .getRentedAgents(accessToken)
        .then(setRentedAgents)
        .catch(() => {});
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    setStatsLoading(true);
    fetch(`${agentManagerUrl}/stats`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setAgentStats(json.data.tasks);
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [accessToken, agentManagerUrl]);

  useEffect(() => {
    const activeAgentTypes = CORTEX_AGENTS.filter((agent) =>
      rentedAgents.some(
        (r) => r.clinic_id === selectedClinicId && r.agent_id === agent.id,
      ),
    );

    if (activeAgentTypes.length === 0) return;

    const generateLog = () => {
      const now = new Date();
      const timeStr =
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + `.${String(now.getMilliseconds()).padStart(3, "0")}`;

      const agent =
        activeAgentTypes[Math.floor(Math.random() * activeAgentTypes.length)];
      const action =
        agent.actions[Math.floor(Math.random() * agent.actions.length)];

      setLiveLog((prev) => {
        const newLogs = [
          {
            id: Math.random().toString(36).substring(7),
            time: timeStr,
            agentId: agent.codename,
            agentName: agent.name,
            action: action,
            type: "done",
            color: agent.color,
          },
          ...prev,
        ];
        return newLogs.slice(0, 50);
      });

      setTasksCompleted((prev) => prev + 1);
      if (Math.random() > 0.7) setPatientsEngaged((prev) => prev + 1);
      if (Math.random() > 0.8)
        setAnimatedRevenue(
          (prev) => prev + Math.floor(Math.random() * 50) + 10,
        );
    };

    for (let i = 0; i < 5; i++) generateLog();

    let timeoutId: NodeJS.Timeout;
    const loop = () => {
      generateLog();
      timeoutId = setTimeout(loop, Math.random() * 2200 + 800);
    };
    timeoutId = setTimeout(loop, 1000);

    return () => clearTimeout(timeoutId);
  }, [selectedClinicId, rentedAgents]);

  const clinicAgents = rentedAgents.filter(
    (r) => r.clinic_id === selectedClinicId,
  );
  const activeAgentTypes = CORTEX_AGENTS.filter((agent) =>
    clinicAgents.some((r) => r.agent_id === agent.id),
  );

  const kpiStats = [
    {
      label: "Pending Review",
      value: statsLoading ? "…" : (agentStats?.pending ?? 0).toString(),
      icon: Clock,
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.08)",
      gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
    },
    {
      label: "Tasks Approved",
      value: statsLoading ? "…" : (agentStats?.approved ?? 0).toString(),
      icon: CheckCircle2,
      color: "#10b981",
      bg: "rgba(16,185,129,0.08)",
      gradient: "linear-gradient(135deg, #10b981, #059669)",
    },
    {
      label: "Active Agents",
      value: rentedAgents
        .filter((r) => r.clinic_id === selectedClinicId)
        .length.toString(),
      icon: Zap,
      color: "#6366f1",
      bg: "rgba(99,102,241,0.08)",
      gradient: "linear-gradient(135deg, #6366f1, #4f46e5)",
    },
    {
      label: "Total Agents",
      value: CORTEX_AGENTS.length.toString(),
      icon: Users,
      color: "#0ea5e9",
      bg: "rgba(14,165,233,0.08)",
      gradient: "linear-gradient(135deg, #0ea5e9, #0284c7)",
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
      {/* Header */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "2rem",
          padding: "1.75rem 2rem",
          background:
            "linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.04) 50%, rgba(14,165,233,0.03) 100%)",
          border: "1px solid rgba(99,102,241,0.15)",
          borderRadius: 20,
          overflow: "hidden",
        }}
      >
        {/* Decorative blob */}
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -30,
            left: 100,
            width: 150,
            height: 150,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)",
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
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
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
                    "linear-gradient(135deg, var(--color-text-primary) 60%, #6366f1)",
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
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 6px 16px rgba(99,102,241,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow =
                "0 2px 8px rgba(99,102,241,0.3)";
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

      {/* KPI Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
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
              transition: "all 0.2s ease",
              cursor: "default",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = `0 8px 24px ${stat.bg.replace("0.08", "0.15")}`;
              e.currentTarget.style.borderColor = stat.color + "40";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "var(--shadow-xs)";
              e.currentTarget.style.borderColor =
                "var(--color-border-secondary)";
            }}
          >
            {/* Top accent stripe */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: `linear-gradient(90deg, transparent, ${stat.color}, transparent)`,
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          gap: "1.5rem",
        }}
      >
        {/* Left Col: Active Roster */}
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
                color: "var(--color-text-primary)",
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
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: "var(--color-background-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1.25rem",
                }}
              >
                <BrainCircuit
                  size={32}
                  color="var(--color-text-secondary)"
                  style={{ opacity: 0.4 }}
                />
              </div>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                  margin: "0 0 8px 0",
                }}
              >
                No Agents Assigned
              </h3>
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  margin: "0 0 20px",
                  fontSize: 14,
                  maxWidth: 360,
                  marginLeft: "auto",
                  marginRight: "auto",
                }}
              >
                This clinic does not have any active digital employees. Head to
                Settings to hire your first agent.
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
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 16,
              }}
            >
              {activeAgentTypes.map((agent, idx) => {
                const activeInstances = clinicAgents.filter(
                  (r) => r.agent_id === agent.id,
                );

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
                    {/* Corner gradient */}
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        width: 80,
                        height: 80,
                        background: `radial-gradient(circle at top right, ${agent.bg}, transparent 70%)`,
                        pointerEvents: "none",
                      }}
                    />

                    <div
                      style={{
                        position: "absolute",
                        top: 14,
                        right: 14,
                        background: "rgba(16,185,129,0.1)",
                        border: "1px solid rgba(16,185,129,0.2)",
                        borderRadius: 20,
                        padding: "3px 9px",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#10b981",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
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
                      {activeInstances.length}x
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
                          color: agent.color,
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
                          {agent.name.replace("Cortex ", "")}
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
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Live Neural Stream */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              background: "#09090b",
              borderRadius: 18,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              height: 560,
              boxShadow: "0 0 0 1px #27272a, 0 20px 60px rgba(0,0,0,0.3)",
              position: "relative",
            }}
          >
            {/* Terminal top rainbow gradient line */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background:
                  "linear-gradient(90deg, #6366f1, #0ea5e9, #10b981, #f59e0b, #ec4899)",
              }}
            />

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
                {/* macOS-style traffic lights */}
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
                  neural.stream
                </h2>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(239, 68, 68, 0.12)",
                  color: "#ef4444",
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "#ef4444",
                    display: "inline-block",
                    boxShadow: "0 0 6px #ef4444",
                    animation: "pulseDot 1.5s infinite",
                  }}
                />
                REC
              </div>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "0.75rem 1rem",
                background: "#09090b",
              }}
            >
              {activeAgentTypes.length === 0 ? (
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
                      fontWeight: 600,
                      fontFamily: "monospace",
                      letterSpacing: "0.06em",
                    }}
                  >
                    awaiting agents...
                  </div>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 1 }}
                >
                  {liveLog.map((log, i) => (
                    <div
                      key={log.id}
                      style={{
                        display: "flex",
                        gap: 10,
                        padding: "6px 4px",
                        borderBottom: "1px solid #18181b",
                        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                        animation: i === 0 ? "fadeIn 0.3s ease-out" : undefined,
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
                        {log.time}
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
                              color: log.color,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            [{log.agentId}]
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              color: "#10b981",
                              opacity: 0.6,
                            }}
                          >
                            OK
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#a1a1aa",
                            lineHeight: 1.4,
                          }}
                        >
                          {log.action}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Terminal bottom status bar */}
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
                {liveLog.length} events
              </span>
              <span
                style={{
                  fontSize: 9,
                  color: "#10b981",
                  fontFamily: "monospace",
                  opacity: 0.6,
                }}
              >
                ● active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
