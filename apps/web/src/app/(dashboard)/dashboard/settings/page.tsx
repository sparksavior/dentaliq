"use client";

import { useState, useEffect, useCallback } from "react";
import { Building2, Settings2, MapPin, Plug, ShieldCheck, User, Sliders } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { tenantsApi, insurancePlansApi, type Tenant, type InsurancePlan, type CreateInsurancePlanInput } from "@/lib/api";

const PMS_LABELS: Record<string, string> = {
  open_dental: "Open Dental",
  dentrix: "Dentrix G7+",
  cleardent: "ClearDent",
  none: "Not connected",
};

const PLAN_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  starter: { label: "Starter", color: "#0f766e", bg: "rgba(15,118,110,0.1)", border: "rgba(15,118,110,0.2)" },
  pro:     { label: "Pro",     color: "#0e7490", bg: "rgba(14,116,144,0.1)", border: "rgba(14,116,144,0.2)" },
  enterprise: { label: "Enterprise", color: "#4f46e5", bg: "rgba(79,70,229,0.1)", border: "rgba(79,70,229,0.2)" },
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  trial:     { label: "Trial",     color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.2)" },
  active:    { label: "Active",    color: "#10b981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.2)" },
  suspended: { label: "Suspended", color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.2)" },
};

const emptyPlan: CreateInsurancePlanInput = {
  insurerName: "", planName: "", groupNumber: "",
  annualMax: undefined, preventiveCoverage: 100, basicCoverage: 80, majorCoverage: 50, orthoCoverage: 50,
};

type SettingsTab = "profile" | "locations" | "integrations" | "insurance" | "account" | "preferences";

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "profile",      label: "Profile",      icon: Settings2  },
  { id: "locations",    label: "Locations",    icon: MapPin      },
  { id: "integrations", label: "Integrations", icon: Plug        },
  { id: "insurance",    label: "Insurance",    icon: ShieldCheck },
  { id: "account",      label: "Account",      icon: User        },
  { id: "preferences",  label: "Preferences",  icon: Sliders     },
];

