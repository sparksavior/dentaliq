"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

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
  low: { bg: "rgba(16, 185, 129, 0.1)", text: "#10b981", dot: "#10b981" },
  medium: { bg: "rgba(245, 158, 11, 0.1)", text: "#f59e0b", dot: "#f59e0b" },
  high: { bg: "rgba(239, 68, 68, 0.1)", text: "#ef4444", dot: "#ef4444" },
};

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
}) {
  return (
    <div
      style={{
        background: "var(--color-background-primary)",
        border: "1px solid var(--color-border-secondary)",
        borderRadius: 14,
        padding: "1.2rem 1.4rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 12,
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
            width: 36,
            height: 36,
            borderRadius: 9,
            background: "var(--color-accent-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          {icon}
        </div>
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "var(--color-text-primary)",
          letterSpacing: "-0.03em",
          marginBottom: 2,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

const DUMMY_RECENT = [
  {
    id: "1",
    cdt_code: "D2750",
    claim_risk: "low",
    coverage_percent: 80,
    patient_cost: 270,
    insurer_pays: 1080,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    first_name: "Emily",
    last_name: "Rodriguez",
  },
  {
    id: "2",
    cdt_code: "D4341",
    claim_risk: "high",
    coverage_percent: 50,
    patient_cost: 124,
    insurer_pays: 124,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    first_name: "James",
    last_name: "Thompson",
  },
  {
    id: "3",
    cdt_code: "D1110",
    claim_risk: "low",
    coverage_percent: 100,
    patient_cost: 0,
    insurer_pays: 115,
    created_at: new Date(Date.now() - 14400000).toISOString(),
    first_name: "Sarah",
    last_name: "Chen",
  },
];

export default function DemoOverview({ planName }: { planName: string }) {
  const [loading, setLoading] = useState(true);
  const now = new Date();

  useEffect(() => {
    setTimeout(() => setLoading(false), 600);
  }, []);

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: 1100,
        margin: "0 auto",
        color: "var(--color-text-primary)",
      }}
    >
      <div style={{ marginBottom: "1.5rem" }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "var(--color-text-primary)",
            letterSpacing: "-0.03em",
            marginBottom: 4,
          }}
        >
          Good{" "}
          {now.getHours() < 12
            ? "morning"
            : now.getHours() < 17
              ? "afternoon"
              : "evening"}
          , Demo
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
          {now.toLocaleDateString("en-CA", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {planName !== "starter" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background:
              "linear-gradient(135deg, rgba(15,118,110,0.06), rgba(13,148,136,0.04))",
            border: "1px solid rgba(15,118,110,0.18)",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--color-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Sparkles size={16} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--color-accent)",
                marginRight: 6,
              }}
            >
              AI Insight
            </span>
            <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>
              1 high-risk claim needs attention this period. Review them in
              Claims to avoid denial.
            </span>
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginBottom: "2rem",
        }}
      >
        {loading ? (
          Array(4)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                style={{
                  background: "var(--color-background-secondary)",
                  border: "1px solid var(--color-border-secondary)",
                  borderRadius: 14,
                  padding: "1.2rem 1.4rem",
                  height: 110,
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ))
        ) : (
          <>
            <StatCard
              label="Total Patients"
              value="1,248"
              sub="12 registered this month"
              icon="👥"
            />
            <StatCard
              label="Estimates This Month"
              value="42"
              sub="+14 vs last month"
              icon="📊"
            />
            <StatCard
              label="Revenue Recovered"
              value="$18,400"
              sub="avg $438 per estimate"
              icon="💰"
            />
            <StatCard
              label="High-Risk Claims"
              value="1"
              sub="1 claim needs attention"
              icon="⚠️"
            />
          </>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
        <div
          style={{
            background: "var(--color-background-primary)",
            border: "1px solid var(--color-border-secondary)",
            borderRadius: 14,
            padding: "1.4rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <h2
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--color-text-primary)",
              marginBottom: "1rem",
            }}
          >
            Quick actions
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              {
                id: "estimates",
                icon: "⚡",
                label: "Run an estimate",
                desc: "Check coverage instantly",
              },
              {
                id: "patients",
                icon: "👤",
                label: "Add a patient",
                desc: "Register new patient",
              },
              {
                id: "claims",
                icon: "🛡",
                label: "Review claims",
                desc: "Check risk flags",
              },
              {
                id: "settings",
                icon: "⚙️",
                label: "Settings",
                desc: "Clinic & integrations",
              },
            ].map((a) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--color-border-tertiary)",
                  textDecoration: "none",
                  background: "var(--color-background-secondary)",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: "var(--color-accent-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 17,
                    flexShrink: 0,
                  }}
                >
                  {a.icon}
                </div>
                <div>
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
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {a.desc}
                  </div>
                </div>
                <div
                  style={{
                    marginLeft: "auto",
                    color: "var(--color-text-secondary)",
                    fontSize: 14,
                  }}
                >
                  ›
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: "var(--color-background-primary)",
            border: "1px solid var(--color-border-secondary)",
            borderRadius: 14,
            padding: "1.4rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
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
                fontSize: 15,
                fontWeight: 600,
                color: "var(--color-text-primary)",
              }}
            >
              Recent activity
            </h2>
            <div
              style={{
                fontSize: 12,
                color: "var(--color-accent)",
                fontWeight: 500,
              }}
            >
              View all →
            </div>
          </div>

          {loading ? (
            Array(3)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 52,
                    borderRadius: 8,
                    marginBottom: 8,
                    background: "var(--color-background-secondary)",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
              ))
          ) : (
            <div>
              {DUMMY_RECENT.map((item) => {
                const rs =
                  riskStyle[item.claim_risk as keyof typeof riskStyle] ??
                  riskStyle.low;
                const patientLabel = item.first_name
                  ? `${item.first_name} ${item.last_name}`
                  : null;
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom: "1px solid var(--color-border-tertiary)",
                    }}
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
                            fontWeight: 600,
                            color: "var(--color-text-primary)",
                          }}
                        >
                          {item.cdt_code}
                        </span>
                        {patientLabel && (
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--color-text-secondary)",
                            }}
                          >
                            · {patientLabel}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: 11,
                            padding: "1px 7px",
                            borderRadius: 20,
                            background: rs.bg,
                            color: rs.text,
                            fontWeight: 500,
                          }}
                        >
                          {item.claim_risk}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {item.coverage_percent}% covered · Patient pays $
                        {item.patient_cost} · Insurer pays ${item.insurer_pays}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--color-text-secondary)",
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
      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
