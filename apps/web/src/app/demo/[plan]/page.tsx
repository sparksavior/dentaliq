"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  ChevronDown,
  Sparkles,
  X,
  MessageSquare,
  Send,
} from "lucide-react";

// Import Demo Components
import DemoOverview from "./DemoOverview";
import DemoEstimates from "./DemoEstimates";
import DemoClaims from "./DemoClaims";
import DemoPatients from "./DemoPatients";
import DemoSettings from "./DemoSettings";
import DemoSupport from "./DemoSupport";
import DemoCortexCmd from "./DemoCortexCmd";
import DemoCortexInbox from "./DemoCortexInbox";

const NAV = [
  {
    id: "dashboard",
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
    id: "estimates",
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
    id: "claims",
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
    id: "patients",
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
    id: "settings",
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
    id: "support",
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
    id: "billing",
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

export default function DemoPage() {
  const { plan } = useParams();
  const router = useRouter();
  const planName = typeof plan === "string" ? plan.toLowerCase() : "starter";

  const [activeTab, setActiveTab] = useState("dashboard");
  const [isClinicMenuOpen, setIsClinicMenuOpen] = useState(false);

  // AI Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I'm your DentalIQ Copilot. I have full context of your clinic's patients, claims, and estimates. How can I help you today?",
    },
  ]);

  useEffect(() => {
    if (!["starter", "pro", "cortex"].includes(planName)) {
      router.push("/");
    }
  }, [planName, router]);

  const handleSendChat = () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: "user", content: chatInput };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm a simulated AI for this demo. In the real app, I'd check the patient's records and draft a response based on live clinical data!",
        },
      ]);
      setChatLoading(false);
    }, 1000);
  };

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
      {/* Demo Banner */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          background: "#1e293b",
          color: "#fff",
          textAlign: "center",
          padding: "8px",
          fontSize: 13,
          fontWeight: 600,
          zIndex: 10000,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span
          style={{
            background: "#3b82f6",
            padding: "2px 8px",
            borderRadius: 4,
            fontSize: 11,
          }}
        >
          INTERACTIVE DEMO
        </span>
        You are previewing the{" "}
        {planName.charAt(0).toUpperCase() + planName.slice(1)} Plan. Data is
        simulated.
        <button
          onClick={() => router.push(`/signup?plan=${planName}`)}
          style={{
            background: "#10b981",
            color: "#fff",
            border: "none",
            padding: "4px 12px",
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 12,
            cursor: "pointer",
            marginLeft: 16,
          }}
        >
          Sign Up
        </button>
        <Link
          href="/"
          style={{
            color: "#93c5fd",
            textDecoration: "none",
            marginLeft: "auto",
            marginRight: 16,
          }}
        >
          ← Exit Demo
        </Link>
      </div>

      {/* Sidebar - EXACT REPLICA OF DashboardLayout */}
      <aside
        style={{
          width: 228,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid var(--color-border-secondary)",
          background: "var(--color-background-primary)",
          flexShrink: 0,
          marginTop: 36,
        }}
      >
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

        {planName === "starter" ? (
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
                  Demo Clinic
                </div>
              </div>
            </div>
            <div
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
            </div>
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
                  Demo Clinic HQ
                </div>
              </div>
              <ChevronDown size={14} color="var(--color-text-secondary)" />
            </button>
          </div>
        )}

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
            const isActive = activeTab === item.id;
            const isLocked = item.id === "billing";
            return (
              <button
                key={item.id}
                onClick={() => !isLocked && setActiveTab(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 9,
                  fontSize: 14,
                  border: "none",
                  textAlign: "left",
                  fontWeight: isActive ? 600 : 400,
                  transition: "all 0.15s",
                  cursor: isLocked ? "not-allowed" : "pointer",
                  background: isActive
                    ? "var(--color-accent-muted)"
                    : "transparent",
                  color: isActive
                    ? "var(--color-accent)"
                    : isLocked
                      ? "var(--color-text-secondary)"
                      : "var(--color-text-secondary)",
                  opacity: isLocked ? 0.4 : 1,
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
              </button>
            );
          })}

          {planName === "cortex" && (
            <>
              <div
                style={{
                  padding: "12px 10px 4px",
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
                { id: "cortex_cmd", label: "Command Center", icon: "🧠" },
                { id: "cortex_inbox", label: "Approval Inbox", icon: "📥" },
              ].map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 9,
                      fontSize: 14,
                      border: "none",
                      textAlign: "left",
                      fontWeight: isActive ? 600 : 400,
                      transition: "all 0.15s",
                      cursor: "pointer",
                      background: isActive
                        ? "rgba(99,102,241,0.1)"
                        : "transparent",
                      color: isActive
                        ? "#6366f1"
                        : "var(--color-text-secondary)",
                    }}
                  >
                    <span style={{ fontSize: 14, flexShrink: 0 }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                );
              })}
            </>
          )}
        </nav>

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
              D
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
                Demo User
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--color-text-secondary)",
                  textTransform: "capitalize",
                }}
              >
                admin
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          position: "relative",
          marginTop: 36,
        }}
      >
        {activeTab === "dashboard" && <DemoOverview planName={planName} />}
        {activeTab === "estimates" && <DemoEstimates planName={planName} />}
        {activeTab === "claims" && <DemoClaims planName={planName} />}
        {activeTab === "patients" && <DemoPatients planName={planName} />}
        {activeTab === "settings" && <DemoSettings planName={planName} />}
        {activeTab === "support" && <DemoSupport planName={planName} />}
        {activeTab === "cortex_cmd" && <DemoCortexCmd planName={planName} />}
        {activeTab === "cortex_inbox" && <DemoCortexInbox />}
      </main>

      {/* AI Chat Float */}
      {planName !== "starter" && (
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
                    <div style={{ display: "flex", gap: 4 }}>...</div>
                  </div>
                )}
              </div>

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
            }}
          >
            {isChatOpen ? <X size={28} /> : <MessageSquare size={28} />}
          </button>
        </div>
      )}
    </div>
  );
}
