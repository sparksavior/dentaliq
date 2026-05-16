"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3001";
      const res = await fetch(`${authUrl}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      const data = await res.json();
      if (data.success) {
        setStatus("success");
      } else {
        setStatus("idle");
        setErrorMsg(data.error || "Failed to request password reset.");
      }
    } catch {
      setStatus("idle");
      setErrorMsg("Failed to connect to server.");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-background-secondary)",
        color: "var(--color-text-primary)",
        fontFamily: "system-ui",
      }}
    >
      <div
        style={{
          borderBottom: "1px solid var(--color-border-secondary)",
          background: "var(--color-background-primary)",
          padding: "0 2rem",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => router.push("/")}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: "linear-gradient(135deg, #0f766e, #0d9488)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            +
          </div>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.03em",
            }}
          >
            DentalIQ
          </span>
        </div>
        <ThemeToggle storageKey="diq_pub_theme" variant="pill" />
      </div>

      <div style={{ maxWidth: 400, margin: "4rem auto", padding: "0 1.5rem" }}>
        <div
          style={{
            background: "var(--color-background-primary)",
            border: "1px solid var(--color-border-secondary)",
            borderRadius: 16,
            padding: "2.5rem 2rem",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "var(--color-accent-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              marginBottom: "1.2rem",
            }}
          >
            🔐
          </div>
          <h2 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em" }}>
            Forgot password?
          </h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: "1.5rem" }}>
            Enter your email and we'll send you a link to reset your password.
          </p>

          {errorMsg && (
            <div
              style={{
                marginBottom: 16,
                padding: "10px 12px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                fontSize: 13,
                color: "#dc2626",
              }}
            >
              {errorMsg}
            </div>
          )}

          {status === "success" ? (
            <div
              style={{
                padding: "16px",
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: 12,
                color: "#059669",
                fontSize: 14,
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              <strong>Check your email</strong><br/>
              If that account exists, we've sent password reset instructions.
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--color-text-secondary)",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Email address
                </label>
                <input
                  type="email"
                  placeholder="you@yourclinic.ca"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    border: "1.5px solid var(--color-border-secondary)",
                    borderRadius: 10,
                    fontSize: 14,
                    color: "var(--color-text-primary)",
                    background: "var(--color-input-bg)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--color-border-secondary)")}
                />
              </div>

              <button
                type="submit"
                disabled={status === "loading" || !email}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  background: status === "loading" || !email ? "var(--color-text-secondary)" : "linear-gradient(135deg, #0f766e, #0d9488)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {status === "loading" ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}

          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            <button
              onClick={() => router.push("/login")}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-text-secondary)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                padding: "8px",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
            >
              ← Back to log in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
