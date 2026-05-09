"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 199,
    desc: "1 clinic location",
    color: "#0f766e",
    features: [
      "Real-time cost estimator",
      "Patient-facing explanations",
      "Up to 300 estimates/mo",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 349,
    desc: "Up to 3 locations",
    color: "#0e7490",
    popular: true,
    features: [
      "Everything in Starter",
      "Claim risk detection",
      "Pre-auth drafting",
      "Priority support",
      "Analytics dashboard",
    ],
  },
  {
    id: "cortex",
    name: "Cortex",
    price: 299,
    desc: "AI Digital Workforce",
    color: "#6366f1",
    features: [
      "Everything in Pro",
      "Cortex Command Center",
      "1 agent per clinic included",
      "Per-clinic data isolation",
      "Outcome billing ($1.50/action)",
    ],
  },
];

const CORTEX_AGENTS_PREVIEW = [
  {
    avatar: "💰",
    name: "Billing Agent",
    status: "Active",
    gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    desc: "Drafts pre-auth narratives overnight, prevents CDCP denials.",
  },
  {
    avatar: "📞",
    name: "Recall Agent",
    status: "Active",
    gradient: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
    desc: "Patient reactivation for hygiene and outstanding treatment.",
  },
  {
    avatar: "⭐",
    name: "Review Agent",
    status: "Active",
    gradient: "linear-gradient(135deg, #f59e0b, #f97316)",
    desc: "Reputation management and intelligent review solicitation.",
  },
  {
    avatar: "📦",
    name: "Supply Agent",
    status: "Active",
    gradient: "linear-gradient(135deg, #10b981, #059669)",
    desc: "Monitors inventory, finds best prices automatically.",
  },
  {
    avatar: "🦷",
    name: "Treatment Coordinator",
    status: "Active",
    gradient: "linear-gradient(135deg, #ec4899, #f43f5e)",
    desc: "Follows up on high-ticket cases to increase acceptance.",
  },
  {
    avatar: "📅",
    name: "Hygienist Agent",
    status: "Active",
    gradient: "linear-gradient(135deg, #14b8a6, #0d9488)",
    desc: "Fills last-minute cancellations intelligently.",
  },
];

