"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function PrivacyPolicyPage() {
  return (
    <div style={{ background: "var(--color-background-primary)", minHeight: "100vh", color: "var(--color-text-primary)" }}>
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
            }}
          >
            +
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text-primary)" }}>
            Dental<span style={{ color: "var(--color-accent)" }}>IQ</span>
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ThemeToggle storageKey="diq_pub_theme" variant="icon" />
          <Link href="/" style={{ padding: "9px 18px", borderRadius: 100, border: "1px solid var(--color-border-secondary)", color: "var(--color-text-primary)", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>Back to Home</Link>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "80px 20px" }}>
        <h1 style={{ fontSize: 40, fontWeight: 800, marginBottom: 16 }}>Privacy Policy</h1>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: 48, fontSize: 14 }}>Last Updated: October 2026</p>
        
        <div style={{ color: "var(--color-text-secondary)", lineHeight: 1.8, fontSize: 15, display: "flex", flexDirection: "column", gap: 24 }}>
          <p>This Privacy Policy (“Policy”) explains how DentalIQ Technologies Inc. (“DentalIQ,” “we,” “our,” or “us”) collects, uses, discloses, and protects personal information when you use our website, application, products, and services (collectively, the “Services”). This Policy applies to individuals who access our Services, including dental clinic administrators, dental practitioners, and staff members (“Users”), as well as the patients whose health information is processed through our Services by the Users (“Patients”).</p>
          
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 20, marginBottom: 10 }}>1. Information We Collect</h2>
          <p>1.1. <strong>Information you provide to us:</strong> When you register for an account, subscribe to our Services, or communicate with us, we collect personal information such as your name, email address, phone number, dental clinic name, billing information, and professional credentials.</p>
          <p>1.2. <strong>Patient Health Information (PHI):</strong> In the course of providing our Services, Users may upload, input, or integrate patient data, including names, dates of birth, insurance details, clinical notes, and treatment plans. DentalIQ acts as a data processor (or Business Associate under HIPAA) with respect to PHI. We process this information strictly in accordance with our Business Associate Agreement (BAA) and the Canadian Personal Information Protection and Electronic Documents Act (PIPEDA).</p>
          <p>1.3. <strong>Automatically Collected Information:</strong> We automatically collect certain information about your device and usage of our Services. This includes IP addresses, browser types, log files, operating systems, and interaction data (e.g., clicks, page views).</p>
          
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 20, marginBottom: 10 }}>2. How We Use Information</h2>
          <p>We use the collected information for the following purposes:</p>
          <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <li>To provide, operate, and maintain our Services, including the processing of insurance pre-authorizations and claim risk analysis.</li>
            <li>To process payments and facilitate billing through third-party processors (e.g., Stripe).</li>
            <li>To train and optimize our local AI models. Note: No identifiable PHI is ever used to train globally shared models. Our Cortex Agents utilize isolated, tenant-specific contextual processing to ensure zero cross-contamination of data.</li>
            <li>To communicate with you regarding updates, security alerts, and administrative messages.</li>
            <li>To monitor usage patterns and improve the user experience of the DentalIQ platform.</li>
          </ul>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 20, marginBottom: 10 }}>3. Information Sharing and Disclosure</h2>
          <p>We do not sell your personal information or PHI. We may share information under the following circumstances:</p>
          <p>3.1. <strong>Service Providers:</strong> We employ third-party companies (e.g., hosting providers like AWS, payment processors) to facilitate our Services. These third parties have access to personal information only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.</p>
          <p>3.2. <strong>Insurance Providers & Clearinghouses:</strong> We transmit PHI to insurance companies (e.g., Sun Life, Manulife, CDCP) as explicitly directed by the User to facilitate pre-authorizations and claims processing.</p>
          <p>3.3. <strong>Legal Requirements:</strong> We may disclose information if required to do so by law or in response to valid requests by public authorities (e.g., a court or government agency).</p>
          <p>3.4. <strong>Business Transfers:</strong> In the event of a merger, acquisition, or asset sale, your personal information may be transferred. We will provide notice before your personal information is transferred and becomes subject to a different Privacy Policy.</p>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 20, marginBottom: 10 }}>4. Data Security & Storage</h2>
          <p>We implement commercially reasonable security measures designed to protect your information. All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption. Our architecture employs strict tenant isolation, ensuring that database queries cannot cross clinic boundaries. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.</p>
          
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 20, marginBottom: 10 }}>5. Your Rights & Choices</h2>
          <p>Depending on your jurisdiction, you may have the right to access, correct, or delete your personal information. Users may update their account information directly within the DentalIQ dashboard. Patients wishing to exercise their rights regarding their PHI must contact the dental clinic directly, as the clinic is the data controller.</p>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 20, marginBottom: 10 }}>6. Changes to This Privacy Policy</h2>
          <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.</p>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 20, marginBottom: 10 }}>7. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy or our data practices, please contact our Privacy Officer at privacy@dentaliq.ca or by mail at 123 Tech Avenue, Suite 400, Toronto, ON, Canada.</p>
        </div>
      </main>
    </div>
  );
}
