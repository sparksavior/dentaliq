"use client";

import { useState, useEffect } from "react";
import { FileText } from "lucide-react";

const INSURERS = [
  "Sun Life Financial",
  "Manulife",
  "Canada Life",
  "Green Shield Canada",
  "Desjardins",
  "OTIP/RAEO",
  "Empire Life",
];

const FALLBACK_CDT = [
  {
    code: "D1110",
    description: "Prophylaxis (adult)",
    category: "preventive",
    typicalFee: 115,
    requiresPreAuth: false,
  },
  {
    code: "D2750",
    description: "Crown — porcelain fused to metal",
    category: "major",
    typicalFee: 1350,
    requiresPreAuth: true,
  },
  {
    code: "D4341",
    description: "Periodontal scaling",
    category: "basic",
    typicalFee: 248,
    requiresPreAuth: false,
  },
  {
    code: "D6010",
    description: "Implant placement",
    category: "implant",
    typicalFee: 2800,
    requiresPreAuth: true,
  },
];

function SearchableSelect({ options, value, onChange, placeholder }: any) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "10px 14px",
        border: "1.5px solid var(--color-border-secondary)",
        borderRadius: 10,
        fontSize: 14,
        color: "var(--color-text-primary)",
        background: "var(--color-background-primary)",
        outline: "none",
        cursor: "pointer",
      }}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((o: any) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export default function DemoEstimates({ planName }: { planName: string }) {
  const [cdt, setCdt] = useState("D1110");
  const [insurer, setInsurer] = useState("Sun Life Financial");
  const [patientId, setPatientId] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [narrativeText, setNarrativeText] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);

  const runEstimate = () => {
    setEstimating(true);
    setResult(null);
    setNarrativeText(null);

    setTimeout(() => {
      const found = FALLBACK_CDT.find((c) => c.code === cdt) || FALLBACK_CDT[0];
      const pct =
        found.category === "preventive"
          ? 100
          : found.category === "basic"
            ? 80
            : 50;
      setResult({
        cdtCode: found.code,
        coveragePercent: pct,
        patientCost: Math.round(found.typicalFee * (1 - pct / 100)),
        insurerPays: Math.round((found.typicalFee * pct) / 100),
        plainExplanation:
          planName === "starter"
            ? "Start the estimate service for AI-powered explanations."
            : `The ${found.description} procedure is considered a ${found.category} service, typically covered at ${pct}% by ${insurer}.`,
        claimRisk: found.requiresPreAuth ? "medium" : "low",
        riskReasons: found.requiresPreAuth
          ? ["Pre-authorization required for this procedure"]
          : [],
      });
      setEstimating(false);
    }, 1200);
  };

  const draftAI = () => {
    setNarrativeLoading(true);
    setTimeout(() => {
      setNarrativeText(
        `[SIMULATED DEMO] Pre-authorization request for ${cdt}.\n\nPatient requires this procedure due to clinical necessity as outlined in recent X-rays. Please advise on coverage availability under their current plan.`,
      );
      setNarrativeLoading(false);
    }, 1500);
  };

  const riskStyle = {
    low: { bg: "rgba(16, 185, 129, 0.1)", text: "#10b981", label: "Low Risk" },
    medium: {
      bg: "rgba(245, 158, 11, 0.1)",
      text: "#f59e0b",
      label: "Medium Risk",
    },
    high: { bg: "rgba(239, 68, 68, 0.1)", text: "#ef4444", label: "High Risk" },
  };

  const rs = result
    ? riskStyle[result.claimRisk as keyof typeof riskStyle]
    : null;

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: 1200,
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
          Cost Estimator
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
          {planName !== "starter"
            ? "AI-powered explanations loaded."
            : "Using fallback rules for Demo Starter."}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <div
            style={{
              background: "var(--color-background-primary)",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: 14,
              padding: "1.5rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--color-text-primary)",
                marginBottom: "1.2rem",
              }}
            >
              Run an estimate
            </h2>

            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--color-text-secondary)",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                Patient (optional)
              </label>
              <SearchableSelect
                options={[
                  { label: "Sarah Chen", value: "1" },
                  { label: "Emily Rodriguez", value: "2" },
                ]}
                value={patientId}
                onChange={setPatientId}
                placeholder="Select patient..."
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--color-text-secondary)",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                CDT procedure code
              </label>
              <SearchableSelect
                options={FALLBACK_CDT.map((c) => ({
                  label: `${c.code} — ${c.description}`,
                  value: c.code,
                }))}
                value={cdt}
                onChange={setCdt}
                placeholder="Select CDT..."
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--color-text-secondary)",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                Insurance provider
              </label>
              <SearchableSelect
                options={INSURERS.map((ins) => ({ label: ins, value: ins }))}
                value={insurer}
                onChange={setInsurer}
                placeholder="Select insurer..."
              />
            </div>

            <button
              onClick={runEstimate}
              disabled={estimating}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                border: "none",
                background: estimating
                  ? "var(--color-text-secondary)"
                  : "linear-gradient(135deg, #0f766e, #0d9488)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                cursor: estimating ? "not-allowed" : "pointer",
              }}
            >
              {estimating ? "Calculating…" : "Run estimate →"}
            </button>
          </div>

          {result && rs && (
            <div
              style={{
                background: "var(--color-background-primary)",
                border: "1px solid var(--color-border-secondary)",
                borderRadius: 14,
                padding: "1.5rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    background: "var(--color-accent-muted)",
                    borderRadius: 10,
                    padding: "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--color-accent)",
                      marginBottom: 4,
                    }}
                  >
                    Coverage
                  </div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 700,
                      color: "var(--color-accent)",
                    }}
                  >
                    {result.coveragePercent}%
                  </div>
                </div>
                <div
                  style={{
                    background: "var(--color-background-secondary)",
                    borderRadius: 10,
                    padding: "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--color-text-secondary)",
                      marginBottom: 4,
                    }}
                  >
                    Patient pays
                  </div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 700,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    ${result.patientCost}
                  </div>
                </div>
                <div
                  style={{
                    background: rs.bg,
                    borderRadius: 10,
                    padding: "12px",
                  }}
                >
                  <div
                    style={{ fontSize: 11, color: rs.text, marginBottom: 4 }}
                  >
                    Claim risk
                  </div>
                  <div
                    style={{ fontSize: 15, fontWeight: 700, color: rs.text }}
                  >
                    {rs.label}
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "var(--color-background-secondary)",
                  borderRadius: 10,
                  padding: "12px",
                  marginBottom: result.riskReasons.length > 0 ? "0.8rem" : 0,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--color-text-secondary)",
                    marginBottom: 4,
                    fontWeight: 500,
                  }}
                >
                  Plain-language explanation
                </div>
                <div
                  style={{ fontSize: 14, color: "var(--color-text-primary)" }}
                >
                  {result.plainExplanation}
                </div>
              </div>

              {result.riskReasons.length > 0 && (
                <div
                  style={{
                    background: "rgba(245, 158, 11, 0.1)",
                    border: "1px solid rgba(245, 158, 11, 0.2)",
                    borderRadius: 10,
                    padding: "12px",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#f59e0b",
                      marginBottom: 8,
                    }}
                  >
                    Claim risk checklist
                  </div>
                  {result.riskReasons.map((r: string, i: number) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 13,
                        color: "var(--color-text-primary)",
                        marginBottom: 4,
                        display: "flex",
                        gap: 6,
                      }}
                    >
                      <span style={{ color: "#f59e0b" }}>⚠</span> {r}
                    </div>
                  ))}
                </div>
              )}

              <div
                style={{
                  borderTop: "1px solid var(--color-border-tertiary)",
                  paddingTop: "1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: narrativeText ? 10 : 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    Pre-authorization letter
                  </div>
                  {!narrativeText &&
                    (planName === "starter" ? (
                      <span
                        style={{
                          fontSize: 12,
                          padding: "4px 10px",
                          borderRadius: 20,
                          background: "rgba(14,116,144,0.08)",
                          color: "#0e7490",
                          fontWeight: 500,
                        }}
                      >
                        Pro feature
                      </span>
                    ) : (
                      <button
                        onClick={draftAI}
                        disabled={narrativeLoading}
                        style={{
                          padding: "7px 14px",
                          borderRadius: 8,
                          border: "1px solid var(--color-border-secondary)",
                          background: "var(--color-background-secondary)",
                          color: "var(--color-text-primary)",
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        {narrativeLoading ? "Generating…" : "✨ Draft with AI"}
                      </button>
                    ))}
                </div>
                {narrativeText && (
                  <textarea
                    value={narrativeText}
                    readOnly
                    style={{
                      width: "100%",
                      height: 120,
                      padding: "12px",
                      borderRadius: 10,
                      border: "1px solid var(--color-border-secondary)",
                      background: "var(--color-input-bg)",
                      color: "var(--color-text-primary)",
                      fontSize: 13,
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            background: "var(--color-background-primary)",
            border: "1px solid var(--color-border-secondary)",
            borderRadius: 14,
            padding: "1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <h2
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--color-text-primary)",
              marginBottom: "1rem",
            }}
          >
            Estimate history
          </h2>
          <div style={{ textAlign: "center", padding: "3rem 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--color-text-primary)",
                marginBottom: 6,
              }}
            >
              History simulated
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              Run an estimate on the left to test the flow.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