const FEATURES = [
  {
    icon: "⚡",
    title: "Real-Time Cost Estimator",
    desc: "Enter a CDT code and insurer — get instant coverage breakdown, patient cost, and insurer payment in seconds.",
    demo: (
      <div
        style={{
          background: "var(--color-background-primary)",
          borderRadius: 12,
          padding: "1.2rem",
          border: "0.5px solid var(--color-border-tertiary)",
          fontFamily: "system-ui",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: "var(--color-text-secondary)",
                marginBottom: 4,
              }}
            >
              CDT Code
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--color-text-primary)",
              }}
            >
              D2750 — Crown
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                color: "var(--color-text-secondary)",
                marginBottom: 4,
              }}
            >
              Insurer
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--color-text-primary)",
              }}
            >
              Sun Life
            </div>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
            marginBottom: 12,
          }}
        >
          {[
            ["Coverage", "80%", "#0f766e"],
            ["Insurer Pays", "$760", "#10b981"],
            ["Patient Owes", "$190", "#f59e0b"],
          ].map(([l, v, c]) => (
            <div
              key={l}
              style={{
                background: "var(--color-background-secondary)",
                borderRadius: 8,
                padding: "8px",
                textAlign: "center",
              }}
            >
              <div
                style={{ fontSize: 11, color: "var(--color-text-secondary)" }}
              >
                {l}
              </div>
              <div
                style={{ fontSize: 18, fontWeight: 700, color: c as string }}
              >
                {v}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            background: "rgba(16,185,129,0.08)",
            border: "0.5px solid #10b981",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 12,
            color: "#10b981",
          }}
        >
          ✓ Low claim risk · Standard procedure, well-covered
        </div>
      </div>
    ),
  },
  {
    icon: "🤖",
    title: "AI Copilot Chat",
    desc: "Ask anything about your patients, claims, revenue, or how to navigate the app. Powered by local Ollama AI.",
    demo: (
      <div
        style={{
          background: "var(--color-background-primary)",
          borderRadius: 12,
          border: "0.5px solid var(--color-border-tertiary)",
          overflow: "hidden",
          fontFamily: "system-ui",
        }}
      >
        <div
          style={{
            background: "#0f766e",
            padding: "10px 14px",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          💬 DentalIQ Copilot
        </div>
        <div
          style={{
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {[
            { role: "user", text: "What's Sarah's phone number?" },
            {
              role: "ai",
              text: "Sarah Chen's phone is (416) 555-0182. Her last visit was March 12, 2025.",
            },
            { role: "user", text: "What is her latest claim status?" },
            {
              role: "ai",
              text: "Her D1110 claim with Sun Life was approved — $180 paid by insurer.",
            },
          ].map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                background:
                  m.role === "user"
                    ? "#0f766e"
                    : "var(--color-background-secondary)",
                color: m.role === "user" ? "#fff" : "var(--color-text-primary)",
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: 12,
                maxWidth: "85%",
                border:
                  m.role === "ai"
                    ? "0.5px solid var(--color-border-tertiary)"
                    : "none",
              }}
            >
              {m.text}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: "🔔",
    title: "Live Claim Notifications",
    desc: "Get notified the moment a claim is approved or denied — with full details, right inside the dashboard.",
    demo: (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          fontFamily: "system-ui",
        }}
      >
        {[
          {
            type: "approval",
            title: "Claim Approved",
            body: "Sun Life approved D1110 for Emily Chen — $180 paid.",
            time: "2 min ago",
          },
          {
            type: "denial",
            title: "Claim Denied",
            body: "Manulife denied D2750 — missing pre-auth form.",
            time: "18 min ago",
          },
          {
            type: "warning",
            title: "Pre-Auth Required",
            body: "D6010 for James T. requires pre-authorization.",
            time: "1 hr ago",
          },
        ].map((n, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 10,
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: 10,
              padding: "10px 12px",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                background:
                  n.type === "approval"
                    ? "rgba(16,185,129,0.1)"
                    : n.type === "denial"
                      ? "rgba(239,68,68,0.1)"
                      : "rgba(245,158,11,0.1)",
                flexShrink: 0,
              }}
            >
              {n.type === "approval" ? "✅" : n.type === "denial" ? "❌" : "⚠️"}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                }}
              >
                {n.title}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--color-text-secondary)",
                  marginTop: 2,
                }}
              >
                {n.body}
              </div>
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--color-text-secondary)",
                whiteSpace: "nowrap",
              }}
            >
              {n.time}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: "🏥",
    title: "Multi-Clinic Management",
    desc: "Manage all your clinic locations from one dashboard — individual dashboards, settings, and patient directories per location.",
    demo: (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          fontFamily: "system-ui",
        }}
      >
        {[
          "Downtown Toronto",
          "Scarborough East",
          "North York",
          "Mississauga West",
        ].map((name, i) => (
          <div
            key={name}
            style={{
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: 10,
              padding: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: "rgba(15,118,110,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}
              >
                🏥
              </div>
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  borderRadius: 20,
                  background: "rgba(16,185,129,0.1)",
                  color: "#10b981",
                }}
              >
                Active
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-text-primary)",
                marginBottom: 2,
              }}
            >
              {name}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
              {[42, 31, 28, 19][i]} patients
            </div>
          </div>
        ))}
      </div>
    ),
  },
];

const STATS = [
  { num: "$6.4K", label: "avg. monthly revenue recovered" },
  { num: "23%", label: "reduction in claim rejections" },
  { num: "94min", label: "saved per clinic per week" },
];

