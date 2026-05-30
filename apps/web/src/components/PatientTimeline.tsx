"use client";

import { useState, useMemo } from "react";
import type {
  EstimateHistoryItem,
  PatientNote,
  DocumentMeta,
  NoteType,
} from "@/lib/api";

type TimelineEntry =
  | { kind: "estimate"; date: string; data: EstimateHistoryItem }
  | { kind: "note"; date: string; data: PatientNote }
  | { kind: "document"; date: string; data: DocumentMeta };

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  clinical: "Clinical",
  billing: "Billing",
  general: "General",
  follow_up: "Follow-up",
  phone_call: "Phone Call",
};

const KIND_ICONS: Record<string, string> = {
  estimate: "📊",
  note: "📝",
  document: "📎",
};

const KIND_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  estimate: {
    bg: "rgba(6,182,212,0.08)",
    border: "rgba(6,182,212,0.2)",
    text: "#06b6d4",
  },
  note: {
    bg: "rgba(168,85,247,0.08)",
    border: "rgba(168,85,247,0.2)",
    text: "#a855f7",
  },
  document: {
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
    text: "#f59e0b",
  },
};

interface PatientTimelineProps {
  estimates: EstimateHistoryItem[];
  notes: PatientNote[];
  documents: DocumentMeta[];
  onAddNote: (content: string, type: NoteType) => Promise<void>;
  onDeleteNote: (id: string) => void;
}

export default function PatientTimeline({
  estimates,
  notes,
  documents,
  onAddNote,
  onDeleteNote,
}: PatientTimelineProps) {
  const [filter, setFilter] = useState<
    "all" | "estimate" | "note" | "document"
  >("all");
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("general");
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const entries = useMemo(() => {
    const all: TimelineEntry[] = [
      ...estimates.map((e) => ({
        kind: "estimate" as const,
        date: e.created_at,
        data: e,
      })),
      ...notes.map((n) => ({
        kind: "note" as const,
        date: n.created_at,
        data: n,
      })),
      ...documents.map((d) => ({
        kind: "document" as const,
        date: d.created_at,
        data: d,
      })),
    ];
    all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (filter !== "all") return all.filter((e) => e.kind === filter);
    return all;
  }, [estimates, notes, documents, filter]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAdding(true);
    try {
      await onAddNote(newNote.trim(), noteType);
      setNewNote("");
      setShowAddForm(false);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "estimate", "note", "document"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 12px",
                borderRadius: 20,
                border: "none",
                background:
                  filter === f ? "var(--color-accent-muted)" : "transparent",
                color:
                  filter === f
                    ? "var(--color-accent)"
                    : "var(--color-text-secondary)",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {f === "all"
                ? `All (${estimates.length + notes.length + documents.length})`
                : f === "estimate"
                  ? `Estimates (${estimates.length})`
                  : f === "note"
                    ? `Notes (${notes.length})`
                    : `Documents (${documents.length})`}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: "7px 14px",
            borderRadius: 8,
            background: "linear-gradient(135deg, #0891b2, #06b6d4)",
            border: "none",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Add Note
        </button>
      </div>

      {/* Add note form */}
      {showAddForm && (
        <div
          style={{
            padding: 16,
            marginBottom: 16,
            borderRadius: 12,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value as NoteType)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                background: "var(--color-background-primary)",
                border: "1px solid var(--color-border-secondary)",
                color: "var(--color-text-primary)",
                fontSize: 13,
              }}
            >
              {Object.entries(NOTE_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Write a note about this patient..."
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              background: "var(--color-background-primary)",
              border: "1px solid var(--color-border-secondary)",
              color: "var(--color-text-primary)",
              fontSize: 14,
              minHeight: 80,
              resize: "vertical",
              fontFamily: "inherit",
              outline: "none",
            }}
            maxLength={2000}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 10,
            }}
          >
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewNote("");
              }}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid var(--color-border-secondary)",
                background: "transparent",
                color: "var(--color-text-secondary)",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim() || adding}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg, #0891b2, #06b6d4)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                opacity: !newNote.trim() || adding ? 0.5 : 1,
              }}
            >
              {adding ? "Saving..." : "Save Note"}
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {entries.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            border: "1px dashed rgba(255,255,255,0.1)",
            borderRadius: 12,
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>
            No activity yet
          </p>
        </div>
      ) : (
        <div style={{ position: "relative", paddingLeft: 28 }}>
          {/* Vertical line */}
          <div
            style={{
              position: "absolute",
              left: 11,
              top: 8,
              bottom: 8,
              width: 2,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 1,
            }}
          />

          {entries.map((entry, i) => {
            const c = KIND_COLORS[entry.kind];
            return (
              <div
                key={`${entry.kind}-${i}`}
                style={{ position: "relative", marginBottom: 12 }}
              >
                {/* Dot */}
                <div
                  style={{
                    position: "absolute",
                    left: -22,
                    top: 16,
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: c.text,
                    border: `2px solid ${c.border}`,
                    boxShadow: `0 0 6px ${c.bg}`,
                  }}
                />

                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid rgba(255,255,255,0.06)`,
                    transition: "border-color 0.2s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span>{KIND_ICONS[entry.kind]}</span>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 10,
                          background: c.bg,
                          color: c.text,
                          border: `1px solid ${c.border}`,
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: "capitalize",
                        }}
                      >
                        {entry.kind}
                      </span>
                      {entry.kind === "note" && (
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 10,
                            background: "rgba(255,255,255,0.04)",
                            color: "var(--color-text-secondary)",
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        >
                          {NOTE_TYPE_LABELS[(entry.data as PatientNote).type] ??
                            "General"}
                        </span>
                      )}
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--color-text-tertiary)",
                        }}
                      >
                        {new Date(entry.date).toLocaleDateString("en-CA", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {entry.kind === "note" && (
                        <button
                          onClick={() => onDeleteNote(entry.data.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--color-text-tertiary)",
                            cursor: "pointer",
                            fontSize: 12,
                            padding: "2px 4px",
                          }}
                          title="Delete note"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Content based on kind */}
                  {entry.kind === "estimate" &&
                    (() => {
                      const e = entry.data as EstimateHistoryItem;
                      return (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontWeight: 700,
                                fontSize: 14,
                                color: "var(--color-text-primary)",
                              }}
                            >
                              {e.cdt_code}
                            </span>
                            {e.plain_explanation && (
                              <span
                                style={{
                                  marginLeft: 8,
                                  fontSize: 13,
                                  color: "var(--color-text-secondary)",
                                }}
                              >
                                {e.plain_explanation.length > 80
                                  ? e.plain_explanation.substring(0, 80) + "…"
                                  : e.plain_explanation}
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              textAlign: "right",
                              flexShrink: 0,
                              marginLeft: 16,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 15,
                                fontWeight: 700,
                                color: "var(--color-accent)",
                              }}
                            >
                              {e.coverage_percent}%
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--color-text-secondary)",
                              }}
                            >
                              ${e.insurer_pays?.toFixed(2) ?? "0.00"}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                  {entry.kind === "note" && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        lineHeight: 1.6,
                        color: "var(--color-text-primary)",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {(entry.data as PatientNote).content}
                    </p>
                  )}

                  {entry.kind === "document" &&
                    (() => {
                      const d = entry.data as DocumentMeta;
                      return (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: "var(--color-text-primary)",
                            }}
                          >
                            {d.name}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--color-text-tertiary)",
                            }}
                          >
                            ({formatBytes(d.size_bytes)})
                          </span>
                        </div>
                      );
                    })()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