function Section({ title, desc, children, icon: Icon }: {
  title: string; desc?: string; children: React.ReactNode; icon?: React.ElementType;
}) {
  return (
    <div style={{
      background: "var(--color-background-primary)", border: "1px solid var(--color-border-secondary)",
      borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-sm)", marginBottom: 16,
    }}>
      <div style={{
        padding: "1rem 1.5rem", borderBottom: "1px solid var(--color-border-secondary)",
        background: "linear-gradient(135deg, var(--color-background-secondary) 0%, var(--color-accent-muted) 100%)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        {Icon && (
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: "linear-gradient(135deg, #0f766e, #0d9488)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Icon size={14} color="white" />
          </div>
        )}
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>{title}</h2>
          {desc && <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "1px 0 0" }}>{desc}</p>}
        </div>
      </div>
      <div style={{ padding: "1.5rem" }}>{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, accessToken } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  const [clinicName, setClinicName] = useState("");
  const [savingClinic, setSavingClinic] = useState(false);
  const [clinicMsg, setClinicMsg] = useState("");

  const [pmsType, setPmsType] = useState<"open_dental" | "dentrix" | "cleardent">("open_dental");
  const [pmsApiKey, setPmsApiKey] = useState("");
  const [savingPms, setSavingPms] = useState(false);
  const [pmsMsg, setPmsMsg] = useState("");

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<CreateInsurancePlanInput>(emptyPlan);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planError, setPlanError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [clinics, setClinics] = useState<any[]>([]);
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [clinicForm, setClinicForm] = useState({ name: "", address: "", phone: "", email: "" });
  const [savingClinicLoc, setSavingClinicLoc] = useState(false);
  const [clinicLocError, setClinicLocError] = useState("");

  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [saveBtnHover, setSaveBtnHover] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [t, ps, cls] = await Promise.all([
        tenantsApi.getTenant(accessToken).catch(() => null),
        insurancePlansApi.getPlans(accessToken).catch(() => [] as InsurancePlan[]),
        tenantsApi.getClinics(accessToken).catch(() => [] as any[]),
      ]);
      if (t) { setTenant(t); setClinicName(t.name); }
      setPlans(ps);
      setClinics(cls);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  const saveClinicName = async () => {
    if (!accessToken || !clinicName.trim()) return;
    setSavingClinic(true); setClinicMsg("");
    try {
      await tenantsApi.updateTenant(accessToken, { name: clinicName.trim() });
      setClinicMsg("Saved!"); setTimeout(() => setClinicMsg(""), 2500); await load();
    } catch (err: any) {
      setClinicMsg("Error: " + (err.message ?? "Save failed"));
    } finally { setSavingClinic(false); }
  };

  const connectPms = async () => {
    if (!accessToken || !pmsApiKey.trim()) return;
    setSavingPms(true); setPmsMsg("");
    try {
      await tenantsApi.connectPms(accessToken, { pmsType, pmsApiKey: pmsApiKey.trim() });
      setPmsMsg("Connected!"); setPmsApiKey(""); setTimeout(() => setPmsMsg(""), 2500); await load();
    } catch (err: any) {
      setPmsMsg("Error: " + (err.message ?? "Connection failed"));
    } finally { setSavingPms(false); }
  };

  const disconnectPms = async () => {
    if (!accessToken) return;
    setSavingPms(true);
    try { await tenantsApi.disconnectPms(accessToken); await load(); } catch {}
    setSavingPms(false);
  };

  const openAddPlan = () => { setEditingPlanId(null); setPlanForm(emptyPlan); setPlanError(""); setShowPlanModal(true); };
  const openEditPlan = (plan: InsurancePlan) => {
    setEditingPlanId(plan.id);
    setPlanForm({ insurerName: plan.insurer_name, planName: plan.plan_name ?? "", groupNumber: plan.group_number ?? "", annualMax: plan.annual_max ?? undefined, preventiveCoverage: plan.preventive_coverage, basicCoverage: plan.basic_coverage, majorCoverage: plan.major_coverage, orthoCoverage: plan.ortho_coverage });
    setPlanError(""); setShowPlanModal(true);
  };

  const savePlan = async () => {
    if (!accessToken) return;
    if (!planForm.insurerName.trim()) { setPlanError("Insurer name is required."); return; }
    setSavingPlan(true); setPlanError("");
    try {
      if (editingPlanId) { await insurancePlansApi.updatePlan(accessToken, editingPlanId, planForm); }
      else { await insurancePlansApi.createPlan(accessToken, planForm); }
      setShowPlanModal(false); await load();
    } catch (err: any) { setPlanError(err.message ?? "Save failed"); }
    finally { setSavingPlan(false); }
  };

  const confirmDeletePlan = async (id: string) => {
    if (!accessToken) return;
    try { await insurancePlansApi.deletePlan(accessToken, id); setDeleteConfirm(null); await load(); } catch {}
  };

  const saveClinicLocation = async () => {
    if (!accessToken) return;
    if (!clinicForm.name.trim()) { setClinicLocError("Name is required"); return; }
    setSavingClinicLoc(true); setClinicLocError("");
    try {
      await tenantsApi.createClinic(accessToken, clinicForm);
      setShowClinicModal(false); setClinicForm({ name: "", address: "", phone: "", email: "" }); await load();
    } catch (err: any) { setClinicLocError(err.message ?? "Failed to add clinic"); }
    finally { setSavingClinicLoc(false); }
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 12px", border: "1.5px solid var(--color-border-secondary)",
    borderRadius: 9, fontSize: 14, color: "var(--color-text-primary)", background: "var(--color-input-bg)",
    outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.15s, box-shadow 0.15s",
  };
  const inpFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = "var(--color-accent)";
    e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-accent-subtle)";
  };
  const inpBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = "var(--color-border-secondary)";
    e.currentTarget.style.boxShadow = "none";
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ height: 44, width: 200, borderRadius: 12, marginBottom: 28 }} className="skeleton" />
        <div style={{ display: "flex", gap: 2, marginBottom: 28, borderBottom: "1px solid var(--color-border-secondary)", paddingBottom: 0 }}>
          {[80, 90, 110, 90, 80, 100].map((w, i) => (
            <div key={i} style={{ height: 36, width: w, borderRadius: 8, marginBottom: -1 }} className="skeleton" />
          ))}
        </div>
        {[1, 2].map(i => (
          <div key={i} style={{ background: "var(--color-background-primary)", border: "1px solid var(--color-border-secondary)", borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "1rem 1.5rem", background: "var(--color-background-secondary)", borderBottom: "1px solid var(--color-border-secondary)" }}>
              <div style={{ height: 16, width: 160, borderRadius: 6 }} className="skeleton" />
            </div>
            <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ height: 40, borderRadius: 9 }} className="skeleton" />
              <div style={{ height: 40, width: "60%", borderRadius: 9 }} className="skeleton" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const planBadge = tenant ? PLAN_LABELS[tenant.plan] : null;
  const statusBadge = tenant ? STATUS_LABELS[tenant.status] : null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}>

      {/* Premium page header */}
      <div style={{
        padding: "1.75rem 2rem 1.5rem",
        background: "linear-gradient(135deg, var(--color-background-primary) 0%, var(--color-accent-muted) 100%)",
        borderBottom: "1px solid var(--color-border-secondary)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, maxWidth: 800, margin: "0 auto" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: "linear-gradient(135deg, #0f766e, #0d9488)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 14px rgba(15,118,110,0.3)", flexShrink: 0,
          }}>
            <Settings2 size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>Settings</h1>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
              Manage your clinic profile, integrations, insurance plans, and preferences.
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: "1.5rem 2rem", maxWidth: 800, margin: "0 auto", animation: "fadeInUp 0.35s ease-out" }}>
        {/* Tab navigation */}
        <div style={{
          display: "flex", gap: 2, marginBottom: "1.75rem",
          borderBottom: "1px solid var(--color-border-secondary)",
          overflowX: "auto",
        }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const isHov = hoveredTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                onMouseEnter={() => setHoveredTab(tab.id)}
                onMouseLeave={() => setHoveredTab(null)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "9px 15px", background: "transparent", border: "none",
                  borderBottom: isActive ? "2px solid var(--color-accent)" : "2px solid transparent",
                  color: isActive ? "var(--color-accent)" : isHov ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  fontWeight: isActive ? 700 : 500, fontSize: 13, cursor: "pointer",
                  whiteSpace: "nowrap", transition: "all 0.15s", marginBottom: -1,
                }}
              >
                <TabIcon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Profile tab */}
        {activeTab === "profile" && (
          <Section title="Clinic Profile" desc="Update your clinic name and view your account details." icon={Settings2}>
            {tenant && (
              <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem", flexWrap: "wrap" }}>
                {planBadge && (
                  <div style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: planBadge.bg, color: planBadge.color, fontWeight: 700, border: `1px solid ${planBadge.border}` }}>
                    {planBadge.label} Plan
                  </div>
                )}
                {statusBadge && (
                  <div style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: statusBadge.bg, color: statusBadge.color, fontWeight: 700, border: `1px solid ${statusBadge.border}`, display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusBadge.color, display: "inline-block", animation: tenant.status === "active" ? "pulseDot 2s ease-in-out infinite" : "none" }} />
                    {statusBadge.label}
                  </div>
                )}
                {tenant.status === "trial" && tenant.trialEndsAt && (
                  <div style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", fontWeight: 500, border: "1px solid var(--color-border-secondary)" }}>
                    Trial ends {new Date(tenant.trialEndsAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                )}
                <div style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", fontWeight: 500, border: "1px solid var(--color-border-secondary)" }}>
                  {tenant.memberCount} member{tenant.memberCount !== 1 ? "s" : ""}
                </div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "flex-end" }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 5 }}>Clinic name</label>
                <input style={inp} value={clinicName} onChange={e => setClinicName(e.target.value)} onFocus={inpFocus} onBlur={inpBlur} />
              </div>
              <button
                onClick={saveClinicName}
                disabled={savingClinic || clinicName === tenant?.name}
                onMouseEnter={() => setSaveBtnHover(true)}
                onMouseLeave={() => setSaveBtnHover(false)}
                style={{
                  padding: "10px 20px", borderRadius: 9, border: "none",
                  background: savingClinic || clinicName === tenant?.name ? "var(--color-background-secondary)" : "linear-gradient(135deg, #0f766e, #0d9488)",
                  color: savingClinic || clinicName === tenant?.name ? "var(--color-text-secondary)" : "#fff",
                  fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", transition: "all 0.15s",
                  cursor: savingClinic || clinicName === tenant?.name ? "not-allowed" : "pointer",
                  boxShadow: savingClinic || clinicName === tenant?.name ? "none" : saveBtnHover ? "0 6px 18px rgba(15,118,110,0.4)" : "0 4px 12px rgba(15,118,110,0.25)",
                  transform: saveBtnHover && !savingClinic && clinicName !== tenant?.name ? "translateY(-1px)" : "translateY(0)",
                }}
              >
                {savingClinic ? "Saving…" : "Save"}
              </button>
            </div>
            {clinicMsg && (
              <div style={{ marginTop: 8, fontSize: 13, color: clinicMsg.startsWith("Error") ? "#ef4444" : "#10b981", fontWeight: 600 }}>
                {clinicMsg.startsWith("Error") ? "⚠ " : "✓ "}{clinicMsg}
              </div>
            )}
          </Section>
        )}

        {/* Locations tab */}
        {activeTab === "locations" && (
          <Section title="Clinic Locations" desc="Manage multiple office locations. Data for patients and estimates will be scoped by location." icon={MapPin}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {clinics.map(c => (
                <div key={c.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "13px 16px", background: "var(--color-background-secondary)",
                  border: "1px solid var(--color-border-secondary)", borderRadius: 12,
                  transition: "all 0.15s",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: "var(--color-accent-muted)", color: "var(--color-accent)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: "1px solid var(--color-accent-subtle)",
                    }}>
                      <Building2 size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{c.address || "No address set"}</div>
                    </div>
                  </div>
                  <div style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.04em",
                    background: c.status === "active" ? "rgba(16,185,129,0.1)" : "var(--color-background-secondary)",
                    color: c.status === "active" ? "#10b981" : "var(--color-text-secondary)",
                    border: `1px solid ${c.status === "active" ? "rgba(16,185,129,0.2)" : "var(--color-border-secondary)"}`,
                    display: "flex", alignItems: "center", gap: 5,
                  }}>
                    {c.status === "active" && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#10b981", display: "inline-block", animation: "pulseDot 2s ease-in-out infinite" }} />}
                    {c.status}
                  </div>
                </div>
              ))}
              {tenant?.plan !== "starter" && clinics.length < (tenant?.plan === "pro" ? 3 : 999) && (
                <button
                  onClick={() => setShowClinicModal(true)}
                  style={{
                    width: "100%", padding: "13px",
                    border: "1.5px dashed var(--color-border-primary)",
                    background: "transparent", color: "var(--color-text-secondary)",
                    borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-accent)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-accent)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--color-accent-muted)" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border-primary)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-secondary)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                >
                  + Add new location
                </button>
              )}
              {tenant?.plan === "starter" && (
                <div style={{
                  padding: "11px 14px", background: "rgba(14,116,144,0.06)", borderRadius: 10,
                  fontSize: 13, color: "#0e7490", display: "flex", alignItems: "center", gap: 8,
                  border: "1px solid rgba(14,116,144,0.15)",
                }}>
                  💡 Upgrade to Pro to add up to 3 locations.
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Integrations tab */}
        {activeTab === "integrations" && (
          <Section title="Practice Management Software" desc="Connect your PMS to sync patients, procedures, and insurance plans automatically." icon={Plug}>
            {tenant?.pmsConnected ? (
              <div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                  background: "var(--color-accent-muted)", border: "1.5px solid var(--color-accent-subtle)",
                  borderRadius: 12, marginBottom: "1rem",
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: "linear-gradient(135deg, #0f766e, #0d9488)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0,
                  }}>🦷</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-accent)" }}>
                      {PMS_LABELS[tenant.pmsType] || tenant.pmsType} connected
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-accent)", opacity: 0.8, marginTop: 2 }}>Patient sync active</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#10b981", fontWeight: 600 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", animation: "pulseDot 1.5s ease-in-out infinite" }} />
                    Live
                  </div>
                </div>
                <button
                  onClick={disconnectPms}
                  disabled={savingPms}
                  style={{
                    padding: "8px 18px", borderRadius: 9, border: "1.5px solid #ef4444",
                    background: "transparent", color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                >
                  {savingPms ? "Disconnecting…" : "Disconnect PMS"}
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 5 }}>PMS software</label>
                    <select style={{ ...inp, cursor: "pointer" }} value={pmsType} onChange={e => setPmsType(e.target.value as any)} onFocus={inpFocus} onBlur={inpBlur}>
                      <option value="open_dental">Open Dental</option>
                      <option value="dentrix">Dentrix G7+</option>
                      <option value="cleardent">ClearDent</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 5 }}>API Key</label>
                    <input type="password" placeholder="Enter your PMS API key…" style={inp} value={pmsApiKey} onChange={e => setPmsApiKey(e.target.value)} onFocus={inpFocus} onBlur={inpBlur} />
                  </div>
                </div>
                <button
                  onClick={connectPms}
                  disabled={savingPms || !pmsApiKey.trim()}
                  style={{
                    padding: "9px 22px", borderRadius: 9, border: "none",
                    background: savingPms || !pmsApiKey.trim() ? "var(--color-background-secondary)" : "linear-gradient(135deg, #0f766e, #0d9488)",
                    color: savingPms || !pmsApiKey.trim() ? "var(--color-text-secondary)" : "#fff",
                    fontSize: 14, fontWeight: 600,
                    cursor: savingPms || !pmsApiKey.trim() ? "not-allowed" : "pointer",
                    boxShadow: savingPms || !pmsApiKey.trim() ? "none" : "0 4px 14px rgba(15,118,110,0.3)",
                    transition: "all 0.15s",
                  }}
                >
                  {savingPms ? "Connecting…" : "Connect PMS"}
                </button>
                {pmsMsg && (
                  <div style={{ marginTop: 8, fontSize: 13, color: pmsMsg.startsWith("Error") ? "#ef4444" : "#10b981", fontWeight: 600 }}>
                    {pmsMsg.startsWith("Error") ? "⚠ " : "✓ "}{pmsMsg}
                  </div>
                )}
              </div>
            )}
          </Section>
        )}

        {/* Insurance plans tab */}
        {activeTab === "insurance" && (
          <Section title="Insurance Plans" desc="Manage the insurance plans your clinic accepts. Used to assign coverage to patients." icon={ShieldCheck}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
              <button
                onClick={openAddPlan}
                style={{
                  padding: "8px 18px", borderRadius: 9, border: "none",
                  background: "linear-gradient(135deg, #0f766e, #0d9488)",
                  color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(15,118,110,0.25)", transition: "all 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 18px rgba(15,118,110,0.4)" }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 12px rgba(15,118,110,0.25)" }}
              >
                + Add plan
              </button>
            </div>
            {plans.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2.5rem", background: "var(--color-background-secondary)", borderRadius: 12, border: "1.5px dashed var(--color-border-secondary)" }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: "var(--color-accent-muted)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <ShieldCheck size={24} color="var(--color-accent)" />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 5 }}>No insurance plans yet</div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>Add your clinic's insurance plans to enable accurate coverage matching.</div>
                <button onClick={openAddPlan} style={{
                  padding: "8px 20px", borderRadius: 9, border: "none",
                  background: "linear-gradient(135deg, #0f766e, #0d9488)", color: "#fff",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(15,118,110,0.25)",
                }}>+ Add first plan</button>
              </div>
            ) : (
              <div style={{ border: "1px solid var(--color-border-secondary)", borderRadius: 12, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--color-background-secondary)", borderBottom: "1px solid var(--color-border-secondary)" }}>
                      {["Insurer", "Plan name", "Annual max", "Prev.", "Basic", "Major", "Ortho", ""].map(h => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: h === "" ? "right" : "left", fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((plan, idx) => (
                      <tr key={plan.id} style={{
                        borderBottom: "1px solid var(--color-border-tertiary)",
                        background: idx % 2 === 1 ? "var(--color-background-secondary)" : "transparent",
                        transition: "background 0.12s",
                      }}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = "var(--color-accent-muted)" }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 1 ? "var(--color-background-secondary)" : "transparent" }}
                      >
                        <td style={{ padding: "11px 12px", fontWeight: 700, color: "var(--color-text-primary)" }}>{plan.insurer_name}</td>
                        <td style={{ padding: "11px 12px", color: "var(--color-text-secondary)" }}>{plan.plan_name || "—"}</td>
                        <td style={{ padding: "11px 12px", color: "var(--color-text-secondary)" }}>{plan.annual_max ? `$${plan.annual_max.toLocaleString()}` : "—"}</td>
                        {[plan.preventive_coverage, plan.basic_coverage, plan.major_coverage, plan.ortho_coverage].map((val, i) => (
                          <td key={i} style={{ padding: "11px 12px", color: "var(--color-accent)", fontWeight: 700 }}>{val}%</td>
                        ))}
                        <td style={{ padding: "11px 12px", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                            <button onClick={() => openEditPlan(plan)} style={{
                              padding: "4px 10px", borderRadius: 6,
                              border: "1px solid var(--color-border-secondary)",
                              background: "transparent", color: "var(--color-text-secondary)",
                              fontSize: 11, fontWeight: 500, cursor: "pointer", transition: "all 0.12s",
                            }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-accent)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-accent)" }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border-secondary)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-secondary)" }}
                            >Edit</button>
                            <button onClick={() => setDeleteConfirm(plan.id)} style={{
                              padding: "4px 10px", borderRadius: 6,
                              border: "1px solid #fecaca", background: "transparent",
                              color: "#ef4444", fontSize: 11, fontWeight: 500, cursor: "pointer", transition: "all 0.12s",
                            }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.06)" }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                            >Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        )}

        {/* Account tab */}
        {activeTab === "account" && (
          <Section title="Account" desc="Your user account details." icon={User}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                ["Name", user?.name ?? "—"],
                ["Email", user?.email ?? "—"],
                ["Role", (user?.role ?? "").replace("_", " ")],
                ["MFA", user?.mfaEnabled ? "✓ Enabled" : "⚠ Not enabled"],
              ].map(([label, value]) => (
                <div key={label} style={{
                  padding: "13px 15px", background: "var(--color-background-secondary)",
                  borderRadius: 10, border: "1px solid var(--color-border-secondary)",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                  <div style={{
                    fontSize: 14, fontWeight: 600,
                    color: label === "MFA" && value === "⚠ Not enabled" ? "#f59e0b" : label === "MFA" ? "#10b981" : "var(--color-text-primary)",
                  }}>{value}</div>
                </div>
              ))}
            </div>
            {!user?.mfaEnabled && (
              <div style={{
                marginTop: 12, padding: "11px 14px",
                background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                borderRadius: 10, fontSize: 13, color: "#f59e0b",
              }}>
                <strong>PHIPA reminder:</strong> Enable two-factor authentication to secure access to patient health information.
              </div>
            )}
          </Section>
        )}

        {/* Preferences tab */}
        {activeTab === "preferences" && (
          <>
            <Section title="Preferences" desc="Customize your DentalIQ experience." icon={Sliders}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "13px 15px", background: "var(--color-background-secondary)",
                borderRadius: 10, border: "1px solid var(--color-border-secondary)",
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 2 }}>App Tour Guide</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Replay the onboarding tour of the platform.</div>
                </div>
                <button
                  onClick={() => window.dispatchEvent(new Event("diq_show_tour"))}
                  style={{
                    padding: "8px 16px", borderRadius: 8, border: "1.5px solid var(--color-border-secondary)",
                    background: "var(--color-background-primary)", color: "var(--color-text-primary)",
                    fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-accent)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-accent)" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border-secondary)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-primary)" }}
                >Show Tour</button>
              </div>
            </Section>

            {tenant?.plan === "cortex" && (
              <Section title="Digital Workforce" desc="Manage your active AI agents and explore new ones." icon={Sliders}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "13px 15px",
                  background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))",
                  borderRadius: 10, border: "1px solid rgba(99,102,241,0.18)",
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 2 }}>Hire Digital Employees</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Scale your clinic by deploying autonomous agents.</div>
                  </div>
                  <button
                    onClick={() => (window.location.href = "/dashboard/cortex/hire")}
                    style={{
                      padding: "8px 18px", borderRadius: 8, border: "none",
                      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                      color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(99,102,241,0.3)", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(99,102,241,0.4)" }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px rgba(99,102,241,0.3)" }}
                  >Hire Agents</button>
                </div>
              </Section>
            )}
          </>
        )}
      </div>

      {/* Insurance plan modal */}
      {showPlanModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(6px)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowPlanModal(false); }}>
          <div style={{
            background: "var(--color-background-primary)", borderRadius: 20, width: "100%", maxWidth: 540,
            boxShadow: "0 24px 64px rgba(0,0,0,0.45)", maxHeight: "90vh", overflowY: "auto",
            border: "1px solid var(--color-border-secondary)", animation: "slideIn 0.25s cubic-bezier(0.16,1,0.3,1)",
          }}>
            <div style={{
              padding: "1.25rem 1.75rem", borderBottom: "1px solid var(--color-border-secondary)",
              background: "linear-gradient(135deg, var(--color-background-secondary) 0%, var(--color-accent-muted) 100%)",
              borderRadius: "20px 20px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #0f766e, #0d9488)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ShieldCheck size={15} color="white" />
                </div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>{editingPlanId ? "Edit plan" : "Add insurance plan"}</h2>
              </div>
              <button onClick={() => setShowPlanModal(false)} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-secondary)", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            <div style={{ padding: "1.5rem 1.75rem" }}>
              {planError && <div style={{ marginBottom: 14, padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid #fecaca", borderRadius: 9, fontSize: 13, color: "#dc2626" }}>⚠ {planError}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 5 }}>Insurer name <span style={{ color: "#ef4444" }}>*</span></label>
                  <input style={inp} placeholder="e.g. Sun Life Financial" value={planForm.insurerName} onChange={e => setPlanForm(f => ({ ...f, insurerName: e.target.value }))} onFocus={inpFocus} onBlur={inpBlur} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 5 }}>Plan name</label>
                  <input style={inp} placeholder="e.g. Group Benefits Basic" value={planForm.planName ?? ""} onChange={e => setPlanForm(f => ({ ...f, planName: e.target.value }))} onFocus={inpFocus} onBlur={inpBlur} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 5 }}>Group number</label>
                  <input style={inp} value={planForm.groupNumber ?? ""} onChange={e => setPlanForm(f => ({ ...f, groupNumber: e.target.value }))} onFocus={inpFocus} onBlur={inpBlur} />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 5 }}>Annual maximum ($)</label>
                  <input type="number" style={inp} placeholder="e.g. 1500" value={planForm.annualMax ?? ""} onChange={e => setPlanForm(f => ({ ...f, annualMax: e.target.value ? Number(e.target.value) : undefined }))} onFocus={inpFocus} onBlur={inpBlur} />
                </div>
              </div>
              <div style={{ background: "var(--color-background-secondary)", borderRadius: 11, padding: "1rem", marginBottom: 16, border: "1px solid var(--color-border-secondary)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 10, letterSpacing: "0.02em" }}>Coverage tiers (%)</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {([ ["Preventive", "preventiveCoverage"], ["Basic", "basicCoverage"], ["Major", "majorCoverage"], ["Ortho", "orthoCoverage"] ] as [string, keyof CreateInsurancePlanInput][]).map(([label, key]) => (
                    <div key={key}>
                      <label style={{ fontSize: 11, color: "var(--color-text-secondary)", display: "block", marginBottom: 4, fontWeight: 600 }}>{label}</label>
                      <input type="number" min={0} max={100} style={{ ...inp, textAlign: "center", fontWeight: 800, color: "var(--color-accent)", fontSize: 16 }} value={(planForm[key] as number) ?? 0} onChange={e => setPlanForm(f => ({ ...f, [key]: Number(e.target.value) }))} onFocus={inpFocus} onBlur={inpBlur} />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setShowPlanModal(false)} style={{ padding: "9px 18px", borderRadius: 9, border: "1.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", fontSize: 14, cursor: "pointer", fontWeight: 500 }}>Cancel</button>
                <button onClick={savePlan} disabled={savingPlan} style={{
                  padding: "9px 22px", borderRadius: 9, border: "none",
                  background: savingPlan ? "var(--color-background-secondary)" : "linear-gradient(135deg, #0f766e, #0d9488)",
                  color: "#fff", fontSize: 14, fontWeight: 600, cursor: savingPlan ? "not-allowed" : "pointer",
                  boxShadow: savingPlan ? "none" : "0 4px 14px rgba(15,118,110,0.3)",
                }}>
                  {savingPlan ? "Saving…" : editingPlanId ? "Save changes" : "Add plan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete plan confirmation */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(6px)" }}>
          <div style={{ background: "var(--color-background-primary)", borderRadius: 20, padding: "2rem", width: "100%", maxWidth: 380, boxShadow: "0 24px 64px rgba(0,0,0,0.45)", border: "1px solid var(--color-border-secondary)", animation: "slideIn 0.25s cubic-bezier(0.16,1,0.3,1)" }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: "1rem" }}>🗑</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 6, margin: "0 0 6px" }}>Delete insurance plan?</h3>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: "1.5rem", lineHeight: 1.65 }}>This will remove the plan. Patients assigned to this plan will have their insurance field cleared.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: "10px", borderRadius: 9, border: "1.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", fontSize: 14, cursor: "pointer", fontWeight: 500 }}>Cancel</button>
              <button onClick={() => confirmDeletePlan(deleteConfirm)} style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: "linear-gradient(135deg, #dc2626, #ef4444)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(239,68,68,0.3)" }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Clinic location modal */}
      <ClinicModal
        open={showClinicModal}
        onClose={() => setShowClinicModal(false)}
        onSave={saveClinicLocation}
        form={clinicForm}
        setForm={setClinicForm}
        loading={savingClinicLoc}
        error={clinicLocError}
        inp={inp}
        inpFocus={inpFocus}
        inpBlur={inpBlur}
      />
    </div>
  );
}

