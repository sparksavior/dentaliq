import { useState, useEffect } from "react";

const STEPS = ["signup", "verify", "integrate", "security", "dashboard"];

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 199,
    desc: "1 clinic location",
    features: ["Real-time cost estimator", "Patient-facing explanations", "Up to 300 estimates/mo", "Email support"],
    color: "#0f766e",
  },
  {
    id: "pro",
    name: "Pro",
    price: 349,
    desc: "Up to 3 locations",
    features: ["Everything in Starter", "Claim risk detection", "Pre-auth drafting", "Priority support", "Analytics dashboard"],
    color: "#0e7490",
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    desc: "Unlimited locations",
    features: ["Everything in Pro", "Custom integrations", "Dedicated success manager", "SLA guarantee", "SSO / SAML"],
    color: "#4f46e5",
  },
];

const securityItems = [
  { icon: "🔒", label: "PHIPA Compliant", desc: "Ontario health data protection" },
  { icon: "🇨🇦", label: "Data Stored in Canada", desc: "AWS ca-central-1 only" },
  { icon: "🔐", label: "AES-256 Encryption", desc: "At rest and in transit" },
  { icon: "📋", label: "Audit Logs", desc: "Full access trail" },
  { icon: "👥", label: "Role-Based Access", desc: "Granular permissions" },
  { icon: "🛡️", label: "PIPEDA Aligned", desc: "Federal privacy standards" },
];

const recentActivity = [
  { time: "2m ago", action: "Cost estimate generated", patient: "P-3821", code: "D1110", result: "$0 — Fully covered" },
  { time: "8m ago", action: "Claim risk flagged", patient: "P-3820", code: "D2750", result: "Missing X-ray ref" },
  { time: "15m ago", action: "Pre-auth drafted", patient: "P-3819", code: "D6010", result: "Sent to Sun Life" },
  { time: "1h ago", action: "Cost estimate generated", patient: "P-3818", code: "D2393", result: "$74 — 80% covered" },
];

export default function App() {
  const [page, setPage] = useState("landing");
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState("pro");
  const [form, setForm] = useState({ name: "", clinic: "", email: "", phone: "" });
  const [integrationStatus, setIntegrationStatus] = useState("idle");
  const [secStep, setSecStep] = useState(0);
  const [verifyCode, setVerifyCode] = useState(["", "", "", "", "", ""]);
  const [provisionProgress, setProvisionProgress] = useState(0);
  const [apiKey] = useState("dk_live_" + Math.random().toString(36).slice(2, 18));

  const advanceStep = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));

  const simulateIntegration = () => {
    setIntegrationStatus("connecting");
    let p = 0;
    const iv = setInterval(() => {
      p += 12;
      setProvisionProgress(p);
      if (p >= 100) {
        clearInterval(iv);
        setIntegrationStatus("connected");
      }
    }, 280);
  };

  if (page === "landing") return <Landing onStart={() => setPage("signup")} selectedPlan={plan} setSelectedPlan={setPlan} />;
  if (page === "signup") return <SignupFlow step={step} setStep={setStep} form={form} setForm={setForm} plan={plan} advanceStep={advanceStep} verifyCode={verifyCode} setVerifyCode={setVerifyCode} integrationStatus={integrationStatus} simulateIntegration={simulateIntegration} provisionProgress={provisionProgress} secStep={secStep} setSecStep={setSecStep} apiKey={apiKey} onComplete={() => setPage("dashboard")} />;
  if (page === "dashboard") return <Dashboard apiKey={apiKey} />;
}

