"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";

interface InboxItem {
  id: string;
  agentName: string;
  agentAvatar: string;
  type: string;
  cdtCode: string;
  cdtDescription: string;
  patientName: string;
  riskLevel: "high" | "medium";
  narrative: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
}

const MOCK_INBOX: InboxItem[] = [
  {
    id: "task_001",
    agentName: "Cortex Billing Agent",
    agentAvatar: "💰",
    type: "billing",
    cdtCode: "D3330",
    cdtDescription: "Root Canal Therapy — Molar",
    patientName: "Sarah Chen",
    riskLevel: "high",
    narrative: `Dear Claims Review Team,\n\nI am writing to request pre-authorization for endodontic therapy (CDT Code D3330 — Root Canal Therapy, Molar) for our patient, Sarah Chen (age 34).\n\nClinical Findings:\nThe patient presented with persistent, spontaneous pain in tooth #19 (mandibular left first molar). Clinical examination revealed:\n- Positive response to cold testing with lingering pain exceeding 30 seconds\n- Tenderness to percussion\n- Periapical radiolucency visible on digital radiograph (PA #19)\n- No evidence of fracture upon transillumination\n\nDiagnosis: Irreversible pulpitis with symptomatic apical periodontitis, tooth #19.\n\nMedical Necessity:\nWithout prompt endodontic intervention, the patient faces risk of acute dental abscess, cellulitis, and potential tooth loss requiring more costly restorative procedures (implant or bridge). Root canal therapy is the most conservative and cost-effective treatment to preserve the natural tooth structure.\n\nThank you for your timely review of this authorization request.\n\nSincerely,\nDentalIQ Cortex Billing Agent\nGenerated: ${new Date().toLocaleDateString()}`,
    createdAt: "2:18 AM Today",
    status: "pending",
  },
  {
    id: "task_002",
    agentName: "Cortex Billing Agent",
    agentAvatar: "💰",
    type: "billing",
    cdtCode: "D2750",
    cdtDescription: "Crown — Porcelain Fused to High Noble Metal",
    patientName: "James Thompson",
    riskLevel: "medium",
    narrative: `Dear Claims Review Team,\n\nI am writing to request pre-authorization for a porcelain-fused-to-high-noble-metal crown (CDT Code D2750) for our patient, James Thompson (age 52).\n\nClinical Findings:\nTooth #14 (maxillary left first premolar) presents with:\n- Large MOD composite restoration (>60% of tooth structure compromised)\n- Visible marginal ridge fracture on the mesial aspect\n- History of repeated composite failures on this tooth\n- No pulpal involvement at this time\n\nDiagnosis: Compromised structural integrity of tooth #14 due to extensive prior restoration and fracture.\n\nMedical Necessity:\nThe existing restoration cannot be predictably replaced with a direct restoration due to insufficient remaining tooth structure. A full-coverage crown is necessary to prevent catastrophic fracture, which would likely result in extraction and more costly replacement options.\n\nThank you for your review.\n\nSincerely,\nDentalIQ Cortex Billing Agent\nGenerated: ${new Date().toLocaleDateString()}`,
    createdAt: "2:24 AM Today",
    status: "pending",
  },
];

