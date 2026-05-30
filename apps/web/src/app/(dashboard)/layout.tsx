"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useClinic } from "@/contexts/clinic-context";
import { tenantsApi, type Tenant, patientsApi, estimateApi } from "@/lib/api";
import {
  X,
  Send,
  Sparkles,
  MessageSquare,
  Building2,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { TourGuide } from "@/components/TourGuide";
import { ClinicInsightPopup } from "@/components/ClinicInsightPopup";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/hooks/useTheme";
import { ToastProvider } from "@/components/Toast";
import { CommandPalette } from "@/components/CommandPalette";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { NotificationCenter } from "@/components/NotificationCenter";
import { insurancePlansApi } from "@/lib/api";

// permission key that gates this nav item for sub-users (undefined = admin-only)
const NAV: {
  href: string;
  label: string;
  icon: React.ReactElement;
  permission?: string;
  adminOnly?: boolean;
}[] = [
  {
    href: "/dashboard",
    label: "Overview",
    permission: "dashboard",
    icon: (
      <svg
        width="18"
        height="18"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    href: "/dashboard/estimates",
    label: "Estimates",
    permission: "estimates",
    icon: (
      <svg
        width="18"
        height="18"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    href: "/dashboard/claims",
    label: "Claims",
    permission: "claims",
    icon: (
      <svg
        width="18"
        height="18"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    href: "/dashboard/patients",
    label: "Patients",
    permission: "patients",
    icon: (
      <svg
        width="18"
        height="18"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    permission: "analytics",
    icon: (
      <svg
        width="18"
        height="18"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16 8v8m-4-5v5m-4-2v2M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    permission: "settings",
    icon: (
      <svg
        width="18"
        height="18"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    href: "/dashboard/support",
    label: "Support",
    permission: "support",
    icon: (
      <svg
        width="18"
        height="18"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    href: "/dashboard/billing",
    label: "Billing",
    adminOnly: true, // billing is NEVER shown to sub-users
    icon: (
      <svg
        width="18"
        height="18"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    ),
  },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, clearSession, accessToken } = useAuth();
  const { selectedClinicId, setSelectedClinicId } = useClinic();
  const router = useRouter();
  const pathname = usePathname();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    { role: string; content: string }[]
  >([
    {
      role: "assistant",
      content:
        "Hello! I'm your DentalIQ Copilot. I have full context of your clinic's patients, claims, and estimates. How can I help you today?",
    },
  ]);
  const [patients, setPatients] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [clinics, setClinics] = useState<any[]>([]);
  const [isClinicMenuOpen, setIsClinicMenuOpen] = useState(false);
  const [cdtCodes, setCdtCodes] = useState<any[]>([]);
  const [insurancePlans, setInsurancePlans] = useState<any[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ── Forced MFA setup state (admins who skipped during signup) ──
  const [mfaSetupData, setMfaSetupData] = useState<{
    secret: string;
    qrCodeDataUrl: string;
    backupCodes: string[];
  } | null>(null);
  const [mfaSetupCode, setMfaSetupCode] = useState("");
  const [mfaSetupSaved, setMfaSetupSaved] = useState(false);
  const [mfaSetupStep, setMfaSetupStep] = useState<"scan" | "verify" | "done">(
    "scan",
  );
  const [mfaSetupLoading, setMfaSetupLoading] = useState(false);
  const [mfaSetupError, setMfaSetupError] = useState("");

  useTheme("diq_dash_theme");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (accessToken) {
      tenantsApi
        .getTenant(accessToken)
        .then(setTenant)
        .catch(() => {});
      tenantsApi
        .getClinics(accessToken)
        .then((data) => {
          setClinics(data);
          if (data.length > 0 && !selectedClinicId)
            setSelectedClinicId(data[0].id);
        })
        .catch(() => {});
    }
  }, [accessToken]);

  // Refresh clinic list + tenant when clinic name is saved in settings
  useEffect(() => {
    const handler = () => {
      if (!accessToken) return;
      tenantsApi
        .getTenant(accessToken)
        .then(setTenant)
        .catch(() => {});
      tenantsApi
        .getClinics(accessToken)
        .then(setClinics)
        .catch(() => {});
    };
    window.addEventListener("diq_clinic_updated", handler);
    return () => window.removeEventListener("diq_clinic_updated", handler);
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      patientsApi
        .getPatients(accessToken)
        .then(setPatients)
        .catch(() => {});
      estimateApi
        .getHistory(accessToken)
        .then(setHistory)
        .catch(() => {});
      estimateApi
        .getCodes(accessToken)
        .then(setCdtCodes)
        .catch(() => {});
      insurancePlansApi
        .getPlans(accessToken)
        .then(setInsurancePlans)
        .catch(() => {});
    }
  }, [accessToken, selectedClinicId]);

  // Check if onboarding should show (first visit, no patients)
  useEffect(() => {
    if (!onboardingChecked && tenant && patients !== undefined) {
      const dismissed = localStorage.getItem("diq_onboarding_done");
      if (!dismissed && patients.length === 0) {
        setShowOnboarding(true);
      }
      setOnboardingChecked(true);
    }
  }, [tenant, patients, onboardingChecked]);

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: "user", content: chatInput };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);
    try {
      const patientSummary = patients
        .slice(0, 10)
        .map((p) => `${p.first_name} ${p.last_name}`)
        .join(", ");
      const claimStats = `Total Estimates/Claims: ${history.length}, High Risk: ${history.filter((h) => h.claim_risk === "high").length}`;
      const res = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "phi3",
          messages: [
            {
              role: "system",
              content: `You are the DentalIQ Copilot, an AI assistant for a dental clinic in Ontario, Canada. Clinic: ${tenant?.name || "Your Clinic"}, Patients: ${patients.length}, ${claimStats}. Be helpful, professional, and concise.`,
            },
            ...chatMessages,
            userMsg,
          ],
          stream: false,
        }),
      });
      const data = await res.json();
      if (data.message) setChatMessages((prev) => [...prev, data.message]);
      else throw new Error("Invalid response");
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I cannot reach the AI engine. Please ensure Ollama is running (`node setup.js`).",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Fetch MFA setup data when admin hasn't set up MFA yet
  useEffect(() => {
    if (!accessToken || !user || user.mfaEnabled || user.role !== "admin")
      return;
    if (mfaSetupData) return;
    fetch(
      `${process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3001"}/auth/mfa/setup`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: "include",
      },
    )
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setMfaSetupData(j.data);
      })
      .catch(() => {});
  }, [accessToken, user, mfaSetupData]);

  async function handleMfaSetupVerify() {
    if (!accessToken || !mfaSetupData || mfaSetupCode.length !== 6) return;
    setMfaSetupLoading(true);
    setMfaSetupError("");
    try {
      const r = await fetch(
        `${process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3001"}/auth/mfa/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: "include",
          body: JSON.stringify({
            code: mfaSetupCode,
            secret: mfaSetupData.secret,
          }),
        },
      );
      const j = await r.json();
      if (!j.success) {
        setMfaSetupError("That code didn't match — try again.");
        return;
      }
      setMfaSetupStep("done");
      // Refresh session so mfaEnabled flips to true
      setTimeout(() => window.location.reload(), 1800);
    } catch {
      setMfaSetupError("Something went wrong. Please try again.");
    } finally {
      setMfaSetupLoading(false);
    }
  }

  // Show forced MFA setup interstitial for admins who skipped it during signup
  if (!loading && user && user.role === "admin" && !user.mfaEnabled) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-bg-dashboard, #0f172a)",
          padding: 24,
        }}
      >
        <style>{`
          @keyframes mfaPopIn { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
          @keyframes spin { to { transform: rotate(360deg) } }
        `}</style>
        <div
          style={{
            background: "var(--color-surface, #1a2332)",
            border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
            borderRadius: 24,
            padding: "40px 36px 32px",
            maxWidth: 460,
            width: "100%",
            textAlign: "center",
            boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
            animation: "mfaPopIn 0.4s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {mfaSetupStep === "done" ? (
            <>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--color-text-primary, #f1f5f9)",
                  margin: "0 0 10px",
                }}
              >
                You're all set!
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--color-text-secondary, #94a3b8)",
                  lineHeight: 1.6,
                }}
              >
                Two-factor authentication is now active on your account. Loading
                your dashboard…
              </p>
              <div
                style={{
                  marginTop: 20,
                  width: 28,
                  height: 28,
                  border: "3px solid rgba(255,255,255,0.1)",
                  borderTopColor: "#0d9488",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                  margin: "20px auto 0",
                }}
              />
            </>
          ) : (
            <>
              {/* Header */}
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  background: "linear-gradient(135deg, #0f766e, #0d9488)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 30,
                  margin: "0 auto 20px",
                  boxShadow: "0 8px 24px rgba(15,118,110,0.3)",
                }}
              >
                🔐
              </div>

              <div
                style={{
                  display: "inline-block",
                  padding: "4px 12px",
                  background: "rgba(245,158,11,0.12)",
                  border: "1px solid rgba(245,158,11,0.25)",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#f59e0b",
                  marginBottom: 14,
                }}
              >
                Action required
              </div>

              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--color-text-primary, #f1f5f9)",
                  margin: "0 0 10px",
                  letterSpacing: "-0.02em",
                }}
              >
                Set up two-factor authentication
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--color-text-secondary, #94a3b8)",
                  lineHeight: 1.6,
                  margin: "0 0 28px",
                }}
              >
                As the account admin, two-factor authentication is required to
                protect your clinic's patient data. This only takes a minute.
              </p>

              {mfaSetupStep === "scan" && (
                <>
                  {mfaSetupData ? (
                    <>
                      <div
                        style={{
                          background: "#fff",
                          borderRadius: 12,
                          padding: 12,
                          display: "inline-block",
                          marginBottom: 16,
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={mfaSetupData.qrCodeDataUrl}
                          alt="MFA QR Code"
                          style={{ width: 160, height: 160, display: "block" }}
                        />
                      </div>
                      <p
                        style={{
                          fontSize: 13,
                          color: "var(--color-text-secondary, #94a3b8)",
                          marginBottom: 8,
                        }}
                      >
                        Scan with Google Authenticator, Authy, or any TOTP app.
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--color-text-tertiary, #64748b)",
                          marginBottom: 20,
                        }}
                      >
                        Can't scan? Use this code manually:
                        <span
                          style={{
                            display: "block",
                            fontFamily: "monospace",
                            fontSize: 13,
                            letterSpacing: "0.08em",
                            color: "var(--color-text-primary, #f1f5f9)",
                            marginTop: 4,
                          }}
                        >
                          {mfaSetupData.secret}
                        </span>
                      </p>

                      {/* Backup codes */}
                      <div
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 12,
                          padding: "14px 16px",
                          marginBottom: 20,
                          textAlign: "left",
                        }}
                      >
                        <p
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--color-text-secondary, #94a3b8)",
                            margin: "0 0 8px",
                          }}
                        >
                          Save these backup codes somewhere safe — you'll need
                          one if you lose your phone.
                        </p>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 4,
                          }}
                        >
                          {mfaSetupData.backupCodes.map((c, i) => (
                            <span
                              key={i}
                              style={{
                                fontFamily: "monospace",
                                fontSize: 12,
                                color: "var(--color-text-primary, #f1f5f9)",
                                padding: "2px 0",
                              }}
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>

                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          cursor: "pointer",
                          marginBottom: 20,
                          justifyContent: "center",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={mfaSetupSaved}
                          onChange={(e) => setMfaSetupSaved(e.target.checked)}
                          style={{
                            width: 16,
                            height: 16,
                            accentColor: "#0d9488",
                            cursor: "pointer",
                          }}
                        />
                        <span
                          style={{
                            fontSize: 13,
                            color: "var(--color-text-secondary, #94a3b8)",
                          }}
                        >
                          I've saved my backup codes
                        </span>
                      </label>

                      <button
                        onClick={() => {
                          if (mfaSetupSaved) setMfaSetupStep("verify");
                        }}
                        disabled={!mfaSetupSaved}
                        style={{
                          width: "100%",
                          padding: "12px 0",
                          background: mfaSetupSaved
                            ? "linear-gradient(135deg, #0f766e, #0d9488)"
                            : "rgba(255,255,255,0.06)",
                          color: mfaSetupSaved
                            ? "#fff"
                            : "var(--color-text-tertiary, #64748b)",
                          border: "none",
                          borderRadius: 12,
                          fontSize: 15,
                          fontWeight: 600,
                          cursor: mfaSetupSaved ? "pointer" : "not-allowed",
                          transition: "all 0.2s",
                        }}
                      >
                        I've scanned the QR code →
                      </button>
                    </>
                  ) : (
                    <div
                      style={{
                        padding: "24px 0",
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          border: "3px solid rgba(255,255,255,0.1)",
                          borderTopColor: "#0d9488",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                    </div>
                  )}
                </>
              )}

              {mfaSetupStep === "verify" && (
                <>
                  <p
                    style={{
                      fontSize: 14,
                      color: "var(--color-text-secondary, #94a3b8)",
                      marginBottom: 20,
                    }}
                  >
                    Enter the 6-digit code from your authenticator app to
                    confirm it's working.
                  </p>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={mfaSetupCode}
                    onChange={(e) =>
                      setMfaSetupCode(
                        e.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      textAlign: "center",
                      fontSize: 24,
                      fontFamily: "monospace",
                      letterSpacing: "0.2em",
                      background: "rgba(255,255,255,0.05)",
                      border: `1.5px solid ${mfaSetupError ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
                      borderRadius: 12,
                      color: "var(--color-text-primary, #f1f5f9)",
                      outline: "none",
                      boxSizing: "border-box",
                      marginBottom: 8,
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleMfaSetupVerify();
                    }}
                    autoFocus
                  />
                  {mfaSetupError && (
                    <p
                      style={{
                        fontSize: 13,
                        color: "#ef4444",
                        marginBottom: 12,
                      }}
                    >
                      {mfaSetupError}
                    </p>
                  )}
                  <button
                    onClick={handleMfaSetupVerify}
                    disabled={mfaSetupCode.length !== 6 || mfaSetupLoading}
                    style={{
                      width: "100%",
                      padding: "12px 0",
                      marginTop: 8,
                      background:
                        mfaSetupCode.length === 6
                          ? "linear-gradient(135deg, #0f766e, #0d9488)"
                          : "rgba(255,255,255,0.06)",
                      color:
                        mfaSetupCode.length === 6
                          ? "#fff"
                          : "var(--color-text-tertiary, #64748b)",
                      border: "none",
                      borderRadius: 12,
                      fontSize: 15,
                      fontWeight: 600,
                      cursor:
                        mfaSetupCode.length === 6 ? "pointer" : "not-allowed",
                    }}
                  >
                    {mfaSetupLoading
                      ? "Verifying…"
                      : "Activate two-factor auth"}
                  </button>
                  <button
                    onClick={() => {
                      setMfaSetupStep("scan");
                      setMfaSetupCode("");
                      setMfaSetupError("");
                    }}
                    style={{
                      marginTop: 10,
                      background: "none",
                      border: "none",
                      color: "var(--color-text-tertiary, #64748b)",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    ← Back to QR code
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-bg-dashboard)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 11,
              background: "linear-gradient(135deg, #0f766e, #0d9488)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            +
          </div>
          <div
            style={{
              width: 24,
              height: 24,
              border: "2px solid var(--color-border-secondary)",
              borderTopColor: "var(--color-accent)",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div
        style={{
          display: "flex",
          height: "100vh",
          background: "var(--color-bg-dashboard)",
          overflow: "hidden",
          color: "var(--color-text-primary)",
        }}
      >
        {/* Command Palette (Cmd+K) */}
        <CommandPalette patients={patients} cdtCodes={cdtCodes} />

        {/* Onboarding Wizard for new clinics */}
        {showOnboarding && (
          <OnboardingWizard
            clinicName={tenant?.name || "Your Clinic"}
            plan={tenant?.plan || "starter"}
            hasClinics={clinics.length > 0}
            hasPatients={patients.length > 0}
            hasInsurance={insurancePlans.length > 0}
            onComplete={() => {
              setShowOnboarding(false);
              localStorage.setItem("diq_onboarding_done", "1");
            }}
          />
        )}
        {/* Mobile sidebar backdrop */}
        <div
          className="diq-sidebar-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            display: "none",
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 999,
            opacity: isMobileMenuOpen ? 1 : 0,
            pointerEvents: isMobileMenuOpen ? "auto" : "none",
            transition: "opacity 0.25s ease",
          }}
        />

        {/* ── SIDEBAR ── */}
        <aside
          className={`diq-sidebar ${isMobileMenuOpen ? "diq-sidebar--open" : ""}`}
          style={{
            width: isSidebarExpanded ? 240 : 72,
            display: "flex",
            flexDirection: "column",
            background: "var(--color-sidebar-bg)",
            flexShrink: 0,
            transition: "width 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
            position: "relative",
            zIndex: 50,
            alignItems: isSidebarExpanded ? "stretch" : "center",
            borderRight: "1px solid rgba(255,255,255,0.03)",
          }}
        >
          {/* Toggle Button */}
          <button
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            style={{
              position: "absolute",
              top: 26,
              right: -12,
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "var(--color-sidebar-bg)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 10,
              boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              style={{
                transform: isSidebarExpanded
                  ? "rotate(180deg)"
                  : "rotate(0deg)",
                transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Logo */}
          <div
            style={{
              height: 72,
              display: "flex",
              alignItems: "center",
              padding: isSidebarExpanded ? "0 20px" : "0",
              justifyContent: isSidebarExpanded ? "flex-start" : "center",
              width: "100%",
              flexShrink: 0,
              gap: 12,
            }}
          >
            <Link
              href="/dashboard"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #0f766e, #0d9488)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 19,
                  fontWeight: 800,
                  color: "#fff",
                  boxShadow: "0 2px 10px rgba(15,118,110,0.45)",
                  flexShrink: 0,
                }}
              >
                +
              </div>
              {isSidebarExpanded && (
                <span
                  style={{
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 19,
                    letterSpacing: "-0.04em",
                  }}
                >
                  DentalIQ
                </span>
              )}
            </Link>
          </div>

          {/* Clinic selector */}
          {(() => {
            const activeClinic = clinics.find((c) => c.id === selectedClinicId);
            const clinicInitials = (name: string) =>
              name
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase() ?? "")
                .join("");
            // Deterministic pastel colour per clinic name
            const clinicColor = (name: string) => {
              const palette = [
                { bg: "#0d9488", text: "#fff" },
                { bg: "#7c3aed", text: "#fff" },
                { bg: "#b45309", text: "#fff" },
                { bg: "#0369a1", text: "#fff" },
                { bg: "#be185d", text: "#fff" },
                { bg: "#065f46", text: "#fff" },
              ];
              let h = 0;
              for (let i = 0; i < name.length; i++)
                h = (h * 31 + name.charCodeAt(i)) & 0xffff;
              return palette[h % palette.length];
            };
            return (
              <div
                style={{
                  width: "100%",
                  padding: isSidebarExpanded ? "8px 12px" : "8px 0",
                  display: "flex",
                  justifyContent: "center",
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                {/* Trigger button */}
                <button
                  onClick={() => setIsClinicMenuOpen(!isClinicMenuOpen)}
                  title={
                    isSidebarExpanded
                      ? undefined
                      : activeClinic?.name || "Select Clinic"
                  }
                  style={{
                    width: isSidebarExpanded ? "100%" : 42,
                    height: isSidebarExpanded ? 52 : 42,
                    borderRadius: 12,
                    background: isClinicMenuOpen
                      ? "rgba(15,118,110,0.2)"
                      : "rgba(255,255,255,0.05)",
                    border: isClinicMenuOpen
                      ? "1px solid rgba(20,184,166,0.35)"
                      : "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    padding: isSidebarExpanded ? "0 10px" : "0",
                    justifyContent: isSidebarExpanded ? "flex-start" : "center",
                    gap: 10,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    outline: "none",
                  }}
                >
                  {/* Avatar */}
                  {activeClinic ? (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: clinicColor(activeClinic.name).bg,
                        color: clinicColor(activeClinic.name).text,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        flexShrink: 0,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {clinicInitials(activeClinic.name) || "?"}
                    </div>
                  ) : (
                    <Building2
                      size={18}
                      style={{ flexShrink: 0, color: "rgba(255,255,255,0.4)" }}
                    />
                  )}

                  {/* Name + subtitle */}
                  {isSidebarExpanded && (
                    <>
                      <div
                        style={{
                          flex: 1,
                          textAlign: "left",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#fff",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            lineHeight: "1.2",
                          }}
                        >
                          {activeClinic?.name || "Select Clinic"}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.4)",
                            marginTop: 2,
                            lineHeight: "1",
                          }}
                        >
                          {clinics.length === 1
                            ? "1 location"
                            : `${clinics.length} locations`}
                        </div>
                      </div>
                      <ChevronDown
                        size={13}
                        style={{
                          color: "rgba(255,255,255,0.35)",
                          transform: isClinicMenuOpen
                            ? "rotate(180deg)"
                            : "none",
                          transition: "transform 0.2s ease",
                          flexShrink: 0,
                        }}
                      />
                    </>
                  )}
                </button>

                {/* Dropdown */}
                {isClinicMenuOpen && (
                  <div
                    style={{
                      position: "absolute",
                      ...(isSidebarExpanded
                        ? { top: "calc(100% - 4px)", left: 12, right: 12 }
                        : { top: 0, left: "calc(100% + 8px)" }),
                      zIndex: 1000,
                      background: "#1a1f2e",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 14,
                      boxShadow:
                        "0 16px 48px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)",
                      overflow: "hidden",
                      minWidth: isSidebarExpanded ? undefined : 220,
                      animation: isSidebarExpanded
                        ? "ddFadeDown 0.15s ease-out"
                        : "ddFadeRight 0.15s ease-out",
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        padding: "10px 14px 8px",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      Locations
                    </div>

                    {/* Clinic list */}
                    <div style={{ padding: "6px 6px" }}>
                      {clinics.map((c) => {
                        const col = clinicColor(c.name);
                        const isActive = selectedClinicId === c.id;
                        return (
                          <button
                            key={c.id}
                            onClick={() => {
                              setSelectedClinicId(c.id);
                              setIsClinicMenuOpen(false);
                            }}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              border: "none",
                              borderRadius: 9,
                              background: isActive
                                ? "rgba(15,118,110,0.18)"
                                : "transparent",
                              cursor: "pointer",
                              textAlign: "left",
                              transition: "background 0.1s",
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive)
                                e.currentTarget.style.background =
                                  "rgba(255,255,255,0.05)";
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive)
                                e.currentTarget.style.background =
                                  "transparent";
                            }}
                          >
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 8,
                                background: col.bg,
                                color: col.text,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 11,
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {clinicInitials(c.name) || "?"}
                            </div>
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: isActive ? 600 : 400,
                                color: isActive
                                  ? "#fff"
                                  : "rgba(255,255,255,0.75)",
                                flex: 1,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {c.name}
                            </span>
                            {isActive && (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#14b8a6"
                                strokeWidth="2.5"
                                style={{ flexShrink: 0 }}
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Footer */}
                    <div
                      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      {tenant?.plan !== "starter" &&
                      clinics.length < (tenant?.plan === "pro" ? 3 : 999) ? (
                        <Link
                          href="/dashboard/settings?tab=clinics"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "10px 16px",
                            color: "#14b8a6",
                            textDecoration: "none",
                            fontSize: 13,
                            fontWeight: 500,
                          }}
                          onClick={() => setIsClinicMenuOpen(false)}
                        >
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 6,
                              background: "rgba(20,184,166,0.15)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 14,
                              fontWeight: 700,
                              lineHeight: 1,
                            }}
                          >
                            +
                          </div>
                          Add Location
                        </Link>
                      ) : tenant?.plan === "starter" ? (
                        <Link
                          href="/dashboard/settings"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "10px 16px",
                            textDecoration: "none",
                            fontSize: 12,
                            fontWeight: 500,
                            color: "rgba(255,255,255,0.4)",
                          }}
                          onClick={() => setIsClinicMenuOpen(false)}
                        >
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 6,
                              background: "rgba(255,255,255,0.07)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                            }}
                          >
                            ↑
                          </div>
                          Upgrade for multi-location
                        </Link>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Dropdown animations */}
                <style>{`
                @keyframes ddFadeDown {
                  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
                  to   { opacity: 1; transform: translateY(0)   scale(1); }
                }
                @keyframes ddFadeRight {
                  from { opacity: 0; transform: translateX(-6px) scale(0.97); }
                  to   { opacity: 1; transform: translateX(0)    scale(1); }
                }
              `}</style>
              </div>
            );
          })()}

          {/* Nav icons */}
          <nav
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "10px 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              width: "100%",
            }}
          >
            {NAV.filter((item) => {
              // Admin always sees everything
              if (user?.role === "admin") return true;
              // adminOnly items are never shown to sub-users
              if (item.adminOnly) return false;
              // For sub-users, show item only if their permissions include it
              const perms: string[] = (user as any)?.permissions ?? [];
              return !item.permission || perms.includes(item.permission);
            }).map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isSidebarExpanded ? undefined : item.label}
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    width: isSidebarExpanded ? "calc(100% - 24px)" : 46,
                    height: 46,
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isSidebarExpanded ? "flex-start" : "center",
                    padding: isSidebarExpanded ? "0 14px" : "0",
                    margin: isSidebarExpanded ? "0 12px" : "0",
                    background: isActive
                      ? "rgba(20,184,166,0.15)"
                      : "transparent",
                    color: isActive ? "#2dd4bf" : "rgba(255,255,255,0.45)",
                    textDecoration: "none",
                    transition: "all 0.13s",
                    position: "relative",
                    gap: 12,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.08)";
                      e.currentTarget.style.color = "rgba(255,255,255,0.85)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "rgba(255,255,255,0.45)";
                    }
                  }}
                >
                  {isActive && !isSidebarExpanded && (
                    <div
                      style={{
                        position: "absolute",
                        left: -2,
                        top: "22%",
                        bottom: "22%",
                        width: 3,
                        borderRadius: 99,
                        background: "#2dd4bf",
                      }}
                    />
                  )}
                  <div style={{ flexShrink: 0, opacity: isActive ? 1 : 0.85 }}>
                    {item.icon}
                  </div>
                  {isSidebarExpanded && (
                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: isActive ? 700 : 500,
                        whiteSpace: "nowrap",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Cortex section */}
            {tenant?.plan === "cortex" && (
              <>
                <div
                  style={{
                    width: 28,
                    height: 1,
                    background: "rgba(255,255,255,0.08)",
                    margin: "6px 0",
                    flexShrink: 0,
                  }}
                />
                {(
                  [
                    {
                      href: "/dashboard/cortex",
                      label: "Command Center",
                      icon: "🧠",
                      permission: "cortex_agents",
                    },
                    {
                      href: "/dashboard/cortex/inbox",
                      label: "Approval Inbox",
                      icon: "📥",
                      permission: "cortex_inbox",
                    },
                  ] as {
                    href: string;
                    label: string;
                    icon: string;
                    permission: string;
                  }[]
                )
                  .filter((item) => {
                    if (user?.role === "admin") return true;
                    const perms: string[] = (user as any)?.permissions ?? [];
                    return perms.includes(item.permission);
                  })
                  .map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={isSidebarExpanded ? undefined : item.label}
                        onClick={() => setIsMobileMenuOpen(false)}
                        style={{
                          width: isSidebarExpanded ? "calc(100% - 24px)" : 46,
                          height: 46,
                          borderRadius: 12,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: isSidebarExpanded
                            ? "flex-start"
                            : "center",
                          padding: isSidebarExpanded ? "0 14px" : "0",
                          margin: isSidebarExpanded ? "0 12px" : "0",
                          background: isActive
                            ? "rgba(99,102,241,0.18)"
                            : "transparent",
                          color: isActive ? "#a5b4fc" : "rgba(255,255,255,0.4)",
                          textDecoration: "none",
                          transition: "all 0.13s",
                          fontSize: 18,
                          gap: 12,
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background =
                              "rgba(255,255,255,0.08)";
                            e.currentTarget.style.color =
                              "rgba(255,255,255,0.85)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color =
                              "rgba(255,255,255,0.4)";
                          }
                        }}
                      >
                        <div
                          style={{ flexShrink: 0, opacity: isActive ? 1 : 0.8 }}
                        >
                          {item.icon}
                        </div>
                        {isSidebarExpanded && (
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: isActive ? 700 : 500,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.label}
                          </span>
                        )}
                      </Link>
                    );
                  })}
              </>
            )}
          </nav>

          {/* Bottom: theme + logout + avatar */}
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              padding: isSidebarExpanded ? "20px 14px" : "20px 0",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              flexShrink: 0,
              alignItems: "center",
            }}
          >
            {/* Theme toggle wrapper */}
            <div
              style={{
                color: "rgba(255,255,255,0.4)",
                width: isSidebarExpanded ? "100%" : "auto",
              }}
            >
              <ThemeToggle storageKey="diq_dash_theme" variant="sidebar" />
            </div>

            {/* Logout */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                clearSession();
              }}
              title={isSidebarExpanded ? undefined : "Sign out"}
              style={{
                width: isSidebarExpanded ? "100%" : 42,
                height: 42,
                borderRadius: 12,
                background: isSidebarExpanded
                  ? "rgba(239,68,68,0.08)"
                  : "transparent",
                border: isSidebarExpanded
                  ? "1px solid rgba(239,68,68,0.15)"
                  : "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isSidebarExpanded ? "#fca5a5" : "rgba(255,255,255,0.35)",
                transition: "all 0.2s",
                gap: 10,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#ef4444";
                e.currentTarget.style.background = "rgba(239,68,68,0.12)";
                if (isSidebarExpanded)
                  e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = isSidebarExpanded
                  ? "#fca5a5"
                  : "rgba(255,255,255,0.35)";
                e.currentTarget.style.background = isSidebarExpanded
                  ? "rgba(239,68,68,0.08)"
                  : "transparent";
                if (isSidebarExpanded)
                  e.currentTarget.style.borderColor = "rgba(239,68,68,0.15)";
              }}
            >
              <LogOut size={18} />
              {isSidebarExpanded && (
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>
                  Sign out
                </span>
              )}
            </button>

            {/* User Profile */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: isSidebarExpanded ? "10px 12px" : "0",
                borderRadius: 14,
                width: isSidebarExpanded ? "100%" : "auto",
                background: isSidebarExpanded
                  ? "rgba(255,255,255,0.03)"
                  : "transparent",
                marginTop: isSidebarExpanded ? 4 : 0,
              }}
            >
              <div
                title={`${user.name} · ${user.role.replace("_", " ")}`}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #0f766e, #0d9488)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#fff",
                  boxShadow: "0 2px 8px rgba(15,118,110,0.35)",
                  flexShrink: 0,
                  border: "2px solid rgba(255,255,255,0.1)",
                }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              {isSidebarExpanded && (
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: "#fff",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {user.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.4)",
                      textTransform: "capitalize",
                      fontWeight: 500,
                    }}
                  >
                    {user.role.replace("_", " ")}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            position: "relative",
            background: "var(--color-bg-dashboard)",
          }}
          onClick={() => isClinicMenuOpen && setIsClinicMenuOpen(false)}
        >
          {/* Mobile header */}
          <div
            className="diq-mobile-header"
            style={{
              display: "none",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid var(--color-border-secondary)",
              background: "var(--color-background-primary)",
              position: "sticky",
              top: 0,
              zIndex: 100,
            }}
          >
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "var(--color-background-secondary)",
                border: "1px solid var(--color-border-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-text-primary)",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <Link
              href="/dashboard"
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: "linear-gradient(135deg, #0f766e, #0d9488)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 17,
                  fontWeight: 800,
                  color: "#fff",
                }}
              >
                +
              </div>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 17,
                  letterSpacing: "-0.04em",
                  color: "var(--color-text-primary)",
                }}
              >
                DentalIQ
              </span>
            </Link>
            <div style={{ width: 40 }} /> {/* spacer for centering */}
          </div>

          <div
            className="diq-notif-bar"
            style={{
              display: "flex",
              justifyContent: "flex-end",
              padding: "12px 32px 0",
              gap: 8,
            }}
          >
            <NotificationCenter accessToken={accessToken} />
          </div>
          <div
            className="diq-breadcrumbs-wrap"
            style={{ padding: "20px 32px 0" }}
          >
            <Breadcrumbs />
          </div>
          {children}

          {/* Suspended overlay */}
          {tenant?.status === "suspended" && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 99999,
                background: "rgba(0,0,0,0.85)",
                backdropFilter: "blur(16px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "2rem",
                animation: "fadeIn 0.3s ease",
              }}
            >
              <div
                style={{
                  maxWidth: 500,
                  width: "100%",
                  background: "var(--color-background-primary)",
                  borderRadius: 24,
                  padding: "3rem",
                  textAlign: "center",
                  boxShadow: "var(--shadow-2xl)",
                  border: "1px solid var(--color-border-secondary)",
                  animation: "scaleIn 0.3s ease-out",
                }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: "rgba(15,118,110,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 2rem",
                    color: "var(--color-accent)",
                  }}
                >
                  <Sparkles size={40} />
                </div>
                <h2
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    marginBottom: "1rem",
                    color: "var(--color-text-primary)",
                    letterSpacing: "-0.03em",
                  }}
                >
                  Free Trial Ended
                </h2>
                <p
                  style={{
                    fontSize: 16,
                    color: "var(--color-text-secondary)",
                    lineHeight: 1.6,
                    marginBottom: "2.5rem",
                  }}
                >
                  We hope you enjoyed your time with DentalIQ! To continue,
                  please contact our support team to activate your subscription.
                </p>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  <a
                    href="mailto:support@dentaliq.dev"
                    style={{
                      background: "linear-gradient(135deg, #0f766e, #0d9488)",
                      color: "#fff",
                      padding: "14px 24px",
                      borderRadius: 12,
                      fontWeight: 600,
                      textDecoration: "none",
                      boxShadow: "var(--shadow-accent)",
                      transition: "opacity 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.opacity = "0.9")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    Contact Support to Activate
                  </a>
                  <button
                    onClick={() => clearSession()}
                    style={{
                      background: "transparent",
                      color: "var(--color-text-secondary)",
                      padding: "12px",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    Sign out of {tenant?.name}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AI Chat Float */}
          {tenant?.plan !== "starter" && (
            <div
              className="diq-chat-float"
              style={{
                position: "fixed",
                bottom: 24,
                right: 24,
                zIndex: 999,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 12,
              }}
            >
              {isChatOpen && (
                <div
                  className="diq-chat-window"
                  style={{
                    width: 380,
                    height: 520,
                    background: "var(--color-background-primary)",
                    border: "1px solid var(--color-border-secondary)",
                    borderRadius: 18,
                    boxShadow: "var(--shadow-xl)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    animation: "slideIn 0.25s var(--t-spring)",
                  }}
                >
                  <div
                    style={{
                      padding: "16px 20px",
                      background: "linear-gradient(135deg, #0f766e, #0d9488)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 9,
                          background: "rgba(255,255,255,0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 14,
                            letterSpacing: "-0.01em",
                          }}
                        >
                          DentalIQ Copilot
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.8 }}>
                          Powered by local AI
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsChatOpen(false)}
                      style={{
                        background: "rgba(255,255,255,0.15)",
                        border: "none",
                        color: "#fff",
                        cursor: "pointer",
                        padding: 6,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      background: "var(--color-background-secondary)",
                    }}
                  >
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        style={{
                          alignSelf:
                            msg.role === "user" ? "flex-end" : "flex-start",
                          maxWidth: "86%",
                        }}
                      >
                        <div
                          style={{
                            padding: "10px 14px",
                            borderRadius:
                              msg.role === "user"
                                ? "14px 14px 4px 14px"
                                : "14px 14px 14px 4px",
                            fontSize: 13.5,
                            lineHeight: 1.55,
                            background:
                              msg.role === "user"
                                ? "var(--color-accent)"
                                : "var(--color-background-primary)",
                            color:
                              msg.role === "user"
                                ? "#fff"
                                : "var(--color-text-primary)",
                            boxShadow: "var(--shadow-sm)",
                            border:
                              msg.role === "user"
                                ? "none"
                                : "1px solid var(--color-border-tertiary)",
                          }}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div
                        style={{
                          alignSelf: "flex-start",
                          background: "var(--color-background-primary)",
                          padding: "12px 16px",
                          borderRadius: "14px 14px 14px 4px",
                          border: "1px solid var(--color-border-tertiary)",
                          boxShadow: "var(--shadow-sm)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 5,
                            alignItems: "center",
                          }}
                        >
                          {[0, 0.15, 0.3].map((d, i) => (
                            <div
                              key={i}
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: "var(--color-accent)",
                                animation: `pulseDot 1.2s ease-in-out ${d}s infinite`,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      padding: "12px 16px",
                      borderTop: "1px solid var(--color-border-secondary)",
                      background: "var(--color-background-primary)",
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                      placeholder="Ask anything…"
                      style={{
                        flex: 1,
                        padding: "9px 14px",
                        borderRadius: 20,
                        border: "1px solid var(--color-border-secondary)",
                        background: "var(--color-background-secondary)",
                        color: "var(--color-text-primary)",
                        fontSize: 14,
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={handleSendChat}
                      disabled={!chatInput.trim() || chatLoading}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "var(--color-accent)",
                        color: "#fff",
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        opacity: !chatInput.trim() || chatLoading ? 0.45 : 1,
                        transition: "opacity 0.15s, transform 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (chatInput.trim())
                          e.currentTarget.style.transform = "scale(1.08)";
                      }}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.transform = "scale(1)")
                      }
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: isChatOpen
                    ? "var(--color-text-primary)"
                    : "linear-gradient(135deg, #0f766e, #0d9488)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: isChatOpen
                    ? "var(--shadow-lg)"
                    : "var(--shadow-accent-lg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.25s var(--t-spring)",
                  animation: !isChatOpen
                    ? "pulseRing 3s ease-out infinite 2s"
                    : "none",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "scale(1.06)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              >
                {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
              </button>
            </div>
          )}
        </main>

        <TourGuide plan={tenant?.plan || "starter"} />
        <ClinicInsightPopup
          patients={patients}
          history={history}
          clinicName={tenant?.name ?? user.name}
          userName={user.name}
        />
      </div>
    </ToastProvider>
  );
}
