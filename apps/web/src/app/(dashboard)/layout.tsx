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

const NAV = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/dashboard/estimates",
    label: "Estimates",
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/claims",
    label: "Claims",
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/patients",
    label: "Patients",
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/support",
    label: "Support",
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/billing",
    label: "Billing",
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
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

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  useTheme("diq_dash_theme");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (accessToken) {
      tenantsApi.getTenant(accessToken).then(setTenant).catch(() => {});
      tenantsApi
        .getClinics(accessToken)
        .then((data) => {
          setClinics(data);
          if (data.length > 0 && !selectedClinicId) setSelectedClinicId(data[0].id);
        })
        .catch(() => {});
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      patientsApi.getPatients(accessToken).then(setPatients).catch(() => {});
      estimateApi.getHistory(accessToken).then(setHistory).catch(() => {});
    }
  }, [accessToken, selectedClinicId]);

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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
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
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "var(--color-bg-dashboard)",
        overflow: "hidden",
        color: "var(--color-text-primary)",
      }}
    >
      {/* ── SIDEBAR ── */}
      <aside
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
              transform: isSidebarExpanded ? "rotate(180deg)" : "rotate(0deg)", 
              transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)" 
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
          <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
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
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 19, letterSpacing: "-0.04em" }}>
                DentalIQ
              </span>
            )}
          </Link>
        </div>

        {/* Clinic selector */}
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            padding: isSidebarExpanded ? "12px 16px" : "12px 0",
            position: "relative",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setIsClinicMenuOpen(!isClinicMenuOpen)}
            title={isSidebarExpanded ? undefined : (clinics.find((c) => c.id === selectedClinicId)?.name || "Select Clinic")}
            style={{
              width: isSidebarExpanded ? "100%" : 42,
              height: 42,
              borderRadius: 12,
              background: isClinicMenuOpen ? "rgba(15,118,110,0.25)" : "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              padding: isSidebarExpanded ? "0 12px" : "0",
              justifyContent: isSidebarExpanded ? "flex-start" : "center",
              gap: 10,
              cursor: "pointer",
              color: isClinicMenuOpen ? "#14b8a6" : "rgba(255,255,255,0.5)",
              transition: "all 0.15s",
            }}
          >
            <Building2 size={18} style={{ flexShrink: 0 }} />
            {isSidebarExpanded && (
              <>
                <span style={{ 
                  fontSize: 13, 
                  fontWeight: 600, 
                  color: "#fff", 
                  whiteSpace: "nowrap", 
                  overflow: "hidden", 
                  textOverflow: "ellipsis",
                  textAlign: "left",
                  flex: 1
                }}>
                  {clinics.find((c) => c.id === selectedClinicId)?.name || "Select Clinic"}
                </span>
                <ChevronDown size={14} style={{ opacity: 0.5, transform: isClinicMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </>
            )}
          </button>

          {/* Clinic dropdown — floats to the right of the sidebar */}
          {isClinicMenuOpen && (
            <div
              style={{
                position: "absolute",
                top: 8,
                left: 76,
                zIndex: 1000,
                background: "var(--color-background-primary)",
                border: "1px solid var(--color-border-secondary)",
                borderRadius: 14,
                boxShadow: "var(--shadow-lg)",
                overflow: "hidden",
                minWidth: 200,
                animation: "slideInRight 0.18s ease-out",
              }}
            >
              <div
                style={{
                  padding: "10px 14px 6px",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--color-text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                Your Clinics
              </div>
              {clinics.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedClinicId(c.id);
                    setIsClinicMenuOpen(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "9px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    border: "none",
                    background:
                      selectedClinicId === c.id
                        ? "var(--color-accent-subtle)"
                        : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    if (selectedClinicId !== c.id)
                      e.currentTarget.style.background = "var(--color-background-secondary)";
                  }}
                  onMouseLeave={(e) => {
                    if (selectedClinicId !== c.id)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Building2
                    size={13}
                    color={selectedClinicId === c.id ? "var(--color-accent)" : "var(--color-text-tertiary)"}
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
                  {selectedClinicId === c.id && (
                    <svg
                      style={{ marginLeft: "auto" }}
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth="2.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
              {tenant?.plan !== "starter" &&
                clinics.length < (tenant?.plan === "pro" ? 3 : 999) && (
                  <Link
                    href="/dashboard/settings?tab=clinics"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: "9px 14px",
                      borderTop: "1px solid var(--color-border-tertiary)",
                      color: "var(--color-accent)",
                      textDecoration: "none",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                    onClick={() => setIsClinicMenuOpen(false)}
                  >
                    <span style={{ fontSize: 16, fontWeight: 600 }}>+</span>
                    Add Location
                  </Link>
                )}
              {tenant?.plan === "starter" && (
                <Link
                  href="/dashboard/settings"
                  style={{
                    display: "block",
                    padding: "8px 14px",
                    borderTop: "1px solid var(--color-border-tertiary)",
                    color: "var(--color-accent)",
                    textDecoration: "none",
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                  onClick={() => setIsClinicMenuOpen(false)}
                >
                  ↑ Upgrade for multi-clinic
                </Link>
              )}
            </div>
          )}
        </div>

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
          {NAV.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isSidebarExpanded ? undefined : item.label}
                style={{
                  width: isSidebarExpanded ? "calc(100% - 24px)" : 46,
                  height: 46,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: isSidebarExpanded ? "flex-start" : "center",
                  padding: isSidebarExpanded ? "0 14px" : "0",
                  margin: isSidebarExpanded ? "0 12px" : "0",
                  background: isActive ? "rgba(20,184,166,0.15)" : "transparent",
                  color: isActive ? "#2dd4bf" : "rgba(255,255,255,0.45)",
                  textDecoration: "none",
                  transition: "all 0.13s",
                  position: "relative",
                  gap: 12,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
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
                <div style={{ flexShrink: 0, opacity: isActive ? 1 : 0.85 }}>{item.icon}</div>
                {isSidebarExpanded && (
                  <span style={{ fontSize: 13.5, fontWeight: isActive ? 700 : 500, whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>
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
              {[
                { href: "/dashboard/cortex", label: "Command Center", icon: "🧠" },
                { href: "/dashboard/cortex/inbox", label: "Approval Inbox", icon: "📥" },
              ].map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isSidebarExpanded ? undefined : item.label}
                    style={{
                      width: isSidebarExpanded ? "calc(100% - 24px)" : 46,
                      height: 46,
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: isSidebarExpanded ? "flex-start" : "center",
                      padding: isSidebarExpanded ? "0 14px" : "0",
                      margin: isSidebarExpanded ? "0 12px" : "0",
                      background: isActive ? "rgba(99,102,241,0.18)" : "transparent",
                      color: isActive ? "#a5b4fc" : "rgba(255,255,255,0.4)",
                      textDecoration: "none",
                      transition: "all 0.13s",
                      fontSize: 18,
                      gap: 12,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                        e.currentTarget.style.color = "rgba(255,255,255,0.85)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "rgba(255,255,255,0.4)";
                      }
                    }}
                  >
                    <div style={{ flexShrink: 0, opacity: isActive ? 1 : 0.8 }}>{item.icon}</div>
                    {isSidebarExpanded && (
                      <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, whiteSpace: "nowrap" }}>
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
          <div style={{ color: "rgba(255,255,255,0.4)", width: isSidebarExpanded ? "100%" : "auto" }}>
            <ThemeToggle storageKey="diq_dash_theme" variant="sidebar" />
          </div>

          {/* Logout */}
          <button
            onClick={clearSession}
            title={isSidebarExpanded ? undefined : "Sign out"}
            style={{
              width: isSidebarExpanded ? "100%" : 42,
              height: 42,
              borderRadius: 12,
              background: isSidebarExpanded ? "rgba(239,68,68,0.08)" : "transparent",
              border: isSidebarExpanded ? "1px solid rgba(239,68,68,0.15)" : "none",
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
              if (isSidebarExpanded) e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = isSidebarExpanded ? "#fca5a5" : "rgba(255,255,255,0.35)";
              e.currentTarget.style.background = isSidebarExpanded ? "rgba(239,68,68,0.08)" : "transparent";
              if (isSidebarExpanded) e.currentTarget.style.borderColor = "rgba(239,68,68,0.15)";
            }}
          >
            <LogOut size={18} />
            {isSidebarExpanded && <span style={{ fontSize: 13.5, fontWeight: 600 }}>Sign out</span>}
          </button>

          {/* User Profile */}
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 12,
            padding: isSidebarExpanded ? "10px 12px" : "0",
            borderRadius: 14,
            width: isSidebarExpanded ? "100%" : "auto",
            background: isSidebarExpanded ? "rgba(255,255,255,0.03)" : "transparent",
            marginTop: isSidebarExpanded ? 4 : 0,
          }}>
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
                border: "2px solid rgba(255,255,255,0.1)"
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            {isSidebarExpanded && (
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-0.01em" }}>
                  {user.name}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "capitalize", fontWeight: 500 }}>
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
                We hope you enjoyed your time with DentalIQ! To continue, please contact our
                support team to activate your subscription.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                      <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.01em" }}>
                        DentalIQ Copilot
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.8 }}>Powered by local AI</div>
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
                        alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
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
                            msg.role === "user" ? "#fff" : "var(--color-text-primary)",
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
                      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
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
                      if (chatInput.trim()) e.currentTarget.style.transform = "scale(1.08)";
                    }}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
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
                boxShadow: isChatOpen ? "var(--shadow-lg)" : "var(--shadow-accent-lg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.25s var(--t-spring)",
                animation: !isChatOpen ? "pulseRing 3s ease-out infinite 2s" : "none",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
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
  );
}
