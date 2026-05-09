"use client";

import Link from "next/link";
import { useState } from "react";

const AGENTS = [
  {
    id: "billing",
    name: "Billing Agent",
    codename: "CORTEX-01",
    avatar: "💰",
    gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    role: "Revenue Compliance Specialist",
    status: "available",
    description:
      "Autonomously scans your daily procedures, identifies high-risk claims before they get denied, and drafts medically-accurate pre-authorization narratives overnight. You wake up, review, and approve.",
    capabilities: [
      "Pre-auth narrative generation",
      "CDCP denial prevention",
      "Claim risk mitigation",
      "Overnight batch processing",
    ],
    roiExample: "Prevents ~$6,400/mo in denied claims",
  },
  {
    id: "recall",
    name: "Recall Agent",
    codename: "CORTEX-02",
    avatar: "📞",
    gradient: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
    role: "Patient Reactivation Specialist",
    status: "available",
    description:
      "Identifies patients overdue for hygiene appointments, outstanding treatment plans, and lapsed patients — then autonomously crafts and schedules personalized outreach.",
    capabilities: [
      "Hygiene recall automation",
      "SMS/email outreach",
      "Treatment follow-up",
      "Lapsed patient recovery",
    ],
    roiExample: "Recovers ~12 patients/month",
  },
  {
    id: "review",
    name: "Review Agent",
    codename: "CORTEX-03",
    avatar: "⭐",
    gradient: "linear-gradient(135deg, #f59e0b, #f97316)",
    role: "Reputation Manager",
    status: "available",
    description:
      "Monitors your online reputation, solicits reviews from satisfied patients at the optimal time, and drafts professional responses to all reviews automatically.",
    capabilities: [
      "Review solicitation",
      "Google review responses",
      "Sentiment analysis",
      "NPS tracking",
    ],
    roiExample: "Increases reviews by ~40%",
  },
  {
    id: "supply",
    name: "Supply Agent",
    codename: "CORTEX-04",
    avatar: "📦",
    gradient: "linear-gradient(135deg, #10b981, #059669)",
    role: "Inventory Optimizer",
    status: "available",
    description:
      "Tracks your dental supply inventory levels, compares prices across suppliers in real-time, and triggers purchase orders before you run out.",
    capabilities: [
      "Inventory monitoring",
      "Price comparison",
      "Auto-reorder triggers",
      "Supplier negotiation",
    ],
    roiExample: "Saves ~$800/mo on supplies",
  },
  {
    id: "treatment",
    name: "Treatment Coordinator",
    codename: "CORTEX-05",
    avatar: "🦷",
    gradient: "linear-gradient(135deg, #ec4899, #f43f5e)",
    role: "Case Acceptance Specialist",
    status: "available",
    description:
      "Follows up with patients who received high-ticket treatment plans (Implants, Invisalign, veneers) but haven't yet accepted. Nurtures them with educational content and financing options.",
    capabilities: [
      "Implant/Invisalign follow-up",
      "Treatment plan nurturing",
      "Patient education",
      "Financial option presentation",
    ],
    roiExample: "Increases case acceptance by ~25%",
  },
  {
    id: "hygienist",
    name: "Hygienist Agent",
    codename: "CORTEX-06",
    avatar: "📅",
    gradient: "linear-gradient(135deg, #14b8a6, #0d9488)",
    role: "Schedule Optimizer",
    status: "available",
    description:
      "Fills last-minute cancellations by intelligently matching patients on the waitlist with open chair time, maximizing your hygiene production.",
    capabilities: [
      "Last-minute fill scheduling",
      "Cancellation recovery",
      "Chair time optimization",
      "Waitlist management",
    ],
    roiExample: "Fills ~90% of cancellations",
  },
];

