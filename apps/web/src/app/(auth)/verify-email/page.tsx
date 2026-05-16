"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("No verification token provided in the URL.");
      return;
    }

    const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3001";
    
    fetch(`${authUrl}/auth/verify-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (data.success) {
          setStatus("success");
        } else {
          setStatus("error");
          setErrorMsg(data.error || "Verification failed");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMsg("Failed to connect to authentication service.");
      });
  }, [token]);

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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
            textAlign: "center",
          }}
        >
          {status === "loading" && (
            <>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "var(--color-background-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  margin: "0 auto 1.5rem",
                  animation: "pulse 2s infinite",
                }}
              >
                ⏳
              </div>
              <h2 style={{ margin: "0 0 10px", fontSize: 22 }}>Verifying your email...</h2>
              <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
                Please wait while we confirm your email address.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "rgba(16, 185, 129, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  margin: "0 auto 1.5rem",
                  color: "#10b981",
                }}
              >
                ✓
              </div>
              <h2 style={{ margin: "0 0 10px", fontSize: 22 }}>Email Verified!</h2>
              <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: "1.5rem" }}>
                Your email has been successfully verified. You can now access your dashboard.
              </p>
              <button
                onClick={() => router.push("/login")}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, #0f766e, #0d9488)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Go to Login
              </button>
            </>
          )}

          {status === "error" && (
            <>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "rgba(239, 68, 68, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  margin: "0 auto 1.5rem",
                  color: "#ef4444",
                }}
              >
                ✕
              </div>
              <h2 style={{ margin: "0 0 10px", fontSize: 22 }}>Verification Failed</h2>
              <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: "1.5rem" }}>
                {errorMsg}
              </p>
              <button
                onClick={() => router.push("/login")}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 10,
                  border: "1.5px solid var(--color-border-secondary)",
                  background: "var(--color-background-secondary)",
                  color: "var(--color-text-primary)",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Back to Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