const SECURITY = [
  {
    icon: "🔒",
    label: "PHIPA Compliant",
    desc: "Ontario health data protection",
  },
  { icon: "🇨🇦", label: "Data Stored in Canada", desc: "AWS ca-central-1 only" },
  { icon: "🔐", label: "AES-256 Encryption", desc: "At rest and in transit" },
  { icon: "📋", label: "Audit Logs", desc: "Full access trail" },
  { icon: "👥", label: "Role-Based Access", desc: "Granular permissions" },
  { icon: "🛡️", label: "PIPEDA Aligned", desc: "Federal privacy standards" },
];

export default function LandingPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [activeFeature, setActiveFeature] = useState(0);
  const goSignup = () => router.push(`/signup?plan=${selectedPlan}`);

  const section: React.CSSProperties = {
    borderTop: "0.5px solid var(--color-border-tertiary)",
    paddingTop: "4rem",
    marginBottom: "4rem",
  };
  const h2: React.CSSProperties = {
    fontSize: 34,
    fontWeight: 800,
    letterSpacing: "-0.04em",
    color: "var(--color-text-primary)",
    marginBottom: "0.5rem",
  };

  return (
    <div
      style={{
        background: "var(--color-background-primary)",
        minHeight: "100vh",
        scrollBehavior: "smooth",
      }}
    >
      {/* Nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 2.5rem",
          borderBottom: "1px solid var(--color-border-tertiary)",
          position: "sticky",
          top: 0,
          background: "var(--color-nav-bg)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: "linear-gradient(135deg, #0f766e, #0d9488)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(15,118,110,0.3)",
            }}
          >
            <span style={{ color: "#fff", fontSize: 17, fontWeight: 800 }}>
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
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          {(
            [
              ["Features", "features"],
              ["Cortex Agents", "cortex"],
              ["Demo", "demo"],
              ["Pricing", "pricing"],
              ["Security", "security"],
            ] as [string, string][]
          ).map(([label, anchor]) => (
            <a
              key={label}
              href={anchor === "cortex" ? "/cortex" : `#${anchor}`}
              style={{
                fontSize: 14,
                color:
                  anchor === "cortex"
                    ? "#8b5cf6"
                    : "var(--color-text-secondary)",
                cursor: "pointer",
                textDecoration: "none",
                transition: "color 0.15s",
                fontWeight: anchor === "cortex" ? 600 : 400,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color =
                  anchor === "cortex" ? "#6366f1" : "#0f766e")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color =
                  anchor === "cortex"
                    ? "#8b5cf6"
                    : "var(--color-text-secondary)")
              }
            >
              {label}
            </a>
          ))}
          <ThemeToggle storageKey="diq_pub_theme" variant="icon" />
          <Link
            href="/login"
            style={{
              fontSize: 14,
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--color-text-primary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--color-text-secondary)")
            }
          >
            Sign in
          </Link>
          <button
            onClick={goSignup}
            style={{
              background: "linear-gradient(135deg, #0f766e, #0d9488)",
              color: "#fff",
              border: "none",
              borderRadius: 9,
              padding: "9px 22px",
              fontSize: 14,
              cursor: "pointer",
              fontWeight: 600,
              boxShadow: "0 2px 12px rgba(15,118,110,0.3)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow =
                "0 4px 20px rgba(15,118,110,0.4)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow =
                "0 2px 12px rgba(15,118,110,0.3)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Get started →
          </button>
        </div>
      </nav>

      <div
        style={{ maxWidth: 1100, margin: "0 auto", padding: "5rem 2rem 4rem" }}
      >
        {/* Hero */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "4rem",
            animation: "fadeInUp 0.5s ease-out",
          }}
        >
          <div
            style={{
              display: "inline-block",
              background: "var(--color-background-secondary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: 20,
              padding: "4px 14px",
              fontSize: 12,
              color: "#0f766e",
              marginBottom: "1.5rem",
              fontWeight: 500,
            }}
          >
            ✦ Now with multi-clinic & AI Copilot
          </div>
          <h1
            style={{
              fontSize: 62,
              fontWeight: 800,
              lineHeight: 1.08,
              marginBottom: "1.25rem",
              color: "var(--color-text-primary)",
              letterSpacing: "-0.045em",
            }}
          >
            Insurance clarity,
            <br />
            <span
              style={{
                background:
                  "linear-gradient(135deg, #0f766e, #0d9488, #0891b2)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              instantly.
            </span>
          </h1>
          <p
            style={{
              fontSize: 19,
              color: "var(--color-text-secondary)",
              lineHeight: 1.65,
              maxWidth: 560,
              margin: "0 auto 2.5rem",
            }}
          >
            AI-powered cost estimates, claim risk detection, and an intelligent
            copilot for Ontario dental clinics. Ready in minutes.
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <button
              onClick={goSignup}
              style={{
                background: "linear-gradient(135deg, #0f766e, #0d9488)",
                color: "#fff",
                border: "none",
                borderRadius: 11,
                padding: "14px 32px",
                fontSize: 16,
                cursor: "pointer",
                fontWeight: 700,
                boxShadow: "0 4px 24px rgba(15,118,110,0.35)",
                transition: "all 0.2s",
                letterSpacing: "-0.01em",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 8px 32px rgba(15,118,110,0.45)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 4px 24px rgba(15,118,110,0.35)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Start free trial →
            </button>
            <Link
              href="/login"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border-secondary)",
                borderRadius: 11,
                padding: "14px 28px",
                fontSize: 16,
                textDecoration: "none",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor =
                  "var(--color-border-primary)";
                e.currentTarget.style.color = "var(--color-text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor =
                  "var(--color-border-secondary)";
                e.currentTarget.style.color = "var(--color-text-secondary)";
              }}
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            marginBottom: "5rem",
          }}
        >
          {STATS.map((s) => (
            <div
              key={s.num}
              style={{
                background: "var(--color-background-secondary)",
                borderRadius: 16,
                padding: "1.75rem",
                border: "1px solid var(--color-border-tertiary)",
                textAlign: "center",
                transition: "all 0.2s ease",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = "var(--shadow-md)";
                e.currentTarget.style.borderColor =
                  "var(--color-border-secondary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor =
                  "var(--color-border-tertiary)";
              }}
            >
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #0f766e, #0d9488)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: "-0.04em",
                  marginBottom: 8,
                  lineHeight: 1,
                }}
              >
                {s.num}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.5,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Feature Demo Section */}
        <div id="features" style={{ ...section, scrollMarginTop: "80px" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <h2 style={h2}>Everything your clinic needs</h2>
            <p style={{ fontSize: 16, color: "var(--color-text-secondary)" }}>
              Built for the modern dental practice — interactive demos below
            </p>
          </div>

          {/* Feature tabs */}
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "center",
              marginBottom: "2.5rem",
              flexWrap: "wrap",
            }}
          >
            {FEATURES.map((f, i) => (
              <button
                key={i}
                onClick={() => setActiveFeature(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 18px",
                  borderRadius: 30,
                  border:
                    activeFeature === i
                      ? "2px solid #0f766e"
                      : "0.5px solid var(--color-border-secondary)",
                  background:
                    activeFeature === i
                      ? "rgba(15,118,110,0.08)"
                      : "transparent",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: activeFeature === i ? 600 : 400,
                  color:
                    activeFeature === i
                      ? "#0f766e"
                      : "var(--color-text-primary)",
                  transition: "all 0.15s",
                }}
              >
                <span>{f.icon}</span> {f.title}
              </button>
            ))}
          </div>

          {/* Active feature */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 40,
              alignItems: "center",
              background: "var(--color-background-secondary)",
              borderRadius: 20,
              padding: "2.5rem",
              border: "0.5px solid var(--color-border-tertiary)",
            }}
          >
            <div>
              <div style={{ fontSize: 40, marginBottom: 16 }}>
                {FEATURES[activeFeature].icon}
              </div>
              <h3
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                  marginBottom: 12,
                  letterSpacing: "-0.02em",
                }}
              >
                {FEATURES[activeFeature].title}
              </h3>
              <p
                style={{
                  fontSize: 15,
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.7,
                  marginBottom: "1.5rem",
                }}
              >
                {FEATURES[activeFeature].desc}
              </p>
              <button
                onClick={goSignup}
                style={{
                  background: "#0f766e",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 22px",
                  fontSize: 14,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Try it free →
              </button>
            </div>
            <div>{FEATURES[activeFeature].demo}</div>
          </div>
        </div>

        {/* How it works — Demo */}
        <div id="demo" style={{ ...section, scrollMarginTop: "80px" }}>
          <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
            <div
              style={{
                display: "inline-block",
                background: "rgba(15,118,110,0.08)",
                border: "0.5px solid rgba(15,118,110,0.2)",
                borderRadius: 20,
                padding: "4px 14px",
                fontSize: 12,
                color: "#0f766e",
                marginBottom: "1rem",
                fontWeight: 600,
              }}
            >
              HOW IT WORKS
            </div>
          </div>
          <h2 style={{ ...h2, textAlign: "center", marginBottom: "0.5rem" }}>
            Up and running in minutes
          </h2>
          <p
            style={{
              textAlign: "center",
              color: "var(--color-text-secondary)",
              fontSize: 15,
              marginBottom: "2.5rem",
            }}
          >
            No IT department required
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
                step: "01",
                title: "Create your account",
                desc: "Sign up with your clinic name, pick a plan, and set up your team in under 3 minutes.",
              },
              {
                step: "02",
                title: "Enter a procedure",
                desc: "Front desk inputs CDT code + insurer. AI returns estimate, risk level, and pre-auth guidance instantly.",
              },
              {
                step: "03",
                title: "Collect more revenue",
                desc: "Fewer rejected claims, faster payments, happier patients. Track everything from your dashboard.",
              },
            ].map((s) => (
              <div
                key={s.step}
                style={{
                  padding: "1.5rem",
                  border: "0.5px solid var(--color-border-tertiary)",
                  borderRadius: 14,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: "monospace",
                    color: "#0f766e",
                    marginBottom: 12,
                    fontWeight: 700,
                    background: "rgba(15,118,110,0.08)",
                    display: "inline-block",
                    padding: "3px 10px",
                    borderRadius: 20,
                  }}
                >
                  {s.step}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: "var(--color-text-primary)",
                  }}
                >
                  {s.title}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  {s.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cortex Agents Showcase */}
        <div id="cortex" style={{ ...section, scrollMarginTop: "80px" }}>
          <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
            <div
              style={{
                display: "inline-block",
                background:
                  "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))",
                border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: 20,
                padding: "4px 14px",
                fontSize: 12,
                color: "#8b5cf6",
                marginBottom: "1rem",
                fontWeight: 600,
              }}
            >
              DENTALIQ CORTEX AGENTS
            </div>
          </div>
          <h2 style={{ ...h2, textAlign: "center", marginBottom: "0.5rem" }}>
            Hire your digital workforce
          </h2>
          <p
            style={{
              textAlign: "center",
              color: "var(--color-text-secondary)",
              fontSize: 15,
              marginBottom: "2.5rem",
            }}
          >
            Autonomous AI agents that work overnight to secure your revenue. You
            review and approve.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 14,
              marginBottom: "2rem",
            }}
          >
            {CORTEX_AGENTS_PREVIEW.map((agent) => (
              <div
                key={agent.name}
                style={{
                  padding: "1.5rem",
                  border: "1px solid var(--color-border-tertiary)",
                  borderRadius: 14,
                  background: "var(--color-background-secondary)",
                  opacity: agent.status === "Coming Soon" ? 0.65 : 1,
                  position: "relative",
                }}
              >
                {agent.status === "Coming Soon" && (
                  <div
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      background: "var(--color-background-primary)",
                      border: "1px solid var(--color-border-secondary)",
                      borderRadius: 20,
                      padding: "2px 8px",
                      fontSize: 9,
                      fontWeight: 600,
                      color: "var(--color-text-secondary)",
                      textTransform: "uppercase",
                    }}
                  >
                    Coming Soon
                  </div>
                )}
                {agent.status === "Active" && (
                  <div
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      background: "rgba(16,185,129,0.1)",
                      border: "1px solid rgba(16,185,129,0.3)",
                      borderRadius: 20,
                      padding: "2px 8px",
                      fontSize: 9,
                      fontWeight: 600,
                      color: "#10b981",
                      textTransform: "uppercase",
                    }}
                  >
                    Active
                  </div>
                )}
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: agent.gradient,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    marginBottom: 10,
                    boxShadow:
                      agent.status === "Active"
                        ? "0 4px 14px rgba(99,102,241,0.25)"
                        : "none",
                  }}
                >
                  {agent.avatar}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                    marginBottom: 4,
                  }}
                >
                  {agent.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--color-text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  {agent.desc}
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center" }}>
            <a
              href="/cortex"
              style={{
                display: "inline-block",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#fff",
                borderRadius: 10,
                padding: "12px 28px",
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
                boxShadow: "0 4px 16px rgba(99,102,241,0.3)",
              }}
            >
              Learn more about Cortex →
            </a>
          </div>
        </div>

        {/* Pricing */}
        <div id="pricing" style={{ ...section, scrollMarginTop: "80px" }}>
          <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
            <div
              style={{
                display: "inline-block",
                background: "rgba(15,118,110,0.08)",
                border: "0.5px solid rgba(15,118,110,0.2)",
                borderRadius: 20,
                padding: "4px 14px",
                fontSize: 12,
                color: "#0f766e",
                marginBottom: "1rem",
                fontWeight: 600,
              }}
            >
              PRICING
            </div>
          </div>
          <h2 style={{ ...h2, textAlign: "center", marginBottom: "0.5rem" }}>
            Simple, transparent pricing
          </h2>
          <p
            style={{
              textAlign: "center",
              color: "var(--color-text-secondary)",
              fontSize: 15,
              marginBottom: "2.5rem",
            }}
          >
            14-day free trial. No credit card required.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            {PLANS.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedPlan(p.id)}
                style={{
                  padding: "1.8rem",
                  border:
                    selectedPlan === p.id
                      ? `2px solid ${p.color}`
                      : "0.5px solid var(--color-border-tertiary)",
                  borderRadius: 16,
                  cursor: "pointer",
                  position: "relative",
                  background:
                    selectedPlan === p.id
                      ? `rgba(${p.id === "pro" ? "14,116,144" : p.id === "enterprise" ? "79,70,229" : "15,118,110"},0.04)`
                      : "var(--color-background-secondary)",
                  transition: "all 0.15s",
                }}
              >
                {p.popular && (
                  <div
                    style={{
                      position: "absolute",
                      top: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: p.color,
                      color: "#fff",
                      fontSize: 11,
                      padding: "3px 12px",
                      borderRadius: 20,
                      whiteSpace: "nowrap",
                      fontWeight: 600,
                    }}
                  >
                    Most popular
                  </div>
                )}
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                    marginBottom: 4,
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--color-text-secondary)",
                    marginBottom: 14,
                  }}
                >
                  {p.desc}
                </div>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 700,
                    color: p.color,
                    marginBottom: 16,
                    letterSpacing: "-0.03em",
                  }}
                >
                  {p.price ? `$${p.price}` : "Custom"}
                  <span
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-secondary)",
                      fontWeight: 400,
                    }}
                  >
                    {p.price ? "/mo" : ""}
                  </span>
                </div>
                {p.features.map((f) => (
                  <div
                    key={f}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        color: p.color,
                        fontSize: 13,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      ✓
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {f}
                    </span>
                  </div>
                ))}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: 8,
                    marginTop: "1.5rem",
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/signup?plan=${p.id}`);
                    }}
                    style={{
                      width: "100%",
                      background:
                        selectedPlan === p.id ? p.color : "transparent",
                      color:
                        selectedPlan === p.id
                          ? "#fff"
                          : "var(--color-text-primary)",
                      border: `0.5px solid ${selectedPlan === p.id ? p.color : "var(--color-border-secondary)"}`,
                      borderRadius: 8,
                      padding: "10px",
                      fontSize: 14,
                      cursor: "pointer",
                      fontWeight: 500,
                      transition: "all 0.15s",
                    }}
                  >
                    Start free trial
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/demo/${p.id}`);
                    }}
                    style={{
                      width: "100%",
                      background: "transparent",
                      color: "var(--color-text-secondary)",
                      border: `0.5px solid var(--color-border-secondary)`,
                      borderRadius: 8,
                      padding: "10px",
                      fontSize: 14,
                      cursor: "pointer",
                      fontWeight: 500,
                      transition: "all 0.15s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color =
                        "var(--color-text-primary)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color =
                        "var(--color-text-secondary)")
                    }
                  >
                    <span>▶</span> Try Live Demo
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              textAlign: "center",
              marginTop: "2rem",
              padding: "1rem",
              border: "1px dashed var(--color-border-secondary)",
              borderRadius: 12,
              display: "inline-block",
              left: "50%",
              transform: "translateX(-50%)",
              position: "relative",
              background: "var(--color-background-secondary)",
            }}
          >
            <span
              style={{ fontSize: 14, color: "var(--color-text-secondary)" }}
            >
              Need unlimited locations or custom integrations?{" "}
              <strong style={{ color: "var(--color-text-primary)" }}>
                Enterprise options are available.
              </strong>{" "}
              <a
                href="mailto:support@dentaliq.ca"
                style={{
                  color: "#0f766e",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                Contact support →
              </a>
            </span>
          </div>
        </div>

        {/* Security */}
        <div id="security" style={{ ...section, scrollMarginTop: "80px" }}>
          <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
            <div
              style={{
                display: "inline-block",
                background: "rgba(15,118,110,0.08)",
                border: "0.5px solid rgba(15,118,110,0.2)",
                borderRadius: 20,
                padding: "4px 14px",
                fontSize: 12,
                color: "#0f766e",
                marginBottom: "1rem",
                fontWeight: 600,
              }}
            >
              SECURITY & COMPLIANCE
            </div>
          </div>
          <h2 style={{ ...h2, textAlign: "center", marginBottom: "0.5rem" }}>
            Built for PHIPA compliance
          </h2>
          <p
            style={{
              textAlign: "center",
              color: "var(--color-text-secondary)",
              fontSize: 15,
              marginBottom: "2.5rem",
            }}
          >
            Your patient data is protected at every layer
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 14,
            }}
          >
            {SECURITY.map((s) => (
              <div
                key={s.label}
                style={{
                  padding: "1.2rem",
                  border: "0.5px solid var(--color-border-tertiary)",
                  borderRadius: 12,
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  background: "var(--color-background-secondary)",
                }}
              >
                <div style={{ fontSize: 24, flexShrink: 0 }}>{s.icon}</div>
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                      marginBottom: 3,
                    }}
                  >
                    {s.label}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {s.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(15,118,110,0.12) 0%, rgba(14,116,144,0.08) 100%)",
            border: "0.5px solid rgba(15,118,110,0.2)",
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
            Ready to recover lost revenue?
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "var(--color-text-secondary)",
              marginBottom: "2rem",
            }}
          >
            Sign up in under 3 minutes. No credit card required.
          </p>
          <button
            onClick={goSignup}
            style={{
              background: "#0f766e",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "15px 36px",
              fontSize: 16,
              cursor: "pointer",
              fontWeight: 600,
              boxShadow: "0 4px 20px rgba(15,118,110,0.3)",
            }}
          >
            Create free account →
          </button>
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
