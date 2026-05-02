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
} from "lucide-react";

const CORTEX_AGENTS = [
  {
    id: "billing",
    name: "Cortex Billing Agent",
    codename: "CORTEX-01",
    role: "Revenue Compliance Specialist",
    avatar: "💰",
    color: "#6366f1",
    bg: "rgba(99,102,241,0.1)",
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
    bg: "rgba(14,165,233,0.1)",
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
    bg: "rgba(245,158,11,0.1)",
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
    bg: "rgba(16,185,129,0.1)",
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
    bg: "rgba(236,72,153,0.1)",
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
    bg: "rgba(20,184,166,0.1)",
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

  const [animatedRevenue, setAnimatedRevenue] = useState(0);
  const [hoursSaved, setHoursSaved] = useState(0);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [patientsEngaged, setPatientsEngaged] = useState(0);

  // Scan state
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

  useEffect(() => {
    if (accessToken) {
      agentsApi
        .getRentedAgents(accessToken)
        .then(setRentedAgents)
        .catch(() => {});
    }
  }, [accessToken]);

  // Animate dynamic stats based on clinic
  useEffect(() => {
    // Determine realistic numbers based on active agents
    const agentsCount = rentedAgents.filter(
      (r) => r.clinic_id === selectedClinicId,
    ).length;
    const multiplier = agentsCount > 0 ? agentsCount : 0.5; // base demo numbers if 0

    const targetRevenue = Math.floor(Math.random() * 2000 * multiplier) + 4500;
    const targetHours = Math.floor(Math.random() * 15 * multiplier) + 24;
    const targetTasks = Math.floor(Math.random() * 200 * multiplier) + 430;
    const targetPatients = Math.floor(Math.random() * 50 * multiplier) + 120;

    let rev = 0,
      hrs = 0,
      tsk = 0,
      pat = 0;
    const steps = 60;

    const timer = setInterval(() => {
      rev += targetRevenue / steps;
      hrs += targetHours / steps;
      tsk += targetTasks / steps;
      pat += targetPatients / steps;
      if (rev >= targetRevenue) {
        rev = targetRevenue;
        hrs = targetHours;
        tsk = targetTasks;
        pat = targetPatients;
        clearInterval(timer);
      }
      setAnimatedRevenue(Math.round(rev));
      setHoursSaved(Math.round(hrs * 10) / 10);
      setTasksCompleted(Math.round(tsk));
      setPatientsEngaged(Math.round(pat));
    }, 16);

    return () => clearInterval(timer);
  }, [selectedClinicId, rentedAgents.length]);

  // Simulate real-time continuous stream of neural activity
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
        return newLogs.slice(0, 50); // Keep last 50
      });

      // Increment stats slightly on each action
      setTasksCompleted((prev) => prev + 1);
      if (Math.random() > 0.7) setPatientsEngaged((prev) => prev + 1);
      if (Math.random() > 0.8)
        setAnimatedRevenue(
          (prev) => prev + Math.floor(Math.random() * 50) + 10,
        );
    };

    // Initial burst
    for (let i = 0; i < 5; i++) generateLog();

    // Continuous random interval between 800ms and 3000ms
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

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: 1400,
        margin: "0 auto",
        color: "var(--color-text-primary)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "2rem",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "var(--color-accent-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BrainCircuit size={24} color="var(--color-accent)" />
            </div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                margin: 0,
                letterSpacing: "-0.03em",
              }}
            >
              Cortex Command Center
            </h1>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(16,185,129,0.1)",
                color: "#10b981",
                padding: "4px 10px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
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
                  animation: "pulse 2s infinite",
                }}
              />
              Live
            </div>
          </div>
          <p
            style={{
              margin: 0,
              color: "var(--color-text-secondary)",
              fontSize: 15,
            }}
          >
            Real-time monitoring of automated clinic operations and digital
            workforce productivity.
          </p>
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
        {[
          {
            label: "Revenue Secured",
            value: `$${animatedRevenue.toLocaleString()}`,
            icon: TrendingUp,
            color: "#6366f1",
            bg: "rgba(99,102,241,0.08)",
          },
          {
            label: "Hours Saved",
            value: `${hoursSaved}h`,
            icon: Clock,
            color: "#10b981",
            bg: "rgba(16,185,129,0.08)",
          },
          {
            label: "Tasks Completed",
            value: tasksCompleted.toLocaleString(),
            icon: CheckCircle2,
            color: "#0ea5e9",
            bg: "rgba(14,165,233,0.08)",
          },
          {
            label: "Patients Engaged",
            value: patientsEngaged.toLocaleString(),
            icon: Users,
            color: "#f59e0b",
            bg: "rgba(245,158,11,0.08)",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "var(--color-background-primary)",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: 16,
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: stat.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <stat.icon size={16} color={stat.color} />
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {stat.label}
              </span>
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: "var(--color-text-primary)",
                letterSpacing: "-0.02em",
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
          gridTemplateColumns: "1fr 350px",
          gap: "2rem",
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
                fontSize: 18,
                fontWeight: 700,
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Shield size={20} color="var(--color-accent)" /> Active Digital
              Workforce
            </h2>
          </div>

          {activeAgentTypes.length === 0 ? (
            <div
              style={{
                background: "var(--color-background-primary)",
                border: "1px dashed var(--color-border-secondary)",
                padding: "4rem 2rem",
                textAlign: "center",
                borderRadius: 24,
              }}
            >
              <BrainCircuit
                size={48}
                color="var(--color-border-secondary)"
                style={{ margin: "0 auto 1rem" }}
              />
              <h3
                style={{
                  fontSize: 18,
                  color: "var(--color-text-primary)",
                  margin: "0 0 8px 0",
                }}
              >
                No Agents Assigned
              </h3>
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  margin: 0,
                  fontSize: 14,
                }}
              >
                This clinic does not have any active digital employees. Head to
                the Settings panel to hire agents.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 16,
              }}
            >
              {activeAgentTypes.map((agent) => {
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
                      transition: "all 0.3s ease",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.borderColor = agent.color + "60";
                      e.currentTarget.style.boxShadow =
                        "0 8px 24px rgba(0,0,0,0.06)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.borderColor =
                        "var(--color-border-secondary)";
                      e.currentTarget.style.boxShadow =
                        "0 2px 10px rgba(0,0,0,0.02)";
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 16,
                        right: 16,
                        background: "rgba(16,185,129,0.1)",
                        border: "1px solid rgba(16,185,129,0.2)",
                        borderRadius: 20,
                        padding: "4px 10px",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#10b981",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#10b981",
                          display: "inline-block",
                        }}
                      />
                      {activeInstances.length} INSTANCE
                      {activeInstances.length > 1 ? "S" : ""}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: 14,
                          background: agent.bg,
                          color: agent.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 24,
                          border: `1px solid ${agent.color}30`,
                        }}
                      >
                        {agent.avatar}
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            fontFamily: "monospace",
                            color: "var(--color-text-secondary)",
                            marginBottom: 2,
                          }}
                        >
                          {agent.codename}
                        </div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "var(--color-text-primary)",
                            marginBottom: 2,
                          }}
                        >
                          {agent.name}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: agent.color,
                        fontWeight: 600,
                        marginBottom: 12,
                        background: agent.bg,
                        padding: "6px 10px",
                        borderRadius: 8,
                        display: "inline-block",
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
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              color: agent.color,
                              fontSize: 12,
                              marginTop: -2,
                            }}
                          >
                            ✓
                          </span>
                          <span style={{ lineHeight: 1.3 }}>{cap}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Live Neural Stream (Dark Console style) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div
            style={{
              background: "#09090b",
              border: "1px solid #27272a",
              borderRadius: 16,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              height: 600,
              boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                padding: "1.2rem",
                borderBottom: "1px solid #27272a",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#09090b",
              }}
            >
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#f4f4f5",
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <Activity size={16} color="#ef4444" /> Live Terminal
              </h2>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#ef4444",
                  padding: "4px 10px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#ef4444",
                    display: "inline-block",
                    boxShadow: "0 0 8px #ef4444",
                    animation: "pulse 1.5s infinite",
                  }}
                />
                REC
              </div>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "1rem",
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
                    color: "#52525b",
                  }}
                >
                  <Zap size={32} style={{ marginBottom: 16, opacity: 0.2 }} />
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 4,
                      fontFamily: "monospace",
                    }}
                  >
                    system.idle
                  </div>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {liveLog.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        display: "flex",
                        gap: 12,
                        padding: "8px 0",
                        borderBottom: "1px solid #18181b",
                        fontFamily: '"JetBrains Mono", monospace',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          color: "#52525b",
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        {log.time}
                      </div>
                      <div>
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
                              fontSize: 10,
                              fontWeight: 800,
                              color: log.color,
                              textTransform: "uppercase",
                            }}
                          >
                            [{log.agentId}]
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
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
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
