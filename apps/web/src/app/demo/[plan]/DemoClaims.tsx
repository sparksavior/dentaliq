"use client";

import { useState, useEffect } from "react";

const riskStyle = {
  low: {
    bg: "rgba(16, 185, 129, 0.1)",
    text: "#10b981",
    dot: "#10b981",
    label: "Low risk",
  },
  medium: {
    bg: "rgba(245, 158, 11, 0.1)",
    text: "#f59e0b",
    dot: "#f59e0b",
    label: "Medium risk",
  },
  high: {
    bg: "rgba(239, 68, 68, 0.1)",
    text: "#ef4444",
    dot: "#ef4444",
    label: "High risk",
  },
};

const DUMMY_HISTORY = [
  {
    id: "1",
    cdt_code: "D2750",
    coverage_percent: 50,
    patient_cost: 675,
    insurer_pays: 675,
    claim_risk: "high",
    plain_explanation: "Pre-authorization required for major restorative work.",
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    cdt_code: "D4341",
    coverage_percent: 80,
    patient_cost: 50,
    insurer_pays: 198,
    claim_risk: "low",
    plain_explanation: "",
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "3",
    cdt_code: "D6010",
    coverage_percent: 50,
    patient_cost: 1400,
    insurer_pays: 1400,
    claim_risk: "high",
    plain_explanation: "Implants often require narrative justification.",
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
];

export default function DemoClaims({ planName }: { planName: string }) {
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">(
    "all",
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  const counts = {
    all: DUMMY_HISTORY.length,
    high: DUMMY_HISTORY.filter((h) => h.claim_risk === "high").length,
    medium: 0,
    low: DUMMY_HISTORY.filter((h) => h.claim_risk === "low").length,
  };

  const filtered =
    filter === "all"
      ? DUMMY_HISTORY
      : DUMMY_HISTORY.filter((h) => h.claim_risk === filter);

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: 1100,
        margin: "0 auto",
        color: "var(--color-text-primary)",
      }}
    >
      <div style={{ marginBottom: "1.5rem" }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--color-text-primary)",
            letterSpacing: "-0.03em",
            marginBottom: 4,
          }}
        >
          Claims
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
          Review estimate risk flags and draft pre-authorization letters.
        </p>
      </div>

      {!loading && (
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
            return (
              <div
                key={risk}
                onClick={() => setFilter(risk === filter ? "all" : risk)}
                style={{
                  background:
                    filter === risk ? rs.bg : "var(--color-background-primary)",
                  border: `1.5px solid ${filter === risk ? rs.dot : "var(--color-border-secondary)"}`,
                  borderRadius: 12,
                  padding: "1rem 1.2rem",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: rs.dot,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color:
                        filter === risk
                          ? rs.text
                          : "var(--color-text-secondary)",
                      textTransform: "capitalize",
                    }}
                  >
                    {rs.label}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color:
                      filter === risk ? rs.text : "var(--color-text-primary)",
                  }}
                >
                  {counts[risk]}
                </div>
                <div
                  style={{ fontSize: 12, color: "var(--color-text-secondary)" }}
                >
                  estimate{counts[risk] !== 1 ? "s" : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: "1.2rem" }}>
        {(["all", "high", "medium", "low"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 16px",
              borderRadius: 20,
              border: "1.5px solid",
              borderColor:
                filter === f
                  ? "var(--color-accent)"
                  : "var(--color-border-secondary)",
              background:
                filter === f
                  ? "var(--color-accent)"
                  : "var(--color-background-primary)",
              color: filter === f ? "#fff" : "var(--color-text-secondary)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {f === "all" ? `All (${counts.all})` : `${f} (${counts[f]})`}
          </button>
        ))}
      </div>

      <div
        style={{
          background: "var(--color-background-primary)",
          border: "1px solid var(--color-border-secondary)",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
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
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const rs = riskStyle[item.claim_risk as keyof typeof riskStyle];
              return (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: "1px solid var(--color-border-tertiary)",
                  }}
                >
                  <td
                    style={{
                      padding: "12px 14px",
                      fontWeight: 700,
                      fontFamily: "monospace",
                    }}
                  >
                    {item.cdt_code}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      color: "var(--color-accent)",
                      fontWeight: 600,
                    }}
                  >
                    {item.coverage_percent}%
                  </td>
                  <td style={{ padding: "12px 14px", fontWeight: 600 }}>
                    ${item.patient_cost}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    ${item.insurer_pays}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "3px 9px",
                        borderRadius: 20,
                        background: rs.bg,
                        color: rs.text,
                        fontWeight: 600,
                        textTransform: "capitalize",
                      }}
                    >
                      {item.claim_risk}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    {(item.claim_risk === "high" ||
                      item.claim_risk === "medium") &&
                      (planName === "starter" ? (
                        <span
                          style={{
                            fontSize: 11,
                            padding: "3px 8px",
                            borderRadius: 20,
                            background: "rgba(14,116,144,0.08)",
                            color: "#0e7490",
                            fontWeight: 500,
                          }}
                        >
                          Pro only
                        </span>
                      ) : (
                        <button
                          style={{
                            padding: "5px 12px",
                            borderRadius: 7,
                            border: "1px solid var(--color-border-secondary)",
                            background: "var(--color-background-primary)",
                            color: "var(--color-accent)",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
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
      </div>
    </div>
  );
}
