"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

const AGENTS = [
  { id: "billing", name: "Billing Agent", codename: "CORTEX-01", emoji: "💰", gradient: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#8b5cf6", role: "Revenue Compliance Specialist", description: "Autonomously scans your daily procedures, identifies high-risk claims before they get denied, and drafts medically-accurate pre-authorization narratives overnight. You wake up, review, and approve.", capabilities: ["Pre-auth narrative generation", "CDCP denial prevention", "Claim risk mitigation", "Overnight batch processing"], roi: "Prevents ~$6,400/mo in denied claims", roiColor: "#8b5cf6" },
  { id: "recall", name: "Recall Agent", codename: "CORTEX-02", emoji: "📞", gradient: "linear-gradient(135deg,#0ea5e9,#06b6d4)", color: "#0ea5e9", role: "Patient Reactivation Specialist", description: "Identifies patients overdue for hygiene appointments, outstanding treatment plans, and lapsed patients — then autonomously crafts and schedules personalized outreach.", capabilities: ["Hygiene recall automation", "SMS/email outreach", "Treatment follow-up", "Lapsed patient recovery"], roi: "Recovers ~12 patients/month", roiColor: "#0ea5e9" },
  { id: "review", name: "Review Agent", codename: "CORTEX-03", emoji: "⭐", gradient: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#f59e0b", role: "Reputation Manager", description: "Monitors your online reputation, solicits reviews from satisfied patients at the optimal moment, and drafts professional responses to all reviews automatically.", capabilities: ["Review solicitation", "Google review responses", "Sentiment analysis", "NPS tracking"], roi: "Increases reviews by ~40%", roiColor: "#f59e0b" },
  { id: "supply", name: "Supply Agent", codename: "CORTEX-04", emoji: "📦", gradient: "linear-gradient(135deg,#10b981,#059669)", color: "#10b981", role: "Inventory Optimizer", description: "Tracks your dental supply inventory, compares prices across suppliers in real-time, and triggers purchase orders before you run out.", capabilities: ["Inventory monitoring", "Price comparison", "Auto-reorder triggers", "Supplier negotiation"], roi: "Saves ~$800/mo on supplies", roiColor: "#10b981" },
  { id: "treatment", name: "Treatment Coordinator", codename: "CORTEX-05", emoji: "🦷", gradient: "linear-gradient(135deg,#ec4899,#f43f5e)", color: "#ec4899", role: "Case Acceptance Specialist", description: "Follows up with patients who received high-ticket treatment plans but haven't yet accepted. Nurtures them with educational content and financing options.", capabilities: ["Implant/Invisalign follow-up", "Treatment plan nurturing", "Patient education", "Financial option presentation"], roi: "Increases case acceptance ~25%", roiColor: "#ec4899" },
  { id: "hygienist", name: "Hygienist Agent", codename: "CORTEX-06", emoji: "📅", gradient: "linear-gradient(135deg,#14b8a6,#0d9488)", color: "#14b8a6", role: "Schedule Optimizer", description: "Fills last-minute cancellations by intelligently matching waitlist patients with open chair time, maximizing your hygiene production.", capabilities: ["Last-minute fill scheduling", "Cancellation recovery", "Chair time optimization", "Waitlist management"], roi: "Fills ~90% of cancellations", roiColor: "#14b8a6" },
];

const ACTIVITY_ITEMS = [
  { icon: "✓", agent: "Billing Agent", action: "D2750 pre-auth drafted · Clinic North", time: "2 min ago", color: "#8b5cf6", waiting: false },
  { icon: "✓", agent: "Recall Agent", action: "3 patients contacted · Clinic South", time: "14 min ago", color: "#0ea5e9", waiting: false },
  { icon: "⏳", agent: "Review Agent", action: "Awaiting your approval · 2 actions", time: "Just now", color: "#f59e0b", waiting: true },
  { icon: "✓", agent: "Supply Agent", action: "Gloves reorder triggered · $240 saved", time: "1 hr ago", color: "#10b981", waiting: false },
  { icon: "✓", agent: "Treatment Coord", action: "Crown follow-up sent · Clinic North", time: "3 hr ago", color: "#ec4899", waiting: false },
];

function Reveal({ children, delay = 0, y = 36 }: { children: React.ReactNode; delay?: number; y?: number }) {
  const [on, setOn] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setOn(true); io.unobserve(e.target); }
    }, { threshold: 0.1 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: on ? 1 : 0, transform: on ? "none" : `translateY(${y}px)`, transition: `opacity 0.7s ease ${delay}s,transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s` }}>
      {children}
    </div>
  );
}

