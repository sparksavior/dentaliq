"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

/* ─────────────── Reveal component ─────────────── */
function Reveal({
  children,
  delay = 0,
  y = 32,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
}) {
  const [on, setOn] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setOn(true);
          io.unobserve(e.target);
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{
        opacity: on ? 1 : 0,
        transform: on ? "none" : `translateY(${y}px)`,
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────── Data ─────────────── */
const PLANS = [
  {
    id: "starter",
    name: "Starter",
    color: "#0ea5e9",
    description: "For solo practitioners",
    price: "$199",
    priceSuffix: "/mo",
    priceNote: null,
    ctaLabel: "Get Started",
    ctaHref: "/signup?plan=starter",
    ctaStyle: "ghost" as const,
    popular: false,
    features: [
      "1 clinic location",
      "Real-time CDT cost estimator",
      "Patient cost explanations",
      "300 estimates/month",
      "CDCP coverage lookup",
      "Basic claim risk flags",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    color: "#0d9488",
    description: "For growing practices",
    price: "$349",
    priceSuffix: "/mo",
    priceNote: null,
    ctaLabel: "Get Started",
    ctaHref: "/signup?plan=pro",
    ctaStyle: "filled" as const,
    popular: true,
    features: [
      "Everything in Starter",
      "Up to 3 clinic locations",
      "Unlimited estimates",
      "Full claim risk detection",
      "AI pre-auth narrative drafting",
      "Multi-location analytics",
      "AR aging reports",
      "Team role management (3 roles)",
      "Priority support",
    ],
  },
  {
    id: "cortex",
    name: "Cortex",
    color: "#8b5cf6",
    description: "AI Digital Workforce",
    price: "$299+",
    priceSuffix: "/mo",
    priceNote: "+ $1.50/approved action",
    ctaLabel: "Hire your agents",
    ctaHref: "/signup?plan=cortex",
    ctaStyle: "purple" as const,
    popular: false,
    features: [
      "Everything in Pro",
      "Cortex Command Center",
      "6 specialized AI agents",
      "Human-in-the-loop approval inbox",
      "Overnight batch processing",
      "Per-clinic agent isolation",
      "On-demand scan trigger",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    color: "#f59e0b",
    description: "For multi-location groups",
    price: "Custom",
    priceSuffix: "",
    priceNote: null,
    ctaLabel: "Talk to sales",
    ctaHref: "/contact?type=sales",
    ctaStyle: "amber" as const,
    popular: false,
    features: [
      "Everything in Cortex",
      "Unlimited locations",
      "Dedicated account manager",
      "Custom PMS integrations",
      "PHIPA audit support",
      "SLA guarantee",
      "On-premise AI deployment",
    ],
  },
];

const TABLE_ROWS: Array<
  | { type: "category"; label: string }
  | { type: "row"; label: string; values: [string, string, string, string] }
> = [
  { type: "category", label: "Core Platform" },
  { type: "row", label: "CDT Estimator", values: ["✓", "✓", "✓", "✓"] },
  { type: "row", label: "Patient cost explanations", values: ["✓", "✓", "✓", "✓"] },
  { type: "row", label: "Estimates/month", values: ["300", "Unlimited", "Unlimited", "Unlimited"] },
  { type: "row", label: "CDCP lookup", values: ["✓", "✓", "✓", "✓"] },

  { type: "category", label: "Clinic Management" },
  { type: "row", label: "Locations", values: ["1", "Up to 3", "Up to 3", "Unlimited"] },
  { type: "row", label: "Team roles", values: ["—", "✓", "✓", "✓"] },

  { type: "category", label: "Insurance Intelligence" },
  { type: "row", label: "Claim risk detection", values: ["Basic", "Full", "Full", "Full"] },
  { type: "row", label: "Pre-auth drafting", values: ["—", "✓", "✓", "✓"] },

  { type: "category", label: "Analytics" },
  { type: "row", label: "Multi-location dashboard", values: ["—", "✓", "✓", "✓"] },
  { type: "row", label: "AR aging reports", values: ["—", "✓", "✓", "✓"] },

  { type: "category", label: "AI Agents" },
  { type: "row", label: "Cortex Command Center", values: ["—", "—", "✓", "✓"] },
  { type: "row", label: "AI Agents available", values: ["—", "—", "6 agents", "6 agents"] },
  { type: "row", label: "Per-clinic isolation", values: ["—", "—", "✓", "✓"] },
  { type: "row", label: "Per-action billing", values: ["—", "—", "$1.50/action", "$1.50/action"] },

  { type: "category", label: "Support" },
  { type: "row", label: "Support level", values: ["Email", "Priority", "Priority", "Dedicated"] },
  { type: "row", label: "Account manager", values: ["—", "—", "—", "✓"] },
  { type: "row", label: "SLA guarantee", values: ["—", "—", "—", "✓"] },
];

const FAQS = [
  {
    q: "Can I switch plans anytime?",
    a: "Yes — upgrade or downgrade at any time. We prorate billing to the day, so you only pay for what you use. Downgrades take effect at the end of your current billing cycle.",
  },
  {
    q: "What counts as an 'approved action' for Cortex?",
    a: "Each time you approve an agent action — such as a pre-auth narrative being sent, a patient follow-up triggered, or a claim flag being resolved — it counts as one approved action billed at $1.50. Scans and analysis that don't result in an approved action are free.",
  },
  {
    q: "Is patient data stored in Canada?",
    a: "Yes. All data is stored in AWS ca-central-1 (Montreal). DentalIQ is PHIPA compliant and uses tenant-isolated databases so your clinic's data is never commingled with another practice's records.",
  },
  {
    q: "How does the per-clinic agent pricing work?",
    a: "The first Cortex agent instance is included in the base $299/mo Cortex plan. Each additional clinic instance (for multi-location practices) is $99/mo. Enterprise plans include custom per-clinic pricing negotiated upfront.",
  },
  {
    q: "Do you offer a free trial?",
    a: "Yes — all plans include a 14-day free trial with no credit card required. You get full access to every feature in your chosen plan. At the end of the trial you can subscribe or let it lapse with no charge.",
  },
];

/* ─────────────── Page ─────────────── */
export default function PricingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <>
      {/* ── Global keyframes ── */}
      <style>{`
        @keyframes gradientFlow {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes badgePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(13,148,136,0.45); }
          50%        { box-shadow: 0 0 0 8px rgba(13,148,136,0); }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 0.35; }
          50%       { opacity: 0.7; }
        }
        @keyframes checkPop {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.25); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes aurora1 {
          0%   { transform: translate(0, 0) scale(1); }
          33%  { transform: translate(60px, -40px) scale(1.1); }
          66%  { transform: translate(-40px, 30px) scale(0.95); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes aurora2 {
          0%   { transform: translate(0, 0) scale(1); }
          33%  { transform: translate(-50px, 50px) scale(1.08); }
          66%  { transform: translate(40px, -30px) scale(0.97); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes accordionOpen {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        style={{
          background: "var(--color-background-primary)",
          minHeight: "100vh",
          color: "var(--color-text-primary)",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* ══════════════════════════════
            1. STICKY NAV
        ══════════════════════════════ */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 40px",
            height: 64,
            background: scrolled
              ? "color-mix(in srgb, var(--color-background-primary) 80%, transparent)"
              : "transparent",
            backdropFilter: scrolled ? "blur(20px)" : "none",
            borderBottom: scrolled
              ? "1px solid var(--color-border-secondary)"
              : "1px solid transparent",
            transition: "all 0.3s ease",
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #0d9488, #0ea5e9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              +
            </div>
            <span
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "var(--color-text-primary)",
              }}
            >
              Dental
              <span style={{ color: "#0d9488" }}>IQ</span>
            </span>
          </Link>

          {/* Center nav pills */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "var(--color-background-secondary)",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: 100,
              padding: "4px 6px",
            }}
          >
            {[
              { label: "Home", href: "/" },
              { label: "Features", href: "/#features" },
              { label: "Cortex", href: "/cortex" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  padding: "6px 16px",
                  borderRadius: 100,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--color-text-secondary)",
                  textDecoration: "none",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--color-text-primary)";
                  e.currentTarget.style.background =
                    "var(--color-background-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color =
                    "var(--color-text-secondary)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div
            style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}
          >
            <ThemeToggle storageKey="diq_pub_theme" variant="icon" />
            <Link
              href="/login"
              style={{
                padding: "8px 16px",
                borderRadius: 100,
                border: "1px solid var(--color-border-secondary)",
                color: "var(--color-text-primary)",
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "none",
                whiteSpace: "nowrap",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "#0d9488")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor =
                  "var(--color-border-secondary)")
              }
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              style={{
                padding: "8px 18px",
                borderRadius: 100,
                background: "linear-gradient(135deg, #0d9488, #059669)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                whiteSpace: "nowrap",
                boxShadow: "0 2px 8px rgba(13,148,136,0.35)",
                transition: "box-shadow 0.2s, transform 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 4px 16px rgba(13,148,136,0.5)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 2px 8px rgba(13,148,136,0.35)";
                e.currentTarget.style.transform = "none";
              }}
            >
              Get Started
            </Link>
          </div>
        </header>

        {/* ══════════════════════════════
            2. HERO
        ══════════════════════════════ */}
        <section
          style={{
            textAlign: "center",
            padding: "96px 24px 72px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Aurora blobs */}
          <div
            style={{
              position: "absolute",
              top: "-20%",
              left: "10%",
              width: 600,
              height: 400,
              background:
                "radial-gradient(ellipse, rgba(13,148,136,0.12) 0%, transparent 70%)",
              borderRadius: "50%",
              animation: "aurora1 14s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "10%",
              right: "5%",
              width: 500,
              height: 350,
              background:
                "radial-gradient(ellipse, rgba(99,102,241,0.10) 0%, transparent 70%)",
              borderRadius: "50%",
              animation: "aurora2 18s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />

          {/* Badge */}
          <Reveal delay={0}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "var(--color-background-secondary)",
                border: "1px solid var(--color-border-secondary)",
                padding: "6px 16px",
                borderRadius: 100,
                fontSize: 13,
                fontWeight: 600,
                color: "#0d9488",
                marginBottom: 28,
                animation: "badgePulse 3s ease-in-out infinite",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#0d9488",
                  display: "inline-block",
                  animation: "dotPulse 2s ease-in-out infinite",
                }}
              />
              Simple, transparent pricing
            </div>
          </Reveal>

          {/* H1 */}
          <Reveal delay={0.08}>
            <h1
              style={{
                fontSize: "clamp(40px, 6vw, 64px)",
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                marginBottom: 20,
                background:
                  "linear-gradient(90deg, var(--color-text-primary) 0%, #0d9488 40%, #6366f1 70%, var(--color-text-primary) 100%)",
                backgroundSize: "300% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "gradientFlow 6s linear infinite",
              }}
            >
              Every plan pays for itself.
            </h1>
          </Reveal>

          {/* Sub */}
          <Reveal delay={0.14}>
            <p
              style={{
                fontSize: 18,
                color: "var(--color-text-secondary)",
                maxWidth: 540,
                margin: "0 auto 36px",
                lineHeight: 1.6,
              }}
            >
              Start with what you need today. Upgrade as your practice grows —
              no hidden fees, no lock-in.
            </p>
          </Reveal>

          {/* Trust chips */}
          <Reveal delay={0.2}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              {["14-day free trial", "No credit card", "Cancel anytime"].map(
                (chip) => (
                  <div
                    key={chip}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--color-text-secondary)",
                      background: "var(--color-background-secondary)",
                      border: "1px solid var(--color-border-secondary)",
                      padding: "6px 14px",
                      borderRadius: 100,
                    }}
                  >
                    <span style={{ color: "#0d9488", fontWeight: 700 }}>✓</span>
                    {chip}
                  </div>
                )
              )}
            </div>
          </Reveal>
        </section>

        {/* ══════════════════════════════
            3. PLAN CARDS
        ══════════════════════════════ */}
        <section style={{ padding: "0 24px 80px" }}>
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 20,
            }}
          >
            {PLANS.map((plan, i) => {
              const isHovered = hoveredCard === plan.id;
              const isPopular = plan.popular;
              return (
                <Reveal key={plan.id} delay={i * 0.08}>
                  <div
                    onMouseEnter={() => setHoveredCard(plan.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    style={{
                      position: "relative",
                      background: "var(--color-background-primary)",
                      border: isPopular
                        ? `2px solid ${plan.color}`
                        : "1px solid var(--color-border-secondary)",
                      borderRadius: 20,
                      padding: "32px 28px",
                      height: "100%",
                      boxSizing: "border-box",
                      transition:
                        "transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease",
                      transform: isHovered ? "translateY(-8px)" : isPopular ? "translateY(-4px)" : "none",
                      boxShadow: isHovered
                        ? `0 20px 50px ${plan.color}35, var(--shadow-lg)`
                        : isPopular
                        ? `0 8px 30px ${plan.color}25, var(--shadow-md)`
                        : "var(--shadow-sm)",
                    }}
                  >
                    {/* Popular badge */}
                    {isPopular && (
                      <div
                        style={{
                          position: "absolute",
                          top: -14,
                          left: "50%",
                          transform: "translateX(-50%)",
                          background: plan.color,
                          color: "#fff",
                          padding: "4px 14px",
                          borderRadius: 100,
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: "0.08em",
                          whiteSpace: "nowrap",
                          animation: "badgePulse 3s ease-in-out infinite",
                        }}
                      >
                        MOST POPULAR
                      </div>
                    )}

                    {/* Plan color label */}
                    <div
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: plan.color,
                        marginBottom: 12,
                        boxShadow: `0 0 8px ${plan.color}80`,
                      }}
                    />

                    {/* Plan name */}
                    <h3
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: "var(--color-text-primary)",
                        marginBottom: 4,
                      }}
                    >
                      {plan.name}
                    </h3>

                    {/* Description */}
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--color-text-tertiary)",
                        marginBottom: 20,
                      }}
                    >
                      {plan.description}
                    </p>

                    {/* Price */}
                    <div style={{ marginBottom: plan.priceNote ? 4 : 24 }}>
                      <span
                        style={{
                          fontSize: plan.price === "Custom" ? 32 : 38,
                          fontWeight: 800,
                          color: "var(--color-text-primary)",
                        }}
                      >
                        {plan.price}
                      </span>
                      {plan.priceSuffix && (
                        <span
                          style={{
                            fontSize: 14,
                            color: "var(--color-text-tertiary)",
                            fontWeight: 400,
                            marginLeft: 2,
                          }}
                        >
                          {plan.priceSuffix}
                        </span>
                      )}
                    </div>

                    {/* Price note */}
                    {plan.priceNote && (
                      <p
                        style={{
                          fontSize: 12,
                          color: plan.color,
                          fontWeight: 500,
                          marginBottom: 20,
                        }}
                      >
                        {plan.priceNote}
                      </p>
                    )}

                    {/* CTA Button */}
                    <PlanButton plan={plan} />

                    {/* Divider */}
                    <div
                      style={{
                        height: 1,
                        background: "var(--color-border-secondary)",
                        margin: "24px 0",
                      }}
                    />

                    {/* Features */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      {plan.features.map((feat, fi) => (
                        <div
                          key={feat}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                            fontSize: 13,
                            color: "var(--color-text-secondary)",
                            animation: isHovered
                              ? `checkPop 0.3s ease ${fi * 0.04}s both`
                              : "none",
                          }}
                        >
                          <span
                            style={{
                              color: plan.color,
                              fontWeight: 700,
                              flexShrink: 0,
                              marginTop: 1,
                            }}
                          >
                            ✓
                          </span>
                          {feat}
                        </div>
                      ))}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* ══════════════════════════════
            4. FEATURE COMPARISON TABLE
        ══════════════════════════════ */}
        <section style={{ padding: "0 24px 96px" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2
                style={{
                  fontSize: "clamp(28px, 4vw, 42px)",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "var(--color-text-primary)",
                  marginBottom: 12,
                }}
              >
                See exactly what&apos;s included
              </h2>
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: 16,
                }}
              >
                Compare every feature across all plans.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div style={{ maxWidth: 1100, margin: "0 auto", overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "separate",
                  borderSpacing: 0,
                  minWidth: 600,
                }}
              >
                {/* Table header */}
                <thead>
                  <tr>
                    <th
                      style={{
                        padding: "14px 20px",
                        textAlign: "left",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--color-text-tertiary)",
                        background: "var(--color-background-secondary)",
                        borderBottom: "1px solid var(--color-border-secondary)",
                        borderRadius: "12px 0 0 0",
                        position: "sticky",
                        top: 64,
                        zIndex: 10,
                        width: "30%",
                      }}
                    >
                      Feature
                    </th>
                    {PLANS.map((plan, i) => (
                      <th
                        key={plan.id}
                        style={{
                          padding: "14px 16px",
                          textAlign: "center",
                          fontSize: 13,
                          fontWeight: 700,
                          color: plan.color,
                          background: "var(--color-background-secondary)",
                          borderBottom: "1px solid var(--color-border-secondary)",
                          borderRadius:
                            i === PLANS.length - 1 ? "0 12px 0 0" : "0",
                          position: "sticky",
                          top: 64,
                          zIndex: 10,
                        }}
                      >
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TABLE_ROWS.map((row, ri) => {
                    if (row.type === "category") {
                      return (
                        <tr key={`cat-${ri}`}>
                          <td
                            colSpan={5}
                            style={{
                              padding: "20px 20px 8px",
                              fontSize: 11,
                              fontWeight: 800,
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              color: "var(--color-text-tertiary)",
                              background:
                                "var(--color-background-primary)",
                              borderBottom:
                                "1px solid var(--color-border-tertiary)",
                            }}
                          >
                            {row.label}
                          </td>
                        </tr>
                      );
                    }

                    const isEven = ri % 2 === 0;
                    return (
                      <tr key={`row-${ri}`}>
                        <td
                          style={{
                            padding: "12px 20px",
                            fontSize: 13,
                            color: "var(--color-text-secondary)",
                            background: isEven
                              ? "var(--color-background-primary)"
                              : "var(--color-background-secondary)",
                            borderBottom:
                              "1px solid var(--color-border-tertiary)",
                          }}
                        >
                          {row.label}
                        </td>
                        {row.values.map((val, vi) => {
                          const isCheck = val === "✓";
                          const isDash = val === "—";
                          return (
                            <td
                              key={vi}
                              style={{
                                padding: "12px 16px",
                                textAlign: "center",
                                fontSize: 13,
                                fontWeight: isCheck ? 700 : 400,
                                color: isCheck
                                  ? PLANS[vi].color
                                  : isDash
                                  ? "var(--color-text-tertiary)"
                                  : "var(--color-text-primary)",
                                background: isEven
                                  ? "var(--color-background-primary)"
                                  : "var(--color-background-secondary)",
                                borderBottom:
                                  "1px solid var(--color-border-tertiary)",
                              }}
                            >
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Reveal>
        </section>

        {/* ══════════════════════════════
            5. FAQ
        ══════════════════════════════ */}
        <section style={{ padding: "0 24px 96px" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2
                style={{
                  fontSize: "clamp(28px, 4vw, 42px)",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "var(--color-text-primary)",
                  marginBottom: 12,
                }}
              >
                Frequently asked questions
              </h2>
              <p style={{ color: "var(--color-text-secondary)", fontSize: 16 }}>
                Everything you need to know before getting started.
              </p>
            </div>
          </Reveal>

          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <Reveal key={i} delay={i * 0.06}>
                  <div
                    style={{
                      borderRadius: 14,
                      border: "1px solid var(--color-border-secondary)",
                      marginBottom: 12,
                      overflow: "hidden",
                      transition: "border-color 0.2s",
                      borderColor: isOpen
                        ? "#0d9488"
                        : "var(--color-border-secondary)",
                    }}
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "20px 24px",
                        background: "var(--color-background-secondary)",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        gap: 16,
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "var(--color-background-primary)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          "var(--color-background-secondary)")
                      }
                    >
                      <span
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: isOpen
                            ? "#0d9488"
                            : "var(--color-text-primary)",
                          transition: "color 0.2s",
                          flex: 1,
                        }}
                      >
                        {faq.q}
                      </span>
                      <span
                        style={{
                          fontSize: 20,
                          color: isOpen
                            ? "#0d9488"
                            : "var(--color-text-tertiary)",
                          transform: isOpen ? "rotate(45deg)" : "none",
                          transition: "transform 0.25s ease, color 0.2s",
                          flexShrink: 0,
                          lineHeight: 1,
                        }}
                      >
                        +
                      </span>
                    </button>
                    <div
                      style={{
                        maxHeight: isOpen ? 400 : 0,
                        overflow: "hidden",
                        transition: "max-height 0.35s cubic-bezier(0.16,1,0.3,1)",
                      }}
                    >
                      <p
                        style={{
                          padding: "0 24px 20px",
                          fontSize: 14,
                          color: "var(--color-text-secondary)",
                          lineHeight: 1.7,
                          margin: 0,
                          animation: isOpen ? "accordionOpen 0.3s ease both" : "none",
                        }}
                      >
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* ══════════════════════════════
            6. CTA BANNER
        ══════════════════════════════ */}
        <section style={{ padding: "0 24px 96px" }}>
          <Reveal>
            <div
              style={{
                maxWidth: 900,
                margin: "0 auto",
                borderRadius: 28,
                background:
                  "linear-gradient(135deg, #0d9488 0%, #0891b2 50%, #6366f1 100%)",
                padding: "72px 48px",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Grid dots overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage:
                    "radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                  pointerEvents: "none",
                }}
              />
              {/* Glow blobs */}
              <div
                style={{
                  position: "absolute",
                  top: "-30%",
                  left: "20%",
                  width: 400,
                  height: 300,
                  background:
                    "radial-gradient(ellipse, rgba(255,255,255,0.12) 0%, transparent 70%)",
                  borderRadius: "50%",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: "-20%",
                  right: "10%",
                  width: 300,
                  height: 250,
                  background:
                    "radial-gradient(ellipse, rgba(99,102,241,0.3) 0%, transparent 70%)",
                  borderRadius: "50%",
                  pointerEvents: "none",
                }}
              />

              <h2
                style={{
                  fontSize: "clamp(28px, 4vw, 48px)",
                  fontWeight: 800,
                  color: "#fff",
                  letterSpacing: "-0.02em",
                  marginBottom: 16,
                  position: "relative",
                }}
              >
                Ready to stop losing revenue?
              </h2>
              <p
                style={{
                  fontSize: 17,
                  color: "rgba(255,255,255,0.8)",
                  marginBottom: 36,
                  maxWidth: 500,
                  margin: "0 auto 36px",
                  lineHeight: 1.6,
                  position: "relative",
                }}
              >
                Join hundreds of Canadian dental practices already using
                DentalIQ to recover lost revenue and work smarter.
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 14,
                  flexWrap: "wrap",
                  position: "relative",
                }}
              >
                <Link
                  href="/signup"
                  style={{
                    padding: "14px 28px",
                    borderRadius: 100,
                    background: "#fff",
                    color: "#0d9488",
                    fontSize: 15,
                    fontWeight: 700,
                    textDecoration: "none",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                    transition: "transform 0.2s, box-shadow 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "0 8px 24px rgba(0,0,0,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow =
                      "0 4px 16px rgba(0,0,0,0.15)";
                  }}
                >
                  Start free trial
                </Link>
                <Link
                  href="/contact?type=sales"
                  style={{
                    padding: "14px 28px",
                    borderRadius: 100,
                    background: "rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.4)",
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: 600,
                    textDecoration: "none",
                    backdropFilter: "blur(8px)",
                    transition: "background 0.2s, transform 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "rgba(255,255,255,0.25)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      "rgba(255,255,255,0.15)";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  Talk to sales
                </Link>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ══════════════════════════════
            7. FOOTER
        ══════════════════════════════ */}
        <footer
          style={{
            borderTop: "1px solid var(--color-border-secondary)",
            padding: "28px 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <span
            style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}
          >
            &copy; {new Date().getFullYear()} DentalIQ Technologies Inc. All
            rights reserved.
          </span>

          <div
            style={{ display: "flex", alignItems: "center", gap: 20 }}
          >
            {[
              { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" },
              { label: "Legal", href: "/legal" },
              { label: "Support", href: "/support" },
            ].map((link) => (
              <Link
                key={link.label}
                href={link.href}
                style={{
                  fontSize: 13,
                  color: "var(--color-text-tertiary)",
                  textDecoration: "none",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--color-text-primary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color =
                    "var(--color-text-tertiary)")
                }
              >
                {link.label}
              </Link>
            ))}
            <ThemeToggle storageKey="diq_pub_theme" variant="icon" />
          </div>
        </footer>
      </div>
    </>
  );
}

/* ─────────────── CTA Button sub-component ─────────────── */
function PlanButton({ plan }: { plan: (typeof PLANS)[number] }) {
  const base: React.CSSProperties = {
    display: "block",
    textAlign: "center",
    padding: "13px 20px",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    textDecoration: "none",
    transition: "transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s",
    cursor: "pointer",
    marginBottom: 0,
  };

  if (plan.ctaStyle === "ghost") {
    return (
      <Link
        href={plan.ctaHref}
        style={{
          ...base,
          background: "transparent",
          border: `1.5px solid ${plan.color}`,
          color: plan.color,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = `${plan.color}15`;
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.transform = "none";
        }}
      >
        {plan.ctaLabel}
      </Link>
    );
  }

  if (plan.ctaStyle === "filled") {
    return (
      <Link
        href={plan.ctaHref}
        style={{
          ...base,
          background: plan.color,
          border: "none",
          color: "#fff",
          boxShadow: `0 4px 14px ${plan.color}55`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = `0 6px 20px ${plan.color}70`;
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = `0 4px 14px ${plan.color}55`;
          e.currentTarget.style.transform = "none";
        }}
      >
        {plan.ctaLabel}
      </Link>
    );
  }

  if (plan.ctaStyle === "purple") {
    return (
      <Link
        href={plan.ctaHref}
        style={{
          ...base,
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          border: "none",
          color: "#fff",
          boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(99,102,241,0.55)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "0 4px 14px rgba(99,102,241,0.4)";
          e.currentTarget.style.transform = "none";
        }}
      >
        {plan.ctaLabel}
      </Link>
    );
  }

  // amber
  return (
    <Link
      href={plan.ctaHref}
      style={{
        ...base,
        background: "transparent",
        border: `1.5px solid ${plan.color}`,
        color: plan.color,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `${plan.color}15`;
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.transform = "none";
      }}
    >
      {plan.ctaLabel}
    </Link>
  );
}
