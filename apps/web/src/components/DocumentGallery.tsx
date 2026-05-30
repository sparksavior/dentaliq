"use client";

import { useState, useMemo } from "react";
import type { DocumentMeta, DocumentType } from "@/lib/api";

const TYPE_ICONS: Record<DocumentType, string> = {
  xray: "🦷",
  treatment_plan: "📋",
  insurance_card: "💳",
  consent_form: "📝",
  lab_report: "🔬",
  photo: "📷",
  other: "📄",
};

const TYPE_LABELS: Record<DocumentType, string> = {
  xray: "X-Ray",
  treatment_plan: "Treatment Plan",
  insurance_card: "Insurance Card",
  consent_form: "Consent Form",
  lab_report: "Lab Report",
  photo: "Photo",
  other: "Other",
};

interface DocumentGalleryProps {
  documents: DocumentMeta[];
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  onUploadClick: () => void;
}

export default function DocumentGallery({
  documents,
  onView,
  onDelete,
  onUploadClick,
}: DocumentGalleryProps) {
  const [filter, setFilter] = useState<DocumentType | "all">("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      filter === "all" ? documents : documents.filter((d) => d.type === filter),
    [documents, filter],
  );

  const typeCounts = useMemo(() => {
    const m = new Map<string, number>();
    documents.forEach((d) => m.set(d.type, (m.get(d.type) ?? 0) + 1));
    return m;
  }, [documents]);

  if (documents.length === 0) {
    return (
      <div style={styles.empty}>
        <span style={{ fontSize: 40 }}>📁</span>
        <p style={{ color: "#94a3b8", margin: "12px 0 4px" }}>
          No documents yet
        </p>
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
          Upload X-rays, treatment plans, insurance cards, and more
        </p>
        <button onClick={onUploadClick} style={styles.emptyBtn}>
          + Upload Document
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Filter bar */}
      <div style={styles.filterBar}>
        <div style={styles.filters}>
          <button
            onClick={() => setFilter("all")}
            style={{
              ...styles.filterChip,
              ...(filter === "all" ? styles.filterActive : {}),
            }}
          >
            All ({documents.length})
          </button>
          {Array.from(typeCounts.entries()).map(([type, count]) => (
            <button
              key={type}
              onClick={() => setFilter(type as DocumentType)}
              style={{
                ...styles.filterChip,
                ...(filter === type ? styles.filterActive : {}),
              }}
            >
              {TYPE_ICONS[type as DocumentType]}{" "}
              {TYPE_LABELS[type as DocumentType]} ({count})
            </button>
          ))}
        </div>
        <button onClick={onUploadClick} style={styles.uploadBtn}>
          + Upload
        </button>
      </div>

      {/* Document grid */}
      <div style={styles.grid}>
        {filtered.map((doc) => (
          <div key={doc.id} style={styles.card}>
            <div style={styles.cardIcon}>
              {TYPE_ICONS[doc.type as DocumentType] ?? "📄"}
            </div>
            <div style={styles.cardBody}>
              <div style={styles.cardName} title={doc.name}>
                {doc.name}
              </div>
              <div style={styles.cardMeta}>
                <span style={styles.badge}>
                  {TYPE_LABELS[doc.type as DocumentType] ?? doc.type}
                </span>
                <span style={{ color: "#64748b", fontSize: 12 }}>
                  {formatBytes(doc.size_bytes)}
                </span>
              </div>
              {doc.notes && <div style={styles.cardNotes}>{doc.notes}</div>}
              <div style={styles.cardDate}>
                {new Date(doc.created_at).toLocaleDateString("en-CA", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
            <div style={styles.cardActions}>
              <button
                onClick={() => onView(doc.id)}
                style={styles.viewBtn}
                title="View / Download"
              >
                👁
              </button>
              {deleteConfirm === doc.id ? (
                <div style={styles.confirmRow}>
                  <button
                    onClick={() => {
                      onDelete(doc.id);
                      setDeleteConfirm(null);
                    }}
                    style={styles.confirmYes}
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    style={styles.confirmNo}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(doc.id)}
                  style={styles.deleteBtn}
                  title="Delete"
                >
                  🗑
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const styles: Record<string, React.CSSProperties> = {
  empty: {
    textAlign: "center" as const,
    padding: "48px 24px",
    border: "1px dashed rgba(255,255,255,0.1)",
    borderRadius: 12,
    background: "rgba(255,255,255,0.02)",
  },
  emptyBtn: {
    marginTop: 16,
    padding: "10px 20px",
    background: "linear-gradient(135deg, #0891b2, #06b6d4)",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  filterBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  filters: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap" as const,
  },
  filterChip: {
    padding: "6px 12px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    color: "#94a3b8",
    fontSize: 12,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  filterActive: {
    background: "rgba(6,182,212,0.12)",
    borderColor: "rgba(6,182,212,0.3)",
    color: "#06b6d4",
  },
  uploadBtn: {
    padding: "8px 16px",
    background: "linear-gradient(135deg, #0891b2, #06b6d4)",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: 12,
  },
  card: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12,
    transition: "border-color 0.2s",
  },
  cardIcon: {
    fontSize: 28,
    flexShrink: 0,
    marginTop: 2,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: 500,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cardMeta: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  badge: {
    padding: "2px 8px",
    background: "rgba(6,182,212,0.1)",
    borderRadius: 10,
    color: "#06b6d4",
    fontSize: 11,
    fontWeight: 500,
  },
  cardNotes: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 6,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cardDate: {
    color: "#475569",
    fontSize: 11,
    marginTop: 4,
  },
  cardActions: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
    flexShrink: 0,
  },
  viewBtn: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 6,
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: 14,
  },
  deleteBtn: {
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.15)",
    borderRadius: 6,
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: 14,
  },
  confirmRow: {
    display: "flex",
    gap: 4,
  },
  confirmYes: {
    background: "rgba(239,68,68,0.2)",
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: 6,
    padding: "4px 6px",
    cursor: "pointer",
    fontSize: 12,
    color: "#f87171",
  },
  confirmNo: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 6,
    padding: "4px 6px",
    cursor: "pointer",
    fontSize: 12,
    color: "#94a3b8",
  },
};
