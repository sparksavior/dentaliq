"use client";

import { useState } from "react";
import { Sparkles, Check, X } from "lucide-react";

export default function DemoCortexInbox() {
  const [items, setItems] = useState([
    {
      id: "1",
      title: "Pre-Auth Narrative: D2750 for Sarah Chen",
      type: "billing",
      status: "pending",
      desc: "AI drafted a 2-paragraph narrative justifying a crown replacement due to recurrent decay.",
      action: "Review Draft",
    },
    {
      id: "2",
      title: "Schedule Gap Optimization",
      type: "scheduling",
      status: "pending",
      desc: "Agent found 3 patients on waitlist matching a newly opened 90-minute slot on Thursday.",
      action: "Approve SMS blast",
    },
  ]);

  const handleAction = (id: string, actionType: "approve" | "reject") => {
    setItems(items.filter((i) => i.id !== id));
  };

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: 900,
        margin: "0 auto",
        color: "var(--color-text-primary)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "var(--color-accent-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
          }}
        >
          📥
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            margin: 0,
            letterSpacing: "-0.03em",
          }}
        >
          Approval Inbox
        </h1>
      </div>
      <p
        style={{
          margin: 0,
          color: "var(--color-text-secondary)",
          fontSize: 15,
          marginBottom: "2rem",
        }}
      >
        Review and approve actions proposed by Cortex Agents.
      </p>

      {items.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            background: "var(--color-background-primary)",
            borderRadius: 16,
            border: "1px solid var(--color-border-secondary)",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Inbox Zero</h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
            Your agents are currently analyzing data. Check back later.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                background: "var(--color-background-primary)",
                border: "1px solid var(--color-border-secondary)",
                borderRadius: 16,
                padding: "1.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: "var(--color-accent-muted)",
                      color: "var(--color-accent)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    {item.type}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-secondary)",
                      fontWeight: 500,
                    }}
                  >
                    Requires Approval
                  </span>
                </div>
                <h3
                  style={{ margin: "0 0 6px 0", fontSize: 16, fontWeight: 700 }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    color: "var(--color-text-secondary)",
                    fontSize: 14,
                  }}
                >
                  {item.desc}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => handleAction(item.id, "reject")}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    border: "1px solid var(--color-border-secondary)",
                    background: "transparent",
                    color: "var(--color-text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <X size={18} />
                </button>
                <button
                  onClick={() => handleAction(item.id, "approve")}
                  style={{
                    padding: "0 16px",
                    height: 40,
                    borderRadius: 10,
                    border: "none",
                    background: "var(--color-accent)",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Check size={16} /> {item.action}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
