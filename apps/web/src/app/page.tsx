"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

// ─── CSS Keyframes ────────────────────────────────────────────────────────────
const CSS = `
  @keyframes aurora1 {
    0%,100% { transform:translate(0,0) scale(1); }
    33%      { transform:translate(90px,-70px) scale(1.12); }
    66%      { transform:translate(-70px,90px) scale(0.9); }
  }
  @keyframes aurora2 {
    0%,100% { transform:translate(0,0) scale(1); }
    33%      { transform:translate(-110px,70px) scale(1.18); }
    66%      { transform:translate(80px,-50px) scale(0.85); }
  }
  @keyframes aurora3 {
    0%,100% { transform:translate(0,0) scale(1); }
    50%      { transform:translate(-70px,-50px) scale(1.2); }
  }
  @keyframes gradientFlow {
    0%   { background-position: 0% 50%; }
    100% { background-position: 300% 50%; }
  }
  @keyframes heroFloat {
    0%,100% { transform:translateY(0px) rotate(-0.5deg); }
    50%      { transform:translateY(-16px) rotate(0.5deg); }
  }
  @keyframes floatR {
    0%,100% { transform:translateY(0) rotate(1.5deg); }
    50%      { transform:translateY(-12px) rotate(-1.5deg); }
  }
  @keyframes floatL {
    0%,100% { transform:translateY(0) rotate(-1.5deg); }
    50%      { transform:translateY(-14px) rotate(1.5deg); }
  }
  @keyframes scanLaser {
    0%   { top:0;    opacity:0; }
    5%   { opacity:1; }
    95%  { opacity:1; }
    100% { top:100%; opacity:0; }
  }
  @keyframes dotPulse {
    0%,100% { transform:scale(1);   opacity:1; }
    50%      { transform:scale(1.7); opacity:0.6; }
  }
  @keyframes badgePulse {
    0%,100% { box-shadow:0 0 0 0   rgba(13,148,136,0.45); }
    50%      { box-shadow:0 0 0 10px rgba(13,148,136,0); }
  }
  @keyframes spin {
    from { transform:rotate(0deg); }
    to   { transform:rotate(360deg); }
  }
  @keyframes marquee {
    0%   { transform:translateX(0); }
    100% { transform:translateX(-50%); }
  }
  @keyframes progressGrow {
    from { width:0; }
    to   { width:92%; }
  }
  @keyframes beamSweep {
    0%   { left:-60%; }
    100% { left:160%; }
  }
  @keyframes gridBreathe {
    0%,100% { opacity:0.4; }
    50%      { opacity:0.7; }
  }
  @keyframes ringPop {
    0%  { transform:scale(0.8); opacity:0; }
    60% { transform:scale(1.05); }
    100%{ transform:scale(1);   opacity:1; }
  }
`;

