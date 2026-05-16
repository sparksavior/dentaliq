"use client";

import { useState, useEffect, useRef, Suspense, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authApi, tenantsApi, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { ThemeToggle } from "@/components/ThemeToggle";

const STEP_NAMES_DEFAULT = [
  "Account",
  "Verify",
  "Clinics",
  "Connect",
  "Security",
  "Done",
];
const STEP_NAMES_CORTEX = [
  "Account",
  "Verify",
  "Agents",
  "Clinics",
  "Connect",
  "Security",
  "Done",
];

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 199,
    desc: "1 clinic location",
    features: ["Cost estimator", "Claim risk checks", "Basic analytics"],
    color: "#0f766e",
  },
  {
    id: "pro",
    name: "Pro",
    price: 349,
    desc: "Up to 3 locations",
    features: [
      "Everything in Starter",
      "AI pre-auth letters",
      "Priority support",
      "Multi-location",
    ],
    color: "#0e7490",
    popular: true,
  },
  {
    id: "cortex",
    name: "Cortex",
    price: 299,
    desc: "AI Digital Workforce",
    features: [
      "Everything in Pro",
      "Cortex Command Center",
      "Autonomous Billing Agent",
      "Outcome-based billing",
    ],
    color: "#6366f1",
  },
];

const CORTEX_AGENTS = [
  {
    id: "billing",
    name: "Cortex Billing Agent",
    avatar: "💰",
    role: "Revenue Compliance Specialist",
    gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    status: "available",
    fee: "Included",
  },
  {
    id: "recall",
    name: "Cortex Recall Agent",
    avatar: "📞",
    role: "Patient Reactivation Specialist",
    gradient: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
    status: "available",
    fee: "$99/mo",
  },
  {
    id: "review",
    name: "Cortex Review Agent",
    avatar: "⭐",
    role: "Reputation Manager",
    gradient: "linear-gradient(135deg, #f59e0b, #f97316)",
    status: "available",
    fee: "$99/mo",
  },
  {
    id: "supply",
    name: "Cortex Supply Agent",
    avatar: "📦",
    role: "Inventory Optimizer",
    gradient: "linear-gradient(135deg, #10b981, #059669)",
    status: "available",
    fee: "$99/mo",
  },
  {
    id: "treatment",
    name: "Cortex Treatment Coordinator",
    avatar: "🦷",
    role: "Case Acceptance Specialist",
    gradient: "linear-gradient(135deg, #ec4899, #f43f5e)",
    status: "available",
    fee: "$99/mo",
  },
  {
    id: "hygienist",
    name: "Cortex Hygienist Agent",
    avatar: "📅",
    role: "Schedule Optimizer",
    gradient: "linear-gradient(135deg, #14b8a6, #0d9488)",
    status: "available",
    fee: "$99/mo",
  },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  border: "1.5px solid var(--color-border-secondary)",
  borderRadius: 10,
  fontSize: 14,
  color: "var(--color-text-primary)",
  background: "var(--color-input-bg)",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

function SignupPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { setSession } = useAuth();

  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState<"starter" | "pro" | "enterprise" | "cortex">(
    (params.get("plan") as any) ?? "pro",
  );
  const [selectedAgents, setSelectedAgents] = useState<string[]>(["billing"]);
  const [form, setForm] = useState({
    name: "",
    clinic: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [verifyCode, setVerifyCode] = useState(["", "", "", "", "", ""]);
  const [pmsStatus, setPmsStatus] = useState<
    "idle" | "connecting" | "connected"
  >("idle");
  const [pmsProgress, setPmsProgress] = useState(0);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [mfaData, setMfaData] = useState<{
    secret: string;
    qrCodeDataUrl: string;
  } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [extraClinics, setExtraClinics] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (step !== 1 || !sessionToken || emailVerified) return;

    const interval = setInterval(async () => {
      try {
        const user = await authApi.me(sessionToken);
        if (user.emailVerified) {
          setEmailVerified(true);
        }
      } catch {
        // ignore
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [step, sessionToken, emailVerified]);

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const selectedPlan = PLANS.find((p) => p.id === plan) ?? PLANS[1];
  const isCortex = plan === "cortex";
  const STEP_NAMES = isCortex ? STEP_NAMES_CORTEX : STEP_NAMES_DEFAULT;
  // Step offsets: for cortex, clinics=3 pms=4 mfa=5 done=6; for others, clinics=2 pms=3 mfa=4 done=5
  const S_AGENTS = isCortex ? 2 : -1;
  const S_CLINICS = isCortex ? 3 : 2;
  const S_PMS = isCortex ? 4 : 3;
  const S_MFA = isCortex ? 5 : 4;
  const S_DONE = isCortex ? 6 : 5;

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm)
      return setError("Passwords do not match.");
    if (form.password.length < 8)
      return setError("Password must be at least 8 characters.");
    setLoading(true);
    try {
      await authApi.register({
        name: form.name,
        email: form.email,
        password: form.password,
        clinicName: form.clinic,
        plan,
      });
      const result = await authApi.login({
        email: form.email,
        password: form.password,
      });
      if (!("requiresMfa" in result)) {
        setSessionToken(result.accessToken);
      }
      setStep(1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  function handleVerify() {
    setStep(isCortex ? S_AGENTS : S_CLINICS);
  }

  async function handleSaveClinics() {
    if (!sessionToken) {
      setStep(S_PMS);
      return;
    }
    setLoading(true);
    setError("");
    try {
      for (const name of extraClinics) {
        if (name.trim()) {
          await tenantsApi.createClinic(sessionToken, { name: name.trim() });
        }
      }
      setStep(S_PMS);
    } catch (err: any) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to save additional locations",
      );
    } finally {
      setLoading(false);
    }
  }

  function connectPms() {
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

  function skipPms() {
    loadMfa();
    setStep(S_MFA);
  }

  async function loadMfa() {
    if (!sessionToken || mfaData) return;
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
      if (json.success) setMfaData(json.data);
    } catch {
      /* MFA is optional */
    }
  }

  async function enableMfa() {
    if (!sessionToken || !mfaData) {
      setStep(S_DONE);
      return;
    }
    if (!mfaCode || mfaCode.length !== 6) {
      setStep(S_DONE);
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
    } catch {
      /* non-blocking */
    }
    setStep(S_DONE);
    setLoading(false);
  }

  async function goToDashboard() {
    if (sessionToken) {
      try {
        const user = await authApi.me(sessionToken);
        setSession(sessionToken, user);
      } catch {
        /* session already set */
      }
    }
    // Flag: show insight popup + trigger tour guide on first dashboard visit
    sessionStorage.setItem("diq_fresh_login", "1");
    router.push("/dashboard");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-background-secondary)",
        color: "var(--color-text-primary)",
        fontFamily: "system-ui",
      }}
    >
      {/* Top nav */}
      <div
        style={{
          borderBottom: "1px solid var(--color-border-secondary)",
          background: "var(--color-background-primary)",
          padding: "0 2rem",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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
              fontWeight: 700,
              color: "#fff",
            }}
          >
            +
          </div>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.03em",
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
      </div>

      <div
        style={{ maxWidth: 640, margin: "0 auto", padding: "2.5rem 1.5rem" }}
      >
        {/* Step progress */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "2.5rem",
            gap: 0,
          }}
        >
          {STEP_NAMES.map((name, i) => (
            <div
              key={name}
              style={{
                display: "flex",
                alignItems: "center",
                flex: i < STEP_NAMES.length - 1 ? 1 : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 600,
                    background:
                      i < step
                        ? "var(--color-accent)"
                        : i === step
                          ? "linear-gradient(135deg, #0f766e, #0d9488)"
                          : "var(--color-background-primary)",
                    color: i <= step ? "#fff" : "var(--color-text-secondary)",
                    border:
                      i > step
                        ? "2px solid var(--color-border-secondary)"
                        : "none",
                    boxShadow:
                      i === step ? "0 0 0 4px rgba(15,118,110,0.15)" : "none",
                    transition: "all 0.3s",
                  }}
                >
                  {i < step ? "✓" : i + 1}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: i === step ? 600 : 400,
                    color:
                      i === step
                        ? "var(--color-accent)"
                        : i < step
                          ? "var(--color-text-secondary)"
                          : "var(--color-text-secondary)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {name}
                </span>
              </div>
              {i < STEP_NAMES.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background:
                      i < step
                        ? "var(--color-accent)"
                        : "var(--color-border-secondary)",
                    marginBottom: 18,
                    transition: "background 0.3s",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div
            style={{
              marginBottom: 20,
              padding: "12px 16px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 12,
              fontSize: 14,
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>⚠</span> {error}
          </div>
        )}

        {/* Step 0: Account details */}
        {step === 0 && (
          <form onSubmit={handleRegister}>
            <div
              style={{
                background: "var(--color-background-primary)",
                border: "1px solid var(--color-border-secondary)",
                borderRadius: 16,
                padding: "2rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                  marginBottom: 4,
                  letterSpacing: "-0.03em",
                }}
              >
                Create your account
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--color-text-secondary)",
                  marginBottom: "1.5rem",
                }}
              >
                Start your 14-day free trial — no credit card required.
              </p>

              {/* Plan selector */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--color-text-secondary)",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Choose your plan
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 8,
                  }}
                >
                  {PLANS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlan(p.id as any)}
                      style={{
                        padding: "12px 8px",
                        borderRadius: 10,
                        cursor: "pointer",
                        textAlign: "left",
                        position: "relative",
                        border:
                          plan === p.id
                            ? `2px solid var(--color-accent)`
                            : "1.5px solid var(--color-border-secondary)",
                        background:
                          plan === p.id
                            ? "var(--color-accent-muted)"
                            : "var(--color-background-primary)",
                        transition: "all 0.2s",
                        boxShadow: plan === p.id ? "0 4px 14px rgba(15,118,110,0.15)" : "none",
                      }}
                      onMouseEnter={(e) => {
                        if (plan !== p.id) {
                          e.currentTarget.style.borderColor = "var(--color-accent)";
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = "0 4px 14px rgba(15,118,110,0.1)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (plan !== p.id) {
                          e.currentTarget.style.borderColor = "var(--color-border-secondary)";
                          e.currentTarget.style.transform = "";
                          e.currentTarget.style.boxShadow = "none";
                        }
                      }}
                    >
                      {p.popular && (
                        <div
                          style={{
                            position: "absolute",
                            top: -10,
                            left: "50%",
                            transform: "translateX(-50%)",
                            background: "var(--color-accent)",
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 20,
                            whiteSpace: "nowrap",
                          }}
                        >
                          POPULAR
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color:
                            plan === p.id
                              ? "var(--color-accent)"
                              : "var(--color-text-primary)",
                          marginBottom: 2,
                        }}
                      >
                        {p.name}
                      </div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color:
                            plan === p.id
                              ? "var(--color-accent)"
                              : "var(--color-text-primary)",
                          marginBottom: 2,
                        }}
                      >
                        {p.price ? `$${p.price}` : "Custom"}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {p.desc}
                      </div>
                    </button>
                  ))}
                </div>
                <div
                  style={{
                    marginTop: 10,
                    padding: "10px 14px",
                    background: "var(--color-accent-muted)",
                    borderRadius: 8,
                    border: "1px solid var(--color-accent)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--color-accent)",
                      fontWeight: 500,
                      marginBottom: 4,
                    }}
                  >
                    {selectedPlan.name} includes:
                  </div>
                  {selectedPlan.features.map((f) => (
                    <div
                      key={f}
                      style={{
                        fontSize: 12,
                        color: "var(--color-accent)",
                        marginBottom: 2,
                      }}
                    >
                      ✓ {f}
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 0,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--color-text-secondary)",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Full name
                  </label>
                  <input
                    style={{
                      ...inputStyle,
                      background: "var(--color-input-bg)",
                      color: "var(--color-text-primary)",
                      border: "1.5px solid var(--color-border-secondary)",
                    }}
                    placeholder="Dr. Sarah Chen"
                    value={form.name}
                    onChange={set("name")}
                    required
                    onFocus={(e) =>
                      (e.target.style.borderColor = "var(--color-accent)")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor =
                        "var(--color-border-secondary)")
                    }
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--color-text-secondary)",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Clinic name
                  </label>
                  <input
                    style={{
                      ...inputStyle,
                      background: "var(--color-input-bg)",
                      color: "var(--color-text-primary)",
                      border: "1.5px solid var(--color-border-secondary)",
                    }}
                    placeholder="Lakeview Dental Group"
                    value={form.clinic}
                    onChange={set("clinic")}
                    required
                    onFocus={(e) =>
                      (e.target.style.borderColor = "var(--color-accent)")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor =
                        "var(--color-border-secondary)")
                    }
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--color-text-secondary)",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Work email
                  </label>
                  <input
                    style={{
                      ...inputStyle,
                      background: "var(--color-input-bg)",
                      color: "var(--color-text-primary)",
                      border: "1.5px solid var(--color-border-secondary)",
                    }}
                    type="email"
                    placeholder="you@yourclinic.ca"
                    value={form.email}
                    onChange={set("email")}
                    required
                    onFocus={(e) =>
                      (e.target.style.borderColor = "var(--color-accent)")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor =
                        "var(--color-border-secondary)")
                    }
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--color-text-secondary)",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Phone{" "}
                    <span
                      style={{
                        color: "var(--color-text-secondary)",
                        fontWeight: 400,
                      }}
                    >
                      (optional)
                    </span>
                  </label>
                  <input
                    style={{
                      ...inputStyle,
                      background: "var(--color-input-bg)",
                      color: "var(--color-text-primary)",
                      border: "1.5px solid var(--color-border-secondary)",
                    }}
                    placeholder="+1 (416) 555-0100"
                    value={form.phone}
                    onChange={set("phone")}
                    onFocus={(e) =>
                      (e.target.style.borderColor = "var(--color-accent)")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor =
                        "var(--color-border-secondary)")
                    }
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--color-text-secondary)",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Password
                  </label>
                  <input
                    style={{
                      ...inputStyle,
                      background: "var(--color-input-bg)",
                      color: "var(--color-text-primary)",
                      border: "1.5px solid var(--color-border-secondary)",
                    }}
                    type="password"
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={set("password")}
                    required
                    onFocus={(e) =>
                      (e.target.style.borderColor = "var(--color-accent)")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor =
                        "var(--color-border-secondary)")
                    }
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--color-text-secondary)",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Confirm password
                  </label>
                  <input
                    style={{
                      ...inputStyle,
                      background: "var(--color-input-bg)",
                      color: "var(--color-text-primary)",
                      border: "1.5px solid var(--color-border-secondary)",
                    }}
                    type="password"
                    placeholder="••••••••"
                    value={form.confirm}
                    onChange={set("confirm")}
                    required
                    onFocus={(e) =>
                      (e.target.style.borderColor = "var(--color-accent)")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor =
                        "var(--color-border-secondary)")
                    }
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={
                loading ||
                !form.name ||
                !form.clinic ||
                !form.email ||
                !form.password
              }
              style={{
                width: "100%",
                marginTop: 12,
                padding: "13px",
                borderRadius: 10,
                border: "none",
                background:
                  loading ||
                  !form.name ||
                  !form.clinic ||
                  !form.email ||
                  !form.password
                    ? "var(--color-text-secondary)"
                    : "linear-gradient(135deg, #0f766e, #0d9488)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "-0.01em",
                transition: "all 0.2s",
                boxShadow:
                  loading ||
                  !form.name ||
                  !form.clinic ||
                  !form.email ||
                  !form.password
                    ? "none"
                    : "0 4px 14px rgba(15,118,110,0.3)",
              }}
              onMouseEnter={(e) => {
                const disabled =
                  loading || !form.name || !form.clinic || !form.email || !form.password;
                if (!disabled) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(15,118,110,0.4)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                const disabled =
                  loading || !form.name || !form.clinic || !form.email || !form.password;
                e.currentTarget.style.boxShadow = disabled ? "none" : "0 4px 14px rgba(15,118,110,0.3)";
              }}
            >
              {loading ? "Creating account…" : "Continue →"}
            </button>
          </form>
        )}

        {/* Step 2 (Cortex only): Hire your Agents */}
        {step === S_AGENTS && isCortex && (
          <div
            style={{
              background: "var(--color-background-primary)",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: 16,
              padding: "2rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
                }}
              >
                🧠
              </div>
              <div>
                <h2
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                    marginBottom: 4,
                    letterSpacing: "-0.03em",
                    margin: 0,
                  }}
                >
                  Hire your Cortex Agents
                </h2>
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--color-text-secondary)",
                    margin: 0,
                  }}
                >
                  Select which digital employees you want working for your
                  clinic.
                </p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: "1.5rem",
              }}
            >
              {CORTEX_AGENTS.map((agent) => (
                <div
                  key={agent.id}
                  style={{
                    padding: "14px",
                    borderRadius: 14,
                    border: selectedAgents.includes(agent.id)
                      ? "2px solid #6366f1"
                      : "1.5px solid var(--color-border-secondary)",
                    background: selectedAgents.includes(agent.id)
                      ? "rgba(99,102,241,0.06)"
                      : "var(--color-background-secondary)",
                    opacity: agent.status === "coming_soon" ? 0.5 : 1,
                    cursor:
                      agent.status === "available" ? "pointer" : "not-allowed",
                    transition: "all 0.2s",
                    position: "relative",
                    boxShadow: selectedAgents.includes(agent.id)
                      ? "0 4px 14px rgba(99,102,241,0.2)"
                      : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (agent.status === "available" && !selectedAgents.includes(agent.id)) {
                      e.currentTarget.style.borderColor = "#6366f150";
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 8px 20px rgba(99,102,241,0.15)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selectedAgents.includes(agent.id)) {
                      e.currentTarget.style.borderColor = "var(--color-border-secondary)";
                      e.currentTarget.style.transform = "";
                      e.currentTarget.style.boxShadow = "none";
                    }
                  }}
                  onClick={() => {
                    if (agent.status !== "available") return;
                    setSelectedAgents((prev) =>
                      prev.includes(agent.id)
                        ? prev.filter((a) => a !== agent.id)
                        : [...prev, agent.id],
                    );
                  }}
                >
                  {agent.status === "coming_soon" && (
                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
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
                  {agent.status === "available" &&
                    selectedAgents.includes(agent.id) && (
                      <div
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          background: "rgba(16,185,129,0.1)",
                          border: "1px solid rgba(16,185,129,0.3)",
                          borderRadius: 20,
                          padding: "2px 8px",
                          fontSize: 9,
                          fontWeight: 600,
                          color: "#10b981",
                          textTransform: "uppercase",
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: "#10b981",
                            display: "inline-block",
                          }}
                        />
                        Hired
                      </div>
                    )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 6,
                    }}
                  >
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
                        flexShrink: 0,
                      }}
                    >
                      {agent.avatar}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--color-text-primary)",
                        }}
                      >
                        {agent.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#8b5cf6",
                          fontWeight: 500,
                        }}
                      >
                        {agent.role}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-secondary)",
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    <span
                      style={{
                        background: "var(--color-background-primary)",
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {agent.status === "coming_soon" ? "TBD" : agent.fee}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                background: "rgba(99,102,241,0.06)",
                border: "1px solid rgba(99,102,241,0.15)",
                borderRadius: 12,
                padding: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#6366f1",
                  marginBottom: 6,
                }}
              >
                💳 Cortex Billing Summary
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.7,
                }}
              >
                <strong>$299/mo</strong> base platform fee (includes 1 agent for
                1st clinic)
                <br />
                <strong>$1.50</strong> per approved action (outcome-based
                billing)
                <br />
                <strong>$99/mo</strong> per additional agent instance (per
                clinic)
              </div>
            </div>

            <button
              onClick={() => setStep(S_CLINICS)}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(99,102,241,0.45)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(99,102,241,0.3)";
              }}
            >
              Continue with {selectedAgents.length} agent
              {selectedAgents.length !== 1 ? "s" : ""} →
            </button>
          </div>
        )}

        {/* Step 1: Email verify */}
        {step === 1 && (
          <div
            style={{
              background: "var(--color-background-primary)",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: 16,
              padding: "2rem",
              boxShadow: "var(--shadow-sm)",
              animation: "scaleIn 0.25s ease-out",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "var(--color-accent-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                marginBottom: "1.2rem",
              }}
            >
              ✉️
            </div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                marginBottom: 6,
                letterSpacing: "-0.03em",
              }}
            >
              Verify your email
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "var(--color-text-secondary)",
                marginBottom: "1.5rem",
              }}
            >
              We sent a verification link to{" "}
              <strong style={{ color: "var(--color-text-primary)" }}>
                {form.email}
              </strong>
            </p>

            <div
              style={{
                background: "var(--color-accent-muted)",
                border: "1px solid var(--color-border-secondary)",
                borderRadius: 12,
                padding: "20px",
                marginBottom: "1.5rem",
                textAlign: "center",
              }}
            >
              <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-primary)", fontWeight: 500 }}>
                Please check your inbox for a magic link.
              </p>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--color-text-secondary)" }}>
                Click the link in the email to securely verify your account, then return here to complete your setup.
              </p>
            </div>

            <button
              onClick={handleVerify}
              disabled={!emailVerified}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: 10,
                border: "none",
                background: !emailVerified ? "var(--color-text-secondary)" : "linear-gradient(135deg, #0f766e, #0d9488)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                cursor: !emailVerified ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                boxShadow: !emailVerified ? "none" : "0 4px 14px rgba(15,118,110,0.3)",
              }}
              onMouseEnter={(e) => {
                if (emailVerified) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(15,118,110,0.4)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                if (emailVerified) {
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(15,118,110,0.3)";
                }
              }}
            >
              {emailVerified ? "Continue →" : "Waiting for verification..."}
            </button>

            {!emailVerified && (
              <p style={{ marginTop: "12px", fontSize: "12px", color: "var(--color-text-tertiary)", textAlign: "center" }}>
                You can continue further once your email is verified.
              </p>
            )}
          </div>
        )}

        {/* Clinics step */}
        {step === S_CLINICS && (
          <div
            style={{
              background: "var(--color-background-primary)",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: 16,
              padding: "2rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                marginBottom: 6,
                letterSpacing: "-0.03em",
              }}
            >
              Clinic locations
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "var(--color-text-secondary)",
                marginBottom: "1.5rem",
              }}
            >
              {plan === "starter"
                ? "The Starter plan includes 1 clinic location."
                : `Your ${plan} plan allows up to ${plan === "pro" ? "3" : "unlimited"} locations.`}
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginBottom: "2rem",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--color-text-secondary)",
                  }}
                >
                  Primary location
                </label>
                <input
                  style={{
                    ...inputStyle,
                    background: "var(--color-background-secondary)",
                    border: "1.5px solid var(--color-border-secondary)",
                    color: "var(--color-text-primary)",
                  }}
                  value={form.clinic}
                  disabled
                />
              </div>

              {extraClinics.map((name, i) => (
                <div
                  key={i}
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <label
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      Location #{i + 2}
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setExtraClinics((prev) =>
                          prev.filter((_, idx) => idx !== i),
                        )
                      }
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    style={{
                      ...inputStyle,
                      background: "var(--color-background-primary)",
                      border: "1.5px solid var(--color-border-secondary)",
                      color: "var(--color-text-primary)",
                    }}
                    placeholder="e.g. Downtown Office"
                    value={name}
                    onChange={(e) => {
                      const next = [...extraClinics];
                      next[i] = e.target.value;
                      setExtraClinics(next);
                    }}
                    onFocus={(e) =>
                      (e.target.style.borderColor = "var(--color-accent)")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor =
                        "var(--color-border-secondary)")
                    }
                  />
                </div>
              ))}

              {plan !== "starter" &&
                extraClinics.length + 1 < (plan === "pro" ? 3 : 999) && (
                  <button
                    type="button"
                    onClick={() => setExtraClinics((prev) => [...prev, ""])}
                    style={{
                      padding: "10px",
                      borderRadius: 10,
                      border: "1.5px dashed var(--color-border-secondary)",
                      background: "none",
                      color: "var(--color-text-secondary)",
                      fontSize: 14,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <span>+ Add another location</span>
                  </button>
                )}
            </div>

            <button
              onClick={handleSaveClinics}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(135deg, #0f766e, #0d9488)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: "0 4px 14px rgba(15,118,110,0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(15,118,110,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(15,118,110,0.3)";
              }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* Connect PMS step */}
        {step === S_PMS && (
          <div
            style={{
              background: "var(--color-background-primary)",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: 16,
              padding: "2rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                marginBottom: 6,
                letterSpacing: "-0.03em",
              }}
            >
              Connect your PMS
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "var(--color-text-secondary)",
                marginBottom: "1.5rem",
              }}
            >
              Automatically syncs patients, procedures, and insurance plans.
            </p>

            {pmsStatus === "idle" && (
              <>
                {/* Open Dental card */}
                <div
                  style={{
                    border: "1.5px solid var(--color-accent)",
                    borderRadius: 12,
                    padding: "1.2rem",
                    marginBottom: "1rem",
                    background: "var(--color-accent-muted)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
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
                        background: "rgba(5, 150, 105, 0.2)",
                        color: "#059669",
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontWeight: 500,
                      }}
                    >
                      Supported
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-secondary)",
                      marginBottom: 12,
                    }}
                  >
                    Syncs: patients, procedures, insurance plans, appointment
                    history
                  </div>
                  <button
                    onClick={connectPms}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: 8,
                      border: "none",
                      background: "linear-gradient(135deg, #0f766e, #0d9488)",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      boxShadow: "0 3px 10px rgba(15,118,110,0.3)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(15,118,110,0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "";
                      e.currentTarget.style.boxShadow = "0 3px 10px rgba(15,118,110,0.3)";
                    }}
                  >
                    Connect Open Dental →
                  </button>
                </div>

                {["Dentrix G7+", "ClearDent"].map((name) => (
                  <div
                    key={name}
                    style={{
                      border: "1px dashed var(--color-border-secondary)",
                      borderRadius: 12,
                      padding: "1rem",
                      marginBottom: "0.8rem",
                      opacity: 0.6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "var(--color-text-primary)",
                      }}
                    >
                      {name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        background: "var(--color-background-secondary)",
                        color: "var(--color-text-secondary)",
                        padding: "3px 10px",
                        borderRadius: 20,
                      }}
                    >
                      Coming soon
                    </div>
                  </div>
                ))}

                <button
                  onClick={skipPms}
                  style={{
                    width: "100%",
                    marginTop: 8,
                    padding: "11px",
                    borderRadius: 10,
                    border: "1.5px solid var(--color-border-secondary)",
                    background: "var(--color-background-primary)",
                    color: "var(--color-text-secondary)",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  Skip for now — connect manually later
                </button>
              </>
            )}

            {pmsStatus === "connecting" && (
              <div>
                <div
                  style={{
                    height: 6,
                    background: "var(--color-background-secondary)",
                    borderRadius: 3,
                    marginBottom: "1.5rem",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pmsProgress}%`,
                      background: "var(--color-accent)",
                      borderRadius: 3,
                      transition: "width 0.3s",
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
                        marginBottom: 12,
                        opacity: i < done ? 1 : isActive ? 1 : 0.35,
                        transition: "opacity 0.3s",
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 600,
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
                          transition: "all 0.3s",
                        }}
                      >
                        {i < done ? "✓" : isActive ? "…" : i + 1}
                      </div>
                      <span
                        style={{
                          fontSize: 14,
                          color:
                            i < done
                              ? "var(--color-accent)"
                              : "var(--color-text-primary)",
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
              <div>
                <div
                  style={{
                    background: "rgba(5, 150, 105, 0.1)",
                    border: "1px solid #059669",
                    borderRadius: 12,
                    padding: "1.2rem",
                    marginBottom: "1.5rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "#059669",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: "#059669",
                      }}
                    >
                      Open Dental connected!
                    </div>
                    <div style={{ fontSize: 13, color: "#047857" }}>
                      Full patient sync available in production.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setStep(S_MFA);
                    loadMfa();
                  }}
                  style={{
                    width: "100%",
                    padding: "13px",
                    borderRadius: 10,
                    border: "none",
                    background: "linear-gradient(135deg, #0f766e, #0d9488)",
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: "0 4px 14px rgba(15,118,110,0.3)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(15,118,110,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = "0 4px 14px rgba(15,118,110,0.3)";
                  }}
                >
                  Continue to security setup →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Security/MFA step */}
        {step === S_MFA && (
          <div
            style={{
              background: "var(--color-background-primary)",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: 16,
              padding: "2rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(15, 118, 110, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                marginBottom: "1.2rem",
              }}
            >
              🔐
            </div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                marginBottom: 6,
                letterSpacing: "-0.03em",
              }}
            >
              Security setup
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "var(--color-text-secondary)",
                marginBottom: "1.5rem",
              }}
            >
              PHIPA requires appropriate access controls for patient health
              information.
            </p>

            {mfaData ? (
              <div
                style={{
                  border: "1px solid var(--color-border-secondary)",
                  borderRadius: 12,
                  padding: "1.2rem",
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                    marginBottom: 8,
                  }}
                >
                  Scan with Google Authenticator or Authy
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: 12,
                  }}
                >
                  <img
                    src={mfaData.qrCodeDataUrl}
                    alt="TOTP QR code"
                    style={{
                      width: 160,
                      height: 160,
                      borderRadius: 12,
                      border: "1px solid var(--color-border-secondary)",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--color-text-secondary)",
                    textAlign: "center",
                    marginBottom: 14,
                  }}
                >
                  Or enter manually:{" "}
                  <code
                    style={{
                      fontFamily: "monospace",
                      background: "var(--color-background-secondary)",
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontSize: 11,
                    }}
                  >
                    {mfaData.secret}
                  </code>
                </div>
                <input
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="Enter 6-digit code to confirm"
                  maxLength={6}
                  inputMode="numeric"
                  style={{
                    ...inputStyle,
                    textAlign: "center",
                    letterSpacing: "0.3em",
                    fontSize: 22,
                    fontFamily: "monospace",
                    background: "var(--color-background-primary)",
                    color: "var(--color-text-primary)",
                    border: "1.5px solid var(--color-border-secondary)",
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "var(--color-accent)")
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor =
                      "var(--color-border-secondary)")
                  }
                />
              </div>
            ) : (
              <div
                style={{
                  border: "1px solid var(--color-border-secondary)",
                  borderRadius: 12,
                  padding: "1.2rem",
                  marginBottom: "1rem",
                  background: "var(--color-background-secondary)",
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                    marginBottom: 6,
                  }}
                >
                  Two-factor authentication
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  Protect access to patient data with an authenticator app. You
                  can enable this later in Settings.
                </div>
              </div>
            )}

            <button
              onClick={enableMfa}
              disabled={loading}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: 10,
                border: "none",
                background: loading
                  ? "var(--color-border-primary)"
                  : "linear-gradient(135deg, #0f766e, #0d9488)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                boxShadow: loading ? "none" : "0 4px 14px rgba(15,118,110,0.3)",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(15,118,110,0.4)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = loading ? "none" : "0 4px 14px rgba(15,118,110,0.3)";
              }}
            >
              {loading
                ? "Enabling…"
                : mfaData && mfaCode.length === 6
                  ? "Enable MFA & continue →"
                  : "Skip for now →"}
            </button>
          </div>
        )}

        {/* Done step */}
        {step === S_DONE && (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                background: "var(--color-background-primary)",
                border: "1px solid var(--color-border-secondary)",
                borderRadius: 16,
                padding: "2.5rem 2rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #0f766e, #0d9488)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                  margin: "0 auto 1.5rem",
                  boxShadow: "0 4px 20px rgba(15,118,110,0.3)",
                }}
              >
                ✓
              </div>

              <h2
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                  marginBottom: 6,
                  letterSpacing: "-0.03em",
                }}
              >
                You're all set!
              </h2>
              <p
                style={{
                  fontSize: 15,
                  color: "var(--color-text-secondary)",
                  marginBottom: "2rem",
                  lineHeight: 1.6,
                }}
              >
                {form.clinic || "Your clinic"} is live on DentalIQ. The AI
                copilot is ready.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginBottom: "2rem",
                  textAlign: "left",
                }}
              >
                {[
                  ["Account", "Created ✓"],
                  ["Locations", `${extraClinics.length + 1} Ready ✓`],
                  ["Plan", `${selectedPlan.name} — 14-day trial`],
                  ["AI Copilot", plan === "starter" ? "Inactive" : "Active ✓"],
                ].map(([l, v]) => (
                  <div
                    key={l}
                    style={{
                      background: "var(--color-background-secondary)",
                      border: "1px solid var(--color-border-secondary)",
                      borderRadius: 10,
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {l}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color:
                          plan === "starter" && l === "AI Copilot"
                            ? "var(--color-text-secondary)"
                            : "#059669",
                        fontWeight: 600,
                      }}
                    >
                      {v}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  background: "var(--color-accent-muted)",
                  border: "1px solid var(--color-accent)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  marginBottom: "1.5rem",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--color-accent)",
                    marginBottom: 6,
                  }}
                >
                  Quick start checklist
                </div>
                {[
                  "Run your first insurance estimate",
                  "Add your first patient",
                  "Connect your PMS (Settings → Integrations)",
                  "Set up 2FA for PHIPA compliance",
                ].map((item, i) => (
                  <div
                    key={item}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                      fontSize: 13,
                      color: "var(--color-accent)",
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "var(--color-accent-muted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 600,
                        flexShrink: 0,
                        border: "1px solid var(--color-accent)",
                      }}
                    >
                      {i + 1}
                    </div>
                    {item}
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left" }}>
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  style={{
                    marginTop: 4,
                    width: 16,
                    height: 16,
                    cursor: "pointer",
                    accentColor: "var(--color-accent)",
                  }}
                />
                <label
                  htmlFor="terms"
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-secondary)",
                    lineHeight: 1.5,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  I agree to the{" "}
                  <Link href="/terms" target="_blank" style={{ color: "var(--color-accent)", fontWeight: 600, textDecoration: "none" }}>
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" target="_blank" style={{ color: "var(--color-accent)", fontWeight: 600, textDecoration: "none" }}>
                    Privacy Policy
                  </Link>
                  . I understand that DentalIQ is an administrative assistant tool and I remain responsible for verifying all AI-generated content before submission.
                </label>
              </div>

              <button
                onClick={goToDashboard}
                disabled={!termsAccepted}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 10,
                  border: "none",
                  background: termsAccepted
                    ? "linear-gradient(135deg, #0f766e, #0d9488)"
                    : "var(--color-text-tertiary)",
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: termsAccepted ? "pointer" : "not-allowed",
                  letterSpacing: "-0.01em",
                  boxShadow: termsAccepted ? "0 4px 14px rgba(15,118,110,0.3)" : "none",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (termsAccepted) {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(15,118,110,0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  if (termsAccepted) {
                    e.currentTarget.style.boxShadow = "0 4px 14px rgba(15,118,110,0.3)";
                  }
                }}
              >
                Launch Dashboard →
              </button>
            </div>
          </div>
        )}
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
