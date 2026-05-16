"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { supportApi, type SupportTicket, type SupportMessage } from "@/lib/api";

const statusStyle: Record<string, { bg: string; color: string; border: string; dot: string; label: string }> = {
  open:        { bg: "rgba(30,64,175,0.08)",   color: "#1e40af", border: "rgba(30,64,175,0.2)",   dot: "#3b82f6", label: "Open" },
  in_progress: { bg: "rgba(146,64,14,0.08)",  color: "#92400e", border: "rgba(146,64,14,0.2)",  dot: "#f59e0b", label: "In Progress" },
  resolved:    { bg: "rgba(22,101,52,0.08)",   color: "#166534", border: "rgba(22,101,52,0.2)",   dot: "#10b981", label: "Resolved" },
};

export default function SupportPage() {
  const { accessToken } = useAuth();
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [activeTicket, setActiveTicket] = useState<(SupportTicket & { messages: SupportMessage[] }) | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replying, setReplying] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [submitHover, setSubmitHover] = useState(false);

  const loadTickets = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await supportApi.listTickets(accessToken);
      setTickets(data);
    } catch (err) { console.error(err); }
  }, [accessToken]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const loadTicketDetail = async (id: string) => {
    if (!accessToken) return;
    try {
      const data = await supportApi.getTicket(accessToken, id);
      setActiveTicket(data);
      setView("detail");
    } catch (err) { console.error(err); }
  };

  const submitTicket = async () => {
    if (!accessToken) return;
    if (!subject.trim() || !description.trim()) { setError("Subject and description are required."); return; }
    setSending(true); setError("");
    try {
      await supportApi.createTicket(accessToken, { subject: subject.trim(), description: description.trim() });
      setSubject(""); setDescription(""); setView("list"); loadTickets();
    } catch (err: any) {
      setError(err.message ?? "Failed to submit ticket");
    } finally { setSending(false); }
  };

  const sendReply = async () => {
    if (!accessToken || !activeTicket || !replyMessage.trim()) return;
    setReplying(true);
    try {
      await supportApi.addMessage(accessToken, activeTicket.id, replyMessage.trim());
      setReplyMessage("");
      await loadTicketDetail(activeTicket.id);
    } catch (err) { console.error(err); }
    finally { setReplying(false); }
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 12px", border: "1.5px solid var(--color-border-secondary)",
    borderRadius: 9, fontSize: 14, color: "var(--color-text-primary)", background: "var(--color-input-bg)",
    outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.15s, box-shadow 0.15s",
  };
  const inpFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = "var(--color-accent)";
    e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-accent-subtle)";
  };
  const inpBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = "var(--color-border-secondary)";
    e.currentTarget.style.boxShadow = "none";
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}>

      {/* Premium page header */}
      <div style={{
        padding: "1.75rem 2rem 1.5rem",
        background: "linear-gradient(135deg, var(--color-background-primary) 0%, var(--color-accent-muted) 100%)",
        borderBottom: "1px solid var(--color-border-secondary)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: "linear-gradient(135deg, #0f766e, #0d9488)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 14px rgba(15,118,110,0.3)", flexShrink: 0,
          }}>
            <svg width="22" height="22" fill="none" stroke="white" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>Support</h1>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
              {view === "detail" && activeTicket ? `Ticket #${activeTicket.id.slice(0, 8)}` : "Have a question or issue? Submit a ticket and our team will get back to you."}
            </p>
          </div>
        </div>
        {view === "list" ? (
          <button
            onClick={() => setView("create")}
            style={{
              padding: "10px 18px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg, #0f766e, #0d9488)", color: "#fff",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              boxShadow: "0 4px 14px rgba(15,118,110,0.3)", transition: "all 0.18s",
              display: "flex", alignItems: "center", gap: 6,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(15,118,110,0.4)" }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px rgba(15,118,110,0.3)" }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            New Ticket
          </button>
        ) : (
          <button
            onClick={() => { setView("list"); loadTickets(); }}
            style={{
              padding: "8px 16px", borderRadius: 9,
              border: "1.5px solid var(--color-border-secondary)",
              background: "var(--color-background-primary)", color: "var(--color-text-secondary)",
              fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: 6,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-accent)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-accent)" }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border-secondary)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-secondary)" }}
          >
            ← Back to Tickets
          </button>
        )}
      </div>

      <div style={{ padding: "1.5rem 2rem", maxWidth: 800, margin: "0 auto" }}>

        {/* Ticket list view */}
        {view === "list" && (
          <div style={{
            background: "var(--color-background-primary)",
            border: "1px solid var(--color-border-secondary)", borderRadius: 16,
            overflow: "hidden", boxShadow: "var(--shadow-sm)",
          }}>
            {tickets.length === 0 ? (
              <div style={{ padding: "4rem 2rem", textAlign: "center", animation: "fadeIn 0.3s ease" }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 18,
                  background: "var(--color-accent-muted)", display: "flex",
                  alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
                }}>
                  <svg width="28" height="28" fill="none" stroke="var(--color-accent)" strokeWidth="1.6" viewBox="0 0 24 24">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 8, margin: "0 0 8px" }}>
                  No support tickets yet
                </h2>
                <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: "1.5rem" }}>
                  If you need help, don't hesitate to reach out.
                </p>
                <button
                  onClick={() => setView("create")}
                  style={{
                    padding: "9px 22px", borderRadius: 10, border: "none",
                    background: "linear-gradient(135deg, #0f766e, #0d9488)", color: "#fff",
                    fontSize: 14, fontWeight: 600, cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(15,118,110,0.3)",
                  }}
                >Create your first ticket</button>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "var(--color-background-secondary)", borderBottom: "1px solid var(--color-border-secondary)" }}>
                    {["Subject", "Status", "Created"].map(h => (
                      <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontWeight: 600, color: "var(--color-text-secondary)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t, idx) => {
                    const st = statusStyle[t.status] ?? statusStyle.open;
                    const isHov = hoveredRow === t.id;
                    return (
                      <tr
                        key={t.id}
                        onClick={() => loadTicketDetail(t.id)}
                        onMouseEnter={() => setHoveredRow(t.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{
                          borderBottom: "1px solid var(--color-border-tertiary)",
                          cursor: "pointer",
                          background: isHov ? "var(--color-accent-muted)" : idx % 2 === 1 ? "var(--color-background-secondary)" : "transparent",
                          transition: "background 0.12s ease",
                        }}
                      >
                        <td style={{ padding: "15px 16px", fontWeight: 600, color: "var(--color-text-primary)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{
                              width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                              background: st.dot,
                              animation: t.status === "open" ? "pulseDot 1.5s ease-in-out infinite" : "none",
                            }} />
                            {t.subject}
                          </div>
                        </td>
                        <td style={{ padding: "15px 16px" }}>
                          <span style={{
                            padding: "4px 11px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                            textTransform: "capitalize", background: st.bg, color: st.color,
                            border: `1px solid ${st.border}`,
                          }}>{st.label}</span>
                        </td>
                        <td style={{ padding: "15px 16px", color: "var(--color-text-secondary)", fontSize: 13 }}>
                          {new Date(t.created_at).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Create ticket view */}
        {view === "create" && (
          <div style={{
            background: "var(--color-background-primary)",
            border: "1px solid var(--color-border-secondary)", borderRadius: 16,
            boxShadow: "var(--shadow-sm)", overflow: "hidden",
            animation: "slideIn 0.25s cubic-bezier(0.16,1,0.3,1)",
          }}>
            <div style={{
              padding: "1.1rem 1.5rem", borderBottom: "1px solid var(--color-border-secondary)",
              background: "linear-gradient(135deg, var(--color-background-secondary) 0%, var(--color-accent-muted) 100%)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #0f766e, #0d9488)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
              </div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>New Support Ticket</h2>
            </div>
            <div style={{ padding: "1.5rem" }}>
              {error && (
                <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid #fecaca", borderRadius: 9, fontSize: 13, color: "#dc2626" }}>
                  ⚠ {error}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Subject <span style={{ color: "#ef4444" }}>*</span></label>
                  <input style={inp} placeholder="e.g. Issue with patient import" value={subject} onChange={e => setSubject(e.target.value)} onFocus={inpFocus} onBlur={inpBlur} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Description <span style={{ color: "#ef4444" }}>*</span></label>
                  <textarea
                    style={{ ...inp, height: 160, resize: "vertical", lineHeight: 1.6 }}
                    placeholder="Describe your issue or question in detail…"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    onFocus={inpFocus} onBlur={inpBlur}
                  />
                </div>
                <div style={{
                  padding: "11px 14px", background: "var(--color-background-secondary)",
                  borderRadius: 10, border: "1px solid var(--color-border-secondary)",
                  fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                  Your clinic name and email will be automatically included with your ticket.
                </div>
                <button
                  onClick={submitTicket}
                  disabled={sending || !subject.trim() || !description.trim()}
                  onMouseEnter={() => setSubmitHover(true)}
                  onMouseLeave={() => setSubmitHover(false)}
                  style={{
                    padding: "13px", borderRadius: 10, border: "none",
                    background: sending || !subject.trim() || !description.trim() ? "var(--color-background-secondary)" : "linear-gradient(135deg, #0f766e, #0d9488)",
                    color: sending || !subject.trim() || !description.trim() ? "var(--color-text-secondary)" : "#fff",
                    fontSize: 15, fontWeight: 700,
                    cursor: sending || !subject.trim() || !description.trim() ? "not-allowed" : "pointer",
                    boxShadow: sending || !subject.trim() || !description.trim() ? "none" : submitHover ? "0 6px 20px rgba(15,118,110,0.4)" : "0 4px 14px rgba(15,118,110,0.3)",
                    transform: submitHover && !sending ? "translateY(-1px)" : "translateY(0)",
                    transition: "all 0.18s",
                  }}
                >
                  {sending ? "Submitting…" : "Submit ticket →"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detail / chat view */}
        {view === "detail" && activeTicket && (
          <div style={{
            display: "flex", flexDirection: "column",
            height: "calc(100vh - 160px)",
            background: "var(--color-background-primary)",
            border: "1px solid var(--color-border-secondary)", borderRadius: 16,
            overflow: "hidden", boxShadow: "var(--shadow-md)",
            animation: "slideIn 0.25s cubic-bezier(0.16,1,0.3,1)",
          }}>
            {/* Chat header */}
            <div style={{
              padding: "14px 20px", borderBottom: "1px solid var(--color-border-secondary)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "linear-gradient(135deg, var(--color-background-secondary) 0%, var(--color-accent-muted) 100%)",
            }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 3, margin: "0 0 3px" }}>
                  {activeTicket.subject}
                </h2>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                  Ticket #{activeTicket.id.slice(0, 8)}
                </div>
              </div>
              {(() => {
                const st = statusStyle[activeTicket.status] ?? statusStyle.open;
                return (
                  <span style={{
                    padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                    textTransform: "capitalize", background: st.bg, color: st.color,
                    border: `1px solid ${st.border}`, display: "flex", alignItems: "center", gap: 5,
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.dot, animation: activeTicket.status === "open" ? "pulseDot 1.5s ease-in-out infinite" : "none" }} />
                    {st.label}
                  </span>
                );
              })()}
            </div>

            {/* Messages area */}
            <div style={{
              flex: 1, overflowY: "auto", padding: "24px 20px",
              display: "flex", flexDirection: "column", gap: 20,
              background: "var(--color-background-primary)",
            }}>
              {/* Initial message */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 5, padding: "0 4px", fontWeight: 500 }}>
                  {activeTicket.user_name} · {new Date(activeTicket.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                </div>
                <div style={{
                  maxWidth: "75%", padding: "13px 17px",
                  borderRadius: "18px 18px 4px 18px", fontSize: 14, lineHeight: 1.65,
                  background: "linear-gradient(135deg, #0f766e, #0d9488)", color: "#fff",
                  whiteSpace: "pre-wrap", boxShadow: "0 4px 14px rgba(15,118,110,0.25)",
                }}>
                  {activeTicket.description}
                </div>
              </div>

              {/* Replies */}
              {activeTicket.messages?.map((msg: any) => {
                const isUser = msg.sender_type === "user";
                return (
                  <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 5, padding: "0 4px", fontWeight: 500 }}>
                      {msg.sender_name} · {new Date(msg.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                    </div>
                    <div style={{
                      maxWidth: "75%", padding: "13px 17px",
                      borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      fontSize: 14, lineHeight: 1.65,
                      background: isUser ? "linear-gradient(135deg, #0f766e, #0d9488)" : "var(--color-background-secondary)",
                      color: isUser ? "#fff" : "var(--color-text-primary)",
                      border: isUser ? "none" : "1px solid var(--color-border-secondary)",
                      whiteSpace: "pre-wrap",
                      boxShadow: isUser ? "0 4px 14px rgba(15,118,110,0.2)" : "var(--shadow-xs)",
                    }}>
                      {msg.message}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input area */}
            {activeTicket.status !== "resolved" ? (
              <div style={{
                padding: "14px 18px", borderTop: "1px solid var(--color-border-secondary)",
                background: "var(--color-background-primary)", display: "flex", gap: 10, alignItems: "flex-end",
              }}>
                <textarea
                  style={{
                    flex: 1, minHeight: 48, maxHeight: 140, padding: "13px 18px",
                    borderRadius: 24, border: "1.5px solid var(--color-border-secondary)",
                    background: "var(--color-background-secondary)", color: "var(--color-text-primary)",
                    fontSize: 14, outline: "none", resize: "none", fontFamily: "inherit",
                    lineHeight: 1.5, transition: "all 0.15s",
                  }}
                  placeholder="Type your message… (Enter to send)"
                  value={replyMessage}
                  onChange={e => setReplyMessage(e.target.value)}
                  onFocus={e => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px var(--color-accent-subtle)" }}
                  onBlur={e => { e.target.style.borderColor = "var(--color-border-secondary)"; e.target.style.boxShadow = "none" }}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (replyMessage.trim()) sendReply(); } }}
                />
                <button
                  onClick={sendReply}
                  disabled={replying || !replyMessage.trim()}
                  style={{
                    width: 48, height: 48, borderRadius: "50%", border: "none",
                    background: replying || !replyMessage.trim() ? "var(--color-border-secondary)" : "linear-gradient(135deg, #0f766e, #0d9488)",
                    color: "#fff", cursor: replying || !replyMessage.trim() ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.18s", flexShrink: 0,
                    boxShadow: replying || !replyMessage.trim() ? "none" : "0 4px 12px rgba(15,118,110,0.3)",
                  }}
                  onMouseEnter={e => { if (!replying && replyMessage.trim()) { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 18px rgba(15,118,110,0.4)" } }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = replying || !replyMessage.trim() ? "none" : "0 4px 12px rgba(15,118,110,0.3)" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            ) : (
              <div style={{
                padding: "18px 20px", borderTop: "1px solid var(--color-border-secondary)",
                background: "rgba(16,185,129,0.06)", textAlign: "center",
                fontSize: 14, color: "#10b981", fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", animation: "pulseDot 2s ease-in-out infinite" }} />
                This ticket has been marked as resolved.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