function Landing({ onStart, selectedPlan, setSelectedPlan }) {
  return (
    <div style={{ fontFamily: "'Georgia', serif", background: "var(--color-background-primary)", minHeight: "100vh" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.2rem 2rem", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#0f766e", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 16, fontFamily: "monospace" }}>+</span>
          </div>
          <span style={{ fontWeight: 600, fontSize: 16, fontFamily: "system-ui", color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>DentalIQ</span>
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          {["Features", "Pricing", "Security", "Docs"].map((l) => (
            <span key={l} style={{ fontSize: 14, color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "system-ui" }}>{l}</span>
          ))}
          <button onClick={onStart} style={{ background: "#0f766e", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 14, cursor: "pointer", fontFamily: "system-ui" }}>
            Get started
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "5rem 2rem 3rem" }}>
        <div style={{ display: "inline-block", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 20, padding: "4px 14px", fontSize: 12, color: "var(--color-text-secondary)", fontFamily: "system-ui", marginBottom: "1.5rem" }}>
          Now with Open Dental integration
        </div>
        <h1 style={{ fontSize: 48, fontWeight: 400, lineHeight: 1.15, marginBottom: "1.2rem", color: "var(--color-text-primary)", letterSpacing: "-0.03em" }}>
          Insurance clarity,<br /><em style={{ color: "#0f766e" }}>instantly</em>
        </h1>
        <p style={{ fontSize: 18, color: "var(--color-text-secondary)", fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 540, marginBottom: "2rem" }}>
          AI-powered cost estimates, claim risk detection, and pre-authorization drafting for Ontario dental clinics. Integrates in minutes.
        </p>
        <div style={{ display: "flex", gap: 12, marginBottom: "3rem" }}>
          <button onClick={onStart} style={{ background: "#0f766e", color: "#fff", border: "none", borderRadius: 8, padding: "13px 28px", fontSize: 15, cursor: "pointer", fontFamily: "system-ui" }}>
            Start free trial →
          </button>
          <button style={{ background: "transparent", color: "var(--color-text-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, padding: "13px 24px", fontSize: 15, cursor: "pointer", fontFamily: "system-ui" }}>
            Watch demo
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: "4rem" }}>
          {[
            { num: "$6.4K", label: "avg. monthly revenue recovered" },
            { num: "23%", label: "reduction in claim rejections" },
            { num: "94min", label: "saved per clinic per week" },
          ].map((s) => (
            <div key={s.num} style={{ background: "var(--color-background-secondary)", borderRadius: 12, padding: "1.2rem", border: "0.5px solid var(--color-border-tertiary)" }}>
              <div style={{ fontSize: 28, fontWeight: 400, color: "#0f766e", marginBottom: 4 }}>{s.num}</div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", fontFamily: "system-ui" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: "3rem", marginBottom: "3rem" }}>
          <h2 style={{ fontSize: 26, fontWeight: 400, marginBottom: "1.5rem", color: "var(--color-text-primary)" }}>How it works</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              { step: "01", title: "Sign up & connect", desc: "Register your clinic, connect Open Dental — takes under 5 minutes. Works automatically." },
              { step: "02", title: "Input procedure + patient", desc: "Front desk enters CDT code and insurance. AI returns estimate and risk flags instantly." },
              { step: "03", title: "Collect & recover", desc: "Fewer rejected claims, higher treatment acceptance, less time on hold with insurers." },
            ].map((s) => (
              <div key={s.step} style={{ padding: "1.2rem", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12 }}>
                <div style={{ fontSize: 12, fontFamily: "monospace", color: "#0f766e", marginBottom: 8 }}>{s.step}</div>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8, fontFamily: "system-ui", color: "var(--color-text-primary)" }}>{s.title}</div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", fontFamily: "system-ui", lineHeight: 1.55 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: "3rem", marginBottom: "3rem" }}>
          <h2 style={{ fontSize: 26, fontWeight: 400, marginBottom: "0.5rem", color: "var(--color-text-primary)" }}>Pricing</h2>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", fontFamily: "system-ui", marginBottom: "1.5rem" }}>14-day free trial. No credit card required.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {plans.map((p) => (
              <div key={p.id} onClick={() => setSelectedPlan(p.id)} style={{ padding: "1.4rem", border: selectedPlan === p.id ? `2px solid ${p.color}` : "0.5px solid var(--color-border-tertiary)", borderRadius: 12, cursor: "pointer", position: "relative", background: "var(--color-background-primary)" }}>
                {p.popular && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "#0e7490", color: "#fff", fontSize: 11, padding: "3px 10px", borderRadius: 20, fontFamily: "system-ui", whiteSpace: "nowrap" }}>Most popular</div>}
                <div style={{ fontSize: 15, fontWeight: 500, fontFamily: "system-ui", color: "var(--color-text-primary)", marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontFamily: "system-ui", marginBottom: 10 }}>{p.desc}</div>
                <div style={{ fontSize: 26, fontWeight: 400, color: p.color, marginBottom: 12 }}>
                  {p.price ? `$${p.price}` : "Custom"}<span style={{ fontSize: 13, color: "var(--color-text-secondary)", fontFamily: "system-ui" }}>{p.price ? "/mo" : ""}</span>
                </div>
                {p.features.map((f) => (
                  <div key={f} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 6 }}>
                    <span style={{ color: p.color, fontSize: 12, marginTop: 2, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontFamily: "system-ui" }}>{f}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 16, padding: "2.5rem", textAlign: "center" }}>
          <h2 style={{ fontSize: 26, fontWeight: 400, marginBottom: "0.8rem", color: "var(--color-text-primary)" }}>Ready to recover lost revenue?</h2>
          <p style={{ fontSize: 15, color: "var(--color-text-secondary)", fontFamily: "system-ui", marginBottom: "1.5rem" }}>Sign up in under 3 minutes. Connect Open Dental. Done.</p>
          <button onClick={onStart} style={{ background: "#0f766e", color: "#fff", border: "none", borderRadius: 8, padding: "13px 32px", fontSize: 15, cursor: "pointer", fontFamily: "system-ui" }}>
            Create free account →
          </button>
        </div>
      </div>
    </div>
  );
}

