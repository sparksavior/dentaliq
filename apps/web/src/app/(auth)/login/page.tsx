"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LaunchScreen } from "@/components/LaunchScreen";

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAuth();

  const [form, setForm] = useState({ email: "", password: "", code: "" });
  // MFA flow state
  const [mfaStep, setMfaStep] = useState<"none" | "pick" | "verify">("none");
  const [mfaMethods, setMfaMethods] = useState<string[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<
    "totp" | "email" | "sms" | null
  >(null);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showLaunch, setShowLaunch] = useState(false);
  const [showMfaReminder, setShowMfaReminder] = useState(false);

  // Method display labels
  const METHOD_LABELS: Record<
    string,
    { label: string; icon: string; desc: string }
  > = {
    totp: {
      label: "Authenticator App",
      icon: "🔐",
      desc: "Enter code from your authenticator app",
    },
    email: {
      label: "Email OTP",
      icon: "📧",
      desc: "Send a code to your email address",
    },
    sms: {
      label: "SMS OTP",
      icon: "📱",
      desc: "Send a code to your phone number",
    },
  };

  // Called after credentials (+ MFA if required) are verified
  function completeLogin(accessToken: string, user: any) {
    setSession(accessToken, user);
    if (!user.mfaEnabled) {
      setShowMfaReminder(true);
    } else {
      setShowLaunch(true);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mfaStep === "none") {
        // First factor — email + password
        const result = await authApi.login({
          email: form.email,
          password: form.password,
        });
        if ("requiresMfa" in result) {
          // Normalise: empty array (shouldn't happen) → fall back to TOTP
          const methods: Array<"totp" | "email" | "sms"> =
            (result.mfaMethods ?? []).length > 0
              ? (result.mfaMethods as Array<"totp" | "email" | "sms">)
              : ["totp"];
          setMfaMethods(methods);
          if (methods.length === 1) {
            // Single method — skip the picker, go straight to verify
            const method = methods[0];
            setSelectedMethod(method);
            if (method === "email" || method === "sms") {
              await authApi.loginSendOtp(form.email, form.password, method);
              setOtpSent(true);
            }
            setMfaStep("verify");
          } else {
            // Multiple methods — show picker
            setMfaStep("pick");
          }
          setLoading(false);
          return;
        }
        completeLogin(result.accessToken, result.user);
      } else if (mfaStep === "verify") {
        // Second factor — submit with chosen method
        const result = await authApi.login({
          email: form.email,
          password: form.password,
          mfaMethod: selectedMethod ?? "totp",
          totpCode: selectedMethod === "totp" ? form.code : undefined,
          otpCode: selectedMethod !== "totp" ? form.code : undefined,
        });
        if ("requiresMfa" in result) {
          setError("Verification failed. Please try again.");
          setLoading(false);
          return;
        }
        completeLogin(result.accessToken, result.user);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
      setLoading(false);
    }
  }

  async function selectMethod(method: "totp" | "email" | "sms") {
    setSelectedMethod(method);
    setError("");
    setOtpSent(false);
    if (method === "email" || method === "sms") {
      setLoading(true);
      try {
        await authApi.loginSendOtp(form.email, form.password, method);
        setOtpSent(true);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to send code");
      }
      setLoading(false);
    }
    setMfaStep("verify");
  }

  async function resendOtp() {
    if (!selectedMethod || selectedMethod === "totp") return;
    setError("");
    setLoading(true);
    try {
      await authApi.loginSendOtp(form.email, form.password, selectedMethod);
      setOtpSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to resend code");
    }
    setLoading(false);
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

  if (showLaunch) {
    return (
      <LaunchScreen variant="login" onDone={() => router.push("/dashboard")} />
    );
  }

  if (showMfaReminder) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-background-primary)",
          padding: "2rem",
        }}
      >
        <style>{`
          @keyframes reminderIn {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div
          style={{
            maxWidth: 460,
            width: "100%",
            background: "var(--color-background-secondary)",
            borderRadius: 20,
            border: "1px solid var(--color-border-secondary)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.12)",
            overflow: "hidden",
            animation: "reminderIn 0.4s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {/* amber header stripe */}
          <div
            style={{
              height: 6,
              background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
            }}
          />
          <div style={{ padding: "2rem 2rem 1.5rem" }}>
            {/* icon */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "rgba(245,158,11,0.1)",
                border: "1.5px solid rgba(245,158,11,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                marginBottom: "1.25rem",
              }}
            >
              🔒
            </div>

            <h2
              style={{
                fontSize: "1.35rem",
                fontWeight: 700,
                color: "var(--color-text-primary)",
                margin: "0 0 0.5rem",
                letterSpacing: "-0.02em",
              }}
            >
              Secure your account
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "var(--color-text-secondary)",
                lineHeight: 1.65,
                margin: "0 0 1.5rem",
              }}
            >
              Two-factor authentication isn&apos;t enabled on your account.
              Adding 2FA protects your patients&apos; data and keeps your clinic
              PHIPA-compliant. It only takes 60 seconds.
            </p>

            {/* bullet points */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginBottom: "1.75rem",
                padding: "1rem 1.25rem",
                background: "rgba(245,158,11,0.05)",
                borderRadius: 12,
                border: "1px solid rgba(245,158,11,0.15)",
              }}
            >
              {[
                {
                  icon: "📱",
                  text: "Authenticator app (Google/Microsoft/Authy)",
                },
                { icon: "📧", text: "Email verification code" },
                { icon: "💬", text: "SMS text message code" },
              ].map((item) => (
                <div
                  key={item.icon}
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {item.text}
                  </span>
                </div>
              ))}
            </div>

            {/* actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={() => router.push("/dashboard/settings?tab=account")}
                style={{
                  width: "100%",
                  padding: "13px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(245,158,11,0.35)",
                  letterSpacing: "-0.01em",
                }}
              >
                Set up 2FA now →
              </button>
              <button
                onClick={() => setShowLaunch(true)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 10,
                  border: "1.5px solid var(--color-border-secondary)",
                  background: "transparent",
                  color: "var(--color-text-secondary)",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Skip for now, go to dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                {mfaStep === "pick"
                  ? "Choose verification method"
                  : mfaStep === "verify"
                    ? "Two-factor authentication"
                    : "Welcome back"}
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.5,
                }}
              >
                {mfaStep === "pick"
                  ? "Select how you'd like to verify your identity."
                  : mfaStep === "verify"
                    ? selectedMethod === "totp"
                      ? "Enter the 6-digit code from your authenticator app."
                      : otpSent
                        ? `A verification code was sent to your ${selectedMethod === "email" ? "email" : "phone"}.`
                        : "Sending verification code…"
                    : "Sign in to your DentalIQ account."}
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
              {mfaStep === "none" && (
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
              )}

              {/* ── Step: pick MFA method ── */}
              {mfaStep === "pick" && (
                <div
                  style={{
                    marginBottom: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {(mfaMethods.length > 0
                    ? mfaMethods
                    : (["totp"] as const)
                  ).map((m) => {
                    const meta = METHOD_LABELS[m] ?? {
                      label: m,
                      icon: "🔑",
                      desc: "",
                    };
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() =>
                          selectMethod(m as "totp" | "email" | "sms")
                        }
                        disabled={loading}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "14px 16px",
                          borderRadius: 12,
                          border: "1.5px solid var(--color-border-secondary)",
                          background: "var(--color-input-bg)",
                          cursor: loading ? "not-allowed" : "pointer",
                          textAlign: "left",
                          width: "100%",
                          transition: "border-color 0.15s, box-shadow 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor =
                            "var(--color-accent)";
                          e.currentTarget.style.boxShadow =
                            "0 0 0 3px var(--color-accent-subtle)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor =
                            "var(--color-border-secondary)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        <span style={{ fontSize: 24 }}>{meta.icon}</span>
                        <div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "var(--color-text-primary)",
                            }}
                          >
                            {meta.label}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--color-text-secondary)",
                              marginTop: 2,
                            }}
                          >
                            {meta.desc}
                          </div>
                        </div>
                        <svg
                          style={{
                            marginLeft: "auto",
                            color: "var(--color-text-tertiary)",
                          }}
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setMfaStep("none");
                      setError("");
                    }}
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-secondary)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      marginTop: 4,
                      textAlign: "center",
                    }}
                  >
                    ← Back to login
                  </button>
                </div>
              )}

              {/* ── Step: enter verification code ── */}
              {mfaStep === "verify" && (
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <label
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {selectedMethod === "totp"
                        ? "Authenticator code"
                        : "Verification code"}
                    </label>
                    {mfaMethods.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setMfaStep("pick");
                          setSelectedMethod(null);
                          setOtpSent(false);
                          setForm((f) => ({ ...f, code: "" }));
                          setError("");
                        }}
                        style={{
                          fontSize: 12,
                          color: "var(--color-accent)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Use different method
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    autoFocus
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, code: e.target.value }))
                    }
                    placeholder="000 000"
                    style={{
                      width: "100%",
                      padding: "16px",
                      border: `1.5px solid ${focusedField === "code" ? "var(--color-accent)" : "var(--color-border-secondary)"}`,
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
                        focusedField === "code"
                          ? "0 0 0 3px var(--color-accent-subtle)"
                          : "none",
                    }}
                    onFocus={() => setFocusedField("code")}
                    onBlur={() => setFocusedField(null)}
                  />
                  {(selectedMethod === "email" || selectedMethod === "sms") && (
                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--color-text-tertiary)",
                        }}
                      >
                        Didn&apos;t receive it?
                      </span>
                      <button
                        type="button"
                        onClick={resendOtp}
                        disabled={loading}
                        style={{
                          fontSize: 12,
                          color: "var(--color-accent)",
                          background: "none",
                          border: "none",
                          cursor: loading ? "not-allowed" : "pointer",
                          fontWeight: 500,
                        }}
                      >
                        Resend code
                      </button>
                    </div>
                  )}
                  {mfaMethods.length <= 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setMfaStep("none");
                        setSelectedMethod(null);
                        setOtpSent(false);
                        setForm((f) => ({ ...f, code: "" }));
                        setError("");
                      }}
                      style={{
                        fontSize: 13,
                        color: "var(--color-text-secondary)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        marginTop: 12,
                        display: "block",
                        width: "100%",
                        textAlign: "center",
                      }}
                    >
                      ← Back to login
                    </button>
                  )}
                </div>
              )}

              {mfaStep !== "pick" && (
                <button
                  type="submit"
                  disabled={loading}
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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow =
                        "0 6px 20px rgba(15,118,110,0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = loading
                      ? "none"
                      : "var(--shadow-accent)";
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
                      {mfaStep === "verify" ? "Verifying…" : "Signing in…"}
                    </>
                  ) : mfaStep === "verify" ? (
                    "Verify code →"
                  ) : (
                    "Sign in →"
                  )}
                </button>
              )}
            </form>

            {mfaStep === "none" && (
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
          </div>
        </div>
      </div>
    </div>
  );
}
