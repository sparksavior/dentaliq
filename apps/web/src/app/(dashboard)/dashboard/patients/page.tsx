"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useClinic } from "@/contexts/clinic-context";
import {
  patientsApi,
  tenantsApi,
  type Patient,
  type CreatePatientInput,
  type Tenant,
} from "@/lib/api";
import { exportToCsv } from "@/lib/export";
import PasswordPromptModal from "@/components/PasswordPromptModal";

interface ClinicLocation {
  id: string;
  name: string;
  status: string;
}

const INSURERS = [
  "Sun Life Financial",
  "Manulife",
  "Canada Life",
  "Green Shield Canada",
  "Desjardins",
  "OTIP/RAEO",
  "Empire Life",
];
const emptyForm: CreatePatientInput = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  phone: "",
  email: "",
  insuranceProvider: "",
};

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function formatDob(dob?: string) {
  if (!dob) return "—";
  try {
    const d = new Date(dob);
    const age = Math.floor((Date.now() - d.getTime()) / 31557600000);
    return `${d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })} (age ${age})`;
  } catch {
    return dob;
  }
}

const AVATAR_COLORS = [
  { bg: "linear-gradient(135deg, #0f766e, #0d9488)", text: "#fff" },
  { bg: "linear-gradient(135deg, #0e7490, #06b6d4)", text: "#fff" },
  { bg: "linear-gradient(135deg, #4f46e5, #7c3aed)", text: "#fff" },
  { bg: "linear-gradient(135deg, #059669, #10b981)", text: "#fff" },
  { bg: "linear-gradient(135deg, #b45309, #d97706)", text: "#fff" },
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function PatientsPage() {
  const { accessToken } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreatePatientInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [clinics, setClinics] = useState<ClinicLocation[]>([]);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [addBtnHover, setAddBtnHover] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const itemsPerPage = 20;

  const { selectedClinicId } = useClinic();
  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [pts, t, cls] = await Promise.all([
        patientsApi.getPatients(accessToken),
        tenantsApi.getTenant(accessToken).catch(() => null),
        tenantsApi.getClinics(accessToken).catch(() => [] as ClinicLocation[]),
      ]);
      setPatients(pts);
      setTenant(t);
      setClinics(cls);
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedClinicId]);

  useEffect(() => {
    load();
  }, [load, selectedClinicId]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm, clinicId: selectedClinicId ?? undefined });
    setError("");
    setShowModal(true);
  };

  const openEdit = (p: Patient) => {
    setEditingId(p.id);
    setForm({
      firstName: p.first_name,
      lastName: p.last_name,
      dateOfBirth: p.date_of_birth ?? "",
      phone: p.phone ?? "",
      email: p.email ?? "",
      insuranceProvider: p.insurance_plan_id ?? "",
      clinicId: (p as any).clinic_id ?? undefined,
    });
    setError("");
    setShowModal(true);
  };

  const save = async () => {
    if (!accessToken) return;
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First and last name are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await patientsApi.updatePatient(accessToken, editingId, form);
      } else {
        await patientsApi.createPatient(accessToken, form);
      }
      setShowModal(false);
      await load();
    } catch (err: any) {
      setError(err.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (id: string) => {
    if (!accessToken) return;
    try {
      await patientsApi.deletePatient(accessToken, id);
      setDeleteConfirm(null);
      await load();
    } catch (err: any) {
      setError(err.message ?? "Delete failed");
    }
  };

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    return (
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      (p.phone ?? "").includes(q) ||
      (p.email ?? "").toLowerCase().includes(q) ||
      (p.insurance_plan_id ?? "").toLowerCase().includes(q)
    );
  });

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginatedPatients = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const inp: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    border: "1.5px solid var(--color-border-secondary)",
    borderRadius: 9,
    fontSize: 14,
    color: "var(--color-text-primary)",
    background: "var(--color-input-bg)",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };
  const inpFocus = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    e.currentTarget.style.borderColor = "var(--color-accent)";
    e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-accent-subtle)";
  };
  const inpBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    e.currentTarget.style.borderColor = "var(--color-border-secondary)";
    e.currentTarget.style.boxShadow = "none";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-background-primary)",
        color: "var(--color-text-primary)",
      }}
    >
      {showPasswordPrompt && (
        <PasswordPromptModal
          onSuccess={() => {
            setShowPasswordPrompt(false);
            exportToCsv(
              `patients-${new Date().toISOString().slice(0, 10)}.csv`,
              [
                "First Name",
                "Last Name",
                "Date of Birth",
                "Phone",
                "Email",
                "Insurance",
                "Created",
              ],
              patients.map((p) => [
                p.first_name,
                p.last_name,
                p.date_of_birth,
                p.phone,
                p.email,
                p.insurance_plan_id,
                p.created_at,
              ]),
            );
          }}
          onCancel={() => setShowPasswordPrompt(false)}
          actionLabel="export patient records to CSV"
        />
      )}

      {/* Premium page header */}
      <div
        style={{
          padding: "1.75rem 2rem 1.5rem",
          background:
            "linear-gradient(135deg, var(--color-background-primary) 0%, var(--color-accent-muted) 100%)",
          borderBottom: "1px solid var(--color-border-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "linear-gradient(135deg, #0f766e, #0d9488)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(15,118,110,0.3)",
              flexShrink: 0,
            }}
          >
            <svg
              width="22"
              height="22"
              fill="none"
              stroke="white"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                margin: 0,
              }}
            >
              Patients
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "var(--color-text-secondary)",
                margin: "2px 0 0",
              }}
            >
              {loading
                ? "Loading…"
                : `${patients.length} patient${patients.length !== 1 ? "s" : ""} registered`}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {patients.length > 0 && (
            <button
              onClick={() => setShowPasswordPrompt(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid var(--color-border-secondary)",
                background: "transparent",
                color: "var(--color-text-secondary)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.color = "var(--color-accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor =
                  "var(--color-border-secondary)";
                e.currentTarget.style.color = "var(--color-text-secondary)";
              }}
            >
              <svg
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>
          )}
          <button
            onClick={openAdd}
            onMouseEnter={() => setAddBtnHover(true)}
            onMouseLeave={() => setAddBtnHover(false)}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg, #0f766e, #0d9488)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: addBtnHover
                ? "0 6px 20px rgba(15,118,110,0.45)"
                : "0 4px 14px rgba(15,118,110,0.3)",
              transform: addBtnHover ? "translateY(-1px)" : "translateY(0)",
              transition: "all 0.18s ease",
            }}
          >
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add patient
          </button>
        </div>
      </div>

      <div style={{ padding: "1.5rem 2rem", maxWidth: 1200, margin: "0 auto" }}>
        {/* Search bar */}
        <div style={{ marginBottom: "1.25rem", position: "relative" }}>
          <div
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-text-secondary)",
              pointerEvents: "none",
            }}
          >
            <svg
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, email, or insurance…"
            style={{
              width: "100%",
              padding: "11px 14px 11px 42px",
              border: "1.5px solid var(--color-border-secondary)",
              borderRadius: 11,
              fontSize: 14,
              color: "var(--color-text-primary)",
              background: "var(--color-background-primary)",
              outline: "none",
              boxSizing: "border-box",
              transition: "all 0.15s",
              boxShadow: "var(--shadow-xs)",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--color-accent)";
              e.target.style.boxShadow = "0 0 0 3px var(--color-accent-subtle)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--color-border-secondary)";
              e.target.style.boxShadow = "var(--shadow-xs)";
            }}
          />
        </div>

        {/* Table card */}
        <div
          style={{
            background: "var(--color-background-primary)",
            border: "1px solid var(--color-border-secondary)",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {loading ? (
            <div style={{ padding: "4rem", textAlign: "center" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "3px solid var(--color-border-secondary)",
                  borderTopColor: "var(--color-accent)",
                  animation: "spin 0.7s linear infinite",
                  margin: "0 auto 12px",
                }}
              />
              <p
                style={{
                  fontSize: 14,
                  color: "var(--color-text-secondary)",
                  margin: 0,
                }}
              >
                Loading patients…
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "4.5rem 2rem",
                animation: "fadeIn 0.3s ease",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  background: "var(--color-accent-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <svg
                  width="28"
                  height="28"
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="1.6"
                  viewBox="0 0 24 24"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                  marginBottom: 6,
                }}
              >
                {search ? "No patients match your search" : "No patients yet"}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "var(--color-text-secondary)",
                  marginBottom: 22,
                  maxWidth: 320,
                  margin: "0 auto 22px",
                }}
              >
                {search
                  ? "Try a different search term."
                  : "Add your first patient to start running estimates and tracking coverage."}
              </div>
              {!search && (
                <button
                  onClick={openAdd}
                  style={{
                    padding: "10px 24px",
                    borderRadius: 10,
                    border: "none",
                    background: "linear-gradient(135deg, #0f766e, #0d9488)",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(15,118,110,0.3)",
                  }}
                >
                  + Add first patient
                </button>
              )}
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
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
                        padding: "11px 16px",
                        textAlign: h === "Actions" ? "right" : "left",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--color-text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedPatients.map((p, idx) => {
                  const color = avatarColor(p.first_name + p.last_name);
                  const isHovered = hoveredRow === p.id;
                  return (
                    <tr
                      key={p.id}
                      onMouseEnter={() => setHoveredRow(p.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        borderBottom: "1px solid var(--color-border-tertiary)",
                        background: isHovered
                          ? "var(--color-accent-muted)"
                          : idx % 2 === 1
                            ? "var(--color-background-secondary)"
                            : "transparent",
                        transition: "background 0.12s ease",
                      }}
                    >
                      <td style={{ padding: "13px 16px" }}>
                        <Link
                          href={`/dashboard/patients/${p.id}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 11,
                            textDecoration: "none",
                          }}
                        >
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              flexShrink: 0,
                              background: color.bg,
                              color: color.text,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                              fontWeight: 700,
                              letterSpacing: "0.02em",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                            }}
                          >
                            {initials(p.first_name, p.last_name)}
                          </div>
                          <div
                            style={{
                              fontWeight: 600,
                              color: "var(--color-accent)",
                              fontSize: 14,
                            }}
                          >
                            {p.first_name} {p.last_name}
                          </div>
                        </Link>
                      </td>
                      <td
                        style={{
                          padding: "13px 16px",
                          color: "var(--color-text-secondary)",
                          fontSize: 13,
                        }}
                      >
                        {formatDob(p.date_of_birth)}
                      </td>
                      <td
                        style={{
                          padding: "13px 16px",
                          color: "var(--color-text-secondary)",
                          fontSize: 13,
                        }}
                      >
                        {p.phone || "—"}
                      </td>
                      <td
                        style={{
                          padding: "13px 16px",
                          color: "var(--color-text-secondary)",
                          fontSize: 13,
                        }}
                      >
                        {p.email || "—"}
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        {p.insurance_plan_id ? (
                          <span
                            style={{
                              fontSize: 12,
                              padding: "3px 10px",
                              background: "var(--color-accent-muted)",
                              color: "var(--color-accent)",
                              borderRadius: 20,
                              fontWeight: 600,
                              border: "1px solid var(--color-accent-subtle)",
                            }}
                          >
                            {p.insurance_plan_id}
                          </span>
                        ) : (
                          <span
                            style={{
                              color: "var(--color-text-tertiary)",
                              fontSize: 13,
                            }}
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "13px 16px", textAlign: "right" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            onClick={() => openEdit(p)}
                            style={{
                              padding: "5px 13px",
                              borderRadius: 7,
                              border: "1px solid var(--color-border-secondary)",
                              background: "var(--color-background-primary)",
                              color: "var(--color-text-primary)",
                              fontSize: 12,
                              fontWeight: 500,
                              cursor: "pointer",
                              transition: "all 0.12s",
                            }}
                            onMouseEnter={(e) => {
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.borderColor = "var(--color-accent)";
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.color = "var(--color-accent)";
                            }}
                            onMouseLeave={(e) => {
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.borderColor =
                                "var(--color-border-secondary)";
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.color = "var(--color-text-primary)";
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(p.id)}
                            style={{
                              padding: "5px 13px",
                              borderRadius: 7,
                              border: "1px solid #fecaca",
                              background: "transparent",
                              color: "#ef4444",
                              fontSize: 12,
                              fontWeight: 500,
                              cursor: "pointer",
                              transition: "all 0.12s",
                            }}
                            onMouseEnter={(e) => {
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.background = "#fef2f2";
                            }}
                            onMouseLeave={(e) => {
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.background = "transparent";
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Pagination Controls */}
          {!loading && filtered.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "var(--color-background-primary)",
                borderTop: "1px solid var(--color-border-secondary)",
              }}
            >
              <div
                style={{ fontSize: 13, color: "var(--color-text-secondary)" }}
              >
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, filtered.length)} of{" "}
                {filtered.length} patients
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--color-border-secondary)",
                    background:
                      currentPage === 1
                        ? "var(--color-background-secondary)"
                        : "var(--color-background-primary)",
                    color:
                      currentPage === 1
                        ? "var(--color-text-tertiary)"
                        : "var(--color-text-primary)",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  Previous
                </button>
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-primary)",
                    fontWeight: 500,
                  }}
                >
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--color-border-secondary)",
                    background:
                      currentPage === totalPages
                        ? "var(--color-background-secondary)"
                        : "var(--color-background-primary)",
                    color:
                      currentPage === totalPages
                        ? "var(--color-text-tertiary)"
                        : "var(--color-text-primary)",
                    cursor:
                      currentPage === totalPages ? "not-allowed" : "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            backdropFilter: "blur(6px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            style={{
              background: "var(--color-background-primary)",
              borderRadius: 20,
              width: "100%",
              maxWidth: 520,
              boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
              maxHeight: "90vh",
              overflowY: "auto",
              border: "1px solid var(--color-border-secondary)",
              animation: "slideIn 0.25s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {/* Modal header with gradient stripe */}
            <div
              style={{
                padding: "1.25rem 1.75rem",
                borderBottom: "1px solid var(--color-border-secondary)",
                background:
                  "linear-gradient(135deg, var(--color-background-secondary) 0%, var(--color-accent-muted) 100%)",
                borderRadius: "20px 20px 0 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: "linear-gradient(135deg, #0f766e, #0d9488)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <h2
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                    margin: 0,
                  }}
                >
                  {editingId ? "Edit patient" : "Add new patient"}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: "1px solid var(--color-border-secondary)",
                  background: "var(--color-background-primary)",
                  color: "var(--color-text-secondary)",
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "1.5rem 1.75rem" }}>
              {error && (
                <div
                  style={{
                    marginBottom: 14,
                    padding: "10px 14px",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid #fecaca",
                    borderRadius: 9,
                    fontSize: 13,
                    color: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span>⚠</span> {error}
                </div>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                {[
                  {
                    label: "First name",
                    key: "firstName",
                    required: true,
                    placeholder: "Jane",
                  },
                  {
                    label: "Last name",
                    key: "lastName",
                    required: true,
                    placeholder: "Smith",
                  },
                  { label: "Date of birth", key: "dateOfBirth", type: "date" },
                  {
                    label: "Phone",
                    key: "phone",
                    placeholder: "+1 (416) 555-0100",
                  },
                ].map((field) => (
                  <div key={field.key}>
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--color-text-secondary)",
                        display: "block",
                        marginBottom: 5,
                      }}
                    >
                      {field.label}{" "}
                      {field.required && (
                        <span style={{ color: "#ef4444" }}>*</span>
                      )}
                    </label>
                    <input
                      type={field.type ?? "text"}
                      placeholder={field.placeholder}
                      style={inp}
                      value={(form as any)[field.key] ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [field.key]: e.target.value }))
                      }
                      onFocus={inpFocus}
                      onBlur={inpBlur}
                    />
                  </div>
                ))}
                <div style={{ gridColumn: "span 2" }}>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--color-text-secondary)",
                      display: "block",
                      marginBottom: 5,
                    }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    style={inp}
                    value={form.email ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    onFocus={inpFocus}
                    onBlur={inpBlur}
                  />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--color-text-secondary)",
                      display: "block",
                      marginBottom: 5,
                    }}
                  >
                    Insurance provider
                  </label>
                  <select
                    style={{ ...inp, cursor: "pointer" }}
                    value={form.insuranceProvider ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        insuranceProvider: e.target.value,
                      }))
                    }
                    onFocus={inpFocus}
                    onBlur={inpBlur}
                  >
                    <option value="">— None —</option>
                    {INSURERS.map((ins) => (
                      <option key={ins} value={ins}>
                        {ins}
                      </option>
                    ))}
                  </select>
                </div>
                {tenant?.plan !== "starter" && clinics.length > 1 && (
                  <div style={{ gridColumn: "span 2" }}>
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--color-text-secondary)",
                        display: "block",
                        marginBottom: 5,
                      }}
                    >
                      Clinic location{" "}
                      {editingId ? (
                        <span style={{ color: "var(--color-accent)" }}>
                          (transfer patient)
                        </span>
                      ) : (
                        ""
                      )}
                    </label>
                    <select
                      style={{ ...inp, cursor: "pointer" }}
                      value={form.clinicId ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          clinicId: e.target.value || undefined,
                        }))
                      }
                      onFocus={inpFocus}
                      onBlur={inpBlur}
                    >
                      <option value="">— Select clinic —</option>
                      {clinics.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                  paddingTop: 4,
                }}
              >
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: "9px 18px",
                    borderRadius: 9,
                    border: "1.5px solid var(--color-border-secondary)",
                    background: "transparent",
                    color: "var(--color-text-secondary)",
                    fontSize: 14,
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  style={{
                    padding: "9px 22px",
                    borderRadius: 9,
                    border: "none",
                    background: saving
                      ? "var(--color-text-secondary)"
                      : "linear-gradient(135deg, #0f766e, #0d9488)",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer",
                    boxShadow: saving
                      ? "none"
                      : "0 4px 14px rgba(15,118,110,0.3)",
                    transition: "all 0.15s",
                  }}
                >
                  {saving
                    ? "Saving…"
                    : editingId
                      ? "Save changes"
                      : "Add patient"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            style={{
              background: "var(--color-background-primary)",
              borderRadius: 20,
              padding: "2rem",
              width: "100%",
              maxWidth: 400,
              boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
              border: "1px solid var(--color-border-secondary)",
              animation: "slideIn 0.25s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                marginBottom: "1.1rem",
              }}
            >
              🗑
            </div>
            <h3
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                marginBottom: 6,
                margin: "0 0 6px",
              }}
            >
              Delete patient?
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "var(--color-text-secondary)",
                marginBottom: "1.5rem",
                lineHeight: 1.65,
              }}
            >
              This will permanently remove the patient and cannot be undone.
              Their estimate history will remain for audit purposes.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 9,
                  border: "1.5px solid var(--color-border-secondary)",
                  background: "transparent",
                  color: "var(--color-text-secondary)",
                  fontSize: 14,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete(deleteConfirm)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 9,
                  border: "none",
                  background: "linear-gradient(135deg, #dc2626, #ef4444)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(239,68,68,0.3)",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