function SignupFlow({ step, form, setForm, plan, advanceStep, verifyCode, setVerifyCode, integrationStatus, simulateIntegration, provisionProgress, secStep, setSecStep, apiKey, onComplete }) {
  const stepNames = ["Account", "Verify", "Connect", "Security", "Done"];
  const selectedPlan = plans.find((p) => p.id === plan) || plans[1];

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background-primary)", fontFamily: "system-ui" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "2.5rem" }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "#0f766e", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 14, fontFamily: "monospace" }}>+</span>
          </div>
          <span style={{ fontWeight: 600, fontSize: 15, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>DentalIQ</span>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: "2.5rem" }}>
          {stepNames.map((s, i) => (
            <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
              <div style={{ height: 3, width: "100%", borderRadius: 2, background: i <= step ? "#0f766e" : "var(--color-border-tertiary)" }} />
              <span style={{ fontSize: 11, color: i <= step ? "#0f766e" : "var(--color-text-secondary)" }}>{s}</span>
            </div>
          ))}
        </div>

        {step === 0 && <StepAccount form={form} setForm={setForm} plan={selectedPlan} onNext={advanceStep} />}
        {step === 1 && <StepVerify verifyCode={verifyCode} setVerifyCode={setVerifyCode} email={form.email} onNext={advanceStep} />}
        {step === 2 && <StepIntegrate status={integrationStatus} onConnect={simulateIntegration} progress={provisionProgress} onNext={advanceStep} />}
        {step === 3 && <StepSecurity secStep={secStep} setSecStep={setSecStep} onNext={advanceStep} />}
        {step === 4 && <StepDone apiKey={apiKey} onDashboard={onComplete} />}
      </div>
    </div>
  );
}

