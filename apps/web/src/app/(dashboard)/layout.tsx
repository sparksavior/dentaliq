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
  ChevronRight,
  Building2,
  ChevronDown,
} from "lucide-react";
import { TourGuide } from "@/components/TourGuide";
import { ClinicInsightPopup } from "@/components/ClinicInsightPopup";

const NAV = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: (
      <svg
        className="h-4 w-4"
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
    icon: (
      <svg
        className="h-4 w-4"
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
    icon: (
      <svg
        className="h-4 w-4"
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
    icon: (
      <svg
        className="h-4 w-4"
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
    href: "/dashboard/settings",
    label: "Settings",
    icon: (
      <svg
        className="h-4 w-4"
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
    icon: (
      <svg
        className="h-4 w-4"
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
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, clearSession, accessToken } = useAuth();
  const { selectedClinicId, setSelectedClinicId } = useClinic();
  const router = useRouter();
  const pathname = usePathname();
  const [tenant, setTenant] = useState<Tenant | null>(null);

  // AI Chat State
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

  // Context State for AI
  const [patients, setPatients] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [clinics, setClinics] = useState<any[]>([]);
  const [isClinicMenuOpen, setIsClinicMenuOpen] = useState(false);

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
          if (data.length > 0 && !selectedClinicId) {
            setSelectedClinicId(data[0].id);
          }
        })
        .catch(() => {});
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      // Re-fetch data for AI context when clinic changes
      patientsApi
        .getPatients(accessToken)
        .then(setPatients)
        .catch(() => {});
      estimateApi
        .getHistory(accessToken)
        .then(setHistory)
        .catch(() => {});
    }
  }, [accessToken, selectedClinicId]);

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: "user", content: chatInput };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      // Build context string
      const patientSummary = patients
        .slice(0, 10)
        .map((p) => `${p.first_name} ${p.last_name}`)
        .join(", ");
      const claimStats = `Total Estimates/Claims: ${history.length}, High Risk: ${history.filter((h) => h.claim_risk === "high").length}`;

      const res = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "phi3", // Default model from setup.js
          messages: [
            {
              role: "system",
              content: `You are the DentalIQ Copilot, an AI assistant for a dental clinic in Ontario, Canada.
              
              Clinic Context:
              - Clinic Name: ${tenant?.name || "Your Clinic"}
              - Total Patients: ${patients.length}
              - Recent Patients: ${patientSummary}
              - Claims/Estimates Overview: ${claimStats}
              
              Be helpful, professional, and knowledgeable about Ontario dental billing (CDAnet), PHIPA compliance, and clinical efficiency. Keep responses concise.`,
            },
            ...chatMessages,
            userMsg,
          ],
          stream: false,
        }),
      });

      const data = await res.json();
      if (data.message) {
        setChatMessages((prev) => [...prev, data.message]);
      } else {
        throw new Error("Invalid response");
      }
    } catch (err) {
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

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background-secondary)]">
        <div className="h-6 w-6 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "var(--color-background-secondary)",
        overflow: "hidden",
        color: "var(--color-text-primary)",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 228,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid var(--color-border-secondary)",
          background: "var(--color-background-primary)",
          flexShrink: 0,
        }}
      >
        {/* Logo + clinic name */}
        <div
          style={{
            padding: "0 16px",
            height: 60,
            display: "flex",
            alignItems: "center",
            borderBottom: "1px solid var(--color-border-tertiary)",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "linear-gradient(135deg, #0f766e, #0d9488)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            +
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              Dental<span style={{ color: "var(--color-accent)" }}>IQ</span>
            </div>
          </div>
        </div>

        {/* Clinic Switcher */}
        {tenant?.plan === "starter" ? (
          <div style={{ padding: "12px 16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 10,
                background: "var(--color-background-secondary)",
                border: "1px solid var(--color-border-secondary)",
              }}
            >
              <Building2 size={16} color="var(--color-accent)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--color-text-secondary)",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Location
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {clinics[0]?.name || tenant?.name || "My Clinic"}
                </div>
              </div>
            </div>
            <Link
              href="/dashboard/settings"
              style={{
                display: "block",
                marginTop: 8,
                fontSize: 11,
                color: "var(--color-accent)",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Upgrade to Pro for multi-clinic →
            </Link>
          </div>
        ) : (
          <div style={{ padding: "12px 16px", position: "relative" }}>
            <button
              onClick={() => setIsClinicMenuOpen(!isClinicMenuOpen)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 10,
                background: "var(--color-background-secondary)",
                border: "1px solid var(--color-border-secondary)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <Building2 size={16} color="var(--color-accent)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--color-text-secondary)",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Clinic
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {clinics.find((c) => c.id === selectedClinicId)?.name ||
                    "Select Clinic"}
                </div>
              </div>
              <ChevronDown size={14} color="var(--color-text-secondary)" />
            </button>

            {isClinicMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 16,
                  right: 16,
                  zIndex: 1000,
                  background: "var(--color-background-primary)",
                  border: "1px solid var(--color-border-secondary)",
                  borderRadius: 12,
                  marginTop: 4,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  overflow: "hidden",
                }}
              >
                {clinics.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedClinicId(c.id);
                      setIsClinicMenuOpen(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      border: "none",
                      background:
                        selectedClinicId === c.id
                          ? "var(--color-accent-muted)"
                          : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.2s",
                    }}
                  >
                    <Building2
                      size={14}
                      color={
                        selectedClinicId === c.id
                          ? "var(--color-accent)"
                          : "var(--color-text-secondary)"
                      }
                    />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: selectedClinicId === c.id ? 600 : 400,
                        color:
                          selectedClinicId === c.id
                            ? "var(--color-accent)"
                            : "var(--color-text-primary)",
                      }}
                    >
                      {c.name}
                    </span>
                  </button>
                ))}
                {tenant?.plan !== "starter" &&
                  clinics.length < (tenant?.plan === "pro" ? 3 : 999) && (
                    <Link
                      href="/dashboard/settings?tab=clinics"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        borderTop: "1px solid var(--color-border-tertiary)",
                        background: "transparent",
                        cursor: "pointer",
                        textDecoration: "none",
                        color: "var(--color-accent)",
                      }}
                      onClick={() => setIsClinicMenuOpen(false)}
                    >
                      <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>
                        Add Location
                      </span>
                    </Link>
                  )}
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <nav
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "10px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {NAV.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 9,
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  textDecoration: "none",
                  transition: "all 0.15s",
                  background: isActive
                    ? "var(--color-accent-muted)"
                    : "transparent",
                  color: isActive
                    ? "var(--color-accent)"
                    : "var(--color-text-secondary)",
                }}
              >
                <span
                  style={{
                    color: isActive
                      ? "var(--color-accent)"
                      : "var(--color-text-secondary)",
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div
          style={{
            borderTop: "1px solid var(--color-border-tertiary)",
            padding: "10px 10px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              borderRadius: 9,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #0f766e, #0d9488)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--color-text-secondary)",
                  textTransform: "capitalize",
                }}
              >
                {user.role.replace("_", " ")}
              </div>
            </div>
            <button
              onClick={clearSession}
              title="Sign out"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-border-primary)",
                padding: 4,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                transition: "color 0.15s",
              }}
            >
              <svg
                style={{ width: 15, height: 15 }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        {children}

        {/* Trial Ended / Suspended Overlay */}
        {tenant?.status === "suspended" && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99999,
              background: "rgba(0, 0, 0, 0.85)",
              backdropFilter: "blur(12px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem",
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
                boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
                border: "1px solid var(--color-border-secondary)",
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "rgba(15, 118, 110, 0.1)",
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
                We hope you enjoyed your time with DentalIQ! Your free trial has
                concluded. To continue using our AI-driven clinical suite and
                manage your clinic effectively, please contact our support team
                to start your subscription.
              </p>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                <a
                  href="mailto:support@dentaliq.dev"
                  style={{
                    background: "var(--color-accent)",
                    color: "#fff",
                    padding: "14px 24px",
                    borderRadius: 12,
                    fontWeight: 600,
                    textDecoration: "none",
                    transition: "opacity 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  Contact Support to Activate
                </a>
                <button
                  onClick={clearSession}
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
                style={{
                  width: 380,
                  height: 500,
                  background: "var(--color-background-primary)",
                  border: "1px solid var(--color-border-secondary)",
                  borderRadius: 16,
                  boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  animation: "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                {/* Header */}
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
                    <Sparkles size={18} />
                    <span style={{ fontWeight: 600, fontSize: 15 }}>
                      DentalIQ Copilot
                    </span>
                  </div>
                  <button
                    onClick={() => setIsChatOpen(false)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#fff",
                      cursor: "pointer",
                      padding: 4,
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Messages */}
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    background: "var(--color-background-secondary)",
                  }}
                >
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      style={{
                        alignSelf:
                          msg.role === "user" ? "flex-end" : "flex-start",
                        maxWidth: "85%",
                      }}
                    >
                      <div
                        style={{
                          padding: "10px 14px",
                          borderRadius: 14,
                          fontSize: 14,
                          lineHeight: 1.5,
                          background:
                            msg.role === "user"
                              ? "var(--color-accent)"
                              : "var(--color-background-primary)",
                          color:
                            msg.role === "user"
                              ? "#fff"
                              : "var(--color-text-primary)",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
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
                        padding: "10px 14px",
                        borderRadius: 14,
                        border: "1px solid var(--color-border-tertiary)",
                      }}
                    >
                      <div style={{ display: "flex", gap: 4 }}>
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "var(--color-text-secondary)",
                            animation: "pulse 1.5s infinite",
                          }}
                        />
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "var(--color-text-secondary)",
                            animation: "pulse 1.5s infinite 0.2s",
                          }}
                        />
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "var(--color-text-secondary)",
                            animation: "pulse 1.5s infinite 0.4s",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div
                  style={{
                    padding: "16px",
                    borderTop: "1px solid var(--color-border-secondary)",
                    background: "var(--color-background-primary)",
                    display: "flex",
                    gap: 8,
                  }}
                >
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                    placeholder="Ask anything..."
                    style={{
                      flex: 1,
                      padding: "10px 16px",
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
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: "var(--color-accent)",
                      color: "#fff",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      opacity: !chatInput.trim() || chatLoading ? 0.5 : 1,
                    }}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "var(--color-accent)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 8px 32px rgba(15, 118, 110, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "scale(1.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
            >
              {isChatOpen ? <X size={28} /> : <MessageSquare size={28} />}
            </button>
          </div>
        )}
      </main>

      {/* Tour guide for new users */}
      <TourGuide plan={tenant?.plan || "starter"} />

      {/* AI clinic insight popup on login */}
      <ClinicInsightPopup
        patients={patients}
        history={history}
        clinicName={tenant?.name ?? user.name}
        userName={user.name}
      />

      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
