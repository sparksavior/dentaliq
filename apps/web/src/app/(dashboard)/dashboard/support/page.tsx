"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { supportApi, type SupportTicket, type SupportMessage } from "@/lib/api";

export default function SupportPage() {
  const { accessToken } = useAuth();
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  // Create state
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Detail state
  const [activeTicket, setActiveTicket] = useState<
    (SupportTicket & { messages: SupportMessage[] }) | null
  >(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replying, setReplying] = useState(false);

  const loadTickets = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await supportApi.listTickets(accessToken);
      setTickets(data);
    } catch (err) {
      console.error(err);
    }
  }, [accessToken]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const loadTicketDetail = async (id: string) => {
    if (!accessToken) return;
    try {
      const data = await supportApi.getTicket(accessToken, id);
      setActiveTicket(data);
      setView("detail");
    } catch (err) {
      console.error(err);
    }
  };

  const submitTicket = async () => {
    if (!accessToken) return;
    if (!subject.trim() || !description.trim()) {
      setError("Subject and description are required.");
      return;
    }
    setSending(true);
    setError("");
    try {
      await supportApi.createTicket(accessToken, {
        subject: subject.trim(),
        description: description.trim(),
      });
      setSubject("");
      setDescription("");
      setView("list");
      loadTickets();
    } catch (err: any) {
      setError(err.message ?? "Failed to submit ticket");
    } finally {
      setSending(false);
    }
  };

  const sendReply = async () => {
    if (!accessToken || !activeTicket || !replyMessage.trim()) return;
    setReplying(true);
    try {
      await supportApi.addMessage(
        accessToken,
        activeTicket.id,
        replyMessage.trim(),
      );
      setReplyMessage("");
      await loadTicketDetail(activeTicket.id);
    } catch (err) {
      console.error(err);
    } finally {
      setReplying(false);
    }
  };

  const inp: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    border: "1.5px solid var(--color-border-secondary)",
    borderRadius: 9,
    fontSize: 14,
    color: "var(--color-text-primary)",
    background: "var(--color-input-bg)",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "system-ui",
    transition: "border-color 0.15s",
  };

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: 800,
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
              fontSize: 22,
              fontWeight: 700,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.03em",
              marginBottom: 4,
            }}
          >
            Support
          </h1>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
            Have a question or issue? Submit a ticket and our team will get back
            to you.
          </p>
        </div>
        {view === "list" && (
          <button
            onClick={() => setView("create")}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              background: "var(--color-accent)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + New Ticket
          </button>
        )}
        {view !== "list" && (
          <button
            onClick={() => {
              setView("list");
              loadTickets();
            }}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--color-border-secondary)",
              background: "var(--color-background-secondary)",
              color: "var(--color-text-primary)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            ← Back to Tickets
          </button>
        )}
      </div>

      {view === "list" && (
        <div
          style={{
            background: "var(--color-background-primary)",
            border: "1px solid var(--color-border-secondary)",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          {tickets.length === 0 ? (
            <div style={{ padding: "3rem 2rem", textAlign: "center" }}>
              <div style={{ fontSize: 32, margin: "0 auto 1rem" }}>💬</div>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  marginBottom: 8,
                }}
              >
                No support tickets yet
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--color-text-secondary)",
                  marginBottom: "1.5rem",
                }}
              >
                If you need help, don't hesitate to reach out.
              </p>
              <button
                onClick={() => setView("create")}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "1.5px solid var(--color-accent)",
                  background: "transparent",
                  color: "var(--color-accent)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Create your first ticket
              </button>
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "var(--color-background-secondary)",
                    borderBottom: "1px solid var(--color-border-secondary)",
                  }}
                >
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "var(--color-text-secondary)",
                      fontSize: 12,
                      textTransform: "uppercase",
                    }}
                  >
                    Subject
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "var(--color-text-secondary)",
                      fontSize: 12,
                      textTransform: "uppercase",
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "var(--color-text-secondary)",
                      fontSize: 12,
                      textTransform: "uppercase",
                    }}
                  >
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => loadTicketDetail(t.id)}
                    style={{
                      borderBottom: "1px solid var(--color-border-tertiary)",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "var(--color-background-secondary)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <td
                      style={{
                        padding: "16px",
                        fontWeight: 500,
                        color: "var(--color-text-primary)",
                      }}
                    >
                      {t.subject}
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          textTransform: "capitalize",
                          background:
                            t.status === "resolved"
                              ? "rgba(22, 101, 52, 0.1)"
                              : t.status === "in_progress"
                                ? "rgba(146, 64, 14, 0.1)"
                                : "rgba(30, 64, 175, 0.1)",
                          color:
                            t.status === "resolved"
                              ? "#166534"
                              : t.status === "in_progress"
                                ? "#92400e"
                                : "#1e40af",
                        }}
                      >
                        {t.status.replace("_", " ")}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {view === "create" && (
        <div
          style={{
            background: "var(--color-background-primary)",
            border: "1px solid var(--color-border-secondary)",
            borderRadius: 16,
            padding: "2rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: "10px 14px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 9,
                fontSize: 13,
                color: "#dc2626",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                Subject <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                style={inp}
                placeholder="e.g. Issue with patient import"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
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
                Description <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <textarea
                style={{
                  ...inp,
                  height: 160,
                  resize: "vertical",
                  lineHeight: 1.6,
                }}
                placeholder="Describe your issue or question in detail…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div
              style={{
                padding: "12px 16px",
                background: "var(--color-background-secondary)",
                borderRadius: 10,
                border: "1px solid var(--color-border-secondary)",
                fontSize: 13,
                color: "var(--color-text-secondary)",
                lineHeight: 1.6,
              }}
            >
              Your clinic name and email will be automatically included with
              your ticket.
            </div>

            <button
              onClick={submitTicket}
              disabled={sending || !subject.trim() || !description.trim()}
              style={{
                padding: "12px",
                borderRadius: 10,
                border: "none",
                background:
                  sending || !subject.trim() || !description.trim()
                    ? "var(--color-text-secondary)"
                    : "linear-gradient(135deg, #0f766e, #0d9488)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                cursor:
                  sending || !subject.trim() || !description.trim()
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {sending ? "Submitting…" : "Submit ticket →"}
            </button>
          </div>
        </div>
      )}

      {view === "detail" && activeTicket && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "calc(100vh - 140px)",
            background: "var(--color-background-primary)",
            border: "1px solid var(--color-border-secondary)",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--color-border-secondary)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--color-background-secondary)",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                  marginBottom: 4,
                }}
              >
                {activeTicket.subject}
              </h2>
              <div
                style={{ fontSize: 13, color: "var(--color-text-secondary)" }}
              >
                Ticket #{activeTicket.id.slice(0, 8)}
              </div>
            </div>
            <span
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                textTransform: "capitalize",
                background:
                  activeTicket.status === "resolved"
                    ? "rgba(22, 101, 52, 0.1)"
                    : activeTicket.status === "in_progress"
                      ? "rgba(146, 64, 14, 0.1)"
                      : "rgba(30, 64, 175, 0.1)",
                color:
                  activeTicket.status === "resolved"
                    ? "#166534"
                    : activeTicket.status === "in_progress"
                      ? "#92400e"
                      : "#1e40af",
              }}
            >
              {activeTicket.status.replace("_", " ")}
            </span>
          </div>

          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "24px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 24,
              background: "var(--color-background-primary)",
            }}
          >
            {/* Initial Request */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "var(--color-text-secondary)",
                  marginBottom: 6,
                  padding: "0 4px",
                  fontWeight: 500,
                }}
              >
                {activeTicket.user_name} •{" "}
                {new Date(activeTicket.created_at).toLocaleString([], {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </div>
              <div
                style={{
                  maxWidth: "75%",
                  padding: "14px 18px",
                  borderRadius: "18px 18px 4px 18px",
                  fontSize: 14,
                  lineHeight: 1.6,
                  background: "var(--color-accent)",
                  color: "#fff",
                  whiteSpace: "pre-wrap",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                }}
              >
                {activeTicket.description}
              </div>
            </div>

            {/* Replies */}
            {activeTicket.messages?.map((msg: any) => {
              const isUser = msg.sender_type === "user";
              return (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isUser ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--color-text-secondary)",
                      marginBottom: 6,
                      padding: "0 4px",
                      fontWeight: 500,
                    }}
                  >
                    {msg.sender_name} •{" "}
                    {new Date(msg.created_at).toLocaleString([], {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </div>
                  <div
                    style={{
                      maxWidth: "75%",
                      padding: "14px 18px",
                      borderRadius: isUser
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px",
                      fontSize: 14,
                      lineHeight: 1.6,
                      background: isUser
                        ? "var(--color-accent)"
                        : "var(--color-background-secondary)",
                      color: isUser ? "#fff" : "var(--color-text-primary)",
                      border: isUser
                        ? "none"
                        : "1px solid var(--color-border-secondary)",
                      whiteSpace: "pre-wrap",
                      boxShadow: "0 2px 5px rgba(0,0,0,0.02)",
                    }}
                  >
                    {msg.message}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input Area */}
          {activeTicket.status !== "resolved" ? (
            <div
              style={{
                padding: "16px 20px",
                borderTop: "1px solid var(--color-border-secondary)",
                background: "var(--color-background-primary)",
                display: "flex",
                gap: 12,
                alignItems: "flex-end",
              }}
            >
              <textarea
                style={{
                  flex: 1,
                  minHeight: 50,
                  maxHeight: 150,
                  padding: "14px 20px",
                  borderRadius: 24,
                  border: "1px solid var(--color-border-secondary)",
                  background: "var(--color-background-secondary)",
                  color: "var(--color-text-primary)",
                  fontSize: 14,
                  outline: "none",
                  resize: "none",
                  fontFamily: "system-ui",
                  lineHeight: 1.5,
                  transition: "border-color 0.2s",
                }}
                placeholder="Type your message here..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                onFocus={(e) =>
                  (e.target.style.borderColor = "var(--color-accent)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "var(--color-border-secondary)")
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (replyMessage.trim()) sendReply();
                  }
                }}
              />
              <button
                onClick={sendReply}
                disabled={replying || !replyMessage.trim()}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: "50%",
                  border: "none",
                  background:
                    replying || !replyMessage.trim()
                      ? "var(--color-border-secondary)"
                      : "var(--color-accent)",
                  color: "#fff",
                  cursor:
                    replying || !replyMessage.trim()
                      ? "not-allowed"
                      : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                  flexShrink: 0,
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          ) : (
            <div
              style={{
                padding: "20px",
                borderTop: "1px solid var(--color-border-secondary)",
                background: "var(--color-background-secondary)",
                textAlign: "center",
                color: "var(--color-text-secondary)",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              This ticket has been marked as resolved.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