function StepAccount({ form, setForm, plan, onNext }) {
  const valid = form.name && form.clinic && form.email && form.phone;
  const inp = { width: "100%", padding: "10px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, fontSize: 14, boxSizing: "border-box", marginBottom: 12, background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "system-ui" };
  return (
    <div>
      <div style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "12px 16px", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{plan.name} plan</div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{plan.price ? `$${plan.price}/month` : "Custom pricing"} · 14-day free trial</div>
        </div>
        <div style={{ fontSize: 18, color: plan.color }}>{plan.price ? `$${plan.price}` : "Custom"}</div>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 500, marginBottom: "1.2rem", color: "var(--color-text-primary)" }}>Create your account</h2>
      <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Full name</label>
      <input style={inp} placeholder="Dr. Sarah Chen" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Clinic name</label>
      <input style={inp} placeholder="Lakeview Dental Group" value={form.clinic} onChange={(e) => setForm({ ...form, clinic: e.target.value })} />
      <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Work email</label>
      <input style={inp} placeholder="sarah@lakeviewdental.ca" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Phone number</label>
      <input style={inp} placeholder="+1 (416) 555-0100" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

      <div style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "10px 14px", marginBottom: "1.2rem", fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
        By continuing you agree to our Terms of Service and Privacy Policy. Your health data is stored exclusively on Canadian infrastructure (AWS ca-central-1) and is PHIPA-compliant.
      </div>

      <button onClick={onNext} disabled={!valid} style={{ width: "100%", background: valid ? "#0f766e" : "var(--color-background-secondary)", color: valid ? "#fff" : "var(--color-text-secondary)", border: "none", borderRadius: 8, padding: "12px", fontSize: 15, cursor: valid ? "pointer" : "default", fontFamily: "system-ui" }}>
        Continue →
      </button>
    </div>
  );
}

function StepVerify({ verifyCode, setVerifyCode, email, onNext }) {
  const code = verifyCode.join("");
  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...verifyCode];
    next[i] = val;
    setVerifyCode(next);
    if (val && i < 5) document.getElementById(`vc-${i + 1}`)?.focus();
  };
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 500, marginBottom: "0.6rem", color: "var(--color-text-primary)" }}>Verify your email</h2>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: "2rem" }}>
        We sent a 6-digit code to <strong style={{ color: "var(--color-text-primary)" }}>{email || "your email"}</strong>
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: "2rem" }}>
        {verifyCode.map((v, i) => (
          <input key={i} id={`vc-${i}`} maxLength={1} value={v} onChange={(e) => handleChange(i, e.target.value)}
            style={{ width: 44, height: 52, textAlign: "center", fontSize: 20, border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "monospace" }} />
        ))}
      </div>
      <button onClick={onNext} style={{ width: "100%", background: code.length === 6 ? "#0f766e" : "var(--color-background-secondary)", color: code.length === 6 ? "#fff" : "var(--color-text-secondary)", border: "none", borderRadius: 8, padding: "12px", fontSize: 15, cursor: "pointer", fontFamily: "system-ui", marginBottom: 12 }}>
        Verify & continue →
      </button>
      <div style={{ textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>
        Didn't receive it? <span style={{ color: "#0f766e", cursor: "pointer" }}>Resend code</span>
      </div>
      <div style={{ marginTop: "1.5rem", background: "var(--color-background-secondary)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--color-text-secondary)" }}>
        For demo purposes, enter any 6 digits to continue.
      </div>
    </div>
  );
}