function AgentCard({ agent }: { agent: typeof AGENTS[0] }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--color-background-secondary)",
        border: `1px solid ${hovered ? agent.color : "var(--color-border-secondary)"}`,
        borderRadius: 20,
        overflow: "hidden",
        transform: hovered ? "translateY(-6px)" : "translateY(0)",
        boxShadow: hovered ? `0 20px 60px ${agent.color}30` : "none",
        transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1),box-shadow 0.3s ease,border-color 0.3s ease",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Accent bar */}
      <div style={{ height: 3, background: agent.gradient }} />

      {/* Body */}
      <div style={{ padding: 24, display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Avatar + codename */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
            {/* Spinning ring */}
            <div style={{
              position: "absolute", inset: -3,
              borderRadius: 17,
              background: `conic-gradient(${agent.color}, transparent, ${agent.color})`,
              animation: "spin 3s linear infinite",
            }} />
            <div style={{
              position: "absolute", inset: 0,
              background: agent.gradient,
              borderRadius: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24,
              zIndex: 1,
            }}>
              {agent.emoji}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--color-text-tertiary)", letterSpacing: "0.08em", marginBottom: 2 }}>
              {agent.codename}
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--color-text-primary)", lineHeight: 1.2 }}>
              {agent.name}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: agent.color, marginTop: 2 }}>
              {agent.role}
            </div>
          </div>
        </div>

        {/* Description */}
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.65, margin: "0 0 16px" }}>
          {agent.description}
        </p>

        {/* Capabilities */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          {agent.capabilities.map((cap, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-secondary)" }}>
              <span style={{ color: agent.color, fontWeight: 700 }}>✓</span>
              {cap}
            </div>
          ))}
        </div>

        {/* ROI badge */}
        <div style={{
          marginTop: 20,
          display: "inline-flex",
          padding: "6px 14px",
          borderRadius: 99,
          background: `${agent.color}12`,
          color: agent.color,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.02em",
        }}>
          {agent.roi}
        </div>
      </div>
    </div>
  );
}

