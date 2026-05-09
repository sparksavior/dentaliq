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
  {
    href: "/dashboard/billing",
    label: "Billing",
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
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  // Apply saved dashboard theme on mount (overrides any public-zone theme)
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
          background: "var(--color-background-secondary)",
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
          width: 232,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid var(--color-border-secondary)",
          background: "var(--color-background-primary)",
          flexShrink: 0,
        }}
      >
        {/* Logo */}
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
              fontWeight: 800,
              color: "#fff",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(15,118,110,0.3)",
            }}
          >
            +
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                letterSpacing: "-0.03em",
                lineHeight: 1.2,
              }}
            >
              Dental<span style={{ color: "var(--color-accent)" }}>IQ</span>
            </div>
          </div>
        </div>

        {/* Clinic Switcher */}
        {tenant?.plan === "starter" ? (
          <div style={{ padding: "12px 12px 4px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "8px 10px",
                borderRadius: 9,
                background: "var(--color-background-secondary)",
                border: "1px solid var(--color-border-secondary)",
              }}
            >
              <Building2 size={15} color="var(--color-accent)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--color-text-tertiary)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
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
                marginTop: 6,
                marginBottom: 4,
                fontSize: 11,
                color: "var(--color-accent)",
                textDecoration: "none",
                fontWeight: 500,
                paddingLeft: 2,
              }}
            >
              ↑ Upgrade for multi-clinic
            </Link>
          </div>
        ) : (
          <div style={{ padding: "12px 12px 4px", position: "relative" }}>
            <button
              onClick={() => setIsClinicMenuOpen(!isClinicMenuOpen)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "8px 10px",
                borderRadius: 9,
                background: "var(--color-background-secondary)",
                border: "1px solid var(--color-border-secondary)",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.15s",
              }}
            >
              <Building2 size={15} color="var(--color-accent)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--color-text-tertiary)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
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
              <ChevronDown
                size={13}
                color="var(--color-text-tertiary)"
                style={{
                  transition: "transform 0.2s",
                  transform: isClinicMenuOpen ? "rotate(180deg)" : "none",
                }}
              />
            </button>

            {isClinicMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% - 4px)",
                  left: 12,
                  right: 12,
                  zIndex: 1000,
                  background: "var(--color-background-primary)",
                  border: "1px solid var(--color-border-secondary)",
                  borderRadius: 12,
                  marginTop: 4,
                  boxShadow: "var(--shadow-lg)",
                  overflow: "hidden",
                  animation: "slideIn 0.18s ease-out",
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
                      padding: "9px 12px",
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
                      transition: "background 0.15s",
                    }}
                  >
                    <Building2
                      size={13}
                      color={
                        selectedClinicId === c.id
                          ? "var(--color-accent)"
                          : "var(--color-text-tertiary)"
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
                        width: "100%",
                        padding: "9px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        borderTop: "1px solid var(--color-border-tertiary)",
                        background: "transparent",
                        cursor: "pointer",
                        textDecoration: "none",
                        color: "var(--color-accent)",
                      }}
                      onClick={() => setIsClinicMenuOpen(false)}
                    >
                      <span
                        style={{ fontSize: 16, lineHeight: 1, fontWeight: 600 }}
                      >
                        +
                      </span>
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
            padding: "8px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {/* Label */}
          <div
            style={{
              padding: "10px 10px 4px",
              fontSize: 10,
              fontWeight: 700,
              color: "var(--color-text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Menu
          </div>

          {NAV.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const isHovered = hoveredNav === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => setHoveredNav(item.href)}
                onMouseLeave={() => setHoveredNav(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "7px 10px",
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: isActive ? 600 : 400,
                  textDecoration: "none",
                  transition: "all 0.13s",
                  background: isActive
                    ? "var(--color-accent-subtle)"
                    : isHovered
                      ? "var(--color-background-secondary)"
                      : "transparent",
                  color: isActive
                    ? "var(--color-accent)"
                    : isHovered
                      ? "var(--color-text-primary)"
                      : "var(--color-text-secondary)",
                  position: "relative",
                }}
              >
                {/* Left accent bar for active item */}
                {isActive && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "20%",
                      bottom: "20%",
                      width: 3,
                      borderRadius: 99,
                      background: "var(--color-accent)",
                    }}
                  />
                )}
                <span
                  style={{
                    color: isActive
                      ? "var(--color-accent)"
                      : isHovered
                        ? "var(--color-text-secondary)"
                        : "var(--color-text-tertiary)",
                    flexShrink: 0,
                    transition: "color 0.13s",
                  }}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}

          {/* Cortex section */}
          {tenant?.plan === "cortex" && (
            <>
              <div
                style={{
                  padding: "14px 10px 4px",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#8b5cf6",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Cortex Agents
              </div>
              {[
                {
                  href: "/dashboard/cortex",
                  label: "Command Center",
                  icon: "🧠",
                },
                {
                  href: "/dashboard/cortex/inbox",
                  label: "Approval Inbox",
                  icon: "📥",
                },
              ].map((item) => {
                const isActive = pathname === item.href;
                const isHovered = hoveredNav === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onMouseEnter={() => setHoveredNav(item.href)}
                    onMouseLeave={() => setHoveredNav(null)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: "7px 10px",
                      borderRadius: 8,
                      fontSize: 13.5,
                      fontWeight: isActive ? 600 : 400,
                      textDecoration: "none",
                      transition: "all 0.13s",
                      position: "relative",
                      background: isActive
                        ? "rgba(99,102,241,0.1)"
                        : isHovered
                          ? "rgba(99,102,241,0.05)"
                          : "transparent",
                      color: isActive
                        ? "#6366f1"
                        : isHovered
                          ? "#7c3aed"
                          : "var(--color-text-secondary)",
                    }}
                  >
                    {isActive && (
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: "20%",
                          bottom: "20%",
                          width: 3,
                          borderRadius: 99,
                          background: "#6366f1",
                        }}
                      />
                    )}
                    <span style={{ fontSize: 14, flexShrink: 0 }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User footer */}
        <div
          style={{
            borderTop: "1px solid var(--color-border-tertiary)",
            padding: "10px 8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "7px 10px",
              borderRadius: 8,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background =
                "var(--color-background-secondary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
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
                boxShadow: "0 2px 8px rgba(15,118,110,0.25)",
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
                  color: "var(--color-text-tertiary)",
                  textTransform: "capitalize",
                }}
              >
                {user.role.replace("_", " ")}
              </div>
            </div>
            <ThemeToggle storageKey="diq_dash_theme" variant="sidebar" />
            <button
              onClick={clearSession}
              title="Sign out"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-text-tertiary)",
                padding: 4,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--color-text-tertiary)")
              }
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
                We hope you enjoyed your time with DentalIQ! To continue, please
                contact our support team to activate your subscription.
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
  );
}
