"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authApi, tenantsApi, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LaunchScreen } from "@/components/LaunchScreen";

// ── Static data ────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: "starter" as const,
    name: "Starter",
    price: 199,
    desc: "1 location",
    color: "#0f766e",
    popular: false,
    features: ["Cost estimator", "Claim risk checks", "Basic analytics"],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: 349,
    desc: "Up to 3 locations",
    color: "#0e7490",
    popular: true,
    features: [
      "Everything in Starter",
      "AI pre-auth letters",
      "Priority support",
      "Multi-location",
    ],
  },
  {
    id: "cortex" as const,
    name: "Cortex",
    price: 299,
    desc: "AI Digital Workforce",
    color: "#6366f1",
    popular: false,
    features: [
      "Everything in Pro",
      "Cortex Command Center",
      "Autonomous Billing Agent",
      "Outcome-based billing",
    ],
  },
];

const CORTEX_AGENTS = [
  {
    id: "billing",
    name: "Cortex Billing Agent",
    avatar: "💰",
    role: "Revenue Compliance",
    gradient: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    fee: "Included",
  },
  {
    id: "recall",
    name: "Cortex Recall Agent",
    avatar: "📞",
    role: "Patient Reactivation",
    gradient: "linear-gradient(135deg,#0ea5e9,#06b6d4)",
    fee: "$99/mo",
  },
  {
    id: "review",
    name: "Cortex Review Agent",
    avatar: "⭐",
    role: "Reputation Manager",
    gradient: "linear-gradient(135deg,#f59e0b,#f97316)",
    fee: "$99/mo",
  },
  {
    id: "supply",
    name: "Cortex Supply Agent",
    avatar: "📦",
    role: "Inventory Optimizer",
    gradient: "linear-gradient(135deg,#10b981,#059669)",
    fee: "$99/mo",
  },
  {
    id: "treatment",
    name: "Treatment Coordinator",
    avatar: "🦷",
    role: "Case Acceptance",
    gradient: "linear-gradient(135deg,#ec4899,#f43f5e)",
    fee: "$99/mo",
  },
  {
    id: "hygienist",
    name: "Cortex Hygienist Agent",
    avatar: "📅",
    role: "Schedule Optimizer",
    gradient: "linear-gradient(135deg,#14b8a6,#0d9488)",
    fee: "$99/mo",
  },
];

const ALL_STEPS = [
  { id: "name", label: "Name", cortexOnly: false },
  { id: "plan", label: "Plan", cortexOnly: false },
  { id: "credentials", label: "Account", cortexOnly: false },
  { id: "verify", label: "Verify", cortexOnly: false },
  { id: "phone", label: "Phone", cortexOnly: false },
  { id: "clinic", label: "Clinic", cortexOnly: false },
  { id: "agents", label: "Agents", cortexOnly: true },
  { id: "security", label: "Security", cortexOnly: false },
  { id: "connect", label: "Connect", cortexOnly: false },
  { id: "launch", label: "Launch", cortexOnly: false },
] as const;

type StepId = (typeof ALL_STEPS)[number]["id"];

// ── Presentational helpers (module-level, stable refs) ─────────────────────────

const INP: React.CSSProperties = {
  width: "100%",
  padding: "13px 16px",
  border: "1.5px solid var(--color-border-secondary)",
  borderRadius: 12,
  fontSize: 15,
  color: "var(--color-text-primary)",
  background: "var(--color-input-bg)",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

function FancyInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{ ...INP, ...props.style }}
      onFocus={(e) => {
        e.target.style.borderColor = "var(--color-accent)";
        e.target.style.boxShadow = "0 0 0 3px rgba(15,118,110,0.12)";
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.target.style.borderColor = "var(--color-border-secondary)";
        e.target.style.boxShadow = "none";
        props.onBlur?.(e);
      }}
    />
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        fontSize: 13,
        fontWeight: 500,
        color: "var(--color-text-secondary)",
        display: "block",
        marginBottom: 6,
      }}
    >
      {children}
    </label>
  );
}

function PrimaryBtn({
  children,
  onClick,
  disabled,
  type = "button",
  accentOverride,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  accentOverride?: string;
}) {
  const grad = accentOverride ?? "linear-gradient(135deg, #0f766e, #0d9488)";
  const shadow = accentOverride
    ? "0 4px 16px rgba(99,102,241,0.35)"
    : "0 4px 16px rgba(15,118,110,0.3)";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "14px",
        borderRadius: 12,
        border: "none",
        background: disabled ? "var(--color-border-secondary)" : grad,
        color: "#fff",
        fontSize: 15,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        letterSpacing: "-0.01em",
        transition: "all 0.2s",
        boxShadow: disabled ? "none" : shadow,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = shadow
            .replace("0.3)", "0.45)")
            .replace("0.35)", "0.5)");
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = disabled ? "none" : shadow;
      }}
    >
      {children}
    </button>
  );
}

function GhostBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "12px",
        borderRadius: 12,
        border: "1.5px solid var(--color-border-secondary)",
        background: "transparent",
        color: "var(--color-text-secondary)",
        fontSize: 14,
        cursor: "pointer",
        transition: "border-color 0.15s, color 0.15s",
        marginTop: 8,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--color-accent)";
        e.currentTarget.style.color = "var(--color-accent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border-secondary)";
        e.currentTarget.style.color = "var(--color-text-secondary)";
      }}
    >
      {children}
    </button>
  );
}

