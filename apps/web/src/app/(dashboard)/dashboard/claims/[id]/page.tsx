"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Activity,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { estimateApi, type EstimateHistoryItem } from "@/lib/api";
import PreAuthPdfModal from "@/components/PreAuthPdfModal";

const riskConfig = {
  high: {
    icon: AlertTriangle,
    bg: "rgba(239,68,68,0.1)",
    color: "#ef4444",
    border: "rgba(239,68,68,0.2)",
    label: "High Risk",
  },
  medium: {
    icon: Clock,
    bg: "rgba(245,158,11,0.1)",
    color: "#f59e0b",
    border: "rgba(245,158,11,0.2)",
    label: "Medium Risk",
  },
  low: {
    icon: CheckCircle2,
    bg: "rgba(16,185,129,0.1)",
    color: "#10b981",
    border: "rgba(16,185,129,0.2)",
    label: "Low Risk",
  },
};

export default function ClaimDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [estimate, setEstimate] = useState<
    | (EstimateHistoryItem & {
        insurance_plan_id?: string;
        date_of_birth?: string;
      })
    | null
  >(null);
  const [error, setError] = useState("");
  const [showPdfModal, setShowPdfModal] = useState<string | null>(null);
  const [backHover, setBackHover] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    setLoading(true);
    try {
      const data = await estimateApi.getEstimate(accessToken, id);
      setEstimate(data as any);
    } catch (err) {
      console.error("Failed to load claim detail", err);
      setError("Could not load claim records.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--color-background-primary)",
        }}
      >
        <div
          style={{
            padding: "1.75rem 2rem 1.5rem",
            background: "var(--color-background-secondary)",
          }}
        >
          <div
            style={{ height: 44, width: 280, borderRadius: 12 }}
            className="skeleton"
          />
        </div>
      </div>
    );
  }

  if (error || !estimate) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          color: "var(--color-text-primary)",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: "rgba(239,68,68,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            margin: "0 auto 12px",
          }}
        >
          ⚠
        </div>
        <p style={{ color: "#ef4444", marginBottom: "1rem" }}>
          {error || "Claim not found"}
        </p>
        <button
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-accent)",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          ← Go back
        </button>
      </div>
    );
  }

  const rc =
    riskConfig[estimate.claim_risk as keyof typeof riskConfig] ??
    riskConfig.low;
  const RiskIcon = rc.icon;
  const letter = estimate.pre_auth_letter;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-background-primary)",
        color: "var(--color-text-primary)",
      }}
    >
      {showPdfModal && (
        <PreAuthPdfModal
          narrative={showPdfModal}
          clinicName="Your Clinic"
          insurerName={estimate.insurance_plan_id || "Insurer"}
          patientName={
            `${estimate.first_name || ""} ${estimate.last_name || ""}`.trim() ||
            "Patient"
          }
          date={new Date(estimate.created_at).toLocaleDateString("en-CA", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          onClose={() => setShowPdfModal(null)}
          onRevise={async () => {}}
        />
      )}

      {/* Header */}
      <div
        style={{
          padding: "1.5rem 2rem",
          background:
            "linear-gradient(135deg, var(--color-background-primary) 0%, var(--color-accent-muted) 100%)",
          borderBottom: "1px solid var(--color-border-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => router.back()}
            onMouseEnter={() => setBackHover(true)}
            onMouseLeave={() => setBackHover(false)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              border: "1.5px solid var(--color-border-secondary)",
              background: backHover
                ? "var(--color-accent-muted)"
                : "var(--color-background-primary)",
              color: backHover
                ? "var(--color-accent)"
                : "var(--color-text-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 3,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "var(--color-text-secondary)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Claim / Estimate Dossier
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 9px",
                  borderRadius: 20,
                  background: rc.bg,
                  color: rc.color,
                  border: `1px solid ${rc.border}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  textTransform: "uppercase",
                }}
              >
                <RiskIcon size={12} /> {rc.label}
              </span>
            </div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                margin: 0,
              }}
            >
              {estimate.cdt_code}
            </h1>
          </div>
        </div>
      </div>

      <div style={{ padding: "2rem", maxWidth: 1000, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 320px",
            gap: "1.75rem",
          }}
        >
          {/* Main Content */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            <div
              style={{
                background: "var(--color-background-primary)",
                borderRadius: 20,
                border: "1px solid var(--color-border-secondary)",
                padding: "1.5rem",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 1rem 0",
                  fontSize: 15,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Activity size={16} color="var(--color-accent)" />
                Clinical Explanation
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {estimate.plain_explanation ||
                  "No clinical explanation available for this estimate."}
              </p>
            </div>

            <div
              style={{
                background: "var(--color-background-primary)",
                borderRadius: 20,
                border: "1px solid var(--color-border-secondary)",
                padding: "1.5rem",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 1rem 0",
                  fontSize: 15,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <FileText size={16} color="var(--color-accent)" />
                Pre-Authorization Letter
              </h3>
              {letter ? (
                <div>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-secondary)",
                      marginBottom: "1rem",
                    }}
                  >
                    A pre-authorization letter has been generated for this
                    estimate.
                  </p>
                  <button
                    onClick={() => setShowPdfModal(letter)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: 10,
                      background: "var(--color-accent)",
                      color: "#fff",
                      border: "none",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <FileText size={16} /> View Pre-Auth PDF
                  </button>
                </div>
              ) : (
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-tertiary)",
                    fontStyle: "italic",
                    margin: 0,
                  }}
                >
                  No pre-authorization letter was generated for this claim.
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            <div
              style={{
                background: "var(--color-background-primary)",
                borderRadius: 20,
                border: "1px solid var(--color-border-secondary)",
                padding: "1.5rem",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <h3
                style={{ margin: "0 0 1rem 0", fontSize: 14, fontWeight: 700 }}
              >
                Financial Overview
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--color-text-secondary)",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      marginBottom: 2,
                    }}
                  >
                    Coverage
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: "var(--color-accent)",
                    }}
                  >
                    {estimate.coverage_percent}%
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--color-text-secondary)",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      marginBottom: 2,
                    }}
                  >
                    Insurer Pays
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>
                    ${estimate.insurer_pays?.toFixed(2) || "0.00"}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--color-text-secondary)",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      marginBottom: 2,
                    }}
                  >
                    Patient Cost
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>
                    ${estimate.patient_cost?.toFixed(2) || "0.00"}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                background: "var(--color-background-primary)",
                borderRadius: 20,
                border: "1px solid var(--color-border-secondary)",
                padding: "1.5rem",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <h3
                style={{ margin: "0 0 1rem 0", fontSize: 14, fontWeight: 700 }}
              >
                Patient Info
              </h3>
              {estimate.patient_id ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <User size={16} color="var(--color-text-tertiary)" />
                    <span
                      style={{ fontSize: 14, fontWeight: 600 }}
                    >{`${estimate.first_name} ${estimate.last_name}`}</span>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <Shield size={16} color="var(--color-text-tertiary)" />
                    <span style={{ fontSize: 14 }}>
                      {estimate.insurance_plan_id || "Self-Pay"}
                    </span>
                  </div>
                </div>
              ) : (
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-secondary)",
                    margin: 0,
                  }}
                >
                  No patient associated.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
