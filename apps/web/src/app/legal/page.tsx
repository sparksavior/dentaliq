"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LegalPage() {
  return (
    <div style={{ background: "var(--color-background-primary)", minHeight: "100vh", color: "var(--color-text-primary)" }}>
      {/* ── NAVBAR ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
          height: 64,
          background: "var(--color-nav-bg)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--color-border-secondary)",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 800,
              fontSize: 18,
              boxShadow: "var(--shadow-accent)",
            }}
          >
            +
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.03em" }}>
            Dental<span style={{ color: "var(--color-accent)" }}>IQ</span>
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ThemeToggle storageKey="diq_pub_theme" variant="icon" />
          <Link
            href="/"
            style={{
              padding: "9px 18px",
              borderRadius: 100,
              background: "transparent",
              border: "1px solid var(--color-border-secondary)",
              color: "var(--color-text-primary)",
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Back to Home
          </Link>
        </div>
      </header>

      {/* ── CONTENT ── */}
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "60px 20px" }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 24 }}>Legal & Compliance</h1>
        
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>1. Privacy & Data Protection (PIPEDA & HIPAA)</h2>
          <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6, marginBottom: 12 }}>
            At DentalIQ, we recognize that patient health information (PHI) is sacred. Our systems are built from the ground up to comply with both the Canadian Personal Information Protection and Electronic Documents Act (PIPEDA) and the US Health Insurance Portability and Accountability Act (HIPAA).
          </p>
          <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            All patient data is encrypted at rest using AES-256 and in transit via TLS 1.3. We employ strict tenant isolation architecture—meaning every dental clinic's data resides in its own securely siloed database schema. Cross-tenant data access is cryptographically impossible by design.
          </p>
        </section>

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>2. AI Agent Autonomy & Liability</h2>
          <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6, marginBottom: 12 }}>
            Our Cortex AI Agents are designed to augment, not replace, human clinical and administrative judgment. While Cortex Agents can autonomously draft pre-authorization narratives and summarize patient history, a licensed practitioner or authorized clinic administrator must review and approve all outputs before they are submitted to insurance providers (such as CDCP, Sun Life, or Manulife).
          </p>
          <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            DentalIQ limits its liability to the provision of software services. We do not provide dental or legal advice. The clinic retains ultimate responsibility for the accuracy of claims and patient communications.
          </p>
        </section>

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>3. Data Retention & Erasure</h2>
          <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6, marginBottom: 12 }}>
            Under the right to be forgotten and standard health data retention policies, clinics maintain full ownership of their data. Upon termination of service, all PHI associated with your clinic is securely purged within 30 days. You may request a complete export of your clinic's data in standard formats (CSV, JSON, XML) at any time during your active subscription.
          </p>
        </section>
      </main>
    </div>
  );
}
