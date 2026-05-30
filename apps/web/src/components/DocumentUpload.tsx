"use client";

import { useState, useRef, useCallback } from "react";
import type { DocumentType, UploadDocumentInput } from "@/lib/api";

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  xray: "X-Ray",
  treatment_plan: "Treatment Plan",
  insurance_card: "Insurance Card",
  consent_form: "Consent Form",
  lab_report: "Lab Report",
  photo: "Photo",
  other: "Other",
};

const ACCEPTED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "image/dicom",
  "image/bmp",
];

const MAX_SIZE = 10_000_000; // 10 MB

interface DocumentUploadProps {
  patientId: string;
  onUpload: (data: UploadDocumentInput) => Promise<void>;
  onClose: () => void;
}

export default function DocumentUpload({
  patientId,
  onUpload,
  onClose,
}: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocumentType>("other");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setError("");
    if (f.size > MAX_SIZE) {
      setError("File exceeds 10 MB limit");
      return;
    }
    setFile(f);
    // Auto-detect type from mime
    if (f.type.startsWith("image/")) {
      if (
        f.name.toLowerCase().includes("xray") ||
        f.name.toLowerCase().includes("x-ray")
      ) {
        setDocType("xray");
      } else {
        setDocType("photo");
      }
    } else if (f.type === "application/pdf") {
      setDocType("treatment_plan");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError("");

    try {
      const base64 = await fileToBase64(file);
      await onUpload({
        patientId,
        name: file.name,
        type: docType,
        content: base64,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        notes: notes || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Upload Document</h3>
          <button onClick={onClose} style={styles.closeBtn}>
            ✕
          </button>
        </div>

        {/* Drop zone */}
        <div
          style={{
            ...styles.dropZone,
            ...(dragOver ? styles.dropZoneActive : {}),
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_MIME.join(",")}
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          {file ? (
            <div style={styles.fileInfo}>
              <span style={styles.fileIcon}>📄</span>
              <div>
                <div style={styles.fileName}>{file.name}</div>
                <div style={styles.fileSize}>{formatBytes(file.size)}</div>
              </div>
            </div>
          ) : (
            <div style={styles.dropText}>
              <span style={{ fontSize: 32 }}>📂</span>
              <p style={{ margin: "8px 0 0", color: "#94a3b8" }}>
                Drop a file here or click to browse
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
                JPEG, PNG, PDF, DICOM • Max 10 MB
              </p>
            </div>
          )}
        </div>

        {/* Type selector */}
        <label style={styles.label}>Document Type</label>
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value as DocumentType)}
          style={styles.select}
        >
          {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        {/* Notes */}
        <label style={styles.label}>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Panoramic X-ray taken Jan 2025"
          style={styles.textarea}
          maxLength={500}
        />

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.actions}>
          <button onClick={onClose} style={styles.cancelBtn}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || loading}
            style={{
              ...styles.uploadBtn,
              opacity: !file || loading ? 0.5 : 1,
            }}
          >
            {loading ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix: "data:image/png;base64,..."
      resolve(result.split(",")[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Styles ───────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#1e293b",
    borderRadius: 16,
    padding: 28,
    width: "100%",
    maxWidth: 480,
    border: "1px solid rgba(255,255,255,0.08)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    color: "#f1f5f9",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: 18,
    cursor: "pointer",
  },
  dropZone: {
    border: "2px dashed rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: 32,
    textAlign: "center" as const,
    cursor: "pointer",
    marginBottom: 16,
    transition: "border-color 0.2s, background 0.2s",
  },
  dropZoneActive: {
    borderColor: "#06b6d4",
    background: "rgba(6,182,212,0.06)",
  },
  dropText: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
  },
  fileInfo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  fileIcon: { fontSize: 28 },
  fileName: { color: "#e2e8f0", fontWeight: 500, fontSize: 14 },
  fileSize: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  label: {
    display: "block",
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 6,
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    color: "#e2e8f0",
    fontSize: 14,
    marginBottom: 14,
    outline: "none",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    color: "#e2e8f0",
    fontSize: 14,
    marginBottom: 14,
    minHeight: 60,
    resize: "vertical" as const,
    fontFamily: "inherit",
    outline: "none",
  },
  error: {
    color: "#f87171",
    fontSize: 13,
    margin: "0 0 12px",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    padding: "10px 20px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    color: "#94a3b8",
    fontSize: 14,
    cursor: "pointer",
  },
  uploadBtn: {
    padding: "10px 24px",
    background: "linear-gradient(135deg, #0891b2, #06b6d4)",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
};