export default function CortexLandingPage() {
  const [expandedAgent, setExpandedAgent] = useState<string | null>("billing");

  return (
    <div
      style={{
        fontFamily: "system-ui",
        background: "var(--color-background-primary)",
        minHeight: "100vh",
      }}
    >
      {/* Nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.2rem 2.5rem",
          borderBottom: "0.5px solid var(--color-border-tertiary)",
          position: "sticky",
          top: 0,
          background: "var(--color-background-primary)",
          zIndex: 100,
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#0f766e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                color: "#fff",
                fontSize: 16,
                fontFamily: "monospace",
                fontWeight: 700,
              }}
            >
              +
            </span>
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: 17,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.03em",
            }}
          >
            Dental<span style={{ color: "#0f766e" }}>IQ</span>
          </span>
        </Link>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link
            href="/login"
            style={{
              fontSize: 14,
              color: "var(--color-text-secondary)",
              textDecoration: "none",
            }}
          >
            Sign in
          </Link>
          <Link
            href="/signup?plan=cortex"
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 20px",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
            }}
          >
            Hire your first agent →
          </Link>
        </div>
      </nav>

      <div
        style={{ maxWidth: 1100, margin: "0 auto", padding: "5rem 2rem 4rem" }}
      >
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "5rem" }}>
          <div
            style={{
              display: "inline-block",
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: 24,
              padding: "6px 18px",
              fontSize: 13,
              color: "#8b5cf6",
              marginBottom: "2rem",
              fontWeight: 600,
            }}
          >
            🧠 Introducing DentalIQ Cortex Agents
          </div>
          <h1
            style={{
              fontSize: 56,
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: "1.5rem",
              color: "var(--color-text-primary)",
              letterSpacing: "-0.04em",
            }}
          >
            Your clinic's
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #6366f1, #a78bfa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              digital workforce.
            </span>
          </h1>
          <p
            style={{
              fontSize: 20,
              color: "var(--color-text-secondary)",
              lineHeight: 1.7,
              maxWidth: 640,
              margin: "0 auto 3rem",
            }}
          >
            While your clinic sleeps, Cortex Agents scan your claims, draft
            pre-authorization narratives, and secure your revenue. You wake up,
            review, and approve.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <Link
              href="/signup?plan=cortex"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#fff",
                borderRadius: 12,
                padding: "16px 36px",
                fontSize: 17,
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 8px 30px rgba(99,102,241,0.35)",
                letterSpacing: "-0.01em",
              }}
            >
              Start with Cortex →
            </Link>
            <a
              href="#agents"
              style={{
                display: "flex",
                alignItems: "center",
                border: "1px solid var(--color-border-secondary)",
                borderRadius: 12,
                padding: "16px 28px",
                fontSize: 17,
                textDecoration: "none",
                color: "var(--color-text-primary)",
              }}
            >
              Meet the agents
            </a>
          </div>
        </div>

        {/* Why Cortex */}
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <h2
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.03em",
              marginBottom: "1rem",
            }}
          >
            Why your clinic needs Cortex
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "var(--color-text-secondary)",
              maxWidth: 600,
              margin: "0 auto 3rem",
            }}
          >
            Canadian dental clinics lose an average of $76,000 per year to
            denied claims and administrative overhead. Cortex Agents eliminate
            that.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 20,
            }}
          >
            {[
              {
                icon: "🛡️",
                title: "Prevent Denials",
                desc: "Cortex scans every procedure for CDCP and insurer-specific denial triggers before you submit.",
              },
              {
                icon: "⏱️",
                title: "Reclaim 18+ Hours/Month",
                desc: "Stop writing pre-auth letters manually. Cortex drafts them overnight while you sleep.",
              },
              {
                icon: "💰",
                title: "Prove ROI Immediately",
                desc: "Every approved narrative directly prevents a denied claim. You only pay for results.",
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  padding: "2rem",
                  background: "var(--color-background-secondary)",
                  border: "1px solid var(--color-border-tertiary)",
                  borderRadius: 16,
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>
                  {item.icon}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                    marginBottom: 8,
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--color-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Roster */}
        <div id="agents" style={{ scrollMarginTop: 100, marginBottom: "4rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div
              style={{
                display: "inline-block",
                background: "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: 20,
                padding: "4px 14px",
                fontSize: 12,
                color: "#8b5cf6",
                marginBottom: "1rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              The Workforce
            </div>
            <h2
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                letterSpacing: "-0.03em",
                marginBottom: 8,
              }}
            >
              Meet your Cortex Agents
            </h2>
            <p style={{ fontSize: 16, color: "var(--color-text-secondary)" }}>
              Hire specialized digital employees for your clinic. Start with
              one, scale as you grow.
            </p>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            {AGENTS.map((agent) => (
              <button
                key={agent.id}
                onClick={() =>
                  setExpandedAgent(expandedAgent === agent.id ? null : agent.id)
                }
                style={{
                  background: "var(--color-background-secondary)",
                  border:
                    expandedAgent === agent.id
                      ? "2px solid #6366f1"
                      : "1px solid var(--color-border-tertiary)",
                  borderRadius: 16,
                  padding: "1.5rem",
                  cursor: "pointer",
                  textAlign: "left",
                  opacity: agent.status === "coming_soon" ? 0.7 : 1,
                  transition: "all 0.2s",
                  position: "relative",
                }}
              >
                {agent.status === "coming_soon" && (
                  <div
                    style={{
                      position: "absolute",
                      top: 14,
                      right: 14,
                      background: "var(--color-background-primary)",
                      border: "1px solid var(--color-border-secondary)",
                      borderRadius: 20,
                      padding: "3px 10px",
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--color-text-secondary)",
                      textTransform: "uppercase",
                    }}
                  >
                    Coming Soon
                  </div>
                )}
                {agent.status === "available" && (
                  <div
                    style={{
                      position: "absolute",
                      top: 14,
                      right: 14,
                      background: "rgba(16,185,129,0.1)",
                      border: "1px solid rgba(16,185,129,0.3)",
                      borderRadius: 20,
                      padding: "3px 10px",
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#10b981",
                      textTransform: "uppercase",
                    }}
                  >
                    Available Now
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    marginBottom: 12,
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
                      boxShadow:
                        agent.status === "available"
                          ? "0 4px 14px rgba(99,102,241,0.3)"
                          : "none",
                      flexShrink: 0,
                    }}
                  >
                    {agent.avatar}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {agent.codename}
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "var(--color-text-primary)",
                      }}
                    >
                      {agent.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#8b5cf6",
                        fontWeight: 500,
                      }}
                    >
                      {agent.role}
                    </div>
                  </div>
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-secondary)",
                    lineHeight: 1.6,
                    marginBottom: 12,
                  }}
                >
                  {agent.description}
                </p>
                {expandedAgent === agent.id && (
                  <div
                    style={{
                      borderTop: "1px solid var(--color-border-secondary)",
                      paddingTop: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--color-text-primary)",
                        marginBottom: 8,
                      }}
                    >
                      Capabilities
                    </div>
                    {agent.capabilities.map((c) => (
                      <div
                        key={c}
                        style={{
                          fontSize: 12,
                          color: "var(--color-text-secondary)",
                          marginBottom: 4,
                          display: "flex",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            color:
                              agent.status === "available"
                                ? "#10b981"
                                : "var(--color-text-secondary)",
                          }}
                        >
                          {agent.status === "available" ? "✓" : "○"}
                        </span>
                        {c}
                      </div>
                    ))}
                    <div
                      style={{
                        marginTop: 10,
                        padding: "8px 12px",
                        background: "rgba(99,102,241,0.08)",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "#6366f1",
                        fontWeight: 600,
                      }}
                    >
                      ROI: {agent.roiExample}
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div style={{ marginBottom: "4rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div
              style={{
                display: "inline-block",
                background: "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: 20,
                padding: "4px 14px",
                fontSize: 12,
                color: "#8b5cf6",
                marginBottom: "1rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Pricing
            </div>
            <h2
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                letterSpacing: "-0.03em",
                marginBottom: 8,
              }}
            >
              Pay for results, not promises
            </h2>
            <p style={{ fontSize: 16, color: "var(--color-text-secondary)" }}>
              Hybrid pricing with per-clinic agent isolation. Each clinic gets
              its own dedicated workforce.
            </p>
          </div>

          <div
            style={{
              maxWidth: 580,
              margin: "0 auto",
              background: "var(--color-background-secondary)",
              border: "2px solid #6366f1",
              borderRadius: 20,
              padding: "2.5rem",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -14,
                left: "50%",
                transform: "translateX(-50%)",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#fff",
                fontSize: 12,
                padding: "5px 16px",
                borderRadius: 20,
                fontWeight: 700,
              }}
            >
              CORTEX PLAN
            </div>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 800,
                  color: "#6366f1",
                  letterSpacing: "-0.03em",
                }}
              >
                $299
                <span
                  style={{
                    fontSize: 16,
                    color: "var(--color-text-secondary)",
                    fontWeight: 400,
                  }}
                >
                  /mo
                </span>
              </div>
              <div
                style={{ fontSize: 14, color: "var(--color-text-secondary)" }}
              >
                Base platform fee · includes 1 agent for 1 clinic
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginBottom: "2rem",
              }}
            >
              {[
                "Cortex Command Center access",
                "Human-in-the-Loop Approval Inbox",
                "1 active Cortex Agent for your first clinic",
                "Per-clinic data isolation — each clinic is independent",
                "Everything in Pro plan",
                "Priority AI processing",
                "On-demand manual scan trigger",
              ].map((f) => (
                <div
                  key={f}
                  style={{
                    display: "flex",
                    gap: 8,
                    fontSize: 14,
                    color: "var(--color-text-primary)",
                  }}
                >
                  <span style={{ color: "#6366f1", flexShrink: 0 }}>✓</span>
                  {f}
                </div>
              ))}
            </div>

            {/* Per-Clinic Pricing Explainer */}
            <div
              style={{
                background: "rgba(99,102,241,0.06)",
                border: "1px solid rgba(99,102,241,0.15)",
                borderRadius: 12,
                padding: "1.2rem",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#6366f1",
                  marginBottom: 8,
                }}
              >
                🏥 Per-Clinic Agent Pricing
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.7,
                }}
              >
                Each agent is deployed <strong>per clinic</strong>. If you have
                3 clinics and hire the Billing Agent, you get 3 dedicated
                Billing Agent instances — one for each clinic, scanning only
                that clinic&apos;s data.
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  marginTop: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    color: "var(--color-text-primary)",
                  }}
                >
                  <span>1st agent (1st clinic)</span>
                  <strong>Included in base</strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    color: "var(--color-text-primary)",
                  }}
                >
                  <span>Each additional agent instance</span>
                  <strong>$99/mo</strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    color: "var(--color-text-primary)",
                  }}
                >
                  <span>Per approved action</span>
                  <strong>$1.50</strong>
                </div>
              </div>
            </div>

            {/* Example calculator */}
            <div
              style={{
                background: "var(--color-background-primary)",
                border: "1px solid var(--color-border-secondary)",
                borderRadius: 12,
                padding: "1.2rem",
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                  marginBottom: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Example: 3 Clinics + Billing Agent
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  fontSize: 13,
                  color: "var(--color-text-primary)",
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Base platform fee</span>
                  <span>$299</span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Billing Agent × Clinic 1</span>
                  <span style={{ color: "#10b981" }}>Included</span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Billing Agent × Clinic 2</span>
                  <span>$99</span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Billing Agent × Clinic 3</span>
                  <span>$99</span>
                </div>
                <div
                  style={{
                    borderTop: "1px solid var(--color-border-secondary)",
                    paddingTop: 6,
                    marginTop: 4,
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: 700,
                  }}
                >
                  <span>Monthly total</span>
                  <span style={{ color: "#6366f1" }}>
                    $497/mo + $1.50/action
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/signup?plan=cortex"
              style={{
                display: "block",
                width: "100%",
                padding: "14px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 700,
                textAlign: "center",
                textDecoration: "none",
                boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
                boxSizing: "border-box",
              }}
            >
              Start 14-day free trial →
            </Link>
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)",
            border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: 20,
            padding: "3.5rem",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "var(--color-text-primary)",
              marginBottom: "0.8rem",
            }}
          >
            Ready to hire your first digital employee?
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "var(--color-text-secondary)",
              marginBottom: "2rem",
            }}
          >
            Join the clinics already using Cortex to secure their revenue
            overnight.
          </p>
          <Link
            href="/signup?plan=cortex"
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              borderRadius: 12,
              padding: "16px 36px",
              fontSize: 17,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 8px 30px rgba(99,102,241,0.35)",
            }}
          >
            Get started with Cortex →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer
        style={{
          borderTop: "0.5px solid var(--color-border-tertiary)",
          padding: "2rem 2.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "var(--color-text-secondary)",
          fontSize: 12,
        }}
      >
        <span>© 2025 DentalIQ Inc. · All rights reserved</span>
        <div style={{ display: "flex", gap: 20 }}>
          {["Privacy", "Terms", "Security", "Support"].map((l) => (
            <span key={l} style={{ cursor: "pointer" }}>
              {l}
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}
