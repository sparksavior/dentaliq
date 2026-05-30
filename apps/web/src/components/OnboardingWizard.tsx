"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface OnboardingWizardProps {
  clinicName: string;
  plan: string;
  hasClinics: boolean;
  hasPatients: boolean;
  hasInsurance: boolean;
  onComplete: () => void;
}

const STEPS = [
  {
    id: "welcome",
    title: "Welcome",
    icon: "👋",
    description: "Let's set up your clinic in 2 minutes.",
  },
  {
    id: "profile",
    title: "Clinic Profile",
    icon: "🏥",
    description: "Confirm your clinic details.",
  },
  {
    id: "patients",
    title: "Add a Patient",
    icon: "👤",
    description: "Add your first patient to unlock estimates.",
  },
  {
    id: "explore",
    title: "Explore Features",
    icon: "🚀",
    description: "You're all set! Here's what to try first.",
  },
];

export function OnboardingWizard({
  clinicName,
  plan,
  hasClinics,
  hasPatients,
  hasInsurance,
  onComplete,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  if (dismissed) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
      setDismissed(true);
    } else {
      setStep((s) => s + 1);
    }
  };

  const skip = () => {
    onComplete();
    setDismissed(true);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99990,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.3s ease",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "var(--color-background-primary, #1a2332)",
          border:
            "1px solid var(--color-border-secondary, rgba(255,255,255,0.08))",
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
          animation: "slideIn 0.3s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Progress bar */}
        <div style={{ height: 3, background: "rgba(255,255,255,0.06)" }}>
          <div
            style={{
              height: "100%",
              background: "linear-gradient(90deg, #0f766e, #14b8a6)",
              width: `${((step + 1) / STEPS.length) * 100}%`,
              transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>

        <div style={{ padding: "2.5rem 2rem 2rem" }}>
          {/* Step indicator */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 28,
              justifyContent: "center",
            }}
          >
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                style={{
                  width: i === step ? 28 : 8,
                  height: 8,
                  borderRadius: 4,
                  background:
                    i <= step
                      ? "var(--color-accent, #14b8a6)"
                      : "rgba(255,255,255,0.08)",
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </div>

          {/* Icon */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              background:
                "linear-gradient(135deg, rgba(15,118,110,0.15), rgba(20,184,166,0.1))",
              border: "1.5px solid rgba(20,184,166,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              margin: "0 auto 24px",
            }}
          >
            {current.icon}
          </div>

          {/* Content */}
          {step === 0 && (
            <div style={{ textAlign: "center" }}>
              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  margin: "0 0 8px",
                  color: "var(--color-text-primary, #f1f5f9)",
                  letterSpacing: "-0.03em",
                }}
              >
                Welcome to DentalIQ
              </h2>
              <p
                style={{
                  fontSize: 15,
                  color: "var(--color-text-secondary, #94a3b8)",
                  lineHeight: 1.7,
                  margin: "0 0 8px",
                }}
              >
                {clinicName} is on the{" "}
                <span
                  style={{
                    color: "var(--color-accent, #14b8a6)",
                    fontWeight: 700,
                    textTransform: "capitalize",
                  }}
                >
                  {plan}
                </span>{" "}
                plan. Let&apos;s get you set up in a few quick steps.
              </p>
            </div>
          )}

          {step === 1 && (
            <div style={{ textAlign: "center" }}>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  margin: "0 0 8px",
                  color: "var(--color-text-primary, #f1f5f9)",
                  letterSpacing: "-0.02em",
                }}
              >
                Clinic Profile
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--color-text-secondary, #94a3b8)",
                  lineHeight: 1.7,
                  margin: "0 0 20px",
                }}
              >
                Your clinic <strong>{clinicName}</strong> is all set. You can
                customize your clinic name, add locations, and configure
                insurance plans in Settings.
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  textAlign: "left",
                  padding: "0 1rem",
                }}
              >
                {[
                  { label: "Clinic created", done: true },
                  { label: "Location added", done: hasClinics },
                  { label: "Insurance configured", done: hasInsurance },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        background: item.done
                          ? "rgba(16,185,129,0.15)"
                          : "rgba(255,255,255,0.06)",
                        border: `1px solid ${item.done ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.1)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: item.done
                          ? "#10b981"
                          : "var(--color-text-tertiary, #64748b)",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {item.done ? "✓" : "·"}
                    </div>
                    <span
                      style={{
                        color: item.done
                          ? "var(--color-text-primary, #f1f5f9)"
                          : "var(--color-text-tertiary, #64748b)",
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ textAlign: "center" }}>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  margin: "0 0 8px",
                  color: "var(--color-text-primary, #f1f5f9)",
                }}
              >
                {hasPatients ? "Patients Ready!" : "Add Your First Patient"}
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--color-text-secondary, #94a3b8)",
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {hasPatients
                  ? "Great, you already have patients in the system. You can run estimates for them right away."
                  : "Estimates are tied to patient records. Head to the Patients page to add your first one."}
              </p>
              {!hasPatients && (
                <button
                  onClick={() => {
                    skip();
                    router.push("/dashboard/patients");
                  }}
                  style={{
                    marginTop: 20,
                    padding: "10px 24px",
                    borderRadius: 10,
                    border: "1.5px solid var(--color-accent, #14b8a6)",
                    background: "transparent",
                    color: "var(--color-accent, #14b8a6)",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Go to Patients →
                </button>
              )}
            </div>
          )}

          {step === 3 && (
            <div style={{ textAlign: "center" }}>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  margin: "0 0 8px",
                  color: "var(--color-text-primary, #f1f5f9)",
                }}
              >
                You&apos;re Ready!
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--color-text-secondary, #94a3b8)",
                  lineHeight: 1.7,
                  margin: "0 0 20px",
                }}
              >
                Here&apos;s what to try first:
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  textAlign: "left",
                  padding: "0 1rem",
                }}
              >
                {[
                  {
                    icon: "📊",
                    label: "Run your first estimate",
                    desc: "Pick a CDT code and insurer",
                  },
                  {
                    icon: "📄",
                    label: "Draft a pre-auth letter",
                    desc: "AI writes it for you",
                  },
                  {
                    icon: "📈",
                    label: "Check analytics",
                    desc: "View your practice metrics",
                  },
                  ...(plan === "cortex"
                    ? [
                        {
                          icon: "🧠",
                          label: "Activate Cortex agents",
                          desc: "Hire AI agents for your clinic",
                        },
                      ]
                    : []),
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--color-text-primary, #f1f5f9)",
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--color-text-tertiary, #64748b)",
                        }}
                      >
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 32,
            }}
          >
            <button
              onClick={skip}
              style={{
                background: "none",
                border: "none",
                fontSize: 13,
                color: "var(--color-text-tertiary, #64748b)",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Skip setup
            </button>
            <button
              onClick={handleNext}
              style={{
                padding: "11px 28px",
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(135deg, #0f766e, #0d9488)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(15,118,110,0.3)",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 6px 20px rgba(15,118,110,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow =
                  "0 4px 14px rgba(15,118,110,0.3)";
              }}
            >
              {isLast ? "Get Started →" : "Continue →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
