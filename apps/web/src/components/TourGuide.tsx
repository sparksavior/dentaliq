"use client";

import { useState, useEffect } from "react";

const TOUR_KEY = "diq_tour_seen";

interface TourStep {
  title: string;
  body: string;
  icon: string;
  position:
    | "center"
    | "sidebar-overview"
    | "sidebar-estimates"
    | "sidebar-claims"
    | "sidebar-patients"
    | "sidebar-settings"
    | "bottom-right";
}

const STEPS: TourStep[] = [
  {
    title: "Welcome to DentalIQ!",
    body: "Let's take a quick tour of your clinic platform. You can click End tour at any time to skip.",
    icon: "🦷",
    position: "center",
  },
  {
    title: "Overview Dashboard",
    body: "Your home base shows real-time clinic stats — total patients, estimates, revenue recovered, and high-risk claims — plus AI-generated insights about your clinic performance.",
    icon: "📊",
    position: "sidebar-overview",
  },
  {
    title: "Insurance Estimates",
    body: "Select a CDT procedure code and insurance provider to instantly get coverage percentage, patient cost, and insurer payment. Results in under 2 seconds.",
    icon: "⚡",
    position: "sidebar-estimates",
  },
  {
    title: "Claims Review",
    body: "All your estimates become trackable claims here. Filter by Low/Medium/High risk and generate AI-drafted pre-authorization letters for complex cases.",
    icon: "🛡️",
    position: "sidebar-claims",
  },
  {
    title: "Patient Management",
    body: "Add patients with their insurance details. Each patient has a full dossier showing estimate history, saved pre-auth letters, and treatment records.",
    icon: "👥",
    position: "sidebar-patients",
  },
  {
    title: "Settings & Integrations",
    body: "Connect your Practice Management Software (Open Dental), manage insurance plans, add team members, and configure 2FA for PHIPA compliance.",
    icon: "⚙️",
    position: "sidebar-settings",
  },
  {
    title: "AI Copilot",
    body: "The AI Copilot (bottom-right corner) has full context of your clinic's data. Ask: 'Which claims need attention?', 'What's our revenue this month?', or 'Help me write a pre-auth note.'",
    icon: "🤖",
    position: "bottom-right",
  },
  {
    title: "You're all set!",
    body: "Start by running your first insurance estimate or adding a patient. DentalIQ will help your clinic recover more revenue and streamline insurance workflows.",
    icon: "🎉",
    position: "center",
  },
];

function getCardStyle(position: TourStep["position"]): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "fixed",
    zIndex: 8001,
    width: 300,
    background: "var(--color-background-primary)",
    border: "1px solid var(--color-border-secondary)",
    borderRadius: 16,
    padding: "20px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
  };

  switch (position) {
    case "center":
      return {
        ...base,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 340,
      };
    case "sidebar-overview":
      return { ...base, top: 100, left: 248 };
    case "sidebar-estimates":
      return { ...base, top: 148, left: 248 };
    case "sidebar-claims":
      return { ...base, top: 196, left: 248 };
    case "sidebar-patients":
      return { ...base, top: 244, left: 248 };
    case "sidebar-settings":
      return { ...base, top: 292, left: 248 };
    case "bottom-right":
      return { ...base, bottom: 105, right: 84 };
    default:
      return {
        ...base,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
  }
}

function ArrowLeft() {
  return (
    <div
      style={{
        position: "absolute",
        left: -10,
        top: 28,
        width: 0,
        height: 0,
        borderTop: "10px solid transparent",
        borderBottom: "10px solid transparent",
        borderRight: "10px solid var(--color-background-primary)",
        filter: "drop-shadow(-2px 0 2px rgba(0,0,0,0.08))",
      }}
    />
  );
}

function ArrowDown() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: -10,
        right: 28,
        width: 0,
        height: 0,
        borderLeft: "10px solid transparent",
        borderRight: "10px solid transparent",
        borderTop: "10px solid var(--color-background-primary)",
      }}
    />
  );
}

export function TourGuide({ plan = "starter" }: { plan?: string }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  const activeSteps = STEPS.filter((s) => {
    if (plan === "starter" && s.title === "AI Copilot") return false;
    return true;
  });

  useEffect(() => {
    const checkTour = () => {
      if (!localStorage.getItem(TOUR_KEY)) {
        setVisible(true);
        setStep(0);
      }
    };

    if (!localStorage.getItem(TOUR_KEY)) {
      const t = setTimeout(() => setVisible(true), 900);
      return () => clearTimeout(t);
    }

    const handleShowTour = () => {
      localStorage.removeItem(TOUR_KEY);
      setVisible(true);
      setStep(0);
    };

    window.addEventListener("diq_show_tour", handleShowTour);
    return () => window.removeEventListener("diq_show_tour", handleShowTour);
  }, []);

  function next() {
    if (step < activeSteps.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }

  function dismiss() {
    localStorage.setItem(TOUR_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  const current = activeSteps[step];
  const isSidebar = current.position.startsWith("sidebar-");
  const isBottomRight = current.position === "bottom-right";

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 8000,
          background: "transparent",
        }}
        onClick={dismiss}
      />

      {/* Tour card */}
      <div
        style={getCardStyle(current.position)}
        onClick={(e) => e.stopPropagation()}
      >
        {isSidebar && <ArrowLeft />}
        {isBottomRight && <ArrowDown />}

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
          {activeSteps.map((_, i) => (
            <div
              key={i}
              style={{
                height: 5,
                width: i === step ? 20 : 5,
                borderRadius: 3,
                background:
                  i <= step
                    ? "var(--color-accent)"
                    : "var(--color-border-secondary)",
                opacity: i < step ? 0.5 : 1,
                transition: "width 0.25s, background 0.25s",
              }}
            />
          ))}
        </div>

        <div style={{ fontSize: 28, marginBottom: 10, lineHeight: 1 }}>
          {current.icon}
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--color-text-primary)",
            marginBottom: 8,
          }}
        >
          {current.title}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--color-text-secondary)",
            lineHeight: 1.65,
            marginBottom: 18,
          }}
        >
          {current.body}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            onClick={dismiss}
            style={{
              background: "none",
              border: "none",
              fontSize: 12,
              color: "var(--color-text-secondary)",
              cursor: "pointer",
              padding: "6px 0",
              opacity: 0.7,
            }}
          >
            End tour
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--color-border-secondary)",
                  background: "transparent",
                  color: "var(--color-text-secondary)",
                  fontSize: 13,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              style={{
                padding: "7px 18px",
                borderRadius: 8,
                border: "none",
                background: "var(--color-accent)",
                color: "#fff",
                fontSize: 13,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {step === activeSteps.length - 1 ? "Get started →" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
