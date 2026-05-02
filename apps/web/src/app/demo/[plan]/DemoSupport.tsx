"use client";

import { useState } from "react";
import { MessageSquare, Send, CheckCircle2, Ticket } from "lucide-react";

export default function DemoSupport({ planName }: { planName: string }) {
  const [tickets, setTickets] = useState([
    {
      id: "TKT-001",
      subject: "Integration help",
      status: "resolved",
      date: "2 days ago",
    },
  ]);
  const [activeTab, setActiveTab] = useState<"chat" | "tickets">("chat");
  const [chatMsg, setChatMsg] = useState("");
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hi! I am the DentalIQ support bot. How can I help you today?",
    },
  ]);

  const send = () => {
    if (!chatMsg.trim()) return;
    setMessages([...messages, { sender: "user", text: chatMsg }]);
    setChatMsg("");
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "This is a demo environment. Real support agents are available in the live app!",
        },
      ]);
    }, 1000);
  };

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: 1000,
        margin: "0 auto",
        color: "var(--color-text-primary)",
      }}
    >
      <div
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.03em",
              marginBottom: 4,
            }}
          >
            Support Center
          </h1>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
            Get help and track your support requests.
          </p>
        </div>
        <div
          style={{
            background: "var(--color-background-primary)",
            border: "1px solid var(--color-border-secondary)",
            borderRadius: 10,
            display: "flex",
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => setActiveTab("chat")}
            style={{
              padding: "8px 16px",
              background:
                activeTab === "chat"
                  ? "var(--color-background-secondary)"
                  : "transparent",
              border: "none",
              color:
                activeTab === "chat"
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Live Chat
          </button>
          <button
            onClick={() => setActiveTab("tickets")}
            style={{
              padding: "8px 16px",
              background:
                activeTab === "tickets"
                  ? "var(--color-background-secondary)"
                  : "transparent",
              border: "none",
              color:
                activeTab === "tickets"
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Tickets
          </button>
        </div>
      </div>

      <div
        style={{
          background: "var(--color-background-primary)",
          border: "1px solid var(--color-border-secondary)",
          borderRadius: 16,
          height: 600,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {activeTab === "chat" ? (
          <>
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--color-border-secondary)",
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
                  background: "linear-gradient(135deg, #0f766e, #0d9488)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                }}
              >
                <MessageSquare size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Support Team</div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--color-text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#10b981",
                    }}
                  />{" "}
                  Online (Demo)
                </div>
              </div>
            </div>
            <div
              style={{
                flex: 1,
                padding: 20,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                background: "var(--color-background-secondary)",
              }}
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      borderRadius: 16,
                      background:
                        m.sender === "user"
                          ? "var(--color-accent)"
                          : "var(--color-background-primary)",
                      color:
                        m.sender === "user"
                          ? "#fff"
                          : "var(--color-text-primary)",
                      border:
                        m.sender === "user"
                          ? "none"
                          : "1px solid var(--color-border-tertiary)",
                      fontSize: 14,
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                padding: 16,
                background: "var(--color-background-primary)",
                borderTop: "1px solid var(--color-border-secondary)",
                display: "flex",
                gap: 12,
              }}
            >
              <input
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Type a message..."
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: 20,
                  border: "1px solid var(--color-border-secondary)",
                  background: "var(--color-background-secondary)",
                  color: "var(--color-text-primary)",
                  outline: "none",
                }}
              />
              <button
                onClick={send}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "var(--color-accent)",
                  color: "#fff",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Send size={18} />
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: "2rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "1.5rem",
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                My Tickets
              </h2>
              <button
                style={{
                  padding: "8px 16px",
                  background: "var(--color-accent)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                + New Ticket
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {tickets.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "1rem",
                    border: "1px solid var(--color-border-secondary)",
                    borderRadius: 12,
                  }}
                >
                  <div
                    style={{ display: "flex", gap: 12, alignItems: "center" }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: "var(--color-background-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      <Ticket size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{t.subject}</div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {t.id} · {t.date}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      padding: "4px 10px",
                      borderRadius: 20,
                      background: "rgba(16, 185, 129, 0.1)",
                      color: "#10b981",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <CheckCircle2 size={14} /> {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