export default function CortexInbox() {
  const [items, setItems] = useState<InboxItem[]>(MOCK_INBOX);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNarrative, setEditingNarrative] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "completed">("pending");

  const pendingItems = items.filter((i) => i.status === "pending");
  const completedItems = items.filter((i) => i.status !== "pending");

  const displayItems = filter === "pending" ? pendingItems : completedItems;

  const handleAction = (id: string, actionType: "approved" | "rejected") => {
    setItems(
      items.map((i) => (i.id === id ? { ...i, status: actionType } : i)),
    );
    setExpandedId(null);
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setEditingNarrative(null);
    } else {
      setExpandedId(id);
      setEditingNarrative(null);
    }
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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "2rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
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
          <div>
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
            <p
              style={{
                margin: 0,
                color: "var(--color-text-secondary)",
                fontSize: 14,
              }}
            >
              Review and approve actions proposed by Cortex Agents.
            </p>
          </div>
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
            onClick={() => setFilter("pending")}
            style={{
              padding: "8px 16px",
              background:
                filter === "pending"
                  ? "var(--color-background-secondary)"
                  : "transparent",
              border: "none",
              color:
                filter === "pending"
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Pending{" "}
            <span
              style={{
                background: "var(--color-accent)",
                color: "#fff",
                padding: "2px 6px",
                borderRadius: 10,
                fontSize: 11,
              }}
            >
              {pendingItems.length}
            </span>
          </button>
          <button
            onClick={() => setFilter("completed")}
            style={{
              padding: "8px 16px",
              background:
                filter === "completed"
                  ? "var(--color-background-secondary)"
                  : "transparent",
              border: "none",
              color:
                filter === "completed"
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Completed
          </button>
        </div>
      </div>

      {displayItems.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "6rem 2rem",
            background: "var(--color-background-primary)",
            borderRadius: 20,
            border: "1px solid var(--color-border-secondary)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 16 }}>✨</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px 0" }}>
            Inbox Zero
          </h2>
          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: 15,
              maxWidth: 400,
              margin: "0 auto 24px",
            }}
          >
            {filter === "pending"
              ? "Your agents are currently analyzing data and generating tasks. Check back later!"
              : "No completed tasks yet."}
          </p>
          {filter === "pending" && (
            <Link
              href="/dashboard/cortex"
              style={{
                display: "inline-block",
                padding: "10px 24px",
                background: "var(--color-background-secondary)",
                border: "1px solid var(--color-border-secondary)",
                color: "var(--color-text-primary)",
                borderRadius: 10,
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Go to Command Center
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {displayItems.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                style={{
                  background: "var(--color-background-primary)",
                  border: "1px solid var(--color-border-secondary)",
                  borderRadius: 20,
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                  boxShadow: isExpanded
                    ? "0 12px 30px rgba(0,0,0,0.06)"
                    : "0 4px 12px rgba(0,0,0,0.02)",
                }}
              >
                {/* Card Header (Always visible) */}
                <div
                  style={{
                    padding: "1.5rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 12,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          padding: "4px 10px",
                          borderRadius: 20,
                          background: "var(--color-accent-muted)",
                          color: "var(--color-accent)",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span style={{ fontSize: 14 }}>{item.agentAvatar}</span>{" "}
                        {item.type}
                      </span>
                      {item.status === "pending" ? (
                        <span
                          style={{
                            fontSize: 11,
                            padding: "4px 10px",
                            borderRadius: 20,
                            background:
                              item.riskLevel === "high"
                                ? "rgba(239,68,68,0.1)"
                                : "rgba(245,158,11,0.1)",
                            color:
                              item.riskLevel === "high" ? "#ef4444" : "#f59e0b",
                            fontWeight: 600,
                            textTransform: "uppercase",
                          }}
                        >
                          {item.riskLevel} Risk
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 11,
                            padding: "4px 10px",
                            borderRadius: 20,
                            background:
                              item.status === "approved"
                                ? "rgba(16,185,129,0.1)"
                                : "rgba(239,68,68,0.1)",
                            color:
                              item.status === "approved"
                                ? "#10b981"
                                : "#ef4444",
                            fontWeight: 600,
                            textTransform: "uppercase",
                          }}
                        >
                          {item.status}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--color-text-secondary)",
                          marginLeft: "auto",
                        }}
                      >
                        {item.createdAt}
                      </span>
                    </div>

                    <h3
                      style={{
                        margin: "0 0 6px 0",
                        fontSize: 18,
                        fontWeight: 700,
                      }}
                    >
                      Pre-Auth: {item.cdtCode} for {item.patientName}
                    </h3>
                    <p
                      style={{
                        margin: "0 0 16px 0",
                        color: "var(--color-text-secondary)",
                        fontSize: 14,
                      }}
                    >
                      {item.agentName} generated a narrative for{" "}
                      {item.cdtDescription.toLowerCase()}.
                    </p>

                    <button
                      onClick={() => toggleExpand(item.id)}
                      style={{
                        background: "var(--color-background-secondary)",
                        border: "1px solid var(--color-border-secondary)",
                        borderRadius: 8,
                        padding: "6px 12px",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--color-text-primary)",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <FileText size={14} />
                      {isExpanded ? "Hide Details" : "Review Narrative"}
                      {isExpanded ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </button>
                  </div>

                  {/* Quick Actions (Only when pending) */}
                  {item.status === "pending" && (
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexShrink: 0,
                        marginLeft: 24,
                      }}
                    >
                      <button
                        onClick={() => handleAction(item.id, "rejected")}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          border: "1px solid var(--color-border-secondary)",
                          background: "transparent",
                          color: "var(--color-text-secondary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          transition: "all 0.1s",
                        }}
                      >
                        <X size={20} />
                      </button>
                      <button
                        onClick={() => handleAction(item.id, "approved")}
                        style={{
                          padding: "0 20px",
                          height: 44,
                          borderRadius: 12,
                          border: "none",
                          background: "var(--color-accent)",
                          color: "#fff",
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          transition: "all 0.1s",
                          boxShadow: "0 4px 12px rgba(15,118,110,0.3)",
                        }}
                      >
                        <Check size={18} /> Approve
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div
                    style={{
                      borderTop: "1px solid var(--color-border-secondary)",
                      padding: "1.5rem",
                      background: "rgba(0,0,0,0.01)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 12,
                      }}
                    >
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
                        Drafted Narrative
                      </h4>
                      {item.status === "pending" && (
                        <button
                          onClick={() =>
                            setEditingNarrative(
                              editingNarrative !== null ? null : item.narrative,
                            )
                          }
                          style={{
                            background: "none",
                            border: "1px solid var(--color-border-secondary)",
                            borderRadius: 8,
                            padding: "4px 12px",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--color-text-secondary)",
                            cursor: "pointer",
                          }}
                        >
                          {editingNarrative !== null
                            ? "Cancel Edit"
                            : "✎ Edit Draft"}
                        </button>
                      )}
                    </div>

                    {editingNarrative !== null ? (
                      <textarea
                        value={editingNarrative}
                        onChange={(e) => setEditingNarrative(e.target.value)}
                        style={{
                          width: "100%",
                          minHeight: 300,
                          padding: 16,
                          border: "1px solid var(--color-border-secondary)",
                          borderRadius: 12,
                          background: "var(--color-background-primary)",
                          color: "var(--color-text-primary)",
                          fontSize: 14,
                          fontFamily: "system-ui",
                          lineHeight: 1.6,
                          resize: "vertical",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          background: "var(--color-background-primary)",
                          padding: 20,
                          borderRadius: 12,
                          border: "1px solid var(--color-border-tertiary)",
                          fontSize: 14,
                          lineHeight: 1.6,
                          color: "var(--color-text-primary)",
                          fontFamily: "system-ui",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {item.narrative}
                      </div>
                    )}

                    {item.status === "pending" && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          marginTop: 16,
                        }}
                      >
                        <button
                          onClick={() => handleAction(item.id, "approved")}
                          style={{
                            padding: "10px 24px",
                            borderRadius: 10,
                            border: "none",
                            background:
                              "linear-gradient(135deg, #10b981, #059669)",
                            color: "#fff",
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
                          }}
                        >
                          ✓ Approve & Send
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
