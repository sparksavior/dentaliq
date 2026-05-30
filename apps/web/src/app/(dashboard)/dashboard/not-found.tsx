"use client";

import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "var(--color-background-primary)",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          background: "var(--color-background-secondary)",
          border: "1px solid var(--color-border-secondary)",
          borderRadius: 20,
          padding: "48px 40px",
          textAlign: "center",
          boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "var(--color-text-tertiary)",
            letterSpacing: "-0.04em",
            lineHeight: 1,
            margin: "0 0 16px",
          }}
        >
          404
        </div>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--color-text-primary)",
            margin: "0 0 10px",
            letterSpacing: "-0.02em",
          }}
        >
          Page not found
        </h1>

        <p
          style={{
            fontSize: 14,
            color: "var(--color-text-secondary)",
            lineHeight: 1.6,
            margin: "0 0 32px",
          }}
        >
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <Link
          href="/dashboard"
          style={{
            display: "inline-block",
            padding: "12px 28px",
            background: "linear-gradient(135deg, #0f766e, #0d9488)",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) =>
            (e.currentTarget.style.opacity = "0.9")
          }
          onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) =>
            (e.currentTarget.style.opacity = "1")
          }
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
