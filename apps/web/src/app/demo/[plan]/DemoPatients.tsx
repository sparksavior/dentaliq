"use client";

import { useState } from "react";

const DUMMY_PATIENTS = [
  {
    id: "1",
    first_name: "Sarah",
    last_name: "Chen",
    date_of_birth: "1985-04-12",
    phone: "+1 (416) 555-0192",
    email: "sarah.c@example.com",
    insurance_plan_id: "Sun Life Financial",
  },
  {
    id: "2",
    first_name: "James",
    last_name: "Thompson",
    date_of_birth: "1972-11-05",
    phone: "+1 (416) 555-0144",
    email: "j.thompson@example.com",
    insurance_plan_id: "Manulife",
  },
  {
    id: "3",
    first_name: "Emily",
    last_name: "Rodriguez",
    date_of_birth: "1990-08-22",
    phone: "+1 (647) 555-0188",
    email: "emily.r@example.com",
    insurance_plan_id: "Canada Life",
  },
];

export default function DemoPatients({ planName }: { planName: string }) {
  const [search, setSearch] = useState("");

  const filtered = DUMMY_PATIENTS.filter(
    (p) =>
      `${p.first_name} ${p.last_name}`
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      p.insurance_plan_id.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: 1200,
        margin: "0 auto",
        color: "var(--color-text-primary)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.03em",
              marginBottom: 4,
            }}
          >
            Patients
          </h1>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
            {DUMMY_PATIENTS.length} patients registered
          </p>
        </div>
        <button
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, #0f766e, #0d9488)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Add patient
        </button>
      </div>

      <div style={{ marginBottom: "1.2rem", position: "relative" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, email, or insurance…"
          style={{
            width: "100%",
            padding: "10px 14px 10px 14px",
            border: "1.5px solid var(--color-border-secondary)",
            borderRadius: 10,
            fontSize: 14,
            color: "var(--color-text-primary)",
            background: "var(--color-background-primary)",
            outline: "none",
          }}
        />
      </div>

      <div
        style={{
          background: "var(--color-background-primary)",
          border: "1px solid var(--color-border-secondary)",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
        >
          <thead>
            <tr
              style={{
                background: "var(--color-background-secondary)",
                borderBottom: "1px solid var(--color-border-secondary)",
              }}
            >
              {[
                "Patient",
                "Date of Birth",
                "Phone",
                "Email",
                "Insurance",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "11px 14px",
                    textAlign: h === "Actions" ? "right" : "left",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--color-text-secondary)",
                    textTransform: "uppercase",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.id}
                style={{
                  borderBottom: "1px solid var(--color-border-tertiary)",
                }}
              >
                <td
                  style={{
                    padding: "12px 14px",
                    fontWeight: 600,
                    color: "var(--color-accent)",
                  }}
                >
                  {p.first_name} {p.last_name}
                </td>
                <td
                  style={{
                    padding: "12px 14px",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {p.date_of_birth}
                </td>
                <td
                  style={{
                    padding: "12px 14px",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {p.phone}
                </td>
                <td
                  style={{
                    padding: "12px 14px",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {p.email}
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <span
                    style={{
                      fontSize: 12,
                      padding: "3px 10px",
                      background: "var(--color-accent-muted)",
                      color: "var(--color-accent)",
                      borderRadius: 20,
                      fontWeight: 500,
                    }}
                  >
                    {p.insurance_plan_id}
                  </span>
                </td>
                <td style={{ padding: "12px 14px", textAlign: "right" }}>
                  <button
                    style={{
                      padding: "5px 12px",
                      borderRadius: 7,
                      border: "1px solid var(--color-border-secondary)",
                      background: "var(--color-background-primary)",
                      color: "var(--color-text-primary)",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
