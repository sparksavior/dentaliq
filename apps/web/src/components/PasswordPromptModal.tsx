"use client";

import { useState, useEffect } from "react";
import { authApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Lock, X, RefreshCw } from "lucide-react";

interface PasswordPromptModalProps {
  onSuccess: () => void;
  onCancel: () => void;
  actionLabel?: string;
}

const CACHE_KEY = "diq_password_verified_until";
const CACHE_DURATION_MS = 2 * 60 * 1000; // 2 minutes

export default function PasswordPromptModal({
  onSuccess,
  onCancel,
  actionLabel = "continue",
}: PasswordPromptModalProps) {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verifyingCache, setVerifyingCache] = useState(true);

  // Check cache on mount
  useEffect(() => {
    const cachedTime = localStorage.getItem(CACHE_KEY);
    if (cachedTime && parseInt(cachedTime, 10) > Date.now()) {
      // Still within the 2-minute window
      onSuccess();
    } else {
      setVerifyingCache(false);
    }
  }, [onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !password) return;
    setLoading(true);
    setError("");
    try {
      await authApi.verifyPassword({ email: user.email, password });
      localStorage.setItem(
        CACHE_KEY,
        (Date.now() + CACHE_DURATION_MS).toString(),
      );
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Incorrect password");
    } finally {
      setLoading(false);
    }
  };

  // If we're checking cache, show nothing (or a subtle spinner)
  if (verifyingCache) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "var(--color-background-primary)",
          borderRadius: 20,
          width: "100%",
          maxWidth: 420,
          padding: 32,
          position: "relative",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
          border: "1px solid var(--color-border-secondary)",
        }}
      >
        <button
          onClick={onCancel}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: "transparent",
            border: "none",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
          }}
        >
          <X size={20} />
        </button>

        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#f59e0b",
            margin: "0 auto 20px",
          }}
        >
          <Lock size={26} />
        </div>

        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--color-text-primary)",
            textAlign: "center",
            marginBottom: 8,
            letterSpacing: "-0.02em",
          }}
        >
          Verify your identity
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "var(--color-text-secondary)",
            textAlign: "center",
            marginBottom: 24,
            lineHeight: 1.5,
          }}
        >
          Please enter your password to {actionLabel}. <br />
          <span style={{ fontSize: 12, opacity: 0.8 }}>
            This verification will be remembered for 2 minutes.
          </span>
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-text-secondary)",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoFocus
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                background: "var(--color-background-secondary)",
                border: "1px solid var(--color-border-secondary)",
                color: "var(--color-text-primary)",
                fontSize: 15,
                outline: "none",
              }}
            />
          </div>

          {error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(239,68,68,0.1)",
                color: "#ef4444",
                fontSize: 13,
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              marginTop: 8,
              width: "100%",
              padding: "14px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #0f766e, #0d9488)",
              color: "#fff",
              border: "none",
              fontSize: 15,
              fontWeight: 600,
              cursor: loading || !password ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: loading || !password ? 0.7 : 1,
              transition: "all 0.2s",
            }}
          >
            {loading ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              "Verify & Continue"
            )}
          </button>
        </form>
      </div>
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