// ─── Scroll-reveal wrapper ────────────────────────────────────────────────────
function Reveal({
  children,
  delay = 0,
  y = 36,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
}) {
  const [on, setOn] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setOn(true); io.unobserve(e.target); } },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
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
        transition: `opacity 0.75s ease ${delay}s, transform 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Count-up number ─────────────────────────────────────────────────────────
function CountUp({
  to,
  display,
}: {
  to: number;
  display: (n: number) => string;
}) {
  const [val, setVal] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setStarted(true); io.unobserve(e.target); } },
      { threshold: 0.5 }
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!started) return;
    let start: number | null = null;
    const dur = 2000;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * to));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, to]);
  return <span ref={ref}>{display(val)}</span>;
}

// ─── 3-D tilt card ────────────────────────────────────────────────────────────
function TiltCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, active: false });
  const move = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current!.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    setT({ rx: (y - 0.5) * 16, ry: (x - 0.5) * -16, gx: x * 100, gy: y * 100, active: true });
  };
  const leave = () => setT({ rx: 0, ry: 0, gx: 50, gy: 50, active: false });
  return (
    <div
      ref={ref}
      onMouseMove={move}
      onMouseLeave={leave}
      style={{
        transform: `perspective(900px) rotateX(${t.rx}deg) rotateY(${t.ry}deg)`,
        transition: "transform 0.12s ease",
        transformStyle: "preserve-3d",
        position: "relative",
        ...style,
      }}
    >
      {/* light sheen on tilt */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none", zIndex: 2,
        background: `radial-gradient(circle at ${t.gx}% ${t.gy}%, rgba(255,255,255,0.07), transparent 55%)`,
        opacity: t.active ? 1 : 0, transition: "opacity 0.3s",
      }} />
      {children}
    </div>
  );
}

// ─── Data ────────────────────────────────────────────────────────────────────
const NAV = [
  { label: "Home",         href: "/" },
  { label: "Why Us",       href: "#why-us" },
  { label: "Features",     href: "#features" },
  { label: "Cortex AI",    href: "/cortex" },
  { label: "Pricing",      href: "/pricing" },
];

const INSURERS = [
  "Sun Life Financial","Manulife","Canada Life","CDCP",
  "Green Shield","Desjardins","Equitable Life","Pacific Blue Cross",
  "Industrial Alliance","Chambers of Commerce","Johnston Group",
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [scrollY, setScrollY] = useState(0);
  const [mouse,   setMouse]   = useState({ x: -2000, y: -2000 });
  const [activeNav, setActiveNav] = useState("Home");

  useEffect(() => {
    const onS = () => setScrollY(window.scrollY);
    const onM = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("scroll", onS, { passive: true });
    window.addEventListener("mousemove", onM, { passive: true });
    return () => { window.removeEventListener("scroll", onS); window.removeEventListener("mousemove", onM); };
  }, []);

  const navBg = scrollY > 24;

  return (
    <div style={{ background: "var(--color-background-primary)", color: "var(--color-text-primary)", overflowX: "hidden", minHeight: "100vh" }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ── Cursor glow ── */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `radial-gradient(700px circle at ${mouse.x}px ${mouse.y}px, rgba(15,118,110,0.07), transparent 80%)`,
        opacity: scrollY < 1200 ? 1 : 0, transition: "opacity 0.6s",
      }} />

      {/* ══════════════════════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════════════════════ */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 48px", height: 72,
        background: navBg ? "rgba(var(--color-bg-nav, 10,15,30), 0.85)" : "transparent",
        backdropFilter: navBg ? "blur(20px) saturate(180%)" : "none",
        borderBottom: navBg ? "1px solid var(--color-border-secondary)" : "1px solid transparent",
        transition: "all 0.4s ease",
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #0f766e, #0d9488)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: 20,
            boxShadow: "0 0 20px rgba(15,118,110,0.55)",
          }}>+</div>
          <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--color-text-primary)" }}>
            Dental<span style={{ color: "#0d9488" }}>IQ</span>
          </span>
        </Link>

        {/* Nav pills */}
        <nav style={{
          display: "flex", gap: 4,
          background: "var(--color-background-secondary)",
          border: "1px solid var(--color-border-secondary)",
          borderRadius: 100, padding: 5,
        }}>
          {NAV.map(l => (
            <Link key={l.label} href={l.href} onClick={() => setActiveNav(l.label)} style={{
              padding: "7px 20px", borderRadius: 100, fontSize: 14, fontWeight: 600,
              textDecoration: "none",
              color:      activeNav === l.label ? "#fff" : "var(--color-text-secondary)",
              background: activeNav === l.label ? "linear-gradient(135deg,#0f766e,#0d9488)" : "transparent",
              boxShadow:  activeNav === l.label ? "0 4px 14px rgba(15,118,110,0.4)" : "none",
              transition: "all 0.22s",
            }}>{l.label}</Link>
          ))}
        </nav>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ThemeToggle storageKey="diq_pub_theme" variant="icon" />
          <Link href="/login" style={{ padding: "9px 18px", borderRadius: 100, fontSize: 14, fontWeight: 600, color: "var(--color-text-secondary)", textDecoration: "none" }}>Sign In</Link>
          <Link href="/signup" style={{
            padding: "9px 22px", borderRadius: 100, fontSize: 14, fontWeight: 700,
            background: "linear-gradient(135deg,#0f766e,#0d9488)", color: "#fff", textDecoration: "none",
            boxShadow: "0 4px 18px rgba(15,118,110,0.45)", transition: "all 0.25s",
          }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform="translateY(-2px)"; el.style.boxShadow="0 8px 28px rgba(15,118,110,0.55)"; }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform="none"; el.style.boxShadow="0 4px 18px rgba(15,118,110,0.45)"; }}
          >Get Started</Link>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════ */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "140px 24px 100px", overflow: "hidden" }}>

        {/* Aurora orbs */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          <div style={{ position:"absolute", top:"-15%", left:"-8%",  width:700, height:700, borderRadius:"50%", background:"radial-gradient(circle, rgba(15,118,110,0.22) 0%, transparent 70%)", filter:"blur(64px)", animation:"aurora1 20s ease-in-out infinite" }} />
          <div style={{ position:"absolute", top:"25%",  right:"-18%", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)", filter:"blur(80px)", animation:"aurora2 26s ease-in-out infinite" }} />
          <div style={{ position:"absolute", bottom:"-12%", left:"18%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 70%)", filter:"blur(64px)", animation:"aurora3 17s ease-in-out infinite" }} />
          {/* Dot grid */}
          <div style={{
            position:"absolute", inset:0,
            backgroundImage:"radial-gradient(circle, var(--color-border-secondary) 1px, transparent 1px)",
            backgroundSize:"36px 36px", animation:"gridBreathe 8s ease-in-out infinite",
            maskImage:"radial-gradient(ellipse 85% 70% at 50% 50%, black 20%, transparent 100%)",
            WebkitMaskImage:"radial-gradient(ellipse 85% 70% at 50% 50%, black 20%, transparent 100%)",
          }} />
        </div>

        <div style={{ position:"relative", zIndex:1, maxWidth:1000, width:"100%", textAlign:"center" }}>

          {/* Badge */}
          <Reveal delay={0}>
            <div style={{
              display:"inline-flex", alignItems:"center", gap:8, marginBottom:36,
              padding:"8px 20px", borderRadius:100,
              background:"rgba(15,118,110,0.1)", border:"1px solid rgba(15,118,110,0.3)",
              fontSize:13, fontWeight:700, color:"#0d9488",
              animation:"badgePulse 3.5s ease-in-out infinite",
            }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#0d9488", animation:"dotPulse 2s ease-in-out infinite" }} />
              🇨🇦&nbsp; Built exclusively for Canadian Dental Clinics
            </div>
          </Reveal>

          {/* Headline */}
          <Reveal delay={0.1} y={56}>
            <h1 style={{ fontSize:"clamp(46px,7vw,88px)", fontWeight:900, lineHeight:1.01, letterSpacing:"-0.046em", marginBottom:28 }}>
              <span style={{
                background:"linear-gradient(135deg, var(--color-text-primary) 0%, var(--color-text-primary) 35%, #0d9488 55%, #5eead4 72%, var(--color-text-primary) 90%)",
                backgroundSize:"300% auto",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                backgroundClip:"text",
                animation:"gradientFlow 7s linear infinite",
                display:"block",
              }}>Stop losing revenue</span>
              <span style={{ color:"var(--color-text-primary)", display:"block" }}>to claim denials.</span>
            </h1>
          </Reveal>

          {/* Sub */}
          <Reveal delay={0.2}>
            <p style={{ fontSize:20, color:"var(--color-text-secondary)", lineHeight:1.7, maxWidth:680, margin:"0 auto 52px" }}>
              DentalIQ is the only practice platform with{" "}
              <strong style={{ color:"var(--color-text-primary)", fontWeight:700 }}>autonomous AI agents</strong>{" "}
              that predict claim denials, handle CDCP complexities, and draft pre-authorizations in seconds.
            </p>
          </Reveal>

          {/* CTAs */}
          <Reveal delay={0.3}>
            <div style={{ display:"flex", gap:16, justifyContent:"center", flexWrap:"wrap", marginBottom:88 }}>
              <Link href="/signup" style={{
                padding:"16px 38px", borderRadius:100, fontSize:16, fontWeight:700,
                background:"linear-gradient(135deg,#0f766e,#0d9488,#14b8a6)", backgroundSize:"200% auto",
                color:"#fff", textDecoration:"none",
                boxShadow:"0 8px 32px rgba(15,118,110,0.5)", transition:"all 0.3s ease",
                display:"flex", alignItems:"center", gap:8,
              }}
              onMouseEnter={e => { const el=e.currentTarget as HTMLAnchorElement; el.style.transform="translateY(-3px) scale(1.02)"; el.style.boxShadow="0 18px 50px rgba(15,118,110,0.58)"; el.style.backgroundPosition="right center"; }}
              onMouseLeave={e => { const el=e.currentTarget as HTMLAnchorElement; el.style.transform="none"; el.style.boxShadow="0 8px 32px rgba(15,118,110,0.5)"; el.style.backgroundPosition="left center"; }}
              >
                Start Free Trial
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
              <Link href="/demo/pro" style={{
                padding:"16px 38px", borderRadius:100, fontSize:16, fontWeight:700,
                background:"transparent", color:"var(--color-text-primary)", textDecoration:"none",
                border:"1.5px solid var(--color-border-primary)", transition:"all 0.25s ease",
                display:"flex", alignItems:"center", gap:8,
              }}
              onMouseEnter={e => { const el=e.currentTarget as HTMLAnchorElement; el.style.borderColor="#0d9488"; el.style.color="#0d9488"; el.style.transform="translateY(-2px)"; }}
              onMouseLeave={e => { const el=e.currentTarget as HTMLAnchorElement; el.style.borderColor="var(--color-border-primary)"; el.style.color="var(--color-text-primary)"; el.style.transform="none"; }}
              >
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Watch Demo
              </Link>
            </div>
          </Reveal>

          {/* Floating hero UI card */}
          <Reveal delay={0.45} y={70}>
            <div style={{ position:"relative", display:"inline-block", width:"100%", maxWidth:820 }}>

              {/* Main card */}
              <div style={{
                background:"var(--color-background-secondary)",
                border:"1px solid var(--color-border-secondary)",
                borderRadius:24, padding:28,
                boxShadow:"0 40px 100px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.04)",
                animation:"heroFloat 7s ease-in-out infinite",
                textAlign:"left", position:"relative", overflow:"hidden",
              }}>
                {/* Scan laser */}
                <div style={{
                  position:"absolute", left:0, width:"100%", height:"1.5px",
                  background:"linear-gradient(90deg, transparent, #0d9488, transparent)",
                  boxShadow:"0 0 14px #0d9488",
                  animation:"scanLaser 4.5s ease-in-out infinite",
                  pointerEvents:"none",
                }} />
                {/* Beam sweep */}
                <div style={{
                  position:"absolute", top:0, width:"40%", height:"100%", pointerEvents:"none",
                  background:"linear-gradient(90deg, transparent, rgba(255,255,255,0.025), transparent)",
                  animation:"beamSweep 5s ease-in-out infinite 1s",
                }} />

                {/* Mini stat row */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:18 }}>
                  {[
                    { label:"Revenue Protected", value:"$48,200", change:"+12.4%", pos:true },
                    { label:"Claim Approval Rate", value:"97.3%",  change:"+8.1%",  pos:true },
                    { label:"Pre-Auths Drafted",   value:"143",    change:"This month", pos:null },
                  ].map((s,i)=>(
                    <div key={i} style={{
                      background:"var(--color-background-primary)", borderRadius:14,
                      padding:"14px 16px", border:"1px solid var(--color-border-secondary)",
                    }}>
                      <div style={{ fontSize:11, color:"var(--color-text-secondary)", marginBottom:6, fontWeight:600 }}>{s.label}</div>
                      <div style={{ fontSize:22, fontWeight:900, letterSpacing:"-0.03em", color:"var(--color-text-primary)", marginBottom:4 }}>{s.value}</div>
                      <div style={{ fontSize:11, fontWeight:700, color: s.pos===true ? "#10b981" : s.pos===null ? "var(--color-text-secondary)" : "#ef4444" }}>{s.change}</div>
                    </div>
                  ))}
                </div>

                {/* Claim risk alert */}
                <div style={{
                  background:"var(--color-background-primary)", borderRadius:14,
                  padding:"14px 18px", border:"1px solid var(--color-border-secondary)",
                  display:"flex", alignItems:"center", justifyContent:"space-between",
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:"rgba(239,68,68,0.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <svg width="18" height="18" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14, color:"var(--color-text-primary)" }}>D2750 · PFM Crown · Manulife</div>
                      <div style={{ fontSize:12, color:"var(--color-text-secondary)" }}>Missing narrative · Pre-op X-Ray required</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
                    <span style={{ padding:"4px 12px", borderRadius:100, fontSize:11, fontWeight:700, background:"rgba(239,68,68,0.1)", color:"#ef4444" }}>HIGH RISK</span>
                    <button style={{ padding:"7px 16px", borderRadius:9, fontSize:12, fontWeight:700, background:"linear-gradient(135deg,#0f766e,#0d9488)", color:"#fff", border:"none", cursor:"pointer" }}>Fix →</button>
                  </div>
                </div>
              </div>

              {/* Floating pill – top right */}
              <div style={{
                position:"absolute", top:-18, right:-24,
                background:"var(--color-background-primary)",
                border:"1px solid var(--color-border-secondary)",
                borderRadius:14, padding:"10px 16px",
                boxShadow:"0 16px 40px rgba(0,0,0,0.2)",
                animation:"floatR 5.5s ease-in-out infinite",
                display:"flex", alignItems:"center", gap:8, whiteSpace:"nowrap",
              }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:"#10b981", animation:"dotPulse 2s infinite" }} />
                <span style={{ fontSize:12, fontWeight:700, color:"var(--color-text-primary)" }}>Claim approved · $1,240</span>
              </div>

              {/* Floating pill – bottom left */}
              <div style={{
                position:"absolute", bottom:-18, left:-24,
                background:"var(--color-background-primary)",
                border:"1px solid var(--color-border-secondary)",
                borderRadius:14, padding:"10px 16px",
                boxShadow:"0 16px 40px rgba(0,0,0,0.2)",
                animation:"floatL 7s ease-in-out infinite 0.8s",
                display:"flex", alignItems:"center", gap:8, whiteSpace:"nowrap",
              }}>
                <div style={{ width:24, height:24, borderRadius:7, background:"rgba(139,92,246,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>🤖</div>
                <span style={{ fontSize:12, fontWeight:700, color:"var(--color-text-primary)" }}>Billing Agent · Pre-auth drafted</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          INSURER TRUST BAR
      ══════════════════════════════════════════════════════════ */}
      <div style={{ padding:"32px 0", borderTop:"1px solid var(--color-border-secondary)", borderBottom:"1px solid var(--color-border-secondary)", background:"var(--color-background-secondary)", overflow:"hidden", position:"relative" }}>
        <div style={{ position:"absolute", top:0, left:0,  width:140, height:"100%", background:"linear-gradient(90deg, var(--color-background-secondary), transparent)", zIndex:2 }} />
        <div style={{ position:"absolute", top:0, right:0, width:140, height:"100%", background:"linear-gradient(-90deg, var(--color-background-secondary), transparent)", zIndex:2 }} />
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--color-text-tertiary)", textAlign:"center", marginBottom:20 }}>
          Integrated with all major Canadian insurers
        </div>
        <div style={{ display:"flex", width:"max-content", animation:"marquee 38s linear infinite" }}>
          {[...INSURERS, ...INSURERS].map((ins,i)=>(
            <div key={i} style={{ padding:"0 52px", fontSize:14, fontWeight:700, color:"var(--color-text-tertiary)", flexShrink:0, whiteSpace:"nowrap" }}>{ins}</div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          STATS
      ══════════════════════════════════════════════════════════ */}
      <section style={{ padding:"110px 24px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <Reveal>
            <div style={{ textAlign:"center", marginBottom:64 }}>
              <p style={{ fontSize:12, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"#0d9488", marginBottom:14 }}>By the Numbers</p>
              <h2 style={{ fontSize:"clamp(34px,4vw,50px)", fontWeight:900, letterSpacing:"-0.04em", color:"var(--color-text-primary)" }}>Results that matter.</h2>
            </div>
          </Reveal>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:1, background:"var(--color-border-secondary)", border:"1px solid var(--color-border-secondary)", borderRadius:24, overflow:"hidden" }}>
            {[
              { to:97,      display:(n:number)=>`${n}%`,           label:"Claim approval rate",    sub:"vs. industry avg of 89%" },
              { to:24,      display:(n:number)=>`$${(n/10).toFixed(1)}M+`, label:"Revenue protected", sub:"Across all DentalIQ clinics" },
              { to:340,     display:(n:number)=>`${n}+`,           label:"Canadian clinics",       sub:"And growing every month" },
            ].map((s,i)=>(
              <Reveal key={i} delay={i*0.14}>
                <div style={{ padding:"56px 32px", background:"var(--color-background-primary)", textAlign:"center" }}>
                  <div style={{
                    fontSize:"clamp(44px,5vw,64px)", fontWeight:900, letterSpacing:"-0.04em",
                    background:"linear-gradient(135deg,#0f766e,#14b8a6)",
                    WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
                    marginBottom:10,
                  }}>
                    <CountUp to={s.to} display={s.display} />
                  </div>
                  <div style={{ fontSize:17, fontWeight:700, color:"var(--color-text-primary)", marginBottom:6 }}>{s.label}</div>
                  <div style={{ fontSize:13, color:"var(--color-text-secondary)" }}>{s.sub}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          WHY US — PROBLEM / SOLUTION
      ══════════════════════════════════════════════════════════ */}
      <section id="why-us" style={{ padding:"110px 24px", background:"var(--color-background-secondary)", borderTop:"1px solid var(--color-border-secondary)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <Reveal>
            <div style={{ textAlign:"center", marginBottom:72 }}>
              <p style={{ fontSize:12, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"#ef4444", marginBottom:14 }}>The Canadian Dental Crisis</p>
              <h2 style={{ fontSize:"clamp(32px,4vw,50px)", fontWeight:900, letterSpacing:"-0.04em", color:"var(--color-text-primary)", lineHeight:1.1, marginBottom:18 }}>Your PMS is holding you back.</h2>
              <p style={{ fontSize:18, color:"var(--color-text-secondary)", maxWidth:580, margin:"0 auto" }}>
                Legacy software was built before CDCP existed. Your team spends hours on admin work that should take seconds.
              </p>
            </div>
          </Reveal>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))", gap:24 }}>
            {[
              {
                icon:"⚡", accent:"#f59e0b",
                pain:"CDCP Confusion",
                before:"Staff spending hours manually checking CDCP coverage limits and exclusions.",
                after:"Real-time CDCP integration flags uncovered codes before the patient sits in the chair.",
              },
              {
                icon:"📄", accent:"#0d9488",
                pain:"Manual Pre-Auths",
                before:"Dentists writing pre-auth narratives at home, after clinic hours, for every major procedure.",
                after:"AI drafts a perfect narrative in 3 seconds from your charting. Just review and click submit.",
              },
              {
                icon:"💸", accent:"#6366f1",
                pain:"Claim Denials",
                before:"Losing 8–12% of revenue to coding errors, frequency limits, and missing documentation.",
                after:"Predictive risk detection intercepts problem claims before submission and guides the fix.",
              },
            ].map((c,i)=>(
              <Reveal key={i} delay={i*0.12}>
                <TiltCard style={{ height:"100%" }}>
                  <div style={{
                    background:"var(--color-background-primary)", borderRadius:22,
                    border:"1px solid var(--color-border-secondary)",
                    boxShadow:"var(--shadow-sm)", overflow:"hidden", height:"100%",
                    display:"flex", flexDirection:"column",
                  }}>
                    <div style={{ padding:"28px 28px 20px" }}>
                      <div style={{ fontSize:28, marginBottom:14 }}>{c.icon}</div>
                      <h3 style={{ fontSize:21, fontWeight:800, letterSpacing:"-0.03em", color:"var(--color-text-primary)" }}>{c.pain}</h3>
                    </div>
                    <div style={{ height:1, background:"var(--color-border-secondary)", margin:"0 28px" }} />
                    <div style={{ padding:"18px 28px 18px" }}>
                      <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"#ef4444", marginBottom:8 }}>❌ Before DentalIQ</div>
                      <p style={{ fontSize:14, color:"var(--color-text-secondary)", lineHeight:1.65, margin:0 }}>{c.before}</p>
                    </div>
                    <div style={{ height:1, background:"var(--color-border-secondary)", margin:"0 28px" }} />
                    <div style={{ padding:"18px 28px 28px", flex:1 }}>
                      <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"#10b981", marginBottom:8 }}>✓ With DentalIQ</div>
                      <p style={{ fontSize:14, color:"var(--color-text-primary)", fontWeight:500, lineHeight:1.65, margin:0 }}>{c.after}</p>
                    </div>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FEATURES — BENTO GRID
      ══════════════════════════════════════════════════════════ */}
      <section id="features" style={{ padding:"110px 24px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <Reveal>
            <div style={{ textAlign:"center", marginBottom:72 }}>
              <p style={{ fontSize:12, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"#0d9488", marginBottom:14 }}>Features</p>
              <h2 style={{ fontSize:"clamp(32px,4vw,50px)", fontWeight:900, letterSpacing:"-0.04em", color:"var(--color-text-primary)" }}>Built different, by design.</h2>
            </div>
          </Reveal>

          {/* Row 1 — 7/5 split */}
          <div style={{ display:"grid", gridTemplateColumns:"7fr 5fr", gap:20, marginBottom:20 }}>

            {/* Feature A — Claim Risk Detection */}
            <Reveal delay={0.1}>
              <TiltCard style={{ height:"100%" }}>
                <div style={{ background:"var(--color-background-secondary)", borderRadius:24, border:"1px solid var(--color-border-secondary)", overflow:"hidden", height:"100%", display:"flex", flexDirection:"column" }}>
                  <div style={{ padding:"36px 36px 0" }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:"rgba(15,118,110,0.1)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
                      <svg width="22" height="22" fill="none" stroke="#0d9488" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    </div>
                    <h3 style={{ fontSize:24, fontWeight:800, letterSpacing:"-0.03em", color:"var(--color-text-primary)", marginBottom:10 }}>Insurance Risk Detection</h3>
                    <p style={{ fontSize:15, color:"var(--color-text-secondary)", lineHeight:1.65, marginBottom:28 }}>
                      Our AI analyzes every claim against insurer-specific rules, CDT frequencies, and patient history in real-time. Stop surprises at remittance time.
                    </p>
                  </div>
                  {/* Animated claim table */}
                  <div style={{ padding:"0 24px 28px", flex:1 }}>
                    <div style={{ background:"var(--color-background-primary)", borderRadius:16, border:"1px solid var(--color-border-secondary)", padding:20, position:"relative", overflow:"hidden" }}>
                      <div style={{ position:"absolute", left:0, width:"100%", height:"1.5px", background:"linear-gradient(90deg,transparent,#0d9488,transparent)", boxShadow:"0 0 10px #0d9488", animation:"scanLaser 4s ease-in-out infinite", pointerEvents:"none" }} />
                      {[
                        { code:"D0330", desc:"Panoramic X-Ray",      risk:"low",    cov:85, ins:"Sun Life" },
                        { code:"D2750", desc:"Crown, PFM",           risk:"high",   cov:0,  ins:"Manulife" },
                        { code:"D4341", desc:"Scaling & Root Planing",risk:"medium", cov:60, ins:"Canada Life" },
                      ].map((r,i)=>(
                        <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 0", borderBottom: i<2 ? "1px solid var(--color-border-tertiary)" : "none" }}>
                          <div>
                            <div style={{ fontWeight:700, fontSize:13, color:"var(--color-text-primary)" }}>{r.code} · {r.desc}</div>
                            <div style={{ fontSize:11, color:"var(--color-text-secondary)" }}>{r.ins}</div>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:"var(--color-text-secondary)" }}>Cov: {r.cov}%</div>
                            <span style={{
                              padding:"3px 11px", borderRadius:100, fontSize:10, fontWeight:700, textTransform:"uppercase",
                              background: r.risk==="low" ? "rgba(16,185,129,0.1)" : r.risk==="medium" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                              color:       r.risk==="low" ? "#10b981"              : r.risk==="medium" ? "#f59e0b"              : "#ef4444",
                            }}>{r.risk}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TiltCard>
            </Reveal>

            {/* Right column – 2 stacked cards */}
            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
              <Reveal delay={0.2}>
                <TiltCard>
                  <div style={{
                    background:"linear-gradient(135deg, rgba(15,118,110,0.07), rgba(20,184,166,0.04))",
                    borderRadius:24, border:"1px solid rgba(15,118,110,0.22)", padding:30,
                    position:"relative", overflow:"hidden",
                  }}>
                    <div style={{ position:"absolute", top:-50, right:-50, width:140, height:140, borderRadius:"50%", background:"radial-gradient(circle, rgba(15,118,110,0.22), transparent)", filter:"blur(24px)" }} />
                    <div style={{ width:42, height:42, borderRadius:12, background:"rgba(15,118,110,0.12)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
                      <svg width="20" height="20" fill="none" stroke="#0d9488" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    </div>
                    <h3 style={{ fontSize:19, fontWeight:800, letterSpacing:"-0.03em", color:"var(--color-text-primary)", marginBottom:8 }}>AI Pre-Auth Drafting</h3>
                    <p style={{ fontSize:14, color:"var(--color-text-secondary)", lineHeight:1.65, margin:"0 0 18px" }}>Complete pre-authorization narratives generated in 3 seconds from your clinical notes.</p>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ flex:1, height:5, borderRadius:100, background:"var(--color-border-secondary)", overflow:"hidden" }}>
                        <div style={{ height:"100%", borderRadius:100, background:"linear-gradient(90deg,#0f766e,#14b8a6)", animation:"progressGrow 2.2s cubic-bezier(0.16,1,0.3,1) 0.8s both" }} />
                      </div>
                      <span style={{ fontSize:12, fontWeight:700, color:"#0d9488", whiteSpace:"nowrap" }}>92% accepted</span>
                    </div>
                  </div>
                </TiltCard>
              </Reveal>

              <Reveal delay={0.32}>
                <TiltCard>
                  <div style={{
                    background:"linear-gradient(135deg, rgba(99,102,241,0.07), rgba(139,92,246,0.04))",
                    borderRadius:24, border:"1px solid rgba(99,102,241,0.22)", padding:30,
                    position:"relative", overflow:"hidden",
                  }}>
                    <div style={{ position:"absolute", top:-50, right:-50, width:140, height:140, borderRadius:"50%", background:"radial-gradient(circle, rgba(99,102,241,0.22), transparent)", filter:"blur(24px)" }} />
                    <div style={{ width:42, height:42, borderRadius:12, background:"rgba(99,102,241,0.1)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
                      <svg width="20" height="20" fill="none" stroke="#6366f1" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                    </div>
                    <h3 style={{ fontSize:19, fontWeight:800, letterSpacing:"-0.03em", color:"var(--color-text-primary)", marginBottom:8 }}>PHIPA-Compliant Local AI</h3>
                    <p style={{ fontSize:14, color:"var(--color-text-secondary)", lineHeight:1.65, margin:"0 0 18px" }}>Patient data stays in Canada. Run AI locally with Ollama — zero PHI ever leaves your server.</p>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {["AWS ca-central-1","PIPEDA","PHIPA DPA","SOC 2"].map(t=>(
                        <span key={t} style={{ padding:"3px 11px", borderRadius:100, fontSize:11, fontWeight:600, background:"rgba(99,102,241,0.1)", color:"#6366f1" }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </TiltCard>
              </Reveal>
            </div>
          </div>

          {/* Row 2 — 3 equal */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20 }}>
            {[
              {
                color:"#f59e0b", bg:"rgba(245,158,11,0.07)", border:"rgba(245,158,11,0.2)",
                icon:<svg width="22" height="22" fill="none" stroke="#f59e0b" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
                title:"Multi-Location Analytics",
                body:"Revenue, claim rates, and agent activity across every clinic in one unified dashboard.",
              },
              {
                color:"#10b981", bg:"rgba(16,185,129,0.07)", border:"rgba(16,185,129,0.2)",
                icon:<svg width="22" height="22" fill="none" stroke="#10b981" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
                title:"Team Role Management",
                body:"Granular permissions for admin, dentist, and front-desk roles. Keep data relevant and secure.",
              },
              {
                color:"#0ea5e9", bg:"rgba(14,165,233,0.07)", border:"rgba(14,165,233,0.2)",
                icon:<svg width="22" height="22" fill="none" stroke="#0ea5e9" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
                title:"Real-Time CDCP Integration",
                body:"Always-current CDCP coverage rules built in. No manual lookups. No chair-side surprises.",
              },
            ].map((f,i)=>(
              <Reveal key={i} delay={i*0.1}>
                <TiltCard style={{ height:"100%" }}>
                  <div style={{ background:f.bg, borderRadius:22, border:`1px solid ${f.border}`, padding:26, height:"100%" }}>
                    <div style={{ width:42, height:42, borderRadius:12, background:"rgba(255,255,255,0.04)", border:`1px solid ${f.border}`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>{f.icon}</div>
                    <h3 style={{ fontSize:17, fontWeight:800, letterSpacing:"-0.02em", color:"var(--color-text-primary)", marginBottom:10 }}>{f.title}</h3>
                    <p style={{ fontSize:14, color:"var(--color-text-secondary)", lineHeight:1.65, margin:0 }}>{f.body}</p>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          CORTEX AGENTS
      ══════════════════════════════════════════════════════════ */}
      <section style={{ padding:"110px 24px", background:"var(--color-background-secondary)", borderTop:"1px solid var(--color-border-secondary)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1fr", gap:80, alignItems:"center" }}>

          <Reveal>
            <p style={{ fontSize:12, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"#8b5cf6", marginBottom:16 }}>Cortex Agents</p>
            <h2 style={{ fontSize:"clamp(32px,4vw,50px)", fontWeight:900, letterSpacing:"-0.04em", color:"var(--color-text-primary)", lineHeight:1.08, marginBottom:20 }}>
              Hire your first<br/>AI employee.
            </h2>
            <p style={{ fontSize:18, color:"var(--color-text-secondary)", lineHeight:1.7, marginBottom:36 }}>
              Cortex Agents are autonomous workers that live inside DentalIQ. They work overnight, never call in sick, and log every action they take.
            </p>
            <Link href="/cortex" style={{
              display:"inline-flex", alignItems:"center", gap:8,
              padding:"14px 30px", borderRadius:100,
              background:"linear-gradient(135deg,#7c3aed,#8b5cf6)", color:"#fff", textDecoration:"none",
              fontSize:15, fontWeight:700,
              boxShadow:"0 8px 28px rgba(124,58,237,0.45)", transition:"all 0.25s",
            }}
            onMouseEnter={e=>{const el=e.currentTarget as HTMLAnchorElement;el.style.transform="translateY(-2px)";el.style.boxShadow="0 16px 40px rgba(124,58,237,0.55)";}}
            onMouseLeave={e=>{const el=e.currentTarget as HTMLAnchorElement;el.style.transform="none";el.style.boxShadow="0 8px 28px rgba(124,58,237,0.45)";}}
            >
              Explore Cortex
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </Reveal>

          <Reveal delay={0.2}>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {[
                { name:"Billing Agent",     task:"Analyzing D2750 pre-auth requirements…", color:"#8b5cf6", result:"3 narratives drafted" },
                { name:"Recall Agent",      task:"Scanning 47 overdue recall appointments…", color:"#0ea5e9", result:"12 patients re-booked" },
                { name:"Supply Agent",      task:"Comparing glove pricing across vendors…",  color:"#10b981", result:"Saved $340 this month" },
                { name:"Compliance Agent",  task:"Reviewing CDCP claim bundle integrity…",   color:"#f59e0b", result:"No violations found" },
              ].map((a,i)=>(
                <TiltCard key={i}>
                  <div style={{
                    background:"var(--color-background-primary)", borderRadius:18,
                    border:"1px solid var(--color-border-secondary)",
                    padding:"15px 18px", display:"flex", alignItems:"center", gap:14,
                    boxShadow:"var(--shadow-sm)", position:"relative", overflow:"hidden",
                    transition:"transform 0.2s, box-shadow 0.2s",
                  }}
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="var(--shadow-md)";}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="var(--shadow-sm)";}}
                  >
                    {/* Spinning conic ring */}
                    <div style={{ width:42, height:42, borderRadius:"50%", flexShrink:0, position:"relative", background:`conic-gradient(from 0deg, transparent 70%, ${a.color})`, animation:"spin 2.2s linear infinite" }}>
                      <div style={{ position:"absolute", inset:3, borderRadius:"50%", background:"var(--color-background-primary)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:a.color, boxShadow:`0 0 8px ${a.color}` }} />
                      </div>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:14, color:"var(--color-text-primary)", marginBottom:2 }}>{a.name}</div>
                      <div style={{ fontSize:12, color:"var(--color-text-secondary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.task}</div>
                    </div>
                    <div style={{ fontSize:11, fontWeight:700, color:a.color, whiteSpace:"nowrap" }}>{a.result}</div>
                  </div>
                </TiltCard>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          DEMO SECTION
      ══════════════════════════════════════════════════════════ */}
      <section style={{ padding:"110px 24px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", textAlign:"center" }}>
          <Reveal>
            <p style={{ fontSize:12, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"#0d9488", marginBottom:14 }}>Try It Yourself</p>
            <h2 style={{ fontSize:"clamp(32px,4vw,50px)", fontWeight:900, letterSpacing:"-0.04em", color:"var(--color-text-primary)", marginBottom:16 }}>Experience DentalIQ live.</h2>
            <p style={{ fontSize:18, color:"var(--color-text-secondary)", maxWidth:500, margin:"0 auto 32px" }}>No credit card. No setup. See real claim analysis in action.</p>
            <Link href="/pricing" style={{
              display:"inline-flex", alignItems:"center", gap:7,
              padding:"10px 22px", borderRadius:100,
              background:"var(--color-background-secondary)",
              border:"1px solid var(--color-border-secondary)",
              fontSize:14, fontWeight:700, color:"var(--color-text-secondary)",
              textDecoration:"none", marginBottom:48,
              transition:"all 0.2s ease",
            }}
            onMouseEnter={e=>{ const el=e.currentTarget as HTMLAnchorElement; el.style.borderColor="#0d9488"; el.style.color="#0d9488"; el.style.background="rgba(13,148,136,0.06)"; }}
            onMouseLeave={e=>{ const el=e.currentTarget as HTMLAnchorElement; el.style.borderColor="var(--color-border-secondary)"; el.style.color="var(--color-text-secondary)"; el.style.background="var(--color-background-secondary)"; }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
              See full pricing &amp; plan comparison
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </Reveal>

          <div style={{ display:"flex", justifyContent:"center", gap:24, flexWrap:"wrap" }}>
            {[
              { plan:"starter", label:"Starter", desc:"Cost estimation & basic claims", color:"#0ea5e9", icon:"⚡" },
              { plan:"pro",     label:"Pro",     desc:"Analytics & multi-location",     color:"#8b5cf6", icon:"📊" },
              { plan:"cortex",  label:"Cortex",  desc:"Live AI agent preview",          color:"#10b981", icon:"🤖" },
            ].map((d,i)=>(
              <Reveal key={d.plan} delay={i*0.1}>
                <Link href={`/demo/${d.plan}`} style={{
                  display:"flex", flexDirection:"column", alignItems:"center",
                  padding:"36px 40px", borderRadius:26,
                  background:"var(--color-background-secondary)",
                  border:"1px solid var(--color-border-secondary)",
                  textDecoration:"none", minWidth:230, gap:16,
                  transition:"all 0.35s cubic-bezier(0.16,1,0.3,1)",
                }}
                onMouseEnter={e=>{ const el=e.currentTarget as HTMLAnchorElement; el.style.transform="translateY(-10px)"; el.style.boxShadow=`0 28px 60px rgba(0,0,0,0.16)`; el.style.borderColor=d.color; }}
                onMouseLeave={e=>{ const el=e.currentTarget as HTMLAnchorElement; el.style.transform="none"; el.style.boxShadow="none"; el.style.borderColor="var(--color-border-secondary)"; }}
                >
                  <div style={{ width:60, height:60, borderRadius:20, background:`${d.color}14`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>{d.icon}</div>
                  <div>
                    <div style={{ fontSize:18, fontWeight:800, color:"var(--color-text-primary)", marginBottom:5 }}>{d.label} Demo</div>
                    <div style={{ fontSize:13, color:"var(--color-text-secondary)" }}>{d.desc}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:13, fontWeight:700, color:d.color }}>
                    Launch demo <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════════════════════════ */}
      <section style={{ padding:"24px", background:"var(--color-background-secondary)", borderTop:"1px solid var(--color-border-secondary)" }}>
        <Reveal>
          <div style={{
            maxWidth:1100, margin:"0 auto",
            background:"linear-gradient(135deg,#0a3d38,#0f766e,#0d9488)",
            borderRadius:30, padding:"72px 80px",
            textAlign:"center", position:"relative", overflow:"hidden",
          }}>
            {/* Grid overlay */}
            <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)", backgroundSize:"28px 28px", borderRadius:"inherit", animation:"gridBreathe 6s ease-in-out infinite" }} />
            {/* Corner orbs */}
            <div style={{ position:"absolute", top:-80, right:-80,   width:260, height:260, borderRadius:"50%", background:"radial-gradient(circle, rgba(255,255,255,0.12), transparent 70%)", filter:"blur(24px)" }} />
            <div style={{ position:"absolute", bottom:-80, left:-80, width:260, height:260, borderRadius:"50%", background:"radial-gradient(circle, rgba(255,255,255,0.12), transparent 70%)", filter:"blur(24px)" }} />

            <div style={{ position:"relative", zIndex:1 }}>
              <h2 style={{ fontSize:"clamp(32px,4.5vw,56px)", fontWeight:900, letterSpacing:"-0.04em", color:"#fff", marginBottom:18, lineHeight:1.1 }}>
                Ready to protect your revenue?
              </h2>
              <p style={{ fontSize:18, color:"rgba(255,255,255,0.72)", maxWidth:520, margin:"0 auto 44px", lineHeight:1.65 }}>
                Join hundreds of Canadian clinics that use DentalIQ to stop claim denials before they happen.
              </p>
              <div style={{ display:"flex", gap:16, justifyContent:"center", flexWrap:"wrap" }}>
                <Link href="/signup" style={{
                  padding:"17px 44px", borderRadius:100, fontSize:16, fontWeight:700,
                  background:"#fff", color:"#0f766e", textDecoration:"none",
                  boxShadow:"0 10px 36px rgba(0,0,0,0.24)", transition:"all 0.25s",
                }}
                onMouseEnter={e=>{ const el=e.currentTarget as HTMLAnchorElement; el.style.transform="translateY(-2px) scale(1.02)"; el.style.boxShadow="0 18px 50px rgba(0,0,0,0.32)"; }}
                onMouseLeave={e=>{ const el=e.currentTarget as HTMLAnchorElement; el.style.transform="none"; el.style.boxShadow="0 10px 36px rgba(0,0,0,0.24)"; }}
                >Start free trial →</Link>
                <Link href="/demo/pro" style={{
                  padding:"17px 44px", borderRadius:100, fontSize:16, fontWeight:700,
                  background:"rgba(255,255,255,0.14)", color:"#fff", textDecoration:"none",
                  border:"1.5px solid rgba(255,255,255,0.32)", transition:"all 0.25s", backdropFilter:"blur(8px)",
                }}
                onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.background="rgba(255,255,255,0.26)";}}
                onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.background="rgba(255,255,255,0.14)";}}
                >Watch a demo</Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════ */}
      <footer style={{ padding:"64px 48px 40px", borderTop:"1px solid var(--color-border-secondary)", background:"var(--color-background-primary)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:48, marginBottom:56 }}>
            {/* Brand */}
            <div style={{ maxWidth:280 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,#0f766e,#0d9488)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:18 }}>+</div>
                <span style={{ fontWeight:800, fontSize:17, letterSpacing:"-0.03em", color:"var(--color-text-primary)" }}>DentalIQ</span>
              </div>
              <p style={{ fontSize:14, color:"var(--color-text-secondary)", lineHeight:1.65, marginBottom:20 }}>
                The intelligent operating system for modern Canadian dental practices.
              </p>
              <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                {["PHIPA","AWS ca-central-1","SOC 2"].map(b=>(
                  <span key={b} style={{ padding:"3px 11px", borderRadius:100, fontSize:11, fontWeight:600, background:"rgba(15,118,110,0.08)", color:"#0d9488", border:"1px solid rgba(15,118,110,0.22)" }}>{b}</span>
                ))}
              </div>
            </div>

            {/* Links */}
            <div style={{ display:"flex", gap:64, flexWrap:"wrap" }}>
              {[
                { heading:"Product", links:[["Cortex Agents","/cortex"],["Interactive Demo","/demo/pro"],["Pricing","/pricing"]] },
                { heading:"Legal",   links:[["Legal & Compliance","/legal"],["Privacy Policy","/privacy"],["Terms of Service","/terms"]] },
                { heading:"Account", links:[["Sign In","/login"],["Get Started","/signup"]] },
              ].map(col=>(
                <div key={col.heading}>
                  <div style={{ fontWeight:700, fontSize:13, letterSpacing:"-0.01em", color:"var(--color-text-primary)", marginBottom:18 }}>{col.heading}</div>
                  {col.links.map(([label, href])=>(
                    <div key={label} style={{ marginBottom:13 }}>
                      <Link href={href} style={{ color:"var(--color-text-secondary)", textDecoration:"none", fontSize:14, transition:"color 0.15s" }}
                      onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.color="#0d9488";}}
                      onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.color="var(--color-text-secondary)";}}
                      >{label}</Link>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop:"1px solid var(--color-border-secondary)", paddingTop:28, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
            <div style={{ fontSize:13, color:"var(--color-text-tertiary)" }}>© {new Date().getFullYear()} DentalIQ Technologies Inc. All rights reserved. Built in Canada 🇨🇦</div>
            <ThemeToggle storageKey="diq_pub_theme" variant="icon" />
          </div>
        </div>
      </footer>
    </div>
  );
}
