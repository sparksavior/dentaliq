"use client";

import { useState } from "react";

export default function DemoSettings({ planName }: { planName: string }) {
  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
    }, 1000);
  };

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: 1000,
        margin: "0 auto",
        color: "var(--color-text-primary)",
      }}
    >
      <div style={{ marginBottom: "1.5rem" }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "var(--color-text-primary)",
            letterSpacing: "-0.03em",
            marginBottom: 4,
          }}
        >
          Settings
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
          Manage your clinic preferences and integrations.
        </p>
      </div>

      <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}>
        <nav
          style={{
            width: 220,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            flexShrink: 0,
          }}
        >
          {[
            { id: "general", label: "General" },
            { id: "clinics", label: "Locations" },
            { id: "team", label: "Team Members" },
            { id: "integrations", label: "Integrations" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: "10px 14px",
                textAlign: "left",
                borderRadius: 8,
                border: "none",
                background:
                  activeTab === t.id
                    ? "var(--color-background-secondary)"
                    : "transparent",
                color:
                  activeTab === t.id
                    ? "var(--color-text-primary)"
                    : "var(--color-text-secondary)",
                fontWeight: activeTab === t.id ? 600 : 500,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div
          style={{
            flex: 1,
            background: "var(--color-background-primary)",
            border: "1px solid var(--color-border-secondary)",
            borderRadius: 16,
            padding: "2rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          {activeTab === "general" && (
            <div>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: "1.5rem",
                }}
              >
                General Settings
              </h2>
              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--color-text-secondary)",
                    display: "block",
                    marginBottom: 5,
                  }}
                >
                  Clinic Name
                </label>
                <input
                  defaultValue="Demo Clinic HQ"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid var(--color-border-secondary)",
                    borderRadius: 8,
                    background: "var(--color-background-secondary)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--color-text-secondary)",
                    display: "block",
                    marginBottom: 5,
                  }}
                >
                  Current Plan
                </label>
                <div
                  style={{
                    padding: "10px 12px",
                    border: "1px solid var(--color-border-secondary)",
                    borderRadius: 8,
                    background: "var(--color-background-secondary)",
                    color: "var(--color-text-secondary)",
                    textTransform: "capitalize",
                  }}
                >
                  {planName} Plan (Demo)
                </div>
              </div>
              <button
                onClick={handleSave}
                style={{
                  padding: "10px 20px",
                  background: "var(--color-accent)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginTop: "1rem",
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
          {activeTab === "clinics" && (
            <div>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: "1.5rem",
                }}
              >
                Clinic Locations
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--color-text-secondary)",
                  marginBottom: "1rem",
                }}
              >
                Manage your multi-clinic locations here.
              </p>
              {planName === "starter" && (
                <div
                  style={{
                    padding: "12px",
                    background: "rgba(14,116,144,0.08)",
                    color: "#0e7490",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  Multi-clinic is a Pro feature.
                </div>
              )}
            </div>
          )}
          {["team", "integrations"].includes(activeTab) && (
            <div>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: "1.5rem",
                  textTransform: "capitalize",
                }}
              >
                {activeTab}
              </h2>
              <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
                This section is simulated for the demo environment.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
