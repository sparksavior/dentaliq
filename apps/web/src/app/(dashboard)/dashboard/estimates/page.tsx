"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Download } from "lucide-react";
import { exportToCsv } from "@/lib/export";
import { useAuth } from "@/contexts/auth-context";
import { useClinic } from "@/contexts/clinic-context";
import {
  estimateApi,
  patientsApi,
  tenantsApi,
  type Tenant,
  type EstimateResult,
  type CdtCodeSummary,
  type Patient,
  type EstimateHistoryItem,
} from "@/lib/api";
import PreAuthPdfModal from "@/components/PreAuthPdfModal";
import PasswordPromptModal from "@/components/PasswordPromptModal";

const FALLBACK_CDT: CdtCodeSummary[] = [
  {
    code: "D1110",
    description: "Prophylaxis (adult)",
    category: "preventive",
    typicalFee: 115,
    requiresPreAuth: false,
  },
  {
    code: "D1120",
    description: "Prophylaxis (child)",
    category: "preventive",
    typicalFee: 80,
    requiresPreAuth: false,
  },
  {
    code: "D2393",
    description: "Composite resin — 3 surfaces",
    category: "basic",
    typicalFee: 248,
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
  {
    code: "D7140",
    description: "Extraction — erupted tooth",
    category: "basic",
    typicalFee: 155,
    requiresPreAuth: false,
  },
  {
    code: "D8080",
    description: "Orthodontics — adolescent",
    category: "ortho",
    typicalFee: 5800,
    requiresPreAuth: true,
  },
];

const INSURERS = [
  "Sun Life Financial",
  "Manulife",
  "Canada Life",
  "Green Shield Canada",
  "Desjardins",
  "OTIP/RAEO",
  "Empire Life",
];

const riskStyle = {
  low: {
    bg: "rgba(16, 185, 129, 0.1)",
    text: "#10b981",
    border: "rgba(16,185,129,0.25)",
    label: "Low Risk",
    dot: "#10b981",
  },
  medium: {
    bg: "rgba(245, 158, 11, 0.1)",
    text: "#f59e0b",
    border: "rgba(245,158,11,0.25)",
    label: "Medium Risk",
    dot: "#f59e0b",
  },
  high: {
    bg: "rgba(239, 68, 68, 0.1)",
    text: "#ef4444",
    border: "rgba(239,68,68,0.25)",
    label: "High Risk",
    dot: "#ef4444",
  },
};

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div style={{ position: "relative" }}>
      <input
        value={open ? query : selectedLabel}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
          setFocused(true);
        }}
        onBlur={() => {
          setTimeout(() => {
            setOpen(false);
            setQuery("");
          }, 150);
          setFocused(false);
        }}
        onKeyDown={(e) => {
          if (
            (e.key === "Enter" || e.key === "Tab") &&
            open &&
            filtered.length > 0
          ) {
            onChange(filtered[0].value);
            setOpen(false);
            setQuery("");
            if (e.key === "Enter") e.preventDefault();
          }
        }}
        style={{
          width: "100%",
          padding: "11px 14px",
          border: `1.5px solid ${focused ? "var(--color-accent)" : "var(--color-border-secondary)"}`,
          borderRadius: 10,
          fontSize: 14,
          color: "var(--color-text-primary)",
          background: "var(--color-background-primary)",
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color 0.15s, box-shadow 0.15s",
          boxShadow: focused ? "0 0 0 3px var(--color-accent-subtle)" : "none",
        }}
      />
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            maxHeight: 220,
            overflowY: "auto",
            background: "var(--color-background-primary)",
            border: "1px solid var(--color-border-secondary)",
            borderRadius: 12,
            zIndex: 50,
            boxShadow: "0 12px 36px rgba(0,0,0,0.15)",
            animation: "slideUpIn 0.15s ease-out",
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "12px 14px",
                fontSize: 13,
                color: "var(--color-text-secondary)",
              }}
            >
              No matches
            </div>
          ) : (
            filtered.map((o) => (
              <div
                key={o.value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={{
                  padding: "10px 14px",
                  fontSize: 14,
                  cursor: "pointer",
                  background:
                    value === o.value
                      ? "var(--color-accent-muted)"
                      : "transparent",
                  color:
                    value === o.value
                      ? "var(--color-accent)"
                      : "var(--color-text-primary)",
                  fontWeight: value === o.value ? 600 : 400,
                  borderBottom: "1px solid var(--color-border-tertiary)",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (value !== o.value)
                    e.currentTarget.style.background =
                      "var(--color-background-secondary)";
                }}
                onMouseLeave={(e) => {
                  if (value !== o.value)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                {o.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function EstimatesPage() {
  const { accessToken } = useAuth();
  const [cdtCodes, setCdtCodes] = useState<CdtCodeSummary[]>(FALLBACK_CDT);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [history, setHistory] = useState<EstimateHistoryItem[]>([]);
  const [liveMode, setLiveMode] = useState(false);

  const [cdt, setCdt] = useState("D1110");
  const [insurer, setInsurer] = useState("Sun Life Financial");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [narrativeText, setNarrativeText] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const itemsPerPage = 20;

  const { selectedClinicId } = useClinic();
  const load = useCallback(async () => {
    if (!accessToken) return;
    const [codes, pts, hist, t] = await Promise.all([
      estimateApi.getCodes(accessToken).catch(() => null),
      patientsApi.getPatients(accessToken).catch(() => [] as Patient[]),
      estimateApi
        .getHistory(accessToken)
        .catch(() => [] as EstimateHistoryItem[]),
      tenantsApi.getTenant(accessToken).catch(() => null),
    ]);
    if (codes) {
      setCdtCodes(codes);
      setLiveMode(true);
    }
    setPatients(pts);
    setHistory(hist);
    setTenant(t);
    setDataLoaded(true);
  }, [accessToken, selectedClinicId]);

  useEffect(() => {
    load();
  }, [load, selectedClinicId]);

  const runEstimate = async () => {
    setEstimating(true);
    setResult(null);
    setError(null);
    setNarrativeText(null);
    if (!accessToken || !liveMode) {
      await new Promise((r) => setTimeout(r, 400));
      const found = FALLBACK_CDT.find((c) => c.code === cdt);
      if (found) {
        const pct =
          found.category === "preventive"
            ? 100
            : found.category === "basic"
              ? 80
              : found.category === "major"
                ? 50
                : 0;
        setResult({
          id: "static",
          cdtCode: found.code,
          coveragePercent: pct,
          patientCost: Math.round(found.typicalFee * (1 - pct / 100)),
          insurerPays: Math.round((found.typicalFee * pct) / 100),
          plainExplanation:
            "Start the estimate service for AI-powered explanations.",
          claimRisk: found.requiresPreAuth ? "medium" : "low",
          riskReasons: found.requiresPreAuth
            ? ["Pre-authorization required for this procedure"]
            : [],
          confidenceScore: 0.6,
        });
      }
      setEstimating(false);
      return;
    }
    try {
      let age: number | undefined;
      if (selectedPatientId) {
        const p = patients.find((p) => p.id === selectedPatientId);
        if (p?.date_of_birth)
          age = Math.floor(
            (Date.now() - new Date(p.date_of_birth).getTime()) / 31557600000,
          );
      }
      const data = await estimateApi.runEstimate(accessToken, {
        cdtCode: cdt,
        insurerName: insurer,
        patientId: selectedPatientId || undefined,
        patientAge: age,
      });
      setResult(data);
      estimateApi
        .getHistory(accessToken)
        .then(setHistory)
        .catch(() => {});
    } catch (err: any) {
      setError(err.message ?? "Estimate failed");
    } finally {
      setEstimating(false);
    }
  };

  const generateNarrative = async (revisionInstructions?: string | any) => {
    if (!accessToken || !result) return;
    setNarrativeLoading(true);
    const instructions =
      typeof revisionInstructions === "string"
        ? revisionInstructions
        : undefined;
    try {
      const p = patients.find((pt) => pt.id === selectedPatientId);
      const patientAge = p?.date_of_birth
        ? Math.floor(
            (Date.now() - new Date(p.date_of_birth).getTime()) / 31557600000,
          )
        : undefined;
      const text = await estimateApi.generateNarrative(accessToken, {
        cdtCode: result.cdtCode,
        insurerName: insurer,
        patientName: p ? `${p.first_name} ${p.last_name}` : undefined,
        patientAge,
        previousNarrative: narrativeText || undefined,
        revisionInstructions: instructions,
      });
      setNarrativeText(text);
      setShowPdfModal(true);
    } catch (err: any) {
      setError(
        "Failed to generate narrative: " + (err.message ?? "Unknown error"),
      );
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

  const rs = result
    ? (riskStyle[result.claimRisk as keyof typeof riskStyle] ?? riskStyle.low)
    : null;
  const patientObj = patients.find((p) => p.id === selectedPatientId);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-background-primary)",
        color: "var(--color-text-primary)",
      }}
    >
      {showPasswordPrompt && (
        <PasswordPromptModal
          onSuccess={() => {
            setShowPasswordPrompt(false);
            exportToCsv(
              `estimates-${new Date().toISOString().slice(0, 10)}.csv`,
              [
                "Code",
                "Coverage %",
                "Patient Cost",
                "Insurer Pays",
                "Risk",
                "Patient",
                "Date",
              ],
              history.map((h) => [
                h.cdt_code,
                h.coverage_percent,
                h.patient_cost,
                h.insurer_pays,
                h.claim_risk,
                h.first_name && h.last_name
                  ? `${h.first_name} ${h.last_name}`
                  : "",
                h.created_at,
              ]),
            );
          }}
          onCancel={() => setShowPasswordPrompt(false)}
          actionLabel="export estimate history to CSV"
        />
      )}
      {showPdfModal && narrativeText && (
        <PreAuthPdfModal
          narrative={narrativeText}
          clinicName={tenant?.name || "Your Clinic"}
          insurerName={insurer}
          patientName={
            patientObj
              ? `${patientObj.first_name} ${patientObj.last_name}`
              : undefined
          }
          onClose={() => setShowPdfModal(false)}
          onRevise={async (instr) => {
            await generateNarrative(instr);
          }}
          onSave={async () => {
            if (
              !accessToken ||
              !result ||
              result.id === "static" ||
              !narrativeText
            )
              return;
            await estimateApi.saveLetter(accessToken, result.id, narrativeText);
            alert("Letter saved to patient profile!");
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
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.8"
            >
              <path d="M9 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3" />
              <path d="M9 15h3l8.5-8.5a1.5 1.5 0 0 0-3-3L9 12v3" />
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
              Cost Estimator
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "var(--color-text-secondary)",
                margin: "2px 0 0",
              }}
            >
              {liveMode
                ? `${cdtCodes.length} CDT codes · AI explanations active`
                : "Estimate service offline — fallback rules active"}
            </p>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 20,
            border: `1px solid ${liveMode ? "rgba(16,185,129,0.3)" : "var(--color-border-secondary)"}`,
            background: liveMode
              ? "rgba(16,185,129,0.08)"
              : "var(--color-background-secondary)",
            fontSize: 12,
            fontWeight: 600,
            color: liveMode ? "#10b981" : "var(--color-text-secondary)",
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: liveMode ? "#10b981" : "var(--color-text-secondary)",
              animation: liveMode ? "pulseDot 2s ease-in-out infinite" : "none",
            }}
          />
          {liveMode ? "Live" : "Offline"}
        </div>
      </div>

      <div
        style={{
          padding: "1.5rem 2rem",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
        }}
      >
        {/* Left: Estimator */}
        <div>
          {/* ── No-patient gate ── */}
          {dataLoaded && patients.length === 0 ? (
            <div
              style={{
                background: "var(--color-background-primary)",
                border: "1.5px dashed var(--color-border-secondary)",
                borderRadius: 16,
                padding: "2.5rem 2rem",
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: "rgba(13,148,136,0.1)",
                  border: "1.5px solid rgba(13,148,136,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                }}
              >
                🧑‍⚕️
              </div>
              <div>
                <h3
                  style={{
                    margin: "0 0 6px",
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Add a patient first
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "var(--color-text-secondary)",
                    lineHeight: 1.6,
                    maxWidth: 280,
                  }}
                >
                  Estimates are tied to patient records. Create your first
                  patient to unlock cost estimating.
                </p>
              </div>
              <a
                href="/dashboard/patients"
                style={{
                  marginTop: 4,
                  padding: "10px 22px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, #0f766e, #0d9488)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  boxShadow: "0 4px 14px rgba(15,118,110,0.3)",
                  display: "inline-block",
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform =
                    "translateY(-1px)";
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 6px 18px rgba(15,118,110,0.4)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "";
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 4px 14px rgba(15,118,110,0.3)";
                }}
              >
                Go to Patients →
              </a>
            </div>
          ) : (
            <div
              style={{
                background: "var(--color-background-primary)",
                border: "1px solid var(--color-border-secondary)",
                borderRadius: 16,
                padding: "1.5rem",
                boxShadow: "var(--shadow-sm)",
                marginBottom: 16,
                transition: "box-shadow 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.boxShadow = "var(--shadow-md)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.boxShadow = "var(--shadow-sm)")
              }
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: "1.25rem",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: "var(--color-accent)",
                  }}
                />
                <h2
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                    margin: 0,
                  }}
                >
                  Run an estimate
                </h2>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-text-secondary)",
                    display: "block",
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Patient{" "}
                  <span
                    style={{
                      fontWeight: 400,
                      textTransform: "none",
                      letterSpacing: 0,
                    }}
                  >
                    (optional)
                  </span>
                </label>
                <SearchableSelect
                  options={[
                    { label: "— No patient selected —", value: "" },
                    ...patients.map((p) => ({
                      label: `${p.first_name} ${p.last_name}`,
                      value: p.id,
                    })),
                  ]}
                  value={selectedPatientId}
                  onChange={(val) => {
                    setSelectedPatientId(val);
                    if (val) {
                      const p = patients.find((p) => p.id === val);
                      if (p?.insurance_plan_id) setInsurer(p.insurance_plan_id);
                    }
                  }}
                  placeholder="Search patient…"
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-text-secondary)",
                    display: "block",
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  CDT Procedure
                </label>
                <SearchableSelect
                  options={cdtCodes.map((c) => ({
                    label: `${c.code} — ${c.description}`,
                    value: c.code,
                  }))}
                  value={cdt}
                  onChange={setCdt}
                  placeholder="Search procedure…"
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-text-secondary)",
                    display: "block",
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Insurance Provider
                </label>
                <SearchableSelect
                  options={INSURERS.map((ins) => ({ label: ins, value: ins }))}
                  value={insurer}
                  onChange={setInsurer}
                  placeholder="Search provider…"
                />
              </div>

              {error && (
                <div
                  style={{
                    marginBottom: 14,
                    padding: "10px 14px",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 10,
                    fontSize: 13,
                    color: "#ef4444",
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                onClick={runEstimate}
                disabled={estimating}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  background: estimating
                    ? "var(--color-text-tertiary)"
                    : "linear-gradient(135deg, #0f766e, #0d9488)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: estimating ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  letterSpacing: "-0.01em",
                  boxShadow: estimating
                    ? "none"
                    : "0 4px 14px rgba(15,118,110,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  if (!estimating) {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow =
                      "0 6px 20px rgba(15,118,110,0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = estimating
                    ? "none"
                    : "0 4px 14px rgba(15,118,110,0.3)";
                }}
              >
                {estimating ? (
                  <>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: "2px solid rgba(255,255,255,0.35)",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                    Calculating…
                  </>
                ) : (
                  "Run Estimate →"
                )}
              </button>
            </div>
          )}{" "}
          {/* end no-patient gate */}
          {/* Result card */}
          {result && rs && (
            <div
              style={{
                background: "var(--color-background-primary)",
                border: "1px solid var(--color-border-secondary)",
                borderRadius: 16,
                padding: "1.5rem",
                boxShadow: "var(--shadow-sm)",
                animation: "slideUpIn 0.25s ease-out",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: rs.dot,
                  }}
                />
                <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
                  Estimate Result
                </h2>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    background:
                      "linear-gradient(135deg, var(--color-accent-muted), rgba(15,118,110,0.05))",
                    borderRadius: 12,
                    padding: "14px",
                    border: "1px solid rgba(15,118,110,0.15)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--color-accent)",
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Coverage
                  </div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: "var(--color-accent)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {result.coveragePercent}%
                  </div>
                </div>
                <div
                  style={{
                    background: "var(--color-background-secondary)",
                    borderRadius: 12,
                    padding: "14px",
                    border: "1px solid var(--color-border-secondary)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--color-text-secondary)",
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Patient Pays
                  </div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: "var(--color-text-primary)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    ${result.patientCost.toLocaleString()}
                  </div>
                </div>
                <div
                  style={{
                    background: rs.bg,
                    borderRadius: 12,
                    padding: "14px",
                    border: `1px solid ${rs.border}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: rs.text,
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Risk Level
                  </div>
                  <div
                    style={{ fontSize: 14, fontWeight: 800, color: rs.text }}
                  >
                    {rs.label}
                  </div>
                  <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
                    {["low", "medium", "high"].map((r) => (
                      <div
                        key={r}
                        style={{
                          flex: 1,
                          height: 3,
                          borderRadius: 2,
                          background:
                            result.claimRisk === r ||
                            (result.claimRisk === "high" && r !== "high") ||
                            (result.claimRisk === "medium" && r === "low")
                              ? rs.dot
                              : "var(--color-border-secondary)",
                          transition: "background 0.2s",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "var(--color-background-secondary)",
                  borderRadius: 12,
                  padding: "12px",
                  marginBottom: result.riskReasons.length > 0 ? "0.8rem" : 0,
                  border: "1px solid var(--color-border-tertiary)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--color-text-tertiary)",
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Plain-Language Explanation
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-primary)",
                    lineHeight: 1.65,
                  }}
                >
                  {result.plainExplanation}
                </div>
              </div>

              {result.riskReasons.length > 0 && (
                <div
                  style={{
                    background: "rgba(245,158,11,0.08)",
                    border: "1px solid rgba(245,158,11,0.2)",
                    borderRadius: 12,
                    padding: "12px",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#f59e0b",
                      marginBottom: 8,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Risk Flags
                  </div>
                  {result.riskReasons.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 13,
                        color: "var(--color-text-primary)",
                        marginBottom: 4,
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-start",
                      }}
                    >
                      <span
                        style={{
                          color: "#f59e0b",
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        ⚠
                      </span>{" "}
                      {r}
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
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth="2"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    Pre-auth Letter
                  </div>
                  {!narrativeText &&
                    (tenant?.plan === "starter" ? (
                      <span
                        style={{
                          fontSize: 11,
                          padding: "4px 10px",
                          borderRadius: 20,
                          background: "rgba(14,116,144,0.08)",
                          color: "#0e7490",
                          fontWeight: 600,
                        }}
                      >
                        Pro Feature
                      </span>
                    ) : (
                      <button
                        onClick={generateNarrative}
                        disabled={narrativeLoading}
                        style={{
                          padding: "7px 14px",
                          borderRadius: 8,
                          border: "1.5px solid var(--color-accent)",
                          background: "var(--color-accent-muted)",
                          color: "var(--color-accent)",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: narrativeLoading ? "not-allowed" : "pointer",
                          transition: "all 0.15s",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                        onMouseEnter={(e) => {
                          if (!narrativeLoading) {
                            e.currentTarget.style.background =
                              "var(--color-accent)";
                            e.currentTarget.style.color = "#fff";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            "var(--color-accent-muted)";
                          e.currentTarget.style.color = "var(--color-accent)";
                        }}
                      >
                        ✨ {narrativeLoading ? "Generating…" : "Draft with AI"}
                      </button>
                    ))}
                </div>
                {narrativeText && (
                  <div style={{ animation: "slideUpIn 0.2s ease-out" }}>
                    <textarea
                      value={narrativeText}
                      onChange={(e) => setNarrativeText(e.target.value)}
                      style={{
                        width: "100%",
                        height: 180,
                        padding: "12px",
                        borderRadius: 10,
                        border: "1.5px solid var(--color-border-secondary)",
                        background: "var(--color-input-bg)",
                        color: "var(--color-text-primary)",
                        fontSize: 13,
                        fontFamily: "inherit",
                        resize: "vertical",
                        lineHeight: 1.55,
                        outline: "none",
                        boxSizing: "border-box",
                        transition: "border-color 0.15s",
                      }}
                      onFocus={(e) =>
                        (e.target.style.borderColor = "var(--color-accent)")
                      }
                      onBlur={(e) =>
                        (e.target.style.borderColor =
                          "var(--color-border-secondary)")
                      }
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
                        onClick={() => setShowPdfModal(true)}
                        style={{
                          padding: "7px 14px",
                          borderRadius: 8,
                          border: "1px solid var(--color-border-secondary)",
                          background: "var(--color-background-secondary)",
                          color: "var(--color-text-primary)",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          transition: "all 0.15s",
                        }}
                      >
                        <FileText size={13} /> View PDF
                      </button>
                      <button
                        onClick={() => setNarrativeText(null)}
                        style={{
                          padding: "7px 14px",
                          borderRadius: 8,
                          border: "1px solid var(--color-border-secondary)",
                          background: "transparent",
                          color: "var(--color-text-secondary)",
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        Discard
                      </button>
                      <button
                        onClick={copyNarrative}
                        style={{
                          padding: "7px 16px",
                          borderRadius: 8,
                          border: "none",
                          background: copied
                            ? "#10b981"
                            : "var(--color-accent)",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          boxShadow: copied
                            ? "none"
                            : "0 3px 10px rgba(15,118,110,0.25)",
                        }}
                      >
                        {copied ? "✓ Copied!" : "Copy Text"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: History */}
        <div
          style={{
            background: "var(--color-background-primary)",
            border: "1px solid var(--color-border-secondary)",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid var(--color-border-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--color-background-secondary)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: "#6366f1",
                }}
              />
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                  margin: 0,
                }}
              >
                Estimate History
              </h2>
            </div>
            {history.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => setShowPasswordPrompt(true)}
                  title="Export CSV"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 10px",
                    borderRadius: 8,
                    border: "1px solid var(--color-border-secondary)",
                    background: "transparent",
                    color: "var(--color-text-secondary)",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-accent)";
                    e.currentTarget.style.color = "var(--color-accent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      "var(--color-border-secondary)";
                    e.currentTarget.style.color = "var(--color-text-secondary)";
                  }}
                >
                  <Download size={11} /> CSV
                </button>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--color-text-secondary)",
                    background: "var(--color-background-primary)",
                    padding: "3px 10px",
                    borderRadius: 20,
                    border: "1px solid var(--color-border-secondary)",
                  }}
                >
                  {history.length} estimates
                </span>
              </div>
            )}
          </div>

          {history.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "3rem",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  background: "var(--color-accent-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="1.5"
                >
                  <path d="M3 3v18h18" />
                  <path d="m19 9-5 5-4-4-3 3" />
                </svg>
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                  marginBottom: 6,
                }}
              >
                No estimates yet
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--color-text-secondary)",
                  maxWidth: 220,
                  lineHeight: 1.6,
                }}
              >
                Run your first estimate using the form on the left.
              </div>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, overflowY: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead style={{ position: "sticky", top: 0 }}>
                    <tr
                      style={{
                        background: "var(--color-background-secondary)",
                        borderBottom: "1px solid var(--color-border-secondary)",
                      }}
                    >
                      {["Code", "Coverage", "Patient", "Risk", "When"].map(
                        (h) => (
                          <th
                            key={h}
                            style={{
                              padding: "10px 12px",
                              textAlign:
                                h === "Coverage" ||
                                h === "Patient" ||
                                h === "When"
                                  ? "right"
                                  : h === "Risk"
                                    ? "center"
                                    : "left",
                              fontSize: 10,
                              fontWeight: 700,
                              color: "var(--color-text-secondary)",
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const totalPages = Math.max(
                        1,
                        Math.ceil(history.length / itemsPerPage),
                      );
                      const paginatedHistory = history.slice(
                        (currentPage - 1) * itemsPerPage,
                        currentPage * itemsPerPage,
                      );
                      return paginatedHistory.map((item, i) => {
                        const style =
                          riskStyle[
                            item.claim_risk as keyof typeof riskStyle
                          ] ?? riskStyle.low;
                        return (
                          <tr
                            key={item.id}
                            onClick={() =>
                              (window.location.href = `/dashboard/claims/${item.id}`)
                            }
                            style={{
                              borderBottom:
                                "1px solid var(--color-border-tertiary)",
                              background:
                                i % 2 === 0
                                  ? "transparent"
                                  : "rgba(0,0,0,0.01)",
                              transition: "background 0.12s",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                "var(--color-accent-muted)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background =
                                i % 2 === 0
                                  ? "transparent"
                                  : "rgba(0,0,0,0.01)")
                            }
                          >
                            <td
                              style={{
                                padding: "11px 12px",
                                fontWeight: 700,
                                color: "var(--color-text-primary)",
                                fontFamily: "monospace",
                                fontSize: 12,
                              }}
                            >
                              {item.cdt_code}
                            </td>
                            <td
                              style={{
                                padding: "11px 12px",
                                textAlign: "right",
                                color: "var(--color-accent)",
                                fontWeight: 700,
                              }}
                            >
                              {item.coverage_percent}%
                            </td>
                            <td
                              style={{
                                padding: "11px 12px",
                                textAlign: "right",
                                color: "var(--color-text-primary)",
                                fontWeight: 600,
                              }}
                            >
                              $
                              {(item.patient_cost || 0).toLocaleString(
                                "en-CA",
                                { maximumFractionDigits: 0 },
                              )}
                            </td>
                            <td
                              style={{
                                padding: "11px 12px",
                                textAlign: "center",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: "3px 8px",
                                  borderRadius: 20,
                                  background: style.bg,
                                  color: style.text,
                                  fontWeight: 700,
                                  textTransform: "capitalize",
                                  border: `1px solid ${style.border}`,
                                }}
                              >
                                {item.claim_risk}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: "11px 12px",
                                textAlign: "right",
                                color: "var(--color-text-secondary)",
                                fontSize: 11,
                              }}
                            >
                              {item.created_at
                                ? new Date(item.created_at).toLocaleDateString()
                                : ""}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {history.length > 0 && (
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
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, history.length)} of{" "}
                    {history.length}
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
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
                      Page {currentPage} of{" "}
                      {Math.max(1, Math.ceil(history.length / itemsPerPage))}
                    </span>
                    <button
                      disabled={
                        currentPage ===
                        Math.max(1, Math.ceil(history.length / itemsPerPage))
                      }
                      onClick={() =>
                        setCurrentPage((p) =>
                          Math.min(
                            Math.max(
                              1,
                              Math.ceil(history.length / itemsPerPage),
                            ),
                            p + 1,
                          ),
                        )
                      }
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: "1px solid var(--color-border-secondary)",
                        background:
                          currentPage ===
                          Math.max(1, Math.ceil(history.length / itemsPerPage))
                            ? "var(--color-background-secondary)"
                            : "var(--color-background-primary)",
                        color:
                          currentPage ===
                          Math.max(1, Math.ceil(history.length / itemsPerPage))
                            ? "var(--color-text-tertiary)"
                            : "var(--color-text-primary)",
                        cursor:
                          currentPage ===
                          Math.max(1, Math.ceil(history.length / itemsPerPage))
                            ? "not-allowed"
                            : "pointer",
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
