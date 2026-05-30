"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useClinic } from "@/contexts/clinic-context";
import {
  estimateApi,
  tenantsApi,
  type Tenant,
  type EstimateHistoryItem,
} from "@/lib/api";
import PreAuthPdfModal from "@/components/PreAuthPdfModal";

type RiskFilter = "all" | "high" | "medium" | "low";

const riskStyle = {
  low: {
    bg: "rgba(16, 185, 129, 0.1)",
    text: "#10b981",
    border: "rgba(16,185,129,0.25)",
    dot: "#10b981",
    label: "Low Risk",
    icon: "🟢",
  },
  medium: {
    bg: "rgba(245, 158, 11, 0.1)",
    text: "#f59e0b",
    border: "rgba(245,158,11,0.25)",
    dot: "#f59e0b",
    label: "Medium Risk",
    icon: "🟡",
  },
  high: {
    bg: "rgba(239, 68, 68, 0.1)",
    text: "#ef4444",
    border: "rgba(239,68,68,0.25)",
    dot: "#ef4444",
    label: "High Risk",
    icon: "🔴",
  },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

export default function ClaimsPage() {
  const { accessToken } = useAuth();
  const [history, setHistory] = useState<EstimateHistoryItem[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RiskFilter>("all");
  const [narrativeTarget, setNarrativeTarget] =
    useState<EstimateHistoryItem | null>(null);
  const [narrativeText, setNarrativeText] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [insurer, setInsurer] = useState("Sun Life Financial");
  const [copied, setCopied] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const { selectedClinicId } = useClinic();
  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [hist, t] = await Promise.all([
        estimateApi.getHistory(accessToken),
        tenantsApi.getTenant(accessToken).catch(() => null),
      ]);
      setHistory(hist);
      setTenant(t);
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedClinicId]);

  useEffect(() => {
    load();
  }, [load, selectedClinicId]);

  const counts = {
    all: history.length,
    high: history.filter((h) => h.claim_risk === "high").length,
    medium: history.filter((h) => h.claim_risk === "medium").length,
    low: history.filter((h) => h.claim_risk === "low").length,
  };

  const filtered =
    filter === "all" ? history : history.filter((h) => h.claim_risk === filter);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginatedHistory = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const openPreAuth = (item: EstimateHistoryItem) => {
    setNarrativeTarget(item);
    setNarrativeText(null);
    setInsurer("Sun Life Financial");
  };

  const generateNarrative = async (revisionInstructions?: string | any) => {
    if (!accessToken || !narrativeTarget) return;
    setNarrativeLoading(true);
    const instructions =
      typeof revisionInstructions === "string"
        ? revisionInstructions
        : undefined;
    try {
      const text = await estimateApi.generateNarrative(accessToken, {
        cdtCode: narrativeTarget.cdt_code,
        insurerName: insurer,
        previousNarrative: narrativeText || undefined,
        revisionInstructions: instructions,
      });
      setNarrativeText(text);
      setShowPdfModal(true);
    } catch (err: any) {
      setNarrativeText("Failed to generate narrative. Please try again.");
    } finally {
      setNarrativeLoading(false);
    }
  };

  const copyNarrative = () => {
    if (!narrativeText) return;
    navigator.clipboard.writeText(narrativeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const INSURERS = [
    "Sun Life Financial",
    "Manulife",
    "Canada Life",
    "Green Shield Canada",
    "Desjardins",
    "OTIP/RAEO",
    "Empire Life",
  ];

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
    fontFamily: "inherit",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-background-primary)",
        color: "var(--color-text-primary)",
      }}
    >
      {/* PDF Modal */}
      {showPdfModal && narrativeText && narrativeTarget && (
        <PreAuthPdfModal
          narrative={narrativeText}
          clinicName={tenant?.name || "Your Clinic"}
          insurerName={insurer}
          patientName={
            narrativeTarget.first_name
              ? `${narrativeTarget.first_name} ${narrativeTarget.last_name}`
              : undefined
          }
          date={new Date(narrativeTarget.created_at).toLocaleDateString(
            "en-CA",
            { year: "numeric", month: "long", day: "numeric" },
          )}
          onClose={() => setShowPdfModal(false)}
          onRevise={async (instr) => {
            await generateNarrative(instr);
          }}
          onSave={async () => {
            if (!accessToken || !narrativeTarget || !narrativeText) return;
            await estimateApi.saveLetter(
              accessToken,
              narrativeTarget.id,
              narrativeText,
            );
          }}
        />
      )}

      {/* Premium page header */}
      <div
        style={{
          padding: "1.75rem 2rem 1.5rem",
          background:
            "linear-gradient(135deg, var(--color-background-primary) 0%, var(--color-accent-muted) 100%)",
          borderBottom: "1px solid var(--color-border-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "linear-gradient(135deg, #0f766e, #0d9488)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(15,118,110,0.3)",
              flexShrink: 0,
            }}
          >
            <svg
              width="22"
              height="22"
              fill="none"
              stroke="white"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                margin: 0,
              }}
            >
              Claims
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "var(--color-text-secondary)",
                margin: "2px 0 0",
              }}
            >
              Review estimate risk flags and draft pre-authorization letters.
            </p>
          </div>
        </div>
        {!loading && history.length > 0 && (
          <div
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              background: "var(--color-background-secondary)",
              border: "1px solid var(--color-border-secondary)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-text-secondary)",
            }}
          >
            {history.length} total estimate{history.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      <div style={{ padding: "1.5rem 2rem", maxWidth: 1100, margin: "0 auto" }}>
        {/* Risk summary cards */}
        {!loading && history.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              marginBottom: "1.5rem",
            }}
          >
            {(["high", "medium", "low"] as const).map((risk) => {
              const rs = riskStyle[risk];
              const isActive = filter === risk;
              const isHov = hoveredCard === risk;
              return (
                <div
                  key={risk}
                  onClick={() => setFilter(risk === filter ? "all" : risk)}
                  onMouseEnter={() => setHoveredCard(risk)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    background: isActive
                      ? rs.bg
                      : "var(--color-background-primary)",
                    border: `1.5px solid ${isActive ? rs.dot : isHov ? rs.border : "var(--color-border-secondary)"}`,
                    borderRadius: 14,
                    padding: "1.1rem 1.3rem",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                    boxShadow: isActive
                      ? `0 4px 16px ${rs.bg}`
                      : isHov
                        ? "var(--shadow-md)"
                        : "var(--shadow-sm)",
                    transform:
                      isHov && !isActive ? "translateY(-1px)" : "translateY(0)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: rs.dot,
                        animation: isActive
                          ? "pulseDot 1.5s ease-in-out infinite"
                          : "none",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: isActive
                          ? rs.text
                          : "var(--color-text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {rs.label}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 32,
                      fontWeight: 800,
                      color: isActive ? rs.text : "var(--color-text-primary)",
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                    }}
                  >
                    {counts[risk]}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-secondary)",
                      marginTop: 4,
                    }}
                  >
                    estimate{counts[risk] !== 1 ? "s" : ""}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Filter pills */}
        <div style={{ display: "flex", gap: 6, marginBottom: "1.25rem" }}>
          {(["all", "high", "medium", "low"] as const).map((f) => {
            const isActive = filter === f;
            const rs = f !== "all" ? riskStyle[f] : null;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 20,
                  border: "1.5px solid",
                  borderColor: isActive
                    ? rs
                      ? rs.dot
                      : "var(--color-accent)"
                    : "var(--color-border-secondary)",
                  background: isActive
                    ? rs
                      ? rs.bg
                      : "var(--color-accent)"
                    : "var(--color-background-primary)",
                  color: isActive
                    ? rs
                      ? rs.text
                      : "#fff"
                    : "var(--color-text-secondary)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  textTransform: "capitalize",
                }}
              >
                {f === "all" ? `All (${counts.all})` : `${f} (${counts[f]})`}
              </button>
            );
          })}
        </div>

        {/* Claims table */}
        <div
          style={{
            background: "var(--color-background-primary)",
            border: "1px solid var(--color-border-secondary)",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {loading ? (
            <div style={{ padding: "4rem", textAlign: "center" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "3px solid var(--color-border-secondary)",
                  borderTopColor: "var(--color-accent)",
                  animation: "spin 0.7s linear infinite",
                  margin: "0 auto 12px",
                }}
              />
              <p
                style={{
                  fontSize: 14,
                  color: "var(--color-text-secondary)",
                  margin: 0,
                }}
              >
                Loading claims…
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "4.5rem 2rem",
                animation: "fadeIn 0.3s ease",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  background: "var(--color-accent-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <svg
                  width="28"
                  height="28"
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="1.6"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                  marginBottom: 6,
                }}
              >
                {history.length === 0
                  ? "No claims yet"
                  : `No ${filter}-risk claims`}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "var(--color-text-secondary)",
                  maxWidth: 340,
                  margin: "0 auto 22px",
                }}
              >
                {history.length === 0
                  ? "Run insurance estimates to see claim risk assessments here."
                  : `There are no ${filter}-risk estimates in your history.`}
              </div>
              {history.length === 0 && (
                <a
                  href="/dashboard/estimates"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 24px",
                    background: "linear-gradient(135deg, #0f766e, #0d9488)",
                    color: "#fff",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: "none",
                    boxShadow: "0 4px 14px rgba(15,118,110,0.3)",
                  }}
                >
                  Run an estimate →
                </a>
              )}
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
                  {[
                    "CDT Code",
                    "Coverage",
                    "Patient pays",
                    "Insurer pays",
                    "Risk",
                    "Risk factors",
                    "Date",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "11px 14px",
                        textAlign: h === "Actions" ? "right" : "left",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--color-text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedHistory.map((item, idx) => {
                  const rs =
                    riskStyle[item.claim_risk as keyof typeof riskStyle] ??
                    riskStyle.low;
                  const isHov = hoveredRow === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() =>
                        (window.location.href = `/dashboard/claims/${item.id}`)
                      }
                      onMouseEnter={() => setHoveredRow(item.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        borderBottom: "1px solid var(--color-border-tertiary)",
                        background: isHov
                          ? "var(--color-accent-muted)"
                          : idx % 2 === 1
                            ? "var(--color-background-secondary)"
                            : "transparent",
                        transition: "background 0.12s ease",
                        cursor: "pointer",
                      }}
                    >
                      <td style={{ padding: "13px 14px" }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            fontSize: 13,
                            color: "var(--color-text-primary)",
                            background: "var(--color-background-secondary)",
                            padding: "3px 8px",
                            borderRadius: 6,
                            border: "1px solid var(--color-border-secondary)",
                          }}
                        >
                          {item.cdt_code}
                        </span>
                      </td>
                      <td style={{ padding: "13px 14px" }}>
                        <span
                          style={{
                            color: "var(--color-accent)",
                            fontWeight: 700,
                            fontSize: 15,
                          }}
                        >
                          {item.coverage_percent}%
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "13px 14px",
                          fontWeight: 700,
                          color: "var(--color-text-primary)",
                        }}
                      >
                        $
                        {(item.patient_cost || 0).toLocaleString("en-CA", {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                      <td
                        style={{
                          padding: "13px 14px",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        $
                        {(item.insurer_pays || 0).toLocaleString("en-CA", {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                      <td style={{ padding: "13px 14px" }}>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "4px 10px",
                            borderRadius: 20,
                            background: rs.bg,
                            color: rs.text,
                            fontWeight: 700,
                            textTransform: "capitalize",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            border: `1px solid ${rs.border}`,
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: rs.dot,
                              display: "inline-block",
                              animation:
                                item.claim_risk === "high"
                                  ? "pulseDot 1.2s ease-in-out infinite"
                                  : "none",
                            }}
                          />
                          {item.claim_risk}
                        </span>
                      </td>
                      <td style={{ padding: "13px 14px", maxWidth: 200 }}>
                        {item.plain_explanation ? (
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--color-text-secondary)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: 200,
                            }}
                            title={item.plain_explanation}
                          >
                            {item.plain_explanation}
                          </div>
                        ) : (
                          <span style={{ color: "var(--color-text-tertiary)" }}>
                            —
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "13px 14px",
                          color: "var(--color-text-secondary)",
                          fontSize: 12,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {timeAgo(item.created_at)}
                      </td>
                      <td style={{ padding: "13px 14px", textAlign: "right" }}>
                        {(item.claim_risk === "high" ||
                          item.claim_risk === "medium") &&
                          (tenant?.plan === "starter" ? (
                            <span
                              style={{
                                fontSize: 11,
                                padding: "3px 10px",
                                borderRadius: 20,
                                background: "rgba(14,116,144,0.08)",
                                color: "#0e7490",
                                fontWeight: 600,
                                border: "1px solid rgba(14,116,144,0.15)",
                              }}
                            >
                              Pro only
                            </span>
                          ) : (
                            <button
                              onClick={() => openPreAuth(item)}
                              style={{
                                padding: "6px 14px",
                                borderRadius: 8,
                                border:
                                  "1.5px solid var(--color-accent-subtle)",
                                background: "var(--color-accent-muted)",
                                color: "var(--color-accent)",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                transition: "all 0.15s",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                              }}
                              onMouseEnter={(e) => {
                                const el = e.currentTarget as HTMLButtonElement;
                                el.style.background = "var(--color-accent)";
                                el.style.color = "#fff";
                                el.style.transform = "translateY(-1px)";
                                el.style.boxShadow =
                                  "0 4px 12px rgba(15,118,110,0.3)";
                              }}
                              onMouseLeave={(e) => {
                                const el = e.currentTarget as HTMLButtonElement;
                                el.style.background =
                                  "var(--color-accent-muted)";
                                el.style.color = "var(--color-accent)";
                                el.style.transform = "translateY(0)";
                                el.style.boxShadow = "none";
                              }}
                            >
                              ✨ Pre-auth
                            </button>
                          ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Pagination Controls */}
          {!loading && filtered.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "var(--color-background-primary)",
                borderTop: "1px solid var(--color-border-secondary)",
              }}
            >
              <div
                style={{ fontSize: 13, color: "var(--color-text-secondary)" }}
              >
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, filtered.length)} of{" "}
                {filtered.length} claims
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--color-border-secondary)",
                    background:
                      currentPage === 1
                        ? "var(--color-background-secondary)"
                        : "var(--color-background-primary)",
                    color:
                      currentPage === 1
                        ? "var(--color-text-tertiary)"
                        : "var(--color-text-primary)",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  Previous
                </button>
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-primary)",
                    fontWeight: 500,
                  }}
                >
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--color-border-secondary)",
                    background:
                      currentPage === totalPages
                        ? "var(--color-background-secondary)"
                        : "var(--color-background-primary)",
                    color:
                      currentPage === totalPages
                        ? "var(--color-text-tertiary)"
                        : "var(--color-text-primary)",
                    cursor:
                      currentPage === totalPages ? "not-allowed" : "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pre-auth modal */}
      {narrativeTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            backdropFilter: "blur(6px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setNarrativeTarget(null);
              setNarrativeText(null);
            }
          }}
        >
          <div
            style={{
              background: "var(--color-background-primary)",
              borderRadius: 20,
              width: "100%",
              maxWidth: 580,
              boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
              maxHeight: "90vh",
              overflowY: "auto",
              border: "1px solid var(--color-border-secondary)",
              animation: "slideIn 0.25s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {/* Modal header */}
            <div
              style={{
                padding: "1.25rem 1.75rem",
                borderBottom: "1px solid var(--color-border-secondary)",
                background:
                  "linear-gradient(135deg, var(--color-background-secondary) 0%, var(--color-accent-muted) 100%)",
                borderRadius: "20px 20px 0 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "linear-gradient(135deg, #0f766e, #0d9488)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                  }}
                >
                  ✨
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    Pre-authorization Letter
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-secondary)",
                      marginTop: 1,
                    }}
                  >
                    Procedure:{" "}
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontWeight: 700,
                        color: "var(--color-accent)",
                      }}
                    >
                      {narrativeTarget.cdt_code}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setNarrativeTarget(null);
                  setNarrativeText(null);
                }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: "1px solid var(--color-border-secondary)",
                  background: "var(--color-background-primary)",
                  color: "var(--color-text-secondary)",
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "1.5rem 1.75rem" }}>
              <div style={{ marginBottom: "1.2rem" }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-text-secondary)",
                    display: "block",
                    marginBottom: 5,
                  }}
                >
                  Insurer (for letter addressing)
                </label>
                <select
                  value={insurer}
                  onChange={(e) => setInsurer(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1.5px solid var(--color-border-secondary)",
                    borderRadius: 9,
                    fontSize: 14,
                    color: "var(--color-text-primary)",
                    background: "var(--color-input-bg)",
                    outline: "none",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-accent)";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px var(--color-accent-subtle)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      "var(--color-border-secondary)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {INSURERS.map((ins) => (
                    <option key={ins} value={ins}>
                      {ins}
                    </option>
                  ))}
                </select>
              </div>

              {!narrativeText ? (
                <button
                  onClick={() => generateNarrative()}
                  disabled={narrativeLoading}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: 10,
                    border: "none",
                    background: narrativeLoading
                      ? "var(--color-text-secondary)"
                      : "linear-gradient(135deg, #0f766e, #0d9488)",
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: narrativeLoading ? "not-allowed" : "pointer",
                    boxShadow: narrativeLoading
                      ? "none"
                      : "0 4px 14px rgba(15,118,110,0.3)",
                    transition: "all 0.18s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {narrativeLoading ? (
                    <>
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          border: "2px solid rgba(255,255,255,0.3)",
                          borderTopColor: "#fff",
                          animation: "spin 0.7s linear infinite",
                        }}
                      />
                      Generating letter…
                    </>
                  ) : (
                    <>✨ Generate pre-auth letter with AI</>
                  )}
                </button>
              ) : (
                <div>
                  <textarea
                    value={narrativeText}
                    onChange={(e) => setNarrativeText(e.target.value)}
                    style={{
                      width: "100%",
                      height: 200,
                      padding: "14px",
                      borderRadius: 10,
                      border: "1.5px solid var(--color-border-secondary)",
                      background: "var(--color-input-bg)",
                      color: "var(--color-text-primary)",
                      fontSize: 13,
                      fontFamily: "inherit",
                      resize: "vertical",
                      lineHeight: 1.7,
                      outline: "none",
                      boxSizing: "border-box",
                      marginBottom: 12,
                      transition: "all 0.15s",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-accent)";
                      e.currentTarget.style.boxShadow =
                        "0 0 0 3px var(--color-accent-subtle)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor =
                        "var(--color-border-secondary)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={() => setShowPdfModal(true)}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: 9,
                        border: "1.5px solid var(--color-border-secondary)",
                        background: "var(--color-background-secondary)",
                        color: "var(--color-text-primary)",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <FileText size={15} /> View PDF
                    </button>
                    <button
                      onClick={() => setNarrativeText(null)}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: 9,
                        border: "1.5px solid var(--color-border-secondary)",
                        background: "transparent",
                        color: "var(--color-text-secondary)",
                        fontSize: 13,
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      Discard
                    </button>
                    <button
                      onClick={copyNarrative}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: 9,
                        border: "none",
                        background: copied
                          ? "linear-gradient(135deg, #059669, #10b981)"
                          : "linear-gradient(135deg, #0f766e, #0d9488)",
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        minWidth: 140,
                        boxShadow: "0 4px 12px rgba(15,118,110,0.25)",
                      }}
                    >
                      {copied ? "✓ Copied!" : "Copy Text"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