function StepIntegrate({ status, onConnect, progress, onNext }) {
  const steps_done = Math.floor(progress / 25);
  const provSteps = ["Provisioning your workspace", "Configuring Open Dental bridge", "Loading insurance rule engine", "Enabling AI copilot"];
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 500, marginBottom: "0.6rem", color: "var(--color-text-primary)" }}>Connect Open Dental</h2>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: "1.5rem" }}>Automatically syncs patients, procedures, and insurance plans.</p>

      {status === "idle" && (
        <div>
          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "1.2rem", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "0.8rem" }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🦷</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>Open Dental</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>v24.x · REST API · Recommended</div>
              </div>
              <div style={{ marginLeft: "auto", fontSize: 11, background: "#d1fae5", color: "#065f46", padding: "3px 10px", borderRadius: 20 }}>Supported</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 10 }}>Syncs: patients, procedures, insurance plans, claim history</div>
            <button onClick={onConnect} style={{ width: "100%", background: "#0f766e", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 14, cursor: "pointer" }}>
              Connect Open Dental →
            </button>
          </div>
          <div style={{ border: "0.5px dashed var(--color-border-tertiary)", borderRadius: 12, padding: "1rem", marginBottom: "0.8rem", opacity: 0.6 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 }}>Dentrix G7+</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Coming soon</div>
          </div>
          <div style={{ border: "0.5px dashed var(--color-border-tertiary)", borderRadius: 12, padding: "1rem", opacity: 0.6 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 }}>ClearDent</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Coming soon</div>
          </div>
          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <span onClick={onNext} style={{ fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}>Skip for now — set up manually later</span>
          </div>
        </div>
      )}

      {status === "connecting" && (
        <div>
          <div style={{ height: 6, background: "var(--color-background-secondary)", borderRadius: 3, marginBottom: "1.5rem" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "#0f766e", borderRadius: 3, transition: "width 0.3s" }} />
          </div>
          {provSteps.map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, opacity: i < steps_done ? 1 : i === steps_done ? 0.7 : 0.3 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: i < steps_done ? "#0f766e" : "var(--color-background-secondary)", border: `0.5px solid ${i < steps_done ? "#0f766e" : "var(--color-border-tertiary)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {i < steps_done && <span style={{ color: "#fff", fontSize: 11 }}>✓</span>}
              </div>
              <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{s}</span>
            </div>
          ))}
        </div>
      )}

      {status === "connected" && (
        <div>
          <div style={{ background: "#d1fae5", border: "0.5px solid #6ee7b7", borderRadius: 12, padding: "1.2rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#065f46" }}>Open Dental connected</div>
              <div style={{ fontSize: 12, color: "#047857" }}>Synced 847 patients · 12 insurance plans · live</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: "1.5rem" }}>
            {[["Patients synced", "847"], ["Insurance plans", "12"], ["Procedures loaded", "4,200+"], ["Sync interval", "Real-time"]].map(([l, v]) => (
              <div key={l} style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 16, fontWeight: 500, color: "var(--color-text-primary)" }}>{v}</div>
              </div>
            ))}
          </div>
          <button onClick={onNext} style={{ width: "100%", background: "#0f766e", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontSize: 15, cursor: "pointer" }}>
            Continue to security setup →
          </button>
        </div>
      )}
    </div>
  );
}

function StepSecurity({ secStep, setSecStep, onNext }) {
  const [mfaCode, setMfaCode] = useState("");
  const [role, setRole] = useState("admin");
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 500, marginBottom: "0.6rem", color: "var(--color-text-primary)" }}>Security setup</h2>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: "1.5rem" }}>PHIPA requires appropriate safeguards. This takes 2 minutes.</p>

      <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem" }}>
        {["MFA", "Roles", "Confirm"].map((s, i) => (
          <div key={s} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ height: 2, background: i <= secStep ? "#0f766e" : "var(--color-border-tertiary)", borderRadius: 1, marginBottom: 4 }} />
            <span style={{ fontSize: 11, color: i <= secStep ? "#0f766e" : "var(--color-text-secondary)" }}>{s}</span>
          </div>
        ))}
      </div>

      {secStep === 0 && (
        <div>
          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "1.2rem", marginBottom: "1rem" }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 6 }}>Two-factor authentication</div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12 }}>Required for all accounts. Protects patient health information per PHIPA guidelines.</div>
            <input value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} placeholder="Enter authenticator code" style={{ width: "100%", padding: "10px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, fontSize: 14, boxSizing: "border-box", marginBottom: 10, background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "monospace" }} />
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>For demo: enter any 6 digits</div>
          </div>
          <button onClick={() => setSecStep(1)} style={{ width: "100%", background: "#0f766e", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontSize: 15, cursor: "pointer" }}>
            Enable MFA →
          </button>
        </div>
      )}

      {secStep === 1 && (
        <div>
          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "1.2rem", marginBottom: "1rem" }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 10 }}>Your role</div>
            {[["admin", "Clinic Admin", "Full access — manage staff, billing, integrations"], ["dentist", "Dentist", "Clinical view — estimates and pre-auth only"], ["front_desk", "Front Desk", "Estimate tool only — no billing data"]].map(([val, label, desc]) => (
              <div key={val} onClick={() => setRole(val)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px", borderRadius: 8, border: role === val ? "0.5px solid #0f766e" : "0.5px solid var(--color-border-tertiary)", marginBottom: 8, cursor: "pointer" }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${role === val ? "#0f766e" : "var(--color-border-secondary)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {role === val && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0f766e" }} />}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{label}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setSecStep(2)} style={{ width: "100%", background: "#0f766e", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontSize: 15, cursor: "pointer" }}>
            Continue →
          </button>
        </div>
      )}

      {secStep === 2 && (
        <div>
          <div style={{ marginBottom: "1rem" }}>
            {securityItems.map((s) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{s.desc}</div>
                </div>
                <div style={{ marginLeft: "auto", fontSize: 11, background: "#d1fae5", color: "#065f46", padding: "3px 8px", borderRadius: 20, flexShrink: 0 }}>Active</div>
              </div>
            ))}
          </div>
          <button onClick={onNext} style={{ width: "100%", background: "#0f766e", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontSize: 15, cursor: "pointer" }}>
            Complete setup →
          </button>
        </div>
      )}
    </div>
  );
}

function StepDone({ apiKey, onDashboard }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 1.5rem" }}>✅</div>
      <h2 style={{ fontSize: 24, fontWeight: 500, marginBottom: "0.6rem", color: "var(--color-text-primary)" }}>You're all set</h2>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: "2rem" }}>Your clinic is live. The AI copilot is ready.</p>

      <div style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "1rem", marginBottom: "1.5rem", textAlign: "left" }}>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Your API key (for integrations)</div>
        <div style={{ fontFamily: "monospace", fontSize: 13, color: "var(--color-text-primary)", wordBreak: "break-all" }}>{apiKey}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: "1.5rem", textAlign: "left" }}>
        {[["Open Dental", "Connected"], ["Insurance engine", "Loaded"], ["PHIPA compliance", "Verified"], ["MFA", "Enabled"]].map(([l, v]) => (
          <div key={l} style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{l}</span>
            <span style={{ fontSize: 12, color: "#059669", fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>

      <button onClick={onDashboard} style={{ width: "100%", background: "#0f766e", color: "#fff", border: "none", borderRadius: 8, padding: "13px", fontSize: 15, cursor: "pointer" }}>
        Open dashboard →
      </button>
    </div>
  );
}

function Dashboard({ apiKey }) {
  const [activeTab, setActiveTab] = useState("estimates");
  const [cdt, setCdt] = useState("D1110");
  const [insurer, setInsurer] = useState("sunlife");
  const [estimateResult, setEstimateResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runEstimate = () => {
    setLoading(true);
    setEstimateResult(null);
    setTimeout(() => {
      const results = {
        D1110: { coverage: 100, cost: 0, note: "Preventive cleaning — fully covered under most plans.", risk: "low" },
        D2393: { coverage: 80, cost: 74, note: "Composite resin filling — 80% covered. Patient pays ~$74.", risk: "low" },
        D2750: { coverage: 50, cost: 480, note: "Porcelain crown — 50% major coverage. Pre-auth recommended.", risk: "medium" },
        D6010: { coverage: 0, cost: 3200, note: "Implant — typically excluded. Verify patient plan directly.", risk: "high" },
      };
      setEstimateResult(results[cdt] || { coverage: 70, cost: 120, note: "Estimated coverage based on standard plan.", risk: "medium" });
      setLoading(false);
    }, 900);
  };

  const riskColor = { low: "#059669", medium: "#d97706", high: "#dc2626" };
  const riskBg = { low: "#d1fae5", medium: "#fef3c7", high: "#fee2e2" };
  const riskTextColor = { low: "#065f46", medium: "#92400e", high: "#991b1b" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background-primary)", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 1.5rem", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: "#0f766e", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 13, fontFamily: "monospace" }}>+</span>
          </div>
          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>DentalIQ</span>
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)", marginLeft: 4 }}>/ Lakeview Dental Group</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 11, background: "#d1fae5", color: "#065f46", padding: "3px 10px", borderRadius: 20 }}>Live · Open Dental synced</div>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#0f766e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff" }}>SC</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", minHeight: "calc(100vh - 53px)" }}>
        <div style={{ borderRight: "0.5px solid var(--color-border-tertiary)", padding: "1rem" }}>
          {[["estimates", "Cost estimator"], ["claims", "Claim risk"], ["preauth", "Pre-auth"], ["activity", "Activity"], ["settings", "Settings"]].map(([id, label]) => (
            <div key={id} onClick={() => setActiveTab(id)} style={{ padding: "8px 10px", borderRadius: 8, marginBottom: 2, cursor: "pointer", fontSize: 13, background: activeTab === id ? "var(--color-background-secondary)" : "transparent", color: activeTab === id ? "var(--color-text-primary)" : "var(--color-text-secondary)", fontWeight: activeTab === id ? 500 : 400 }}>
              {label}
            </div>
          ))}
          <div style={{ marginTop: "2rem", padding: "10px", background: "var(--color-background-secondary)", borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 4 }}>This month</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: "#0f766e", marginBottom: 2 }}>$4,820</div>
            <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>revenue recovered</div>
          </div>
        </div>

        <div style={{ padding: "1.5rem" }}>
          {activeTab === "estimates" && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: "1.2rem", color: "var(--color-text-primary)" }}>Real-time cost estimator</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1rem" }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>CDT procedure code</label>
                  <select value={cdt} onChange={(e) => setCdt(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, fontSize: 14, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}>
                    <option value="D1110">D1110 — Prophylaxis (adult)</option>
                    <option value="D2393">D2393 — Composite resin, 3 surfaces</option>
                    <option value="D2750">D2750 — Crown, porcelain</option>
                    <option value="D6010">D6010 — Implant placement</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Insurance provider</label>
                  <select value={insurer} onChange={(e) => setInsurer(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, fontSize: 14, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}>
                    <option value="sunlife">Sun Life Financial</option>
                    <option value="manulife">Manulife</option>
                    <option value="canadalife">Canada Life</option>
                    <option value="greenshield">Green Shield Canada</option>
                  </select>
                </div>
              </div>
              <button onClick={runEstimate} style={{ background: "#0f766e", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, cursor: "pointer", marginBottom: "1.2rem" }}>
                {loading ? "Calculating…" : "Run estimate →"}
              </button>

              {estimateResult && (
                <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "1.2rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: "1rem" }}>
                    <div style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Coverage</div>
                      <div style={{ fontSize: 20, fontWeight: 500, color: "#0f766e" }}>{estimateResult.coverage}%</div>
                    </div>
                    <div style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Patient pays</div>
                      <div style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)" }}>${estimateResult.cost}</div>
                    </div>
                    <div style={{ background: riskBg[estimateResult.risk], borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 11, color: riskTextColor[estimateResult.risk], marginBottom: 4 }}>Claim risk</div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: riskColor[estimateResult.risk], textTransform: "capitalize" }}>{estimateResult.risk}</div>
                    </div>
                  </div>
                  <div style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "12px" }}>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>Plain-language explanation for patient</div>
                    <div style={{ fontSize: 14, color: "var(--color-text-primary)", lineHeight: 1.5 }}>{estimateResult.note}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "activity" && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: "1.2rem", color: "var(--color-text-primary)" }}>Recent activity</h2>
              {recentActivity.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", width: 50, flexShrink: 0 }}>{a.time}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "var(--color-text-primary)", marginBottom: 2 }}>{a.action}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{a.patient} · {a.code}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", textAlign: "right" }}>{a.result}</div>
                </div>
              ))}
            </div>
          )}

          {(activeTab === "claims" || activeTab === "preauth" || activeTab === "settings") && (
            <div style={{ textAlign: "center", padding: "4rem 0" }}>
              <div style={{ fontSize: 32, marginBottom: "1rem" }}>🚧</div>
              <div style={{ fontSize: 15, color: "var(--color-text-secondary)" }}>
                {activeTab === "claims" ? "Claim risk detection" : activeTab === "preauth" ? "Pre-authorization drafting" : "Settings"} — available in full build
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