function StepHeader({
  icon,
  title,
  sub,
}: {
  icon: string;
  title: string;
  sub: string;
}) {
  return (
    <div
      style={{
        marginBottom: "2rem",
        animation: "stepFadeUp 0.4s ease-out both",
      }}
    >
      <div
        style={{
          width: 68,
          height: 68,
          borderRadius: 22,
          background: "var(--color-accent-muted)",
          border: "1.5px solid rgba(15,118,110,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 34,
          marginBottom: 22,
          boxShadow: "0 4px 20px rgba(15,118,110,0.15)",
        }}
      >
        {icon}
      </div>
      <h1
        style={{
          fontSize: 30,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          color: "var(--color-text-primary)",
          marginBottom: 10,
          lineHeight: 1.1,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          fontSize: 15,
          color: "var(--color-text-secondary)",
          lineHeight: 1.55,
          margin: 0,
        }}
      >
        {sub}
      </p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

function SignupPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { setSession } = useAuth();

  const [plan, setPlan] = useState<"starter" | "pro" | "enterprise" | "cortex">(
    (params.get("plan") as any) ?? "pro",
  );

  // Filter steps based on plan
  const steps = ALL_STEPS.filter((s) => !s.cortexOnly || plan === "cortex");
  const [stepIdx, setStepIdx] = useState(0);
  const currentId = steps[Math.min(stepIdx, steps.length - 1)]?.id ?? "name";

  // Form
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    phone: "",
    clinic: "",
    address: "",
  });
  const [extraClinics, setExtraClinics] = useState<string[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>(["billing"]);

  // Backend state
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [mfaData, setMfaData] = useState<{
    secret: string;
    qrCodeDataUrl: string;
    backupCodes?: string[];
  } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaLoadError, setMfaLoadError] = useState(false);
  const [pmsStatus, setPmsStatus] = useState<
    "idle" | "connecting" | "connected"
  >("idle");
  const [pmsProgress, setPmsProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // UI state
  const [emailVerified, setEmailVerified] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showLaunch, setShowLaunch] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  // Poll email verification
  useEffect(() => {
    if (currentId !== "verify" || !sessionToken || emailVerified) return;
    const iv = setInterval(async () => {
      try {
        const u = await authApi.me(sessionToken);
        if (u.emailVerified) setEmailVerified(true);
      } catch {}
    }, 3000);
    return () => clearInterval(iv);
  }, [currentId, sessionToken, emailVerified]);

  // Load MFA QR when entering security step
  useEffect(() => {
    if (currentId !== "security" || !sessionToken || mfaData) return;
    setMfaLoadError(false);
    (async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3001"}/auth/mfa/setup`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${sessionToken}` },
            credentials: "include",
          },
        );
        const json = await res.json();
        if (json.success) {
          setMfaData(json.data);
        } else {
          setMfaLoadError(true);
        }
      } catch {
        setMfaLoadError(true);
      }
    })();
  }, [currentId, sessionToken, mfaLoadError]);

  const setF =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const advance = () => {
    setError("");
    setDirection("forward");
    setStepIdx((i) => Math.min(i + 1, steps.length - 1));
  };
  const goBack = () => {
    setError("");
    setDirection("back");
    setStepIdx((i) => Math.max(i - 1, 0));
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function submitName() {
    if (!form.name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    setError("");
    advance();
  }

  async function submitCredentials() {
    setError("");
    if (!form.email.trim()) return setError("Please enter your work email.");
    if (form.password.length < 8)
      return setError("Password must be at least 8 characters.");
    if (form.password !== form.confirm)
      return setError("Passwords do not match.");
    setLoading(true);
    try {
      await authApi.register({
        name: form.name,
        email: form.email,
        password: form.password,
        clinicName: "My Clinic", // updated in clinic step
        plan,
      });
      const result = await authApi.login({
        email: form.email,
        password: form.password,
      });
      if (!("requiresMfa" in result)) setSessionToken(result.accessToken);
      advance();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitClinic() {
    setError("");
    if (!form.clinic.trim()) return setError("Please enter your clinic name.");
    setLoading(true);
    try {
      if (sessionToken) {
        await tenantsApi.updateTenant(sessionToken, {
          name: form.clinic.trim(),
        });
        for (const n of extraClinics) {
          if (n.trim())
            await tenantsApi.createClinic(sessionToken, {
              name: n.trim(),
              address: form.address.trim() || undefined,
            });
        }
      }
      advance();
    } catch (err: any) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to save clinic. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitMfa() {
    if (!sessionToken || !mfaData || mfaCode.length !== 6) {
      advance();
      return;
    }
    setLoading(true);
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3001"}/auth/mfa/verify`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ code: mfaCode, secret: mfaData.secret }),
        },
      );
    } catch {}
    setLoading(false);
    advance();
  }

  function startPms() {
    setPmsStatus("connecting");
    setPmsProgress(0);
    let p = 0;
    timerRef.current = setInterval(() => {
      p += 12;
      setPmsProgress(p);
      if (p >= 100) {
        clearInterval(timerRef.current!);
        setPmsStatus("connected");
      }
    }, 280);
  }

  async function goToDashboard() {
    if (sessionToken) {
      try {
        const u = await authApi.me(sessionToken);
        setSession(sessionToken, u);
      } catch {}
    }
    sessionStorage.setItem("diq_fresh_login", "1");
    setShowLaunch(true);
  }

  // ── Shared inline helpers ────────────────────────────────────────────────────

  const ErrorBanner = error ? (
    <div
      style={{
        marginBottom: 16,
        padding: "12px 16px",
        background: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.25)",
        borderRadius: 10,
        fontSize: 14,
        color: "#ef4444",
        display: "flex",
        alignItems: "center",
        gap: 8,
        animation: "stepFadeUp 0.25s ease-out",
      }}
    >
      <span>⚠</span> {error}
    </div>
  ) : null;

  const BackLink =
    stepIdx > 0 ? (
      <button
        onClick={goBack}
        style={{
          background: "none",
          border: "none",
          color: "var(--color-text-tertiary)",
          fontSize: 13,
          cursor: "pointer",
          marginTop: 14,
          width: "100%",
          padding: "6px 0",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--color-text-secondary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--color-text-tertiary)";
        }}
      >
        ← Back
      </button>
    ) : null;

  // ── Step renderers ────────────────────────────────────────────────────────────

  function renderStep(id: StepId) {
    switch (id) {
      // ── 0: Name ──────────────────────────────────────────────────────────────
      case "name":
        return (
          <>
            <StepHeader
              icon="👋"
              title="Welcome to DentalIQ"
              sub="Let's get you set up in minutes. First — what's your name?"
            />
            {ErrorBanner}
            <div style={{ marginBottom: 20 }}>
              <FieldLabel>Your full name</FieldLabel>
              <FancyInput
                autoFocus
                placeholder="Dr. Sarah Chen"
                value={form.name}
                onChange={setF("name")}
                onKeyDown={(e) => e.key === "Enter" && submitName()}
                style={{ fontSize: 18, padding: "16px 18px" }}
              />
            </div>
            <PrimaryBtn onClick={submitName} disabled={!form.name.trim()}>
              Let's go →
            </PrimaryBtn>
          </>
        );

      // ── 1: Credentials + Plan ─────────────────────────────────────────────────
      case "credentials":
        return (
          <>
            <StepHeader
              icon="🔑"
              title={`Hi${form.name ? `, ${form.name.split(" ")[0]}` : ""}!`}
              sub="Set up your login credentials and choose a plan."
            />
            {ErrorBanner}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                marginBottom: 20,
              }}
            >
              <div>
                <FieldLabel>Work email</FieldLabel>
                <FancyInput
                  autoFocus
                  type="email"
                  placeholder="you@yourclinic.ca"
                  value={form.email}
                  onChange={setF("email")}
                />
              </div>
              <div>
                <FieldLabel>Password</FieldLabel>
                <div style={{ position: "relative" }}>
                  <FancyInput
                    type={showPw ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={setF("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    style={{
                      position: "absolute",
                      right: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 16,
                      color: "var(--color-text-tertiary)",
                      padding: 0,
                    }}
                  >
                    {showPw ? "🙈" : "👁"}
                  </button>
                </div>
                {form.password && (
                  <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
                    {[4, 8, 12].map((threshold, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: 3,
                          borderRadius: 2,
                          background:
                            form.password.length >= threshold
                              ? ["#ef4444", "#f59e0b", "#10b981"][i]
                              : "var(--color-border-secondary)",
                          transition: "background 0.3s",
                        }}
                      />
                    ))}
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--color-text-tertiary)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {form.password.length < 4
                        ? "Too short"
                        : form.password.length < 8
                          ? "Weak"
                          : form.password.length < 12
                            ? "Good"
                            : "Strong"}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <FieldLabel>Confirm password</FieldLabel>
                <FancyInput
                  type="password"
                  placeholder="Repeat your password"
                  value={form.confirm}
                  onChange={setF("confirm")}
                  style={{
                    borderColor:
                      form.confirm && form.confirm !== form.password
                        ? "#ef4444"
                        : undefined,
                  }}
                />
                {form.confirm && form.confirm !== form.password && (
                  <div style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>
                    Passwords don't match
                  </div>
                )}
              </div>
            </div>

            <PrimaryBtn
              onClick={submitCredentials}
              disabled={
                loading ||
                !form.email ||
                !form.password ||
                form.password !== form.confirm ||
                form.password.length < 8
              }
            >
              {loading ? "Creating account…" : "Create account →"}
            </PrimaryBtn>
            {BackLink}
          </>
        );

      // ── 2: Email verification ─────────────────────────────────────────────────
      case "verify":
        return (
          <>
            <StepHeader
              icon="✉️"
              title="Check your inbox"
              sub={`We sent a verification link to ${form.email}. Click it to continue.`}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 36,
              }}
            >
              <div style={{ position: "relative", width: 100, height: 100 }}>
                {/* Pulse rings */}
                {!emailVerified && (
                  <>
                    <div
                      style={{
                        position: "absolute",
                        inset: -12,
                        borderRadius: "50%",
                        border: "2px solid var(--color-accent)",
                        opacity: 0,
                        animation: "pulseRing 2.5s ease-out infinite",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: -24,
                        borderRadius: "50%",
                        border: "2px solid var(--color-accent)",
                        opacity: 0,
                        animation: "pulseRing 2.5s ease-out infinite 0.6s",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: -36,
                        borderRadius: "50%",
                        border: "2px solid var(--color-accent)",
                        opacity: 0,
                        animation: "pulseRing 2.5s ease-out infinite 1.2s",
                      }}
                    />
                  </>
                )}
                <div
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: "50%",
                    background: emailVerified
                      ? "rgba(16,185,129,0.12)"
                      : "var(--color-accent-muted)",
                    border: `2px solid ${emailVerified ? "#10b981" : "var(--color-accent)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 44,
                    transition: "all 0.4s",
                    boxShadow: emailVerified
                      ? "0 0 0 6px rgba(16,185,129,0.12)"
                      : "0 0 0 6px rgba(15,118,110,0.1)",
                  }}
                >
                  {emailVerified ? "✅" : "✉️"}
                </div>
              </div>
            </div>

            <div
              style={{
                background: "var(--color-background-primary)",
                border: `1px solid ${emailVerified ? "rgba(16,185,129,0.4)" : "var(--color-border-secondary)"}`,
                borderRadius: 14,
                padding: "20px 24px",
                marginBottom: 20,
                textAlign: "center",
                transition: "border-color 0.4s",
              }}
            >
              {emailVerified ? (
                <>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#10b981",
                      marginBottom: 4,
                    }}
                  >
                    Email verified! 🎉
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    You're all confirmed. Click Continue.
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: "2.5px solid var(--color-accent)",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: "var(--color-text-primary)",
                      }}
                    >
                      Waiting for verification…
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    Check your inbox and spam folder.
                  </div>
                </>
              )}
            </div>

            <PrimaryBtn onClick={advance} disabled={!emailVerified}>
              {emailVerified ? "Continue →" : "Waiting for email verification…"}
            </PrimaryBtn>
          </>
        );

      // ── 3: Phone ──────────────────────────────────────────────────────────────
      case "phone":
        return (
          <>
            <StepHeader
              icon="📱"
              title="Your phone number"
              sub="Used for account recovery and SMS two-factor authentication."
            />
            {ErrorBanner}
            <div style={{ marginBottom: 20 }}>
              <FieldLabel>
                Phone number{" "}
                <span
                  style={{
                    color: "var(--color-text-tertiary)",
                    fontWeight: 400,
                  }}
                >
                  (optional)
                </span>
              </FieldLabel>
              <FancyInput
                autoFocus
                type="tel"
                placeholder="+1 (416) 555-0100"
                value={form.phone}
                onChange={setF("phone")}
                onKeyDown={(e) => e.key === "Enter" && advance()}
                style={{ fontSize: 18, padding: "16px 18px" }}
              />
            </div>
            <PrimaryBtn onClick={advance}>Continue →</PrimaryBtn>
            <GhostBtn onClick={advance}>Skip for now</GhostBtn>
            {BackLink}
          </>
        );

      // ── 4: Plan selection ─────────────────────────────────────────────────────
      case "plan":
        return (
          <>
            <StepHeader
              icon="💎"
              title="Choose your plan"
              sub="14-day free trial on every plan. No credit card required."
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginBottom: 20,
              }}
            >
              {PLANS.map((p) => {
                const sel = plan === p.id;
                const isCortexPlan = p.id === "cortex";
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlan(p.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "0",
                      borderRadius: 16,
                      border: sel
                        ? `2px solid ${isCortexPlan ? "#6366f1" : "var(--color-accent)"}`
                        : "1.5px solid var(--color-border-secondary)",
                      background: sel
                        ? isCortexPlan
                          ? "rgba(99,102,241,0.06)"
                          : "var(--color-accent-muted)"
                        : "var(--color-background-primary)",
                      cursor: "pointer",
                      transition: "all 0.18s",
                      boxShadow: sel
                        ? isCortexPlan
                          ? "0 6px 24px rgba(99,102,241,0.2)"
                          : "0 6px 24px rgba(15,118,110,0.18)"
                        : "none",
                      overflow: "hidden",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => {
                      if (!sel) {
                        e.currentTarget.style.borderColor = isCortexPlan
                          ? "rgba(99,102,241,0.5)"
                          : "rgba(15,118,110,0.5)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!sel) {
                        e.currentTarget.style.borderColor =
                          "var(--color-border-secondary)";
                        e.currentTarget.style.transform = "";
                      }
                    }}
                  >
                    {/* Popular badge */}
                    {p.popular && (
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          background: "var(--color-accent)",
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "4px 12px",
                          borderRadius: "0 14px 0 8px",
                          letterSpacing: "0.05em",
                        }}
                      >
                        MOST POPULAR
                      </div>
                    )}
                    {isCortexPlan && (
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "4px 12px",
                          borderRadius: "0 14px 0 8px",
                          letterSpacing: "0.05em",
                        }}
                      >
                        AI WORKFORCE
                      </div>
                    )}

                    {/* Main card body */}
                    <div style={{ padding: "18px 20px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 16,
                        }}
                      >
                        {/* Left: name + price */}
                        <div style={{ minWidth: 100, flexShrink: 0 }}>
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 800,
                              letterSpacing: "-0.03em",
                              color: sel
                                ? isCortexPlan
                                  ? "#6366f1"
                                  : "var(--color-accent)"
                                : "var(--color-text-primary)",
                              marginBottom: 4,
                            }}
                          >
                            {p.name}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "baseline",
                              gap: 2,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 28,
                                fontWeight: 800,
                                color: sel
                                  ? isCortexPlan
                                    ? "#6366f1"
                                    : "var(--color-accent)"
                                  : "var(--color-text-primary)",
                                letterSpacing: "-0.04em",
                              }}
                            >
                              ${p.price}
                            </span>
                            <span
                              style={{
                                fontSize: 12,
                                color: "var(--color-text-tertiary)",
                                fontWeight: 400,
                              }}
                            >
                              /mo
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--color-text-tertiary)",
                              marginTop: 2,
                            }}
                          >
                            {p.desc}
                          </div>
                        </div>

                        {/* Right: features */}
                        <div style={{ flex: 1 }}>
                          {p.features.map((f) => (
                            <div
                              key={f}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 7,
                                marginBottom: 5,
                                fontSize: 13,
                                color: sel
                                  ? isCortexPlan
                                    ? "#818cf8"
                                    : "var(--color-accent)"
                                  : "var(--color-text-secondary)",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 11,
                                  flexShrink: 0,
                                  color:
                                    isCortexPlan && sel
                                      ? "#6366f1"
                                      : "var(--color-accent)",
                                }}
                              >
                                ✓
                              </span>
                              {f}
                            </div>
                          ))}
                        </div>

                        {/* Selection indicator */}
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            flexShrink: 0,
                            border: `2px solid ${sel ? (isCortexPlan ? "#6366f1" : "var(--color-accent)") : "var(--color-border-secondary)"}`,
                            background: sel
                              ? isCortexPlan
                                ? "#6366f1"
                                : "var(--color-accent)"
                              : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 700,
                            transition: "all 0.2s",
                          }}
                        >
                          {sel ? "✓" : ""}
                        </div>
                      </div>

                      {/* Cortex pricing breakdown */}
                      {isCortexPlan && (
                        <div
                          style={{
                            marginTop: 14,
                            padding: "12px 14px",
                            background: sel
                              ? "rgba(99,102,241,0.08)"
                              : "var(--color-background-secondary)",
                            borderRadius: 10,
                            border: sel
                              ? "1px solid rgba(99,102,241,0.2)"
                              : "1px solid var(--color-border-secondary)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: sel
                                ? "#6366f1"
                                : "var(--color-text-tertiary)",
                              textTransform: "uppercase",
                              letterSpacing: "0.07em",
                              marginBottom: 8,
                            }}
                          >
                            💳 Cortex Billing Model
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 5,
                            }}
                          >
                            {[
                              {
                                label: "Platform base fee",
                                value: "$299/mo",
                                sub: "Includes 1 agent for 1st clinic",
                              },
                              {
                                label: "Per approved action",
                                value: "$1.50",
                                sub: "Outcome-based — only pay for results",
                              },
                              {
                                label: "Additional agents",
                                value: "$99/mo",
                                sub: "Per agent instance, per clinic",
                              },
                            ].map((row) => (
                              <div
                                key={row.label}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: sel
                                        ? "rgba(129,140,248,0.9)"
                                        : "var(--color-text-secondary)",
                                      fontWeight: 500,
                                    }}
                                  >
                                    {row.label}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: sel
                                        ? "rgba(99,102,241,0.6)"
                                        : "var(--color-text-tertiary)",
                                    }}
                                  >
                                    {row.sub}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: sel
                                      ? "#6366f1"
                                      : "var(--color-text-primary)",
                                    flexShrink: 0,
                                    marginLeft: 8,
                                  }}
                                >
                                  {row.value}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div
                            style={{
                              marginTop: 10,
                              padding: "8px 10px",
                              background: sel
                                ? "rgba(99,102,241,0.1)"
                                : "var(--color-background-primary)",
                              borderRadius: 8,
                              fontSize: 11,
                              color: sel
                                ? "#818cf8"
                                : "var(--color-text-tertiary)",
                              lineHeight: 1.5,
                            }}
                          >
                            🎯 <strong>Outcome-based:</strong> Cortex only bills
                            $1.50 when an action is approved — you're never
                            charged for work that didn't land.
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <PrimaryBtn
              onClick={advance}
              accentOverride={
                plan === "cortex"
                  ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                  : undefined
              }
            >
              Continue with {PLANS.find((p) => p.id === plan)?.name} →
            </PrimaryBtn>
            {BackLink}
          </>
        );

      // ── 5: Clinic name + address ──────────────────────────────────────────────
      case "clinic":
        return (
          <>
            <StepHeader
              icon="🏥"
              title="Your clinic"
              sub="Tell us about your practice. We'll set everything up."
            />
            {ErrorBanner}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                marginBottom: 20,
              }}
            >
              <div>
                <FieldLabel>Clinic name</FieldLabel>
                <FancyInput
                  autoFocus
                  placeholder="Lakeview Dental Group"
                  value={form.clinic}
                  onChange={setF("clinic")}
                  style={{ fontSize: 16 }}
                />
              </div>
              <div>
                <FieldLabel>
                  Address{" "}
                  <span
                    style={{
                      color: "var(--color-text-tertiary)",
                      fontWeight: 400,
                    }}
                  >
                    (optional)
                  </span>
                </FieldLabel>
                <FancyInput
                  placeholder="123 Main St, Toronto, ON M5V 2T6"
                  value={form.address}
                  onChange={setF("address")}
                />
              </div>

              {plan !== "starter" && (
                <div>
                  <FieldLabel>
                    Additional locations{" "}
                    <span
                      style={{
                        color: "var(--color-text-tertiary)",
                        fontWeight: 400,
                      }}
                    >
                      (optional)
                    </span>
                  </FieldLabel>
                  {extraClinics.map((n, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: 8,
                        marginBottom: 8,
                        alignItems: "center",
                      }}
                    >
                      <FancyInput
                        placeholder={`Location #${i + 2}`}
                        value={n}
                        onChange={(e) => {
                          const next = [...extraClinics];
                          next[i] = e.target.value;
                          setExtraClinics(next);
                        }}
                      />
                      <button
                        onClick={() =>
                          setExtraClinics((prev) =>
                            prev.filter((_, idx) => idx !== i),
                          )
                        }
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          fontSize: 20,
                          cursor: "pointer",
                          flexShrink: 0,
                          padding: "0 4px",
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {extraClinics.length + 1 < (plan === "pro" ? 3 : 999) && (
                    <button
                      onClick={() => setExtraClinics((p) => [...p, ""])}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: 10,
                        border: "1.5px dashed var(--color-border-secondary)",
                        background: "none",
                        color: "var(--color-text-secondary)",
                        fontSize: 13,
                        cursor: "pointer",
                        transition: "border-color 0.15s, color 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor =
                          "var(--color-accent)";
                        e.currentTarget.style.color = "var(--color-accent)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor =
                          "var(--color-border-secondary)";
                        e.currentTarget.style.color =
                          "var(--color-text-secondary)";
                      }}
                    >
                      + Add another location
                    </button>
                  )}
                </div>
              )}
            </div>

            <PrimaryBtn
              onClick={submitClinic}
              disabled={loading || !form.clinic.trim()}
            >
              {loading ? "Saving…" : "Continue →"}
            </PrimaryBtn>
            {BackLink}
          </>
        );

      // ── 5 (Cortex only): Agent selection ─────────────────────────────────────
      case "agents":
        return (
          <>
            <div
              style={{
                marginBottom: "1.5rem",
                animation: "stepFadeUp 0.4s ease-out both",
              }}
            >
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 22,
                  background: "rgba(99,102,241,0.1)",
                  border: "1.5px solid rgba(99,102,241,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 34,
                  marginBottom: 22,
                  boxShadow: "0 4px 20px rgba(99,102,241,0.2)",
                }}
              >
                🧠
              </div>
              <h1
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  color: "var(--color-text-primary)",
                  marginBottom: 10,
                  lineHeight: 1.1,
                }}
              >
                Hire your agents
              </h1>
              <p
                style={{
                  fontSize: 15,
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                Choose which AI digital employees will work for your clinic.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 20,
              }}
            >
              {CORTEX_AGENTS.map((agent) => {
                const sel = selectedAgents.includes(agent.id);
                return (
                  <div
                    key={agent.id}
                    onClick={() =>
                      setSelectedAgents((p) =>
                        sel
                          ? p.filter((a) => a !== agent.id)
                          : [...p, agent.id],
                      )
                    }
                    style={{
                      padding: "14px",
                      borderRadius: 12,
                      cursor: "pointer",
                      position: "relative",
                      border: sel
                        ? "2px solid #6366f1"
                        : "1.5px solid var(--color-border-secondary)",
                      background: sel
                        ? "rgba(99,102,241,0.07)"
                        : "var(--color-background-primary)",
                      transition: "all 0.2s",
                      boxShadow: sel
                        ? "0 4px 14px rgba(99,102,241,0.2)"
                        : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!sel)
                        e.currentTarget.style.borderColor =
                          "rgba(99,102,241,0.4)";
                    }}
                    onMouseLeave={(e) => {
                      if (!sel)
                        e.currentTarget.style.borderColor =
                          "var(--color-border-secondary)";
                    }}
                  >
                    {sel && (
                      <div
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: "#6366f1",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        ✓
                      </div>
                    )}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: agent.gradient,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        marginBottom: 8,
                      }}
                    >
                      {agent.avatar}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--color-text-primary)",
                        marginBottom: 2,
                      }}
                    >
                      {agent.name}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "#8b5cf6",
                        marginBottom: 6,
                      }}
                    >
                      {agent.role}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: sel ? "#6366f1" : "var(--color-text-tertiary)",
                      }}
                    >
                      {agent.fee}
                    </div>
                  </div>
                );
              })}
            </div>

            <PrimaryBtn
              onClick={advance}
              accentOverride="linear-gradient(135deg,#6366f1,#8b5cf6)"
            >
              Continue with {selectedAgents.length} agent
              {selectedAgents.length !== 1 ? "s" : ""} →
            </PrimaryBtn>
            {BackLink}
          </>
        );

      // ── 6: 2FA / Security ─────────────────────────────────────────────────────
      case "security":
        return (
          <>
            <StepHeader
              icon="🔐"
              title="Lock it down"
              sub="PHIPA requires access controls for patient health data. Set up 2FA to protect your account."
            />
            {ErrorBanner}

            {mfaData ? (
              <div
                style={{
                  background: "var(--color-background-primary)",
                  border: "1px solid var(--color-border-secondary)",
                  borderRadius: 14,
                  padding: "20px 24px",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                    marginBottom: 14,
                  }}
                >
                  Scan with Google Authenticator or Authy
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      padding: 8,
                      background: "#fff",
                      borderRadius: 12,
                      boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
                    }}
                  >
                    <img
                      src={mfaData.qrCodeDataUrl}
                      alt="TOTP QR code"
                      style={{
                        width: 150,
                        height: 150,
                        display: "block",
                        borderRadius: 8,
                      }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--color-text-secondary)",
                    textAlign: "center",
                    marginBottom: 16,
                  }}
                >
                  Or enter manually:{" "}
                  <code
                    style={{
                      background: "var(--color-background-secondary)",
                      padding: "2px 8px",
                      borderRadius: 5,
                      fontSize: 11,
                      letterSpacing: "0.05em",
                    }}
                  >
                    {mfaData.secret}
                  </code>
                </div>
                <FancyInput
                  value={mfaCode}
                  onChange={(e) =>
                    setMfaCode(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  inputMode="numeric"
                  autoFocus
                  style={{
                    textAlign: "center",
                    letterSpacing: "0.35em",
                    fontSize: 24,
                    fontFamily: "monospace",
                    padding: "14px",
                  }}
                />

                {mfaData.backupCodes && mfaData.backupCodes.length > 0 && (
                  <div
                    style={{
                      marginTop: 18,
                      padding: "14px 16px",
                      background: "var(--color-background-secondary)",
                      borderRadius: 10,
                      border: "1px solid var(--color-border-secondary)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--color-text-secondary)",
                        marginBottom: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span>🔑</span> Backup codes — save these somewhere safe
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "4px 12px",
                      }}
                    >
                      {mfaData.backupCodes.map((code, i) => (
                        <code
                          key={i}
                          style={{
                            fontSize: 12,
                            color: "var(--color-text-primary)",
                            letterSpacing: "0.1em",
                            fontFamily: "monospace",
                            padding: "2px 0",
                          }}
                        >
                          {code}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : mfaLoadError ? (
              <div
                style={{
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: 14,
                  padding: "28px 24px",
                  marginBottom: 20,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                    marginBottom: 6,
                  }}
                >
                  Couldn't load authenticator setup
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-secondary)",
                    marginBottom: 16,
                  }}
                >
                  {sessionToken
                    ? "There was a problem reaching the server."
                    : "Your session may have expired — please go back and log in again."}
                </div>
                {sessionToken && (
                  <button
                    onClick={() => setMfaLoadError(false)}
                    style={{
                      padding: "9px 20px",
                      borderRadius: 8,
                      border: "1.5px solid var(--color-border-secondary)",
                      background: "transparent",
                      color: "var(--color-text-secondary)",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Retry
                  </button>
                )}
              </div>
            ) : (
              <div
                style={{
                  background: "var(--color-background-primary)",
                  border: "1px solid var(--color-border-secondary)",
                  borderRadius: 14,
                  padding: "32px 24px",
                  marginBottom: 20,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    border: "2.5px solid var(--color-accent)",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                    margin: "0 auto 12px",
                  }}
                />
                <div
                  style={{ fontSize: 14, color: "var(--color-text-secondary)" }}
                >
                  Loading authenticator setup…
                </div>
              </div>
            )}

            <PrimaryBtn onClick={submitMfa} disabled={loading}>
              {loading
                ? "Saving…"
                : mfaData && mfaCode.length === 6
                  ? "Enable 2FA & continue →"
                  : "Skip for now →"}
            </PrimaryBtn>
            {BackLink}
          </>
        );

      // ── 7: Connect PMS ───────────────────────────────────────────────────────
      case "connect":
        return (
          <>
            <StepHeader
              icon="🔌"
              title="Connect your PMS"
              sub="Automatically sync patients, procedures, and insurance plans."
            />

            {pmsStatus === "idle" && (
              <>
                <div
                  style={{
                    border: "1.5px solid var(--color-accent)",
                    borderRadius: 14,
                    padding: "18px",
                    marginBottom: 12,
                    background: "var(--color-accent-muted)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: "var(--color-accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        flexShrink: 0,
                      }}
                    >
                      🦷
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: "var(--color-text-primary)",
                        }}
                      >
                        Open Dental
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        v24.x · REST API
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        background: "rgba(5,150,105,0.15)",
                        color: "#059669",
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontWeight: 600,
                      }}
                    >
                      Supported
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-secondary)",
                      marginBottom: 14,
                    }}
                  >
                    Syncs patients, procedures, insurance plans, and appointment
                    history
                  </div>
                  <button
                    onClick={startPms}
                    style={{
                      width: "100%",
                      padding: "11px",
                      borderRadius: 9,
                      border: "none",
                      background: "linear-gradient(135deg,#0f766e,#0d9488)",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      boxShadow: "0 3px 12px rgba(15,118,110,0.3)",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow =
                        "0 6px 18px rgba(15,118,110,0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "";
                      e.currentTarget.style.boxShadow =
                        "0 3px 12px rgba(15,118,110,0.3)";
                    }}
                  >
                    Connect Open Dental →
                  </button>
                </div>

                {["Dentrix G7+", "ClearDent"].map((n) => (
                  <div
                    key={n}
                    style={{
                      border: "1px dashed var(--color-border-secondary)",
                      borderRadius: 12,
                      padding: "14px 18px",
                      marginBottom: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      opacity: 0.55,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "var(--color-text-primary)",
                      }}
                    >
                      {n}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        background: "var(--color-background-secondary)",
                        color: "var(--color-text-secondary)",
                        padding: "3px 10px",
                        borderRadius: 20,
                      }}
                    >
                      Coming soon
                    </span>
                  </div>
                ))}

                <GhostBtn onClick={advance}>
                  Skip — connect manually later
                </GhostBtn>
                {BackLink}
              </>
            )}

            {pmsStatus === "connecting" && (
              <div
                style={{
                  background: "var(--color-background-primary)",
                  border: "1px solid var(--color-border-secondary)",
                  borderRadius: 14,
                  padding: "28px 24px",
                }}
              >
                <div
                  style={{
                    height: 6,
                    background: "var(--color-background-secondary)",
                    borderRadius: 3,
                    marginBottom: 24,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pmsProgress}%`,
                      background: "linear-gradient(90deg,#0f766e,#14b8a6)",
                      borderRadius: 3,
                      transition: "width 0.3s",
                      boxShadow: "0 0 8px rgba(15,118,110,0.5)",
                    }}
                  />
                </div>
                {[
                  "Provisioning your workspace",
                  "Configuring Open Dental bridge",
                  "Loading insurance rule engine",
                  "Enabling AI copilot",
                ].map((s, i) => {
                  const done = Math.floor(pmsProgress / 25);
                  const isActive = i === done;
                  return (
                    <div
                      key={s}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 14,
                        opacity: i < done ? 1 : isActive ? 1 : 0.3,
                        transition: "opacity 0.4s",
                      }}
                    >
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 700,
                          background:
                            i < done
                              ? "var(--color-accent)"
                              : isActive
                                ? "var(--color-accent-muted)"
                                : "var(--color-background-secondary)",
                          color:
                            i < done
                              ? "#fff"
                              : isActive
                                ? "var(--color-accent)"
                                : "var(--color-text-secondary)",
                          transition: "all 0.4s",
                        }}
                      >
                        {i < done ? (
                          "✓"
                        ) : isActive ? (
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              border: "2px solid var(--color-accent)",
                              borderTopColor: "transparent",
                              borderRadius: "50%",
                              animation: "spin 0.8s linear infinite",
                            }}
                          />
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: 14,
                          color:
                            i < done
                              ? "var(--color-accent)"
                              : "var(--color-text-primary)",
                          fontWeight: i < done ? 500 : 400,
                        }}
                      >
                        {s}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {pmsStatus === "connected" && (
              <>
                <div
                  style={{
                    background: "rgba(5,150,105,0.08)",
                    border: "1px solid rgba(5,150,105,0.4)",
                    borderRadius: 14,
                    padding: "20px 24px",
                    marginBottom: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    animation: "stepFadeUp 0.3s ease-out",
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: "#059669",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 22,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#059669",
                        marginBottom: 2,
                      }}
                    >
                      Open Dental connected!
                    </div>
                    <div style={{ fontSize: 13, color: "#047857" }}>
                      Full patient sync available in production.
                    </div>
                  </div>
                </div>
                <PrimaryBtn onClick={advance}>Continue →</PrimaryBtn>
              </>
            )}
          </>
        );

      // ── 8: Terms + Launch ────────────────────────────────────────────────────
      case "launch":
        return (
          <>
            <StepHeader
              icon="🚀"
              title="Almost there!"
              sub={`${form.clinic || "Your clinic"} is ready to launch on DentalIQ.`}
            />

            {/* Summary cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 20,
              }}
            >
              {[
                { label: "Account", value: form.name || "Created", ok: true },
                {
                  label: "Locations",
                  value: `${extraClinics.length + 1} ready`,
                  ok: true,
                },
                {
                  label: "Plan",
                  value: `${PLANS.find((p) => p.id === plan)?.name} · 14-day trial`,
                  ok: true,
                },
                {
                  label: "AI Copilot",
                  value: plan === "starter" ? "Upgrade to unlock" : "Active ✓",
                  ok: plan !== "starter",
                },
              ].map(({ label, value, ok }) => (
                <div
                  key={label}
                  style={{
                    background: "var(--color-background-primary)",
                    border: "1px solid var(--color-border-secondary)",
                    borderRadius: 10,
                    padding: "12px 14px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--color-text-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      marginBottom: 4,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: ok ? "#10b981" : "var(--color-text-secondary)",
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Terms */}
            <div
              style={{
                background: "var(--color-background-primary)",
                border: "1px solid var(--color-border-secondary)",
                borderRadius: 14,
                padding: "18px 20px",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  marginBottom: 10,
                }}
              >
                Terms & Conditions
              </div>
              <div
                style={{
                  height: 130,
                  overflowY: "auto",
                  padding: "12px 14px",
                  background: "var(--color-background-secondary)",
                  borderRadius: 8,
                  marginBottom: 16,
                  fontSize: 12,
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.7,
                }}
              >
                <p style={{ margin: "0 0 8px", fontWeight: 600 }}>
                  DentalIQ Terms of Service
                </p>
                <p style={{ margin: "0 0 8px" }}>
                  DentalIQ is an administrative assistance tool. You remain
                  solely responsible for verifying all AI-generated content
                  before submission to insurance providers or patients.
                </p>
                <p style={{ margin: "0 0 8px" }}>
                  DentalIQ complies with PHIPA requirements for handling
                  personal health information. You agree to maintain appropriate
                  access controls and to report any suspected security breaches
                  immediately.
                </p>
                <p style={{ margin: "0 0 8px" }}>
                  Billing is monthly with no long-term commitment. Your 14-day
                  trial includes full access to all features of your selected
                  plan at no charge. You may cancel at any time before the trial
                  ends.
                </p>
                <p style={{ margin: 0 }}>
                  By creating an account you confirm you are authorised to act
                  on behalf of your clinic and accept these terms on its behalf.
                </p>
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  style={{
                    marginTop: 3,
                    width: 16,
                    height: 16,
                    accentColor: "var(--color-accent)",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-secondary)",
                    lineHeight: 1.55,
                  }}
                >
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    target="_blank"
                    style={{
                      color: "var(--color-accent)",
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    target="_blank"
                    style={{
                      color: "var(--color-accent)",
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    Privacy Policy
                  </Link>
                  . I understand DentalIQ is an administrative tool and I remain
                  responsible for verifying all AI-generated content.
                </span>
              </label>
            </div>

            <PrimaryBtn onClick={goToDashboard} disabled={!termsAccepted}>
              🚀 Launch Dashboard
            </PrimaryBtn>
            {BackLink}
          </>
        );

      default:
        return null;
    }
  }

  // ── Layout ────────────────────────────────────────────────────────────────────

  const progress = steps.length > 1 ? stepIdx / (steps.length - 1) : 1;

  // Show launch screen before navigating to dashboard
  if (showLaunch) {
    return (
      <LaunchScreen
        variant="signup"
        clinicName={form.clinic || undefined}
        onDone={() => router.push("/dashboard")}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-background-secondary)",
        color: "var(--color-text-primary)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* CSS keyframes */}
      <style>{`
        @keyframes blobDriftA {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(50px,-35px) scale(1.06); }
          66%      { transform: translate(-20px,40px) scale(0.97); }
        }
        @keyframes blobDriftB {
          0%,100% { transform: translate(0,0) scale(1); }
          40%     { transform: translate(-55px,45px) scale(1.07); }
          70%     { transform: translate(30px,-25px) scale(0.96); }
        }
        @keyframes blobDriftC {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(40px,55px) scale(0.94); }
        }
        @keyframes pulseRing {
          0%   { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.0); opacity: 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes stepFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(56px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-56px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Background animated orbs */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 700,
            height: 700,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(15,118,110,0.11) 0%, transparent 65%)",
            top: "-22%",
            left: "-18%",
            animation: "blobDriftA 24s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 580,
            height: 580,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 65%)",
            bottom: "-10%",
            right: "-14%",
            animation: "blobDriftB 30s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 420,
            height: 420,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(14,165,233,0.07) 0%, transparent 65%)",
            top: "48%",
            left: "52%",
            animation: "blobDriftC 20s ease-in-out infinite",
          }}
        />
      </div>

      {/* Thin teal progress bar — fixed at very top */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          zIndex: 200,
        }}
      >
        <div
          style={{
            height: "100%",
            background: "linear-gradient(90deg, #0f766e, #14b8a6, #0d9488)",
            width: `${progress * 100}%`,
            transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
            borderRadius: "0 3px 3px 0",
            boxShadow: "0 0 10px rgba(20,184,166,0.6)",
          }}
        />
      </div>

      {/* Header */}
      <header
        style={{
          position: "relative",
          zIndex: 10,
          borderBottom: "1px solid var(--color-border-secondary)",
          background: "var(--color-background-primary)",
          padding: "0 2rem",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: "linear-gradient(135deg, #0f766e, #0d9488)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 800,
              color: "#fff",
              boxShadow: "0 2px 10px rgba(15,118,110,0.4)",
            }}
          >
            +
          </div>
          <span
            style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: "var(--color-text-primary)",
            }}
          >
            DentalIQ
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <ThemeToggle storageKey="diq_pub_theme" variant="pill" />
          <a
            href="/login"
            style={{
              fontSize: 14,
              color: "var(--color-text-secondary)",
              textDecoration: "none",
            }}
          >
            Already have an account?{" "}
            <span style={{ color: "var(--color-accent)", fontWeight: 600 }}>
              Sign in
            </span>
          </a>
        </div>
      </header>

      {/* Step indicator */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          paddingTop: 24,
          paddingBottom: 4,
        }}
      >
        {/* Pill dots */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 5,
            marginBottom: 8,
          }}
        >
          {steps.map((s, i) => (
            <div
              key={s.id}
              style={{
                height: 7,
                borderRadius: 4,
                width: i === stepIdx ? 28 : 7,
                background:
                  i < stepIdx
                    ? "var(--color-accent)"
                    : i === stepIdx
                      ? "linear-gradient(90deg, #0f766e, #14b8a6)"
                      : "var(--color-border-secondary)",
                transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
                boxShadow:
                  i === stepIdx ? "0 0 8px rgba(15,118,110,0.55)" : "none",
              }}
            />
          ))}
        </div>
        {/* Step label */}
        <div
          style={{
            textAlign: "center",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--color-text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.09em",
          }}
        >
          {steps[stepIdx]?.label ?? ""} · {stepIdx + 1} of {steps.length}
        </div>
      </div>

      {/* Step renderer — one step at a time, slides in/out on button click only.
          No percentage-based carousel track so resizing the browser never causes
          an unwanted slide transition. */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          overflow: "hidden",
          width: "100%",
        }}
      >
        <div
          key={stepIdx}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            padding: "36px 16px 72px",
            minHeight: "calc(100vh - 142px)",
            animation: `${direction === "back" ? "slideInLeft" : "slideInRight"} 0.38s cubic-bezier(0.4,0,0.2,1) both`,
          }}
        >
          <div style={{ maxWidth: 480, width: "100%" }}>
            {renderStep(currentId as StepId)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPageWrapper() {
  return (
    <Suspense fallback={null}>
      <SignupPage />
    </Suspense>
  );
}