function ClinicModal({ open, onClose, onSave, form, setForm, loading, error, inp, inpFocus, inpBlur }: any) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: 20, width: "100%", maxWidth: 440, boxShadow: "0 24px 64px rgba(0,0,0,0.45)", border: "1px solid var(--color-border-secondary)", animation: "slideIn 0.25s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ padding: "1.25rem 1.75rem", borderBottom: "1px solid var(--color-border-secondary)", background: "linear-gradient(135deg, var(--color-background-secondary) 0%, var(--color-accent-muted) 100%)", borderRadius: "20px 20px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #0f766e, #0d9488)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 size={15} color="white" />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>Add Clinic Location</h2>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-secondary)", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ padding: "1.5rem 1.75rem" }}>
          {error && <div style={{ marginBottom: 14, padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid #fecaca", borderRadius: 9, fontSize: 13, color: "#dc2626" }}>⚠ {error}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: "1.5rem" }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 5 }}>Clinic Name <span style={{ color: "#ef4444" }}>*</span></label>
              <input style={inp} placeholder="e.g. West End Dental" value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} onFocus={inpFocus} onBlur={inpBlur} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 5 }}>Address</label>
              <input style={inp} placeholder="123 Main St..." value={form.address} onChange={(e: any) => setForm({ ...form, address: e.target.value })} onFocus={inpFocus} onBlur={inpBlur} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 5 }}>Phone</label>
                <input style={inp} placeholder="555-0123" value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} onFocus={inpFocus} onBlur={inpBlur} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 5 }}>Email</label>
                <input style={inp} placeholder="office@..." value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} onFocus={inpFocus} onBlur={inpBlur} />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 9, border: "1.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", fontSize: 14, cursor: "pointer", fontWeight: 500 }}>Cancel</button>
            <button onClick={onSave} disabled={loading} style={{
              padding: "9px 22px", borderRadius: 9, border: "none",
              background: loading ? "var(--color-background-secondary)" : "linear-gradient(135deg, #0f766e, #0d9488)",
              color: "#fff", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 4px 14px rgba(15,118,110,0.3)",
            }}>
              {loading ? "Adding…" : "Add Location"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
