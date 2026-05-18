"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi, mfaApi, ApiError, type MfaMethodType } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { ThemeToggle } from "@/components/ThemeToggle";

// ── 2FA nudge sub-steps inside login ────────────────────────
type NudgeStep = "prompt" | "pick" | "totp-scan" | "otp-verify"

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAuth();

  // Login form state
  const [form, setForm] = useState({ email: "", password: "", totpCode: "" });
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [availableMethods, setAvailableMethods] = useState<MfaMethodType[]>([]);
  const [mfaMethod, setMfaMethod] = useState<MfaMethodType>("totp");
  const [methodPicking, setMethodPicking] = useState(false); // showing method picker
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Pending session — held while showing 2FA nudge
  const [pendingSession, setPendingSession] = useState<{ token: string; user: import("@/lib/api").AuthUser } | null>(null);

  // 2FA nudge state
  const [nudgeStep, setNudgeStep] = useState<NudgeStep>("prompt");
  const [nudgeMfaMethod, setNudgeMfaMethod] = useState<MfaMethodType>("totp");
  const [nudgeTotpData, setNudgeTotpData] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [nudgeCode, setNudgeCode] = useState("");
  const [nudgeLoading, setNudgeLoading] = useState(false);
  const [nudgeError, setNudgeError] = useState("");
  const [nudgeResendCooldown, setNudgeResendCooldown] = useState(0);

  // Complete login — call this whenever we're ready to enter the dashboard
  function completeLogin(token?: string, user?: import("@/lib/api").AuthUser) {
    const t = token ?? pendingSession?.token;
    const u = user ?? pendingSession?.user;
    if (t && u) {
      setSession(t, u);
      router.push("/dashboard");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await authApi.login({
        email: form.email,
        password: form.password,
        totpCode: requiresMfa ? form.totpCode : undefined,
        selectedMfaMethod: requiresMfa ? mfaMethod : undefined,
      });
      if ("requiresMfa" in result) {
        const methods = result.availableMethods ?? [];
        setAvailableMethods(methods);
        setRequiresMfa(true);
        if (methods.length > 1) {
          // Let user pick which method to use
          setMethodPicking(true);
        } else {
          const method = methods[0] ?? "totp";
          setMfaMethod(method);
          setMethodPicking(false);
          if (method === "email" || method === "sms") {
            setResendCooldown(30);
            const t = setInterval(() => setResendCooldown(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
          }
        }
        setLoading(false);
        return;
      }
      // Successful login — check if they need a 2FA nudge
      if (!result.user.mfaEnabled) {
        setPendingSession({ token: result.accessToken, user: result.user });
        setNudgeStep("prompt");
        setNudgeCode("");
        setNudgeError("");
        setNudgeTotpData(null);
        setLoading(false);
        return;
      }
      completeLogin(result.accessToken, result.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
      setLoading(false);
    }
  }

  async function pickMfaMethod(method: MfaMethodType) {
    setMfaMethod(method);
    setMethodPicking(false);
    setForm(f => ({ ...f, totpCode: "" }));
    setError("");
    if (method === "email" || method === "sms") {
      // Trigger OTP send now that the user has chosen — call login again with
      // selectedMfaMethod (no totpCode) so the backend sends the code.
      try {
        await authApi.login({
          email: form.email,
          password: form.password,
          selectedMfaMethod: method,
        });
      } catch { /* server returns requiresMfa:true (202), not an error */ }
      setResendCooldown(30);
      const t = setInterval(() => setResendCooldown(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0) return;
    try {
      await authApi.login({ email: form.email, password: form.password, selectedMfaMethod: mfaMethod });
      setResendCooldown(30);
      const t = setInterval(() => setResendCooldown(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
    } catch { /* ignore */ }
  }

  // ── 2FA Nudge handlers ──────────────────────────────────────
  async function nudgeStartMethod(method: MfaMethodType) {
    if (!pendingSession) return;
    setNudgeMfaMethod(method);
    setNudgeError("");
    setNudgeCode("");
    setNudgeLoading(true);
    try {
      if (method === "totp") {
        const data = await mfaApi.setupTotp(pendingSession.token);
        setNudgeTotpData(data);
        setNudgeStep("totp-scan");
      } else if (method === "email") {
        await mfaApi.setupEmail(pendingSession.token);
        setNudgeResendCooldown(30);
        const t = setInterval(() => setNudgeResendCooldown(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
        setNudgeStep("otp-verify");
      }
    } catch (err: any) {
      setNudgeError(err?.message ?? "Failed to start setup");
    } finally {
      setNudgeLoading(false);
    }
  }

  async function nudgeVerify() {
    if (!pendingSession || nudgeCode.length < 6) return;
    setNudgeLoading(true);
    setNudgeError("");
    try {
      if (nudgeMfaMethod === "totp" && nudgeTotpData) {
        await mfaApi.verifyTotp(pendingSession.token, nudgeCode, nudgeTotpData.secret);
      } else if (nudgeMfaMethod === "email") {
        await mfaApi.verifyEmailSetup(pendingSession.token, nudgeCode);
      }
      // 2FA enabled — go to dashboard
      completeLogin();
    } catch (err: any) {
      setNudgeError(err?.message ?? "Incorrect code. Please try again.");
    } finally {
      setNudgeLoading(false);
    }
  }

  const inputStyle = (field: string): React.CSSProperties => ({
    width: "100%",
    padding: "11px 14px 11px 42px",
    border: `1.5px solid ${focusedField === field ? "var(--color-accent)" : "var(--color-border-secondary)"}`,
    borderRadius: 10,
    fontSize: 14,
    color: "var(--color-text-primary)",
    outline: "none",
    background: "var(--color-input-bg)",
    transition: "border-color 0.15s, box-shadow 0.15s",
    boxShadow:
      focusedField === field ? "0 0 0 3px var(--color-accent-subtle)" : "none",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        position: "relative",
      }}
    >
      {/* Left panel — brand */}
      <div
        style={{
          background:
            "linear-gradient(145deg, #0c4a44 0%, #0f766e 40%, #0d9488 75%, #0c6b62 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "3rem",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Animated background blobs */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-15%",
              right: "-10%",
              width: 420,
              height: 420,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)",
              animation: "float 8s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-10%",
              left: "-8%",
              width: 320,
              height: 320,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)",
              animation: "float 11s ease-in-out infinite 2s",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "40%",
              left: "50%",
              width: 180,
              height: 180,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)",
              animation: "floatSlow 14s ease-in-out infinite 1s",
            }}
          />
          {/* Grid pattern overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              opacity: 0.6,
            }}
          />
        </div>

        {/* Logo */}
        <div
          style={{
            position: "relative",
            animation: "fadeInDown 0.5s ease-out",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: "3.5rem",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 19,
                fontWeight: 800,
              }}
            >
              +
            </div>
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "-0.03em",
              }}
            >
              DentalIQ
            </span>
          </div>

          <h1
            style={{
              fontSize: 34,
              fontWeight: 800,
              lineHeight: 1.2,
              marginBottom: "1rem",
              letterSpacing: "-0.035em",
            }}
          >
            Stop losing $3K/month
            <br />
            to insurance guesswork.
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "rgba(255,255,255,0.78)",
              lineHeight: 1.65,
              maxWidth: 340,
            }}
          >
            Real-time coverage estimates, claim risk detection, and AI-drafted
            pre-auth letters — built for Ontario dental clinics.
          </p>
        </div>

        {/* Feature bullets + testimonial */}
        <div
          style={{
            position: "relative",
            animation: "fadeInUp 0.5s ease-out 0.2s both",
          }}
        >
          <div
            style={{
              marginBottom: "1.8rem",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {[
              { icon: "⚡", text: "Coverage answers in under 2 seconds" },
              { icon: "🛡", text: "PHIPA-compliant · Canadian data centres" },
              { icon: "🤖", text: "AI pre-auth letters in 90 seconds" },
            ].map((f) => (
              <div
                key={f.text}
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: "rgba(255,255,255,0.12)",
                    backdropFilter: "blur(4px)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  {f.icon}
                </div>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.88)" }}>
                  {f.text}
                </span>
              </div>
            ))}
          </div>

          {/* Testimonial card — glassmorphism */}
          <div
            style={{
              padding: "1.25rem",
              background: "rgba(255,255,255,0.08)",
              borderRadius: 16,
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            }}
          >
            {/* Stars */}
            <div style={{ display: "flex", gap: 3, marginBottom: 10 }}>
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <svg
                    key={i}
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="#fbbf24"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
            </div>
            <p
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.9)",
                lineHeight: 1.65,
                fontStyle: "italic",
                marginBottom: 12,
              }}
            >
              "We recovered $7,200 in the first month. The pre-auth drafting
              alone saves us 2 hours a day."
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.15))",
                  border: "1.5px solid rgba(255,255,255,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                KM
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  Dr. K. Mehta
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>
                  Oakville Family Dental
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          background: "var(--color-background-primary)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "12px 20px",
            borderBottom: "1px solid var(--color-border-tertiary)",
          }}
        >
          <ThemeToggle storageKey="diq_pub_theme" variant="pill" />
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2.5rem 3rem",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 400,
              animation: "fadeInUp 0.45s ease-out 0.1s both",
            }}
          >

            {/* ── 2FA Nudge screen (shown when user has no MFA set up) ── */}
            {pendingSession && (
              <div>
                {nudgeStep === "prompt" && (
                  <>
                    <div style={{ textAlign: "center", marginBottom: 24 }}>
                      <div style={{
                        width: 60, height: 60, borderRadius: 18,
                        background: "rgba(245,158,11,0.10)",
                        border: "1.5px solid rgba(245,158,11,0.22)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 28, margin: "0 auto 16px",
                      }}>🔓</div>
                      <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 8px", letterSpacing: "-0.03em" }}>
                        Secure your account
                      </h2>
                      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6, margin: 0 }}>
                        Two-factor authentication isn't set up yet. It takes under a minute and protects your clinic's patient data.
                      </p>
                    </div>

                    {/* Method options */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                      <button onClick={() => nudgeStartMethod("totp")} disabled={nudgeLoading} style={{
                        display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                        border: "1.5px solid var(--color-border-secondary)", borderRadius: 12,
                        background: "var(--color-background-secondary)", cursor: nudgeLoading ? "not-allowed" : "pointer",
                        textAlign: "left", transition: "border-color 0.15s, box-shadow 0.15s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-accent-subtle)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border-secondary)"; e.currentTarget.style.boxShadow = "none"; }}
                      >
                        <span style={{ fontSize: 26, flexShrink: 0 }}>📱</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>Authenticator app</div>
                          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>Google Authenticator, Authy, 1Password</div>
                        </div>
                        <span style={{ fontSize: 12, padding: "3px 9px", borderRadius: 20, background: "rgba(16,185,129,0.1)", color: "#10b981", fontWeight: 700, flexShrink: 0 }}>Recommended</span>
                      </button>

                      <button onClick={() => nudgeStartMethod("email")} disabled={nudgeLoading} style={{
                        display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                        border: "1.5px solid var(--color-border-secondary)", borderRadius: 12,
                        background: "var(--color-background-secondary)", cursor: nudgeLoading ? "not-allowed" : "pointer",
                        textAlign: "left", transition: "border-color 0.15s, box-shadow 0.15s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-accent-subtle)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border-secondary)"; e.currentTarget.style.boxShadow = "none"; }}
                      >
                        <span style={{ fontSize: 26, flexShrink: 0 }}>✉️</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>Email code</div>
                          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>6-digit code sent to your email each sign-in</div>
                        </div>
                      </button>

                      {/* SMS — disabled */}
                      <div style={{
                        display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                        border: "1.5px solid var(--color-border-secondary)", borderRadius: 12,
                        background: "var(--color-background-secondary)", opacity: 0.45, cursor: "not-allowed",
                      }}>
                        <span style={{ fontSize: 26, flexShrink: 0 }}>💬</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>SMS text message</div>
                          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>Code sent to your phone number</div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", background: "rgba(100,116,139,0.15)", color: "var(--color-text-secondary)", borderRadius: 20, flexShrink: 0, whiteSpace: "nowrap" }}>Coming soon</span>
                      </div>
                    </div>

                    {nudgeError && <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 12, textAlign: "center" }}>{nudgeError}</p>}

                    <button onClick={() => completeLogin()} style={{
                      width: "100%", background: "none", border: "none",
                      color: "var(--color-text-tertiary)", fontSize: 13, cursor: "pointer", padding: "10px 0",
                      textDecoration: "underline", textDecorationColor: "transparent",
                      transition: "color 0.15s",
                    }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--color-text-secondary)"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--color-text-tertiary)"}
                    >
                      Remind me next time — skip for now
                    </button>
                  </>
                )}

                {nudgeStep === "totp-scan" && nudgeTotpData && (
                  <>
                    <div style={{ textAlign: "center", marginBottom: 20 }}>
                      <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 6px", letterSpacing: "-0.03em" }}>
                        Scan this QR code
                      </h2>
                      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
                        Open your authenticator app and scan to add your account.
                      </p>
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                      <div style={{ background: "#fff", borderRadius: 14, padding: 10, display: "inline-block", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={nudgeTotpData.qrCodeDataUrl} alt="TOTP QR code" style={{ width: 164, height: 164, display: "block" }} />
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--color-text-secondary)", textAlign: "center", marginBottom: 4 }}>
                      Can't scan? Manual code:
                    </p>
                    <p style={{ fontSize: 11, fontFamily: "monospace", letterSpacing: "0.07em", color: "var(--color-text-primary)", textAlign: "center", background: "var(--color-background-secondary)", padding: "6px 10px", borderRadius: 8, marginBottom: 16 }}>
                      {nudgeTotpData.secret}
                    </p>
                    <input
                      type="text" inputMode="numeric" maxLength={6}
                      placeholder="Enter 6-digit code to confirm"
                      value={nudgeCode}
                      onChange={e => setNudgeCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      onKeyDown={e => { if (e.key === "Enter") nudgeVerify(); }}
                      autoFocus
                      style={{
                        width: "100%", padding: "14px", textAlign: "center", fontSize: 26,
                        fontFamily: "monospace", letterSpacing: "0.3em",
                        border: `1.5px solid ${nudgeError ? "#ef4444" : "var(--color-border-secondary)"}`,
                        borderRadius: 12, color: "var(--color-text-primary)", outline: "none",
                        background: "var(--color-input-bg)", boxSizing: "border-box", marginBottom: 8,
                        transition: "border-color 0.15s, box-shadow 0.15s",
                      }}
                      onFocus={e => e.target.style.boxShadow = "0 0 0 3px var(--color-accent-subtle)"}
                      onBlur={e => e.target.style.boxShadow = "none"}
                    />
                    {nudgeError && <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 8, textAlign: "center" }}>{nudgeError}</p>}
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button onClick={() => { setNudgeStep("prompt"); setNudgeCode(""); setNudgeError(""); }} style={{
                        flex: 1, padding: "11px", borderRadius: 10, border: "1.5px solid var(--color-border-secondary)",
                        background: "transparent", color: "var(--color-text-secondary)", fontSize: 14, cursor: "pointer",
                      }}>← Back</button>
                      <button onClick={nudgeVerify} disabled={nudgeCode.length !== 6 || nudgeLoading} style={{
                        flex: 2, padding: "11px", borderRadius: 10, border: "none",
                        background: nudgeCode.length === 6 ? "linear-gradient(135deg, #0f766e, #0d9488)" : "var(--color-border-secondary)",
                        color: nudgeCode.length === 6 ? "#fff" : "var(--color-text-tertiary)",
                        fontSize: 14, fontWeight: 600, cursor: nudgeCode.length === 6 ? "pointer" : "not-allowed",
                        boxShadow: nudgeCode.length === 6 ? "0 4px 14px rgba(15,118,110,0.3)" : "none",
                        transition: "all 0.15s",
                      }}>
                        {nudgeLoading ? "Activating…" : "Enable & sign in →"}
                      </button>
                    </div>
                    <button onClick={() => completeLogin()} style={{
                      width: "100%", background: "none", border: "none", marginTop: 12,
                      color: "var(--color-text-tertiary)", fontSize: 12, cursor: "pointer", padding: "6px 0",
                    }}>Skip for now</button>
                  </>
                )}

                {nudgeStep === "otp-verify" && (
                  <>
                    <div style={{ textAlign: "center", marginBottom: 20 }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>✉️</div>
                      <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 6px", letterSpacing: "-0.03em" }}>
                        Check your email
                      </h2>
                      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.5 }}>
                        We sent a 6-digit code to <strong style={{ color: "var(--color-text-primary)" }}>{form.email}</strong>
                      </p>
                    </div>
                    <input
                      type="text" inputMode="numeric" maxLength={6}
                      placeholder="000000"
                      value={nudgeCode}
                      onChange={e => setNudgeCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      onKeyDown={e => { if (e.key === "Enter") nudgeVerify(); }}
                      autoFocus
                      style={{
                        width: "100%", padding: "14px", textAlign: "center", fontSize: 30,
                        fontFamily: "monospace", letterSpacing: "0.3em",
                        border: `1.5px solid ${nudgeError ? "#ef4444" : "var(--color-border-secondary)"}`,
                        borderRadius: 12, color: "var(--color-text-primary)", outline: "none",
                        background: "var(--color-input-bg)", boxSizing: "border-box", marginBottom: 8,
                        transition: "border-color 0.15s, box-shadow 0.15s",
                      }}
                      onFocus={e => e.target.style.boxShadow = "0 0 0 3px var(--color-accent-subtle)"}
                      onBlur={e => e.target.style.boxShadow = "none"}
                    />
                    {nudgeError && <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 8, textAlign: "center" }}>{nudgeError}</p>}
                    <p style={{ textAlign: "center", fontSize: 13, color: "var(--color-text-tertiary)", marginBottom: 14 }}>
                      Didn't get it?{" "}
                      <button type="button" onClick={() => nudgeStartMethod("email")} disabled={nudgeResendCooldown > 0} style={{
                        background: "none", border: "none", padding: 0, fontSize: 13, fontWeight: 600,
                        color: nudgeResendCooldown > 0 ? "var(--color-text-tertiary)" : "var(--color-accent)",
                        cursor: nudgeResendCooldown > 0 ? "default" : "pointer",
                      }}>
                        {nudgeResendCooldown > 0 ? `Resend in ${nudgeResendCooldown}s` : "Resend code"}
                      </button>
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { setNudgeStep("prompt"); setNudgeCode(""); setNudgeError(""); }} style={{
                        flex: 1, padding: "11px", borderRadius: 10, border: "1.5px solid var(--color-border-secondary)",
                        background: "transparent", color: "var(--color-text-secondary)", fontSize: 14, cursor: "pointer",
                      }}>← Back</button>
                      <button onClick={nudgeVerify} disabled={nudgeCode.length !== 6 || nudgeLoading} style={{
                        flex: 2, padding: "11px", borderRadius: 10, border: "none",
                        background: nudgeCode.length === 6 ? "linear-gradient(135deg, #0f766e, #0d9488)" : "var(--color-border-secondary)",
                        color: nudgeCode.length === 6 ? "#fff" : "var(--color-text-tertiary)",
                        fontSize: 14, fontWeight: 600, cursor: nudgeCode.length === 6 ? "pointer" : "not-allowed",
                        boxShadow: nudgeCode.length === 6 ? "0 4px 14px rgba(15,118,110,0.3)" : "none",
                        transition: "all 0.15s",
                      }}>
                        {nudgeLoading ? "Activating…" : "Enable & sign in →"}
                      </button>
                    </div>
                    <button onClick={() => completeLogin()} style={{
                      width: "100%", background: "none", border: "none", marginTop: 12,
                      color: "var(--color-text-tertiary)", fontSize: 12, cursor: "pointer", padding: "6px 0",
                    }}>Skip for now</button>
                  </>
                )}
              </div>
            )}

            {/* Normal login form — hidden while nudge is showing */}
            {!pendingSession && (

            <>
            {/* Header */}
            <div style={{ marginBottom: "2rem" }}>
              <h2
                style={{
                  fontSize: 27,
                  fontWeight: 800,
                  color: "var(--color-text-primary)",
                  marginBottom: 6,
                  letterSpacing: "-0.035em",
                }}
              >
                {requiresMfa ? "Two-factor authentication" : "Welcome back"}
              </h2>
              <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                {!requiresMfa && "Sign in to your DentalIQ account."}
                {requiresMfa && methodPicking && "Select an authentication method to continue."}
                {requiresMfa && !methodPicking && mfaMethod === "totp" && "Enter the 6-digit code from your authenticator app."}
                {requiresMfa && !methodPicking && mfaMethod === "email" && "We sent a 6-digit code to your email address."}
                {requiresMfa && !methodPicking && mfaMethod === "sms" && "We sent a 6-digit code to your phone."}
              </p>
            </div>

            {error && (
              <div
                style={{
                  marginBottom: 20,
                  padding: "12px 16px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 10,
                  fontSize: 14,
                  color: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  animation: "scaleIn 0.2s ease-out",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 0 }}
            >
              {!requiresMfa ? (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--color-text-secondary)",
                        marginBottom: 6,
                      }}
                    >
                      Email address
                    </label>
                    <div style={{ position: "relative" }}>
                      <svg
                        style={{
                          position: "absolute",
                          left: 13,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color:
                            focusedField === "email"
                              ? "var(--color-accent)"
                              : "var(--color-text-tertiary)",
                          transition: "color 0.15s",
                          pointerEvents: "none",
                          flexShrink: 0,
                        }}
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m2 7 10 7 10-7" />
                      </svg>
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, email: e.target.value }))
                        }
                        placeholder="you@yourclinic.com"
                        style={inputStyle("email")}
                        onFocus={() => setFocusedField("email")}
                        onBlur={() => setFocusedField(null)}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 6 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--color-text-secondary)",
                        marginBottom: 6,
                      }}
                    >
                      Password
                    </label>
                    <div style={{ position: "relative" }}>
                      <svg
                        style={{
                          position: "absolute",
                          left: 13,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color:
                            focusedField === "password"
                              ? "var(--color-accent)"
                              : "var(--color-text-tertiary)",
                          transition: "color 0.15s",
                          pointerEvents: "none",
                        }}
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <input
                        type="password"
                        required
                        autoComplete="current-password"
                        value={form.password}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, password: e.target.value }))
                        }
                        placeholder="••••••••"
                        style={inputStyle("password")}
                        onFocus={() => setFocusedField("password")}
                        onBlur={() => setFocusedField(null)}
                      />
                    </div>
                    <div style={{ textAlign: "right", marginTop: 7 }}>
                      <Link
                        href="/forgot-password"
                        style={{
                          fontSize: 12,
                          color: "var(--color-accent)",
                          textDecoration: "none",
                          fontWeight: 500,
                        }}
                      >
                        Forgot password?
                      </Link>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ marginBottom: 20 }}>
                  {/* Method picker — shown when user has multiple methods and hasn't chosen yet */}
                  {methodPicking ? (
                    <>
                      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 14 }}>
                        Choose how you'd like to verify:
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {availableMethods.map(method => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => pickMfaMethod(method)}
                            style={{
                              display: "flex", alignItems: "center", gap: 12, padding: "13px 15px",
                              border: "1.5px solid var(--color-border-secondary)", borderRadius: 11,
                              background: "var(--color-background-secondary)", cursor: "pointer",
                              textAlign: "left", transition: "border-color 0.15s, box-shadow 0.15s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-accent-subtle)"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border-secondary)"; e.currentTarget.style.boxShadow = "none"; }}
                          >
                            <span style={{ fontSize: 22 }}>
                              {method === "totp" ? "📱" : method === "email" ? "✉️" : "💬"}
                            </span>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>
                                {method === "totp" ? "Authenticator app" : method === "email" ? "Email code" : "SMS code"}
                              </div>
                              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 1 }}>
                                {method === "totp" ? "6-digit code from your app" : method === "email" ? "Code sent to your email" : "Code sent to your phone"}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <label
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--color-text-secondary)",
                          marginBottom: 8,
                        }}
                      >
                        Authenticator code
                      </label>
                      {/* Method badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                          background: "rgba(13,148,136,0.10)", color: "var(--color-accent)",
                          border: "1px solid rgba(13,148,136,0.2)",
                        }}>
                          {mfaMethod === "totp" && <span>📱 Authenticator app</span>}
                          {mfaMethod === "email" && <span>✉️ Email code</span>}
                          {mfaMethod === "sms" && <span>💬 SMS code</span>}
                        </span>
                        {/* Switch method link — only when multiple methods available */}
                        {availableMethods.length > 1 && (
                          <button type="button" onClick={() => setMethodPicking(true)} style={{
                            background: "none", border: "none", padding: 0, fontSize: 12,
                            color: "var(--color-accent)", cursor: "pointer", fontWeight: 600,
                          }}>
                            Switch method
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="\d{6}"
                        maxLength={8}
                        required
                        autoFocus
                        value={form.totpCode}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, totpCode: e.target.value.replace(/\s/g, '') }))
                        }
                        placeholder={mfaMethod === "totp" ? "000 000" : "000000"}
                        style={{
                          width: "100%",
                          padding: "16px",
                          border: `1.5px solid ${focusedField === "totp" ? "var(--color-accent)" : "var(--color-border-secondary)"}`,
                          borderRadius: 12,
                          fontSize: 28,
                          color: "var(--color-text-primary)",
                          outline: "none",
                          textAlign: "center",
                          letterSpacing: "0.35em",
                          fontFamily: "monospace",
                          background: "var(--color-input-bg)",
                          transition: "border-color 0.15s, box-shadow 0.15s",
                          boxShadow:
                            focusedField === "totp"
                              ? "0 0 0 3px var(--color-accent-subtle)"
                              : "none",
                        }}
                        onFocus={() => setFocusedField("totp")}
                        onBlur={() => setFocusedField(null)}
                      />

                      {/* Resend link for email/SMS */}
                      {(mfaMethod === "email" || mfaMethod === "sms") && (
                        <p style={{ textAlign: "center", fontSize: 13, marginTop: 10, color: "var(--color-text-secondary)" }}>
                          Didn't receive a code?{" "}
                          <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={resendCooldown > 0}
                            style={{
                              background: "none", border: "none", padding: 0, cursor: resendCooldown > 0 ? "default" : "pointer",
                              color: resendCooldown > 0 ? "var(--color-text-tertiary)" : "var(--color-accent)",
                              fontWeight: 600, fontSize: 13,
                            }}
                          >
                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                          </button>
                        </p>
                      )}

                      {/* Backup code hint for TOTP */}
                      {mfaMethod === "totp" && (
                        <p style={{ textAlign: "center", fontSize: 12, marginTop: 8, color: "var(--color-text-tertiary)" }}>
                          Lost your phone? Enter a backup code instead.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Hide submit button while user is picking MFA method */}
              <button
                type="submit"
                disabled={loading || methodPicking}
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  background: loading
                    ? "var(--color-text-tertiary)"
                    : "linear-gradient(135deg, #0f766e, #0d9488)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  letterSpacing: "-0.01em",
                  boxShadow: loading ? "none" : "var(--shadow-accent)",
                  display: methodPicking ? "none" : "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(15,118,110,0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = loading ? "none" : "var(--shadow-accent)";
                }}
              >
                {loading ? (
                  <>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                    Signing in…
                  </>
                ) : requiresMfa ? (
                  "Verify code →"
                ) : (
                  "Sign in →"
                )}
              </button>
            </form>

            {!requiresMfa && (
              <p
                style={{
                  marginTop: "1.5rem",
                  textAlign: "center",
                  fontSize: 14,
                  color: "var(--color-text-secondary)",
                }}
              >
                New to DentalIQ?{" "}
                <Link
                  href="/signup"
                  style={{
                    color: "var(--color-accent)",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Create an account
                </Link>
              </p>
            )}

            <div
              style={{
                marginTop: "2.5rem",
                paddingTop: "1.5rem",
                borderTop: "1px solid var(--color-border-tertiary)",
                display: "flex",
                justifyContent: "center",
                gap: 24,
              }}
            >
              {["PHIPA Compliant", "SOC 2 Ready", "Canadian Data"].map(
                (badge) => (
                  <div
                    key={badge}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 11,
                      color: "var(--color-text-tertiary)",
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth="2.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {badge}
                  </div>
                ),
              )}
            </div>

            </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