export default function CortexPage() {
  const scrollToAgents = () => {
    const el = document.getElementById("agents");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes aurora1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(100px,-80px) scale(1.15)} 66%{transform:translate(-80px,100px) scale(0.88)} }
        @keyframes aurora2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-120px,80px) scale(1.2)} 66%{transform:translate(90px,-60px) scale(0.85)} }
        @keyframes aurora3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-80px,-60px) scale(1.25)} }
        @keyframes gradientShimmer { 0%{background-position:0% 50%} 100%{background-position:300% 50%} }
        @keyframes heroFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes badgePulse { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.5)} 50%{box-shadow:0 0 0 10px rgba(99,102,241,0)} }
        @keyframes dotPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.7);opacity:0.5} }
        @keyframes rowPulse { 0%,100%{background:rgba(99,102,241,0.04)} 50%{background:rgba(99,102,241,0.12)} }
        @keyframes gridBreathe { 0%,100%{opacity:0.5} 50%{opacity:0.8} }
        * { box-sizing: border-box; }
      ` }} />

      <div style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", background: "var(--color-background-primary)", color: "var(--color-text-primary)", minHeight: "100vh" }}>

        {/* ──────────── NAVBAR ──────────── */}
        <nav style={{
          position: "sticky", top: 0, zIndex: 100,
          background: "rgba(13,13,26,0.8)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {/* Logo */}
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
              <div style={{
                width: 36, height: 36,
                background: "linear-gradient(135deg,#14b8a6,#0d9488)",
                borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 900, fontSize: 18,
              }}>+</div>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
                Dental<span style={{ color: "#14b8a6" }}>IQ</span>
              </span>
            </Link>

            {/* Center nav */}
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              {[["Home", "/"], ["Pricing", "/pricing"], ["Features", "/#features"]].map(([label, href]) => (
                <Link key={label} href={href} style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", textDecoration: "none", transition: "color 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}>
                  {label}
                </Link>
              ))}
            </div>

            {/* Right */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <ThemeToggle storageKey="diq_pub_theme" variant="icon" />
              <Link href="/login" style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>Sign in</Link>
              <Link href="/signup" style={{
                fontSize: 14, fontWeight: 600, color: "#fff",
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                padding: "8px 18px", borderRadius: 8,
                textDecoration: "none",
                boxShadow: "0 0 20px rgba(99,102,241,0.4)",
              }}>
                Hire your first agent →
              </Link>
            </div>
          </div>
        </nav>

        {/* ──────────── HERO ──────────── */}
        <section style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg,#0d0d1a 0%,#130826 50%,#0d1a2e 100%)",
          position: "relative",
          overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {/* Aurora orbs */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: "15%", left: "10%", width: 600, height: 600, borderRadius: "50%", background: "rgba(99,102,241,0.25)", filter: "blur(100px)", animation: "aurora1 18s ease-in-out infinite" }} />
            <div style={{ position: "absolute", top: "50%", right: "8%", width: 500, height: 500, borderRadius: "50%", background: "rgba(139,92,246,0.18)", filter: "blur(90px)", animation: "aurora2 22s ease-in-out infinite" }} />
            <div style={{ position: "absolute", bottom: "10%", left: "35%", width: 400, height: 400, borderRadius: "50%", background: "rgba(67,56,202,0.15)", filter: "blur(80px)", animation: "aurora3 15s ease-in-out infinite" }} />
          </div>

          {/* Dot grid */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            animation: "gridBreathe 8s ease-in-out infinite",
          }} />

          {/* Content */}
          <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>
            {/* Badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 20px", borderRadius: 99,
              border: "1px solid rgba(99,102,241,0.5)",
              background: "rgba(99,102,241,0.1)",
              color: "rgba(255,255,255,0.9)",
              fontSize: 13, fontWeight: 600,
              marginBottom: 36,
              animation: "badgePulse 3s ease-in-out infinite",
            }}>
              🧠 DentalIQ Cortex Agents
            </div>

            {/* H1 */}
            <h1 style={{ fontSize: 80, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.05em", color: "#fff", margin: "0 0 28px" }}>
              Your clinic&apos;s<br />
              <span style={{
                background: "linear-gradient(135deg,#a78bfa,#6366f1,#38bdf8)",
                backgroundSize: "300% 300%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "gradientShimmer 4s linear infinite",
              }}>digital workforce.</span>
            </h1>

            {/* Subtext */}
            <p style={{ fontSize: 20, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, maxWidth: 620, margin: "0 auto 40px" }}>
              While your clinic sleeps, Cortex Agents scan claims, draft pre-authorizations, and secure your revenue. You wake up, review, and approve.
            </p>

            {/* Stat chips */}
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginBottom: 44 }}>
              {["6 Specialized Agents", "$76K avg recovered/year", "18+ hours saved/month"].map((stat) => (
                <div key={stat} style={{
                  padding: "10px 20px", borderRadius: 99,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.9)",
                  fontSize: 13, fontWeight: 600,
                }}>
                  {stat}
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              <Link href="/signup" style={{
                display: "inline-flex", alignItems: "center",
                padding: "14px 32px", borderRadius: 10,
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff", fontWeight: 700, fontSize: 15,
                textDecoration: "none",
                boxShadow: "0 0 30px rgba(99,102,241,0.5)",
                transition: "opacity 0.2s",
              }}>
                Start with Cortex →
              </Link>
              <button onClick={scrollToAgents} style={{
                display: "inline-flex", alignItems: "center",
                padding: "14px 32px", borderRadius: 10,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.35)",
                color: "#fff", fontWeight: 600, fontSize: 15,
                cursor: "pointer",
                transition: "background 0.2s",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                Meet the agents ↓
              </button>
            </div>
          </div>
        </section>

        {/* ──────────── WHY CORTEX ──────────── */}
        <section style={{ background: "var(--color-background-secondary)", padding: "100px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: 64 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "#ef4444", marginBottom: 16, textTransform: "uppercase" }}>
                  THE PROBLEM
                </div>
                <h2 style={{ fontSize: 48, fontWeight: 800, margin: 0, color: "var(--color-text-primary)", lineHeight: 1.15 }}>
                  Canadian clinics lose $76,000/year<br />to admin overhead.
                </h2>
              </div>
            </Reveal>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
              {[
                { emoji: "🛡️", title: "Prevent Denials", desc: "Cortex scans every procedure for CDCP and insurer-specific denial triggers before you submit.", accent: "#6366f1" },
                { emoji: "⏱️", title: "18+ Hours Reclaimed", desc: "Stop writing pre-auth letters manually. Cortex drafts them overnight while you sleep.", accent: "#8b5cf6" },
                { emoji: "💰", title: "Pay for Results", desc: "Every approved narrative prevents a denied claim. Outcome billing at $1.50/action only when it works.", accent: "#a78bfa" },
              ].map((card, i) => (
                <Reveal key={card.title} delay={i * 0.12}>
                  <WhyCard {...card} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ──────────── HOW IT WORKS ──────────── */}
        <section style={{ padding: "100px 24px", background: "var(--color-background-primary)" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: 72 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "#6366f1", marginBottom: 16, textTransform: "uppercase" }}>
                  HOW IT WORKS
                </div>
                <h2 style={{ fontSize: 48, fontWeight: 800, margin: 0, color: "var(--color-text-primary)" }}>
                  Three steps to autonomous operation.
                </h2>
              </div>
            </Reveal>

            <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 32 }}>
              {/* Connector line */}
              <div style={{
                position: "absolute", top: 52, left: "16.6%", right: "16.6%", height: 1,
                borderTop: "2px dotted var(--color-border-tertiary)",
              }} />

              {[
                { num: "01", icon: "⚡", title: "Deploy", desc: "Choose your agent, assign it to a clinic. Setup takes 2 minutes." },
                { num: "02", icon: "🤖", title: "Run", desc: "Agents work autonomously overnight, processing your clinic's data in isolation." },
                { num: "03", icon: "✅", title: "Review", desc: "Wake up to an approval inbox. One click to authorize each agent action." },
              ].map((step, i) => (
                <Reveal key={step.num} delay={i * 0.15}>
                  <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
                    <div style={{
                      width: 80, height: 80, borderRadius: "50%",
                      background: "var(--color-background-secondary)",
                      border: "2px solid var(--color-border-secondary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 32, margin: "0 auto 20px",
                    }}>
                      {step.icon}
                    </div>
                    <div style={{
                      fontSize: 52, fontWeight: 900, lineHeight: 1,
                      background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                      marginBottom: 12,
                    }}>
                      {step.num}
                    </div>
                    <h3 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 10px", color: "var(--color-text-primary)" }}>
                      {step.title}
                    </h3>
                    <p style={{ fontSize: 15, color: "var(--color-text-secondary)", lineHeight: 1.6, margin: 0, maxWidth: 260, marginLeft: "auto", marginRight: "auto" }}>
                      {step.desc}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ──────────── AGENT ROSTER ──────────── */}
        <section id="agents" style={{ padding: "100px 24px", background: "var(--color-background-secondary)", scrollMarginTop: 80 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: 60 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "#6366f1", marginBottom: 16, textTransform: "uppercase" }}>
                  THE ROSTER
                </div>
                <h2 style={{ fontSize: 48, fontWeight: 800, margin: "0 0 16px", color: "var(--color-text-primary)" }}>
                  Meet your Cortex Agents.
                </h2>
                <p style={{ fontSize: 18, color: "var(--color-text-secondary)", margin: 0, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
                  Six specialized agents, each built for a specific job in your clinic.
                </p>
              </div>
            </Reveal>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
              {AGENTS.map((agent, i) => (
                <Reveal key={agent.id} delay={i * 0.08}>
                  <AgentCard agent={agent} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ──────────── ACTIVITY FEED MOCKUP ──────────── */}
        <section style={{
          padding: "100px 24px",
          background: "linear-gradient(135deg,#0d0d1a 0%,#130826 50%,#0d1a2e 100%)",
          position: "relative", overflow: "hidden",
        }}>
          {/* Mini aurora */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: "20%", left: "5%", width: 400, height: 400, borderRadius: "50%", background: "rgba(99,102,241,0.15)", filter: "blur(80px)", animation: "aurora1 20s ease-in-out infinite" }} />
            <div style={{ position: "absolute", bottom: "10%", right: "10%", width: 350, height: 350, borderRadius: "50%", background: "rgba(139,92,246,0.12)", filter: "blur(70px)", animation: "aurora2 25s ease-in-out infinite" }} />
          </div>

          <div style={{ maxWidth: 800, margin: "0 auto", position: "relative", zIndex: 1, textAlign: "center" }}>
            <Reveal>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "#a78bfa", marginBottom: 16, textTransform: "uppercase" }}>
                COMMAND CENTER
              </div>
              <h2 style={{ fontSize: 48, fontWeight: 800, margin: "0 0 16px", color: "#fff" }}>
                Your agents, always working.
              </h2>
              <p style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", margin: "0 0 56px", lineHeight: 1.6 }}>
                Every action logged, reviewed, and approved on your schedule.
              </p>
            </Reveal>

            <Reveal delay={0.2}>
              {/* Floating card */}
              <div style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 20,
                overflow: "hidden",
                animation: "heroFloat 7s ease-in-out infinite",
                backdropFilter: "blur(20px)",
              }}>
                {/* Card header */}
                <div style={{
                  padding: "16px 24px",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>Cortex Command Center</span>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "4px 12px", borderRadius: 99,
                    background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)",
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", animation: "dotPulse 1.5s ease-in-out infinite" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", letterSpacing: "0.08em" }}>LIVE</span>
                  </div>
                </div>

                {/* Activity items */}
                <div>
                  {ACTIVITY_ITEMS.map((item, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 16,
                      padding: "14px 24px",
                      borderBottom: i < ACTIVITY_ITEMS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                      borderLeft: `3px solid ${item.color}`,
                      animation: item.waiting ? "rowPulse 2s ease-in-out infinite" : "none",
                    }}>
                      <span style={{ fontSize: 16, width: 20, textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.agent}</span>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}> · {item.action}</span>
                      </div>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>{item.time}</span>
                    </div>
                  ))}
                </div>

                {/* Card footer */}
                <div style={{ padding: "16px 24px" }}>
                  <Link href="/signup" style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "10px 24px", borderRadius: 8,
                    background: "linear-gradient(135deg,#14b8a6,#0d9488)",
                    color: "#fff", fontWeight: 700, fontSize: 14,
                    textDecoration: "none",
                    boxShadow: "0 0 20px rgba(20,184,166,0.3)",
                  }}>
                    Review &amp; Approve
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ──────────── PRICING ──────────── */}
        <section style={{ padding: "100px 24px", background: "var(--color-background-primary)" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: 72 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "#6366f1", marginBottom: 16, textTransform: "uppercase" }}>
                  PRICING
                </div>
                <h2 style={{ fontSize: 48, fontWeight: 800, margin: 0, color: "var(--color-text-primary)" }}>
                  Pay for results, not promises.
                </h2>
              </div>
            </Reveal>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }}>
              {/* Left: explanation */}
              <Reveal>
                <div>
                  <h3 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 24px", color: "var(--color-text-primary)" }}>
                    Simple, outcome-based pricing.
                  </h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    {[
                      { icon: "🏥", label: "$299/mo base", desc: "Includes 1 agent for 1 clinic, plus full Pro platform features." },
                      { icon: "📈", label: "Per-clinic scaling", desc: "Add additional agent instances at $99/mo per clinic — scale as you grow." },
                      { icon: "✅", label: "$1.50 per approved action", desc: "You only pay when your agents successfully deliver value. Zero action, zero charge." },
                    ].map((item) => (
                      <div key={item.label} style={{ display: "flex", gap: 16 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                          background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                        }}>
                          {item.icon}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--color-text-primary)", marginBottom: 4 }}>{item.label}</div>
                          <div style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{
                    marginTop: 40, padding: "20px 24px", borderRadius: 14,
                    background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
                  }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: "#a78bfa", margin: "0 0 8px" }}>
                      You only pay when agents deliver value.
                    </p>
                    <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.6 }}>
                      Every $1.50 action prevents a denied claim or recovers a lapsed patient. The math always works in your favor.
                    </p>
                  </div>
                </div>
              </Reveal>

              {/* Right: calculator card */}
              <Reveal delay={0.15}>
                <div style={{
                  background: "#0f0f1a",
                  border: "1px solid rgba(99,102,241,0.4)",
                  borderRadius: 20, overflow: "hidden",
                  boxShadow: "0 0 60px rgba(99,102,241,0.15)",
                }}>
                  {/* Card header */}
                  <div style={{
                    padding: "20px 28px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>
                      CORTEX PLAN
                    </span>
                    <div style={{
                      padding: "4px 10px", borderRadius: 99,
                      background: "rgba(99,102,241,0.2)",
                      fontSize: 11, fontWeight: 700, color: "#a78bfa",
                    }}>
                      MOST POPULAR
                    </div>
                  </div>

                  <div style={{ padding: "28px 28px 0" }}>
                    {/* Price */}
                    <div style={{ marginBottom: 28 }}>
                      <span style={{ fontSize: 60, fontWeight: 900, color: "#fff", lineHeight: 1 }}>$299</span>
                      <span style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", marginLeft: 6 }}>/month</span>
                    </div>

                    {/* Features */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                      {[
                        "1 Cortex Agent included",
                        "1 clinic workspace",
                        "Full Pro platform features",
                        "Overnight batch processing",
                        "Approval inbox",
                        "Priority support",
                        "14-day free trial",
                      ].map((feat) => (
                        <div key={feat} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "rgba(255,255,255,0.8)" }}>
                          <span style={{ color: "#8b5cf6", fontWeight: 700 }}>✓</span>
                          {feat}
                        </div>
                      ))}
                    </div>

                    {/* Divider */}
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginBottom: 24 }} />

                    {/* Per-clinic table */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
                        SCALING
                      </div>
                      {[
                        { label: "1st agent (1 clinic)", price: "Included" },
                        { label: "Additional instances", price: "$99/mo each" },
                        { label: "Per approved action", price: "$1.50" },
                      ].map((row) => (
                        <div key={row.label} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "8px 0",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          fontSize: 13,
                        }}>
                          <span style={{ color: "rgba(255,255,255,0.6)" }}>{row.label}</span>
                          <span style={{ color: "#a78bfa", fontWeight: 700 }}>{row.price}</span>
                        </div>
                      ))}
                    </div>

                    {/* Example calc */}
                    <div style={{
                      padding: "14px 18px", borderRadius: 10, marginBottom: 24,
                      background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
                      fontSize: 13, color: "rgba(255,255,255,0.7)",
                    }}>
                      <span style={{ color: "#a78bfa", fontWeight: 700 }}>Example: </span>
                      3 clinics + Billing Agent = $497/mo + usage
                    </div>
                  </div>

                  {/* CTA */}
                  <div style={{ padding: "0 28px 28px" }}>
                    <Link href="/signup" style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "14px", borderRadius: 10,
                      background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                      color: "#fff", fontWeight: 700, fontSize: 15,
                      textDecoration: "none",
                      boxShadow: "0 0 24px rgba(99,102,241,0.45)",
                    }}>
                      Start 14-day free trial →
                    </Link>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ──────────── CTA BANNER ──────────── */}
        <section style={{
          padding: "100px 24px",
          background: "linear-gradient(135deg,#2d1b6b,#4c1d95,#3730a3)",
          textAlign: "center",
        }}>
          <Reveal>
            <h2 style={{ fontSize: 48, fontWeight: 800, color: "#fff", margin: "0 0 16px" }}>
              Ready to hire your first digital employee?
            </h2>
            <p style={{ fontSize: 18, color: "rgba(255,255,255,0.7)", margin: "0 0 44px", maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}>
              Join Canadian dental clinics already running on Cortex. Start in minutes, see ROI overnight.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              <Link href="/signup" style={{
                padding: "14px 32px", borderRadius: 10,
                background: "#fff",
                color: "#4c1d95", fontWeight: 700, fontSize: 15,
                textDecoration: "none",
              }}>
                Start with Cortex →
              </Link>
              <Link href="/pricing" style={{
                padding: "14px 32px", borderRadius: 10,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.35)",
                color: "#fff", fontWeight: 600, fontSize: 15,
                textDecoration: "none",
              }}>
                View all pricing →
              </Link>
            </div>
          </Reveal>
        </section>

        {/* ──────────── FOOTER ──────────── */}
        <footer style={{
          background: "var(--color-background-secondary)",
          borderTop: "1px solid var(--color-border-secondary)",
          padding: "24px",
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>
              © 2025 DentalIQ Technologies Inc.
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <ThemeToggle storageKey="diq_pub_theme" variant="icon" />
              {[["Privacy", "/privacy"], ["Terms", "/terms"], ["Legal", "/legal"], ["Back to home", "/"]].map(([label, href]) => (
                <Link key={label} href={href} style={{ fontSize: 13, color: "var(--color-text-tertiary)", textDecoration: "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-tertiary)")}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

function WhyCard({ emoji, title, desc, accent }: { emoji: string; title: string; desc: string; accent: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "32px 28px",
        borderRadius: 18,
        background: "var(--color-background-primary)",
        border: `1px solid ${hovered ? accent : "var(--color-border-secondary)"}`,
        transform: hovered ? "translateY(-4px)" : "none",
        transition: "transform 0.3s ease,border-color 0.3s ease,box-shadow 0.3s ease",
        boxShadow: hovered ? `0 16px 48px ${accent}20` : "none",
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: `${accent}15`, border: `1px solid ${accent}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 26, marginBottom: 20,
      }}>
        {emoji}
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px", color: "var(--color-text-primary)" }}>
        {title}
      </h3>
      <p style={{ fontSize: 15, color: "var(--color-text-secondary)", lineHeight: 1.65, margin: 0 }}>
        {desc}
      </p>
    </div>
  );
}
