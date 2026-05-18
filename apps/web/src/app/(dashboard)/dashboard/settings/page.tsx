"use client";

import { useState, useEffect, useCallback } from "react";
import { Building2, Settings2, MapPin, Plug, ShieldCheck, User, Sliders, Users, Mail, Trash2, Pencil, X, Check, Clock, Smartphone, Monitor } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { tenantsApi, insurancePlansApi, teamApi, mfaApi, type Tenant, type InsurancePlan, type CreateInsurancePlanInput, type TeamMember, type PendingInvite, type PermissionKey, type MfaDevice, type MfaMethodType, ALL_PERMISSIONS, PERMISSION_LABELS } from "@/lib/api";

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

type SettingsTab = "profile" | "locations" | "integrations" | "insurance" | "account" | "preferences" | "team";

const ALL_TABS: { id: SettingsTab; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
  { id: "profile",      label: "Profile",      icon: Settings2  },
  { id: "team",         label: "Team",         icon: Users, adminOnly: true },
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

  // ── Security (MFA) tab state ────────────────────────────────
  const [mfaDevices, setMfaDevices] = useState<MfaDevice[]>([]);
  const [mfaEnabledMethods, setMfaEnabledMethods] = useState<MfaMethodType[]>([]);
  const [mfaSecurityLoading, setMfaSecurityLoading] = useState(false);
  // Add method flow (opens pick → setup/verify)
  const [showChangeMfa, setShowChangeMfa] = useState(false);
  const [changeMfaMethod, setChangeMfaMethod] = useState<MfaMethodType>("totp");
  const [changeMfaSubStep, setChangeMfaSubStep] = useState<"pick" | "setup" | "verify">("pick");
  const [changeMfaData, setChangeMfaData] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [changeMfaCode, setChangeMfaCode] = useState("");
  const [changeMfaLoading, setChangeMfaLoading] = useState(false);
  const [changeMfaError, setChangeMfaError] = useState("");
  const [changeMfaResendCooldown, setChangeMfaResendCooldown] = useState(0);
  // Disable single method flow
  const [showDisableMethod, setShowDisableMethod] = useState(false);
  const [disableMethodTarget, setDisableMethodTarget] = useState<MfaMethodType | null>(null);
  const [disableMethodPassword, setDisableMethodPassword] = useState("");
  const [disableMethodCode, setDisableMethodCode] = useState("");
  const [disableMethodLoading, setDisableMethodLoading] = useState(false);
  const [disableMethodError, setDisableMethodError] = useState("");
  // Add device flow
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [addDeviceData, setAddDeviceData] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [addDeviceCode, setAddDeviceCode] = useState("");
  const [addDeviceLabel, setAddDeviceLabel] = useState("Authenticator");
  const [addDeviceLoading, setAddDeviceLoading] = useState(false);
  const [addDeviceError, setAddDeviceError] = useState("");
  // Backup codes
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodesPassword, setBackupCodesPassword] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [backupCodesLoading, setBackupCodesLoading] = useState(false);
  const [backupCodesError, setBackupCodesError] = useState("");

  // ── Team tab state ──────────────────────────────────────────
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', permissions: [] as PermissionKey[] });
  const [inviteError, setInviteError] = useState('');
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [editPermsFor, setEditPermsFor] = useState<string | null>(null); // userId
  const [editPerms, setEditPerms] = useState<PermissionKey[]>([]);
  const [editPermsSaving, setEditPermsSaving] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null); // userId or inviteId
  const [removeType, setRemoveType] = useState<'member' | 'invite'>('member');

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

  // ── MFA Security actions ─────────────────────────────────
  const loadMfaDevices = useCallback(async () => {
    if (!accessToken) return;
    setMfaSecurityLoading(true);
    try {
      const [devices, status] = await Promise.all([
        mfaApi.listDevices(accessToken).catch(() => [] as MfaDevice[]),
        mfaApi.getStatus(accessToken).catch(() => null),
      ]);
      setMfaDevices(devices);
      if (status?.methods) setMfaEnabledMethods(status.methods);
    } finally {
      setMfaSecurityLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { if (activeTab === 'account') loadMfaDevices(); }, [activeTab, loadMfaDevices]);

  async function startChangeMfaMethod(method: MfaMethodType) {
    if (!accessToken) return;
    setChangeMfaMethod(method);
    setChangeMfaError("");
    setChangeMfaCode("");
    setChangeMfaLoading(true);
    try {
      if (method === "totp") {
        const data = await mfaApi.setupTotp(accessToken);
        setChangeMfaData(data);
        setChangeMfaSubStep("setup");
      } else if (method === "email") {
        await mfaApi.setupEmail(accessToken);
        setChangeMfaResendCooldown(30);
        const t = setInterval(() => setChangeMfaResendCooldown(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
        setChangeMfaSubStep("verify");
      }
    } catch (err: any) {
      setChangeMfaError(err?.message ?? "Failed to start setup");
    } finally {
      setChangeMfaLoading(false);
    }
  }

  async function confirmChangeMfa() {
    if (!accessToken || !changeMfaCode || changeMfaCode.length < 6) return;
    setChangeMfaLoading(true);
    setChangeMfaError("");
    try {
      if (changeMfaMethod === "totp" && changeMfaData) {
        await mfaApi.verifyTotp(accessToken, changeMfaCode, changeMfaData.secret);
      } else if (changeMfaMethod === "email") {
        await mfaApi.verifyEmailSetup(accessToken, changeMfaCode);
      }
      setShowChangeMfa(false);
      setChangeMfaSubStep("pick");
      setChangeMfaData(null);
      setChangeMfaCode("");
      // Refresh so user context reflects new mfaMethods
      window.location.reload();
    } catch (err: any) {
      setChangeMfaError(err?.message ?? "Invalid code. Please try again.");
    } finally {
      setChangeMfaLoading(false);
    }
  }

  async function startAddDevice() {
    if (!accessToken) return;
    setAddDeviceError("");
    setAddDeviceCode("");
    setAddDeviceLoading(true);
    try {
      const data = await mfaApi.initiateAddDevice(accessToken);
      setAddDeviceData(data);
      setShowAddDevice(true);
    } catch (err: any) {
      setAddDeviceError(err?.message ?? "Failed to start device setup");
    } finally {
      setAddDeviceLoading(false);
    }
  }

  async function confirmAddDevice() {
    if (!accessToken || !addDeviceData || addDeviceCode.length !== 6) return;
    setAddDeviceLoading(true);
    setAddDeviceError("");
    try {
      await mfaApi.confirmAddDevice(accessToken, addDeviceData.secret, addDeviceCode, addDeviceLabel);
      setShowAddDevice(false);
      setAddDeviceData(null);
      setAddDeviceCode("");
      setAddDeviceLabel("Authenticator");
      await loadMfaDevices();
    } catch (err: any) {
      setAddDeviceError(err?.message ?? "Invalid code. Please try again.");
    } finally {
      setAddDeviceLoading(false);
    }
  }

  async function removeDevice(deviceId: string) {
    if (!accessToken) return;
    try {
      await mfaApi.removeDevice(accessToken, deviceId);
      await loadMfaDevices();
    } catch { /* ignore */ }
  }

  async function regenBackupCodes() {
    if (!accessToken || !backupCodesPassword) return;
    setBackupCodesLoading(true);
    setBackupCodesError("");
    try {
      const res = await mfaApi.regenerateBackupCodes(accessToken, backupCodesPassword);
      setBackupCodes(res.backupCodes);
      setBackupCodesPassword("");
    } catch (err: any) {
      setBackupCodesError(err?.message ?? "Incorrect password");
    } finally {
      setBackupCodesLoading(false);
    }
  }

  async function disableSingleMethod() {
    if (!accessToken || !disableMethodTarget || !disableMethodPassword || disableMethodCode.length < 6) return;
    setDisableMethodLoading(true);
    setDisableMethodError("");
    try {
      await mfaApi.disableMethod(accessToken, disableMethodTarget, disableMethodPassword, disableMethodCode);
      setShowDisableMethod(false);
      setDisableMethodTarget(null);
      setDisableMethodPassword("");
      setDisableMethodCode("");
      await loadMfaDevices();
      window.location.reload(); // refresh user context so mfaEnabled/mfaMethods update
    } catch (err: any) {
      setDisableMethodError(err?.message ?? "Incorrect password or code.");
    } finally {
      setDisableMethodLoading(false);
    }
  }

  const loadTeam = useCallback(async () => {
    if (!accessToken || user?.role !== 'admin') return;
    setTeamLoading(true);
    try {
      const [members, invites] = await Promise.all([
        teamApi.listMembers(accessToken).catch(() => [] as TeamMember[]),
        teamApi.listPendingInvites(accessToken).catch(() => [] as PendingInvite[]),
      ]);
      setTeamMembers(members);
      setPendingInvites(invites);
    } finally {
      setTeamLoading(false);
    }
  }, [accessToken, user]);

  const handleInvite = async () => {
    if (!accessToken) return;
    setInviteError(''); setInviteSuccess('');
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) { setInviteError('Name and email are required.'); return; }
    if (!inviteForm.email.includes('@')) { setInviteError('Please enter a valid email address.'); return; }
    if (inviteForm.permissions.length === 0) { setInviteError('Select at least one permission.'); return; }
    setInviteSaving(true);
    try {
      await teamApi.invite(accessToken, inviteForm);
      setInviteSuccess(`Invite sent to ${inviteForm.email}! They'll receive an email to set up their account.`);
      setInviteForm({ name: '', email: '', permissions: [] });
      await loadTeam();
      setTimeout(() => { setShowInviteModal(false); setInviteSuccess(''); }, 3000);
    } catch (err: any) { setInviteError(err.message ?? 'Failed to send invite.'); }
    finally { setInviteSaving(false); }
  };

  const handleSavePerms = async () => {
    if (!accessToken || !editPermsFor) return;
    setEditPermsSaving(true);
    try {
      await teamApi.updatePermissions(accessToken, editPermsFor, editPerms);
      setEditPermsFor(null);
      await loadTeam();
    } catch (err: any) { alert(err.message ?? 'Failed to update permissions.'); }
    finally { setEditPermsSaving(false); }
  };

  const handleRemove = async () => {
    if (!accessToken || !removeConfirm) return;
    try {
      if (removeType === 'member') await teamApi.removeMember(accessToken, removeConfirm);
      else await teamApi.revokeInvite(accessToken, removeConfirm);
      setRemoveConfirm(null);
      await loadTeam();
    } catch (err: any) { alert(err.message ?? 'Failed to remove.'); }
  };

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (activeTab === 'team') loadTeam(); }, [activeTab, loadTeam]);

  const saveClinicName = async () => {
    if (!accessToken || !clinicName.trim()) return;
    setSavingClinic(true); setClinicMsg("");
    try {
      await tenantsApi.updateTenant(accessToken, { name: clinicName.trim() });
      setClinicMsg("Saved!"); setTimeout(() => setClinicMsg(""), 2500); await load();
      // Tell the sidebar to refresh its clinic list immediately
      window.dispatchEvent(new CustomEvent("diq_clinic_updated"));
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
          {ALL_TABS.filter(t => !t.adminOnly || user?.role === 'admin').map(tab => {
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

        {/* Team tab (admin only) */}
        {activeTab === "team" && user?.role === "admin" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)" }}>Team Members</h2>
                <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--color-text-secondary)" }}>
                  Invite team members and control exactly what they can access.
                </p>
              </div>
              <button
                onClick={() => { setInviteForm({ name: '', email: '', permissions: [] }); setInviteError(''); setInviteSuccess(''); setShowInviteModal(true); }}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "linear-gradient(135deg,#0f766e,#0d9488)", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                <Mail size={14} /> Invite Member
              </button>
            </div>

            {teamLoading && (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-secondary)", fontSize: 14 }}>Loading team…</div>
            )}

            {/* Active members */}
            {!teamLoading && teamMembers.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>Active ({teamMembers.length})</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {teamMembers.map(member => {
                    const isCurrentUser = member.id === user?.id;
                    return (
                      <div key={member.id} style={{ background: "var(--color-background-secondary)", border: "1px solid var(--color-border-secondary)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 14 }}>
                        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#0f766e,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--color-text-primary)" }}>{member.name}</span>
                            {isCurrentUser && <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 100, background: "rgba(13,148,136,0.12)", color: "#0d9488", fontWeight: 600 }}>You</span>}
                            {member.role === 'admin' && <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 100, background: "rgba(245,158,11,0.1)", color: "#f59e0b", fontWeight: 600 }}>Admin</span>}
                            {!member.mfaEnabled && <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 100, background: "rgba(239,68,68,0.08)", color: "#ef4444", fontWeight: 600 }}>No 2FA</span>}
                          </div>
                          <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--color-text-secondary)" }}>{member.email}</p>
                          {member.role !== 'admin' && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                              {member.permissions.length === 0
                                ? <span style={{ fontSize: 11, color: "var(--color-text-secondary)", fontStyle: "italic" }}>No permissions set</span>
                                : member.permissions.map(p => (
                                  <span key={p} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 100, background: "rgba(13,148,136,0.1)", color: "#0d9488", border: "1px solid rgba(13,148,136,0.2)", fontWeight: 600 }}>
                                    {PERMISSION_LABELS[p]}
                                  </span>
                                ))
                              }
                            </div>
                          )}
                        </div>
                        {!isCurrentUser && member.role !== 'admin' && (
                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <button
                              onClick={() => { setEditPermsFor(member.id); setEditPerms([...member.permissions]); }}
                              title="Edit permissions"
                              style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-primary)", border: "1px solid var(--color-border-secondary)", borderRadius: 8, cursor: "pointer", color: "var(--color-text-secondary)" }}
                            ><Pencil size={13} /></button>
                            <button
                              onClick={() => { setRemoveConfirm(member.id); setRemoveType('member'); }}
                              title="Remove member"
                              style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, cursor: "pointer", color: "#ef4444" }}
                            ><Trash2 size={13} /></button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pending invites */}
            {!teamLoading && pendingInvites.length > 0 && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>Pending Invites ({pendingInvites.length})</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {pendingInvites.map(invite => (
                    <div key={invite.id} style={{ background: "var(--color-background-secondary)", border: "1px solid var(--color-border-secondary)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 14, opacity: 0.8 }}>
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(245,158,11,0.15)", border: "1.5px dashed rgba(245,158,11,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Clock size={16} color="#f59e0b" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--color-text-primary)" }}>{invite.name}</span>
                          <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 100, background: "rgba(245,158,11,0.1)", color: "#f59e0b", fontWeight: 600 }}>Invite Pending</span>
                        </div>
                        <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--color-text-secondary)" }}>{invite.email}</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {invite.permissions.map(p => (
                            <span key={p} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 100, background: "rgba(13,148,136,0.1)", color: "#0d9488", border: "1px solid rgba(13,148,136,0.2)", fontWeight: 600 }}>
                              {PERMISSION_LABELS[p]}
                            </span>
                          ))}
                        </div>
                        <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--color-text-secondary)" }}>
                          Expires {new Date(invite.expiresAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <button
                        onClick={() => { setRemoveConfirm(invite.id); setRemoveType('invite'); }}
                        title="Revoke invite"
                        style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, cursor: "pointer", color: "#ef4444", flexShrink: 0 }}
                      ><X size={13} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!teamLoading && teamMembers.length === 0 && pendingInvites.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--color-text-secondary)" }}>
                <Users size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p style={{ margin: "0 0 6px", fontWeight: 600, color: "var(--color-text-primary)" }}>No team members yet</p>
                <p style={{ margin: 0, fontSize: 13 }}>Click "Invite Member" to add your first team member.</p>
              </div>
            )}

            {/* Invite modal */}
            {showInviteModal && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={e => { if (e.target === e.currentTarget) setShowInviteModal(false); }}>
                <div style={{ background: "var(--color-background-primary)", border: "1px solid var(--color-border-secondary)", borderRadius: 18, padding: "1.75rem", width: "100%", maxWidth: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--color-text-primary)" }}>Invite Team Member</h3>
                    <button onClick={() => setShowInviteModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", padding: 4 }}><X size={18} /></button>
                  </div>

                  {inviteSuccess ? (
                    <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#0f766e,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                        <Check size={24} color="#fff" />
                      </div>
                      <p style={{ fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 6px" }}>Invite Sent!</p>
                      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>{inviteSuccess}</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Full Name *</label>
                        <input value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1.5px solid var(--color-border-secondary)", borderRadius: 9, fontSize: 14, color: "var(--color-text-primary)", background: "var(--color-input-bg)", outline: "none", fontFamily: "inherit" }} />
                      </div>
                      <div style={{ marginBottom: 20 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Email Address *</label>
                        <input value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} type="email" placeholder="jane@yourclinic.ca" style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1.5px solid var(--color-border-secondary)", borderRadius: 9, fontSize: 14, color: "var(--color-text-primary)", background: "var(--color-input-bg)", outline: "none", fontFamily: "inherit" }} />
                      </div>
                      <div style={{ marginBottom: 20 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Access Permissions *
                        </label>
                        <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--color-text-secondary)" }}>
                          Select exactly what this team member can see in the dashboard. Billing and team management are always restricted to admins.
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          {ALL_PERMISSIONS
                            .filter(p => (p !== 'cortex_agents' && p !== 'cortex_inbox') || tenant?.plan === 'cortex')
                            .map(perm => {
                            const isChecked = inviteForm.permissions.includes(perm);
                            return (
                              <label key={perm} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "9px 11px", borderRadius: 9, border: `1.5px solid ${isChecked ? "var(--color-accent)" : "var(--color-border-secondary)"}`, background: isChecked ? "var(--color-accent-muted)" : "var(--color-background-secondary)", transition: "all 0.15s" }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={e => setInviteForm(f => ({ ...f, permissions: e.target.checked ? [...f.permissions, perm] : f.permissions.filter(p => p !== perm) }))}
                                  style={{ accentColor: "var(--color-accent)", cursor: "pointer", flexShrink: 0 }}
                                />
                                <span style={{ fontSize: 12, fontWeight: 600, color: isChecked ? "var(--color-accent)" : "var(--color-text-secondary)" }}>
                                  {PERMISSION_LABELS[perm]}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {inviteError && <p style={{ margin: "0 0 14px", fontSize: 13, color: "#ef4444" }}>{inviteError}</p>}

                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setShowInviteModal(false)} style={{ flex: 1, padding: "10px", background: "var(--color-background-secondary)", border: "1px solid var(--color-border-secondary)", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--color-text-secondary)", fontFamily: "inherit" }}>Cancel</button>
                        <button onClick={handleInvite} disabled={inviteSaving} style={{ flex: 2, padding: "10px", background: "linear-gradient(135deg,#0f766e,#0d9488)", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: inviteSaving ? "default" : "pointer", color: "#fff", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          {inviteSaving ? <>
                            <div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                            Sending…
                          </> : <><Mail size={13} /> Send Invite</>}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Edit permissions modal */}
            {editPermsFor && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={e => { if (e.target === e.currentTarget) setEditPermsFor(null); }}>
                <div style={{ background: "var(--color-background-primary)", border: "1px solid var(--color-border-secondary)", borderRadius: 18, padding: "1.75rem", width: "100%", maxWidth: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--color-text-primary)" }}>Edit Permissions</h3>
                    <button onClick={() => setEditPermsFor(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", padding: 4 }}><X size={18} /></button>
                  </div>
                  <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--color-text-secondary)" }}>
                    {teamMembers.find(m => m.id === editPermsFor)?.name} — update their dashboard access.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                    {ALL_PERMISSIONS
                      .filter(p => (p !== 'cortex_agents' && p !== 'cortex_inbox') || tenant?.plan === 'cortex')
                      .map(perm => {
                      const isChecked = editPerms.includes(perm);
                      return (
                        <label key={perm} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "9px 11px", borderRadius: 9, border: `1.5px solid ${isChecked ? "var(--color-accent)" : "var(--color-border-secondary)"}`, background: isChecked ? "var(--color-accent-muted)" : "var(--color-background-secondary)", transition: "all 0.15s" }}>
                          <input type="checkbox" checked={isChecked} onChange={e => setEditPerms(prev => e.target.checked ? [...prev, perm] : prev.filter(p => p !== perm))} style={{ accentColor: "var(--color-accent)", cursor: "pointer" }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: isChecked ? "var(--color-accent)" : "var(--color-text-secondary)" }}>{PERMISSION_LABELS[perm]}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setEditPermsFor(null)} style={{ flex: 1, padding: "10px", background: "var(--color-background-secondary)", border: "1px solid var(--color-border-secondary)", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--color-text-secondary)", fontFamily: "inherit" }}>Cancel</button>
                    <button onClick={handleSavePerms} disabled={editPermsSaving} style={{ flex: 2, padding: "10px", background: "linear-gradient(135deg,#0f766e,#0d9488)", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#fff", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      {editPermsSaving ? 'Saving…' : <><Check size={13} /> Save Changes</>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Remove confirm */}
            {removeConfirm && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
                <div style={{ background: "var(--color-background-primary)", border: "1px solid var(--color-border-secondary)", borderRadius: 18, padding: "1.75rem", width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <Trash2 size={22} color="#ef4444" />
                  </div>
                  <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)" }}>
                    {removeType === 'invite' ? 'Revoke invite?' : 'Remove team member?'}
                  </h3>
                  <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                    {removeType === 'invite'
                      ? 'The invite link will be invalidated. You can send a new invite at any time.'
                      : 'This person will immediately lose access to the dashboard. This cannot be undone.'}
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setRemoveConfirm(null)} style={{ flex: 1, padding: "10px", background: "var(--color-background-secondary)", border: "1px solid var(--color-border-secondary)", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--color-text-secondary)", fontFamily: "inherit" }}>Cancel</button>
                    <button onClick={handleRemove} style={{ flex: 1, padding: "10px", background: "#ef4444", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#fff", fontFamily: "inherit" }}>
                      {removeType === 'invite' ? 'Revoke' : 'Remove'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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

        {/* Account / Security tab */}
        {activeTab === "account" && (
          <>
            {/* Account details */}
            <Section title="Account" desc="Your user account details." icon={User}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  ["Name", user?.name ?? "—"],
                  ["Email", user?.email ?? "—"],
                  ["Role", (user?.role ?? "").replace("_", " ")],
                ].map(([label, value]) => (
                  <div key={label} style={{ padding: "13px 15px", background: "var(--color-background-secondary)", borderRadius: 10, border: "1px solid var(--color-border-secondary)" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{value}</div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Two-factor authentication panel */}
            <Section title="Two-factor authentication" desc="Protect your account with an additional verification step each sign-in." icon={ShieldCheck}>

              {/* Current status row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "var(--color-background-secondary)", borderRadius: 12, border: "1px solid var(--color-border-secondary)", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: user?.mfaEnabled ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                    {user?.mfaEnabled ? "🛡️" : "⚠️"}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>
                      {user?.mfaEnabled ? "2FA is active" : "2FA is not enabled"}
                    </div>
                    {user?.mfaEnabled && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 5 }}>
                        {(mfaEnabledMethods.length > 0 ? mfaEnabledMethods : (user.mfaMethods ?? [])).map(m => (
                          <span key={m} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, padding: "2px 9px", borderRadius: 20, background: "rgba(13,148,136,0.1)", color: "var(--color-accent)", border: "1px solid rgba(13,148,136,0.2)", fontWeight: 600 }}>
                            {m === "totp" ? "📱 Authenticator" : m === "email" ? "✉️ Email" : "💬 SMS"}
                          </span>
                        ))}
                      </div>
                    )}
                    {!user?.mfaEnabled && (
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                        PHIPA recommends MFA for all PHI access
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => { setShowChangeMfa(true); setChangeMfaSubStep("pick"); }}
                  style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                  {user?.mfaEnabled ? "Add method" : "Enable 2FA"}
                </button>
              </div>

              {/* Not enabled warning */}
              {!user?.mfaEnabled && (
                <div style={{ padding: "12px 14px", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.18)", borderRadius: 10, fontSize: 13, color: "#f59e0b", marginBottom: 16 }}>
                  <strong>PHIPA reminder:</strong> Enable 2FA to secure access to patient health information.
                </div>
              )}

              {/* Per-method rows with individual remove buttons */}
              {user?.mfaEnabled && (mfaEnabledMethods.length > 0 ? mfaEnabledMethods : (user.mfaMethods ?? [])).length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Active methods</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(mfaEnabledMethods.length > 0 ? mfaEnabledMethods : (user.mfaMethods ?? [])).map(m => (
                      <div key={m} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", background: "var(--color-background-secondary)", borderRadius: 10, border: "1px solid var(--color-border-secondary)" }}>
                        <span style={{ fontSize: 20 }}>{m === "totp" ? "📱" : m === "email" ? "✉️" : "💬"}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                            {m === "totp" ? "Authenticator app" : m === "email" ? "Email code" : "SMS code"}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                            {m === "totp" ? "Time-based one-time password" : m === "email" ? `Code sent to ${user?.email}` : "Code sent via SMS"}
                          </div>
                        </div>
                        {(mfaEnabledMethods.length > 0 ? mfaEnabledMethods : (user.mfaMethods ?? [])).length > 1 && (
                          <button
                            onClick={() => { setDisableMethodTarget(m); setShowDisableMethod(true); setDisableMethodPassword(""); setDisableMethodCode(""); setDisableMethodError(""); }}
                            style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #fecaca", background: "transparent", color: "#ef4444", fontSize: 11, cursor: "pointer", flexShrink: 0 }}
                          >
                            Remove
                          </button>
                        )}
                        {(mfaEnabledMethods.length > 0 ? mfaEnabledMethods : (user.mfaMethods ?? [])).length === 1 && (
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "rgba(16,185,129,0.1)", color: "#10b981", fontWeight: 600, flexShrink: 0 }}>Primary</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Authenticator devices (only shown when TOTP method is active) */}
              {user?.mfaEnabled && (mfaEnabledMethods.includes("totp") || user.mfaMethod === "totp" || (!user.mfaMethod && user.mfaEnabled)) && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Trusted devices</div>
                  {mfaSecurityLoading ? (
                    <div style={{ padding: "12px 0", fontSize: 13, color: "var(--color-text-secondary)" }}>Loading…</div>
                  ) : (
                    <>
                      {/* Primary device */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", background: "var(--color-background-secondary)", borderRadius: 10, border: "1px solid var(--color-border-secondary)", marginBottom: 6 }}>
                        <Smartphone size={16} style={{ color: "var(--color-accent)", flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>Primary authenticator</div>
                          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Added at signup</div>
                        </div>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "rgba(16,185,129,0.1)", color: "#10b981", fontWeight: 600 }}>Primary</span>
                      </div>
                      {/* Additional devices */}
                      {mfaDevices.map(d => (
                        <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", background: "var(--color-background-secondary)", borderRadius: 10, border: "1px solid var(--color-border-secondary)", marginBottom: 6 }}>
                          <Monitor size={16} style={{ color: "var(--color-text-secondary)", flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{d.label}</div>
                            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                              Added {new Date(d.createdAt).toLocaleDateString()}
                              {d.lastUsedAt ? ` · Last used ${new Date(d.lastUsedAt).toLocaleDateString()}` : ""}
                            </div>
                          </div>
                          <button onClick={() => removeDevice(d.id)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #fecaca", background: "transparent", color: "#ef4444", fontSize: 11, cursor: "pointer" }}>Remove</button>
                        </div>
                      ))}
                      <button onClick={startAddDevice} disabled={addDeviceLoading} style={{ marginTop: 6, padding: "9px 14px", borderRadius: 8, border: "1.5px dashed var(--color-border-secondary)", background: "transparent", color: "var(--color-accent)", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%" }}>
                        + Add another device
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Backup codes */}
              {user?.mfaEnabled && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Backup codes</div>
                  {backupCodes.length > 0 ? (
                    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
                      <p style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600, margin: "0 0 10px" }}>⚠️ Save these now — they won't be shown again</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                        {backupCodes.map((c, i) => <span key={i} style={{ fontFamily: "monospace", fontSize: 13, color: "var(--color-text-primary)" }}>{c}</span>)}
                      </div>
                      <button onClick={() => setBackupCodes([])} style={{ marginTop: 12, fontSize: 12, background: "none", border: "none", color: "var(--color-text-tertiary)", cursor: "pointer" }}>Hide codes</button>
                    </div>
                  ) : (
                    <div style={{ padding: "12px 14px", background: "var(--color-background-secondary)", border: "1px solid var(--color-border-secondary)", borderRadius: 10 }}>
                      {showBackupCodes ? (
                        <div>
                          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 10px" }}>Enter your password to generate new backup codes. Your old codes will be invalidated.</p>
                          <input type="password" placeholder="Your password" value={backupCodesPassword} onChange={e => setBackupCodesPassword(e.target.value)}
                            style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid var(--color-border-secondary)", background: "var(--color-input-bg)", color: "var(--color-text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                          {backupCodesError && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 6 }}>{backupCodesError}</p>}
                          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                            <button onClick={() => { setShowBackupCodes(false); setBackupCodesPassword(""); setBackupCodesError(""); }}
                              style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}>
                              Cancel
                            </button>
                            <button onClick={regenBackupCodes} disabled={backupCodesLoading || !backupCodesPassword}
                              style={{ flex: 2, padding: "8px", borderRadius: 8, border: "none", background: backupCodesPassword ? "linear-gradient(135deg, #0f766e, #0d9488)" : "var(--color-border-primary)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: backupCodesPassword ? "pointer" : "not-allowed" }}>
                              {backupCodesLoading ? "Generating…" : "Generate new codes"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>Backup codes</div>
                            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>Use if you lose access to your authentication method</div>
                          </div>
                          <button onClick={() => setShowBackupCodes(true)}
                            style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}>
                            Regenerate
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Section>

            {/* ── Change MFA method modal ── */}
            {showChangeMfa && (
              <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
                <div style={{ background: "var(--color-surface, #1a2332)", border: "1px solid var(--color-border, rgba(255,255,255,0.08))", borderRadius: 20, padding: "32px 28px 24px", maxWidth: 420, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--color-text-primary)" }}>
                      {user?.mfaEnabled ? "Add 2FA method" : "Enable two-factor authentication"}
                    </h3>
                    <button onClick={() => { setShowChangeMfa(false); setChangeMfaSubStep("pick"); setChangeMfaData(null); setChangeMfaCode(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}><X size={18} /></button>
                  </div>

                  {changeMfaSubStep === "pick" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {[
                        { method: "totp" as MfaMethodType, icon: "📱", label: "Authenticator app", desc: "Google Authenticator, Authy, 1Password" },
                        { method: "email" as MfaMethodType, icon: "✉️", label: "Email code", desc: `Code sent to ${user?.email}` },
                      ].map(opt => {
                        const alreadyEnabled = (mfaEnabledMethods.length > 0 ? mfaEnabledMethods : (user?.mfaMethods ?? [])).includes(opt.method);
                        return (
                          <button key={opt.method} onClick={() => !alreadyEnabled && startChangeMfaMethod(opt.method)} disabled={changeMfaLoading || alreadyEnabled}
                            style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderRadius: 10, border: `1.5px solid ${alreadyEnabled ? "var(--color-accent)" : "var(--color-border-secondary)"}`, background: alreadyEnabled ? "rgba(13,148,136,0.06)" : "var(--color-background-secondary)", cursor: changeMfaLoading || alreadyEnabled ? "not-allowed" : "pointer", textAlign: "left", opacity: alreadyEnabled ? 0.7 : 1 }}>
                            <span style={{ fontSize: 22 }}>{opt.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{opt.label}</div>
                              <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{opt.desc}</div>
                            </div>
                            {alreadyEnabled && <Check size={14} style={{ color: "var(--color-accent)" }} />}
                          </button>
                        );
                      })}
                      {/* SMS — disabled */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderRadius: 10, border: "1.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", opacity: 0.45, cursor: "not-allowed" }}>
                        <span style={{ fontSize: 22 }}>💬</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>SMS text message</div>
                          <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Receive a code by text</div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", background: "rgba(100,116,139,0.15)", borderRadius: 20, color: "var(--color-text-secondary)" }}>Soon</span>
                      </div>
                    </div>
                  )}

                  {changeMfaSubStep === "setup" && changeMfaMethod === "totp" && changeMfaData && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                        <div style={{ background: "#fff", borderRadius: 10, padding: 8, display: "inline-block" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={changeMfaData.qrCodeDataUrl} alt="QR" style={{ width: 140, height: 140, display: "block" }} />
                        </div>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--color-text-secondary)", textAlign: "center", marginBottom: 6 }}>Scan with your authenticator app.</p>
                      <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", textAlign: "center", marginBottom: 14 }}>Manual: <code style={{ fontFamily: "monospace" }}>{changeMfaData.secret}</code></p>
                      <input type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={changeMfaCode} autoFocus
                        onChange={e => setChangeMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        onKeyDown={e => { if (e.key === "Enter") confirmChangeMfa(); }}
                        style={{ width: "100%", padding: "12px", textAlign: "center", fontSize: 24, fontFamily: "monospace", letterSpacing: "0.2em", background: "rgba(255,255,255,0.05)", border: `1.5px solid ${changeMfaError ? "#ef4444" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box" }} />
                      {changeMfaError && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 6 }}>{changeMfaError}</p>}
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button onClick={() => setChangeMfaSubStep("pick")} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}>← Back</button>
                        <button onClick={confirmChangeMfa} disabled={changeMfaCode.length !== 6 || changeMfaLoading} style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: changeMfaCode.length === 6 ? "linear-gradient(135deg, #0f766e, #0d9488)" : "rgba(255,255,255,0.06)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: changeMfaCode.length === 6 ? "pointer" : "not-allowed" }}>{changeMfaLoading ? "Activating…" : "Confirm →"}</button>
                      </div>
                    </div>
                  )}

                  {changeMfaSubStep === "verify" && changeMfaMethod === "email" && (
                    <div>
                      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 14, textAlign: "center" }}>Enter the code sent to <strong>{user?.email}</strong></p>
                      <input type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={changeMfaCode} autoFocus
                        onChange={e => setChangeMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        onKeyDown={e => { if (e.key === "Enter") confirmChangeMfa(); }}
                        style={{ width: "100%", padding: "12px", textAlign: "center", fontSize: 28, fontFamily: "monospace", letterSpacing: "0.2em", background: "rgba(255,255,255,0.05)", border: `1.5px solid ${changeMfaError ? "#ef4444" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box" }} />
                      {changeMfaError && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 6 }}>{changeMfaError}</p>}
                      <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", textAlign: "center", marginTop: 8 }}>
                        <button onClick={() => { startChangeMfaMethod("email"); }} disabled={changeMfaResendCooldown > 0} style={{ background: "none", border: "none", color: changeMfaResendCooldown > 0 ? "var(--color-text-tertiary)" : "var(--color-accent)", fontSize: 12, fontWeight: 600, cursor: changeMfaResendCooldown > 0 ? "default" : "pointer", padding: 0 }}>
                          {changeMfaResendCooldown > 0 ? `Resend in ${changeMfaResendCooldown}s` : "Resend code"}
                        </button>
                      </p>
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button onClick={() => setChangeMfaSubStep("pick")} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}>← Back</button>
                        <button onClick={confirmChangeMfa} disabled={changeMfaCode.length !== 6 || changeMfaLoading} style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: changeMfaCode.length === 6 ? "linear-gradient(135deg, #0f766e, #0d9488)" : "rgba(255,255,255,0.06)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: changeMfaCode.length === 6 ? "pointer" : "not-allowed" }}>{changeMfaLoading ? "Activating…" : "Confirm →"}</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Disable single method confirmation ── */}
            {showDisableMethod && disableMethodTarget && (
              <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
                <div style={{ background: "var(--color-surface, #1a2332)", border: "1px solid var(--color-border, rgba(255,255,255,0.08))", borderRadius: 20, padding: "32px 28px 24px", maxWidth: 400, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--color-text-primary)" }}>
                      Remove {disableMethodTarget === "totp" ? "Authenticator app" : disableMethodTarget === "email" ? "Email code" : "SMS"} method
                    </h3>
                    <button onClick={() => setShowDisableMethod(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}><X size={18} /></button>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>
                    To confirm, enter your password and an active verification code.
                  </p>
                  <input type="password" placeholder="Your account password" value={disableMethodPassword}
                    onChange={e => setDisableMethodPassword(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", marginBottom: 10, borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "var(--color-input-bg)", color: "var(--color-text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                  <input type="text" inputMode="numeric" maxLength={8} placeholder="6-digit code or backup code"
                    value={disableMethodCode}
                    onChange={e => setDisableMethodCode(e.target.value.replace(/\s/g, ""))}
                    onKeyDown={e => { if (e.key === "Enter") disableSingleMethod(); }}
                    style={{ width: "100%", padding: "10px 12px", marginBottom: 10, borderRadius: 8, border: `1.5px solid ${disableMethodError ? "#ef4444" : "var(--color-border-secondary)"}`, background: "var(--color-input-bg)", color: "var(--color-text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                  {disableMethodError && <p style={{ fontSize: 12, color: "#ef4444", margin: "0 0 10px" }}>{disableMethodError}</p>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setShowDisableMethod(false); setDisableMethodPassword(""); setDisableMethodCode(""); setDisableMethodError(""); }}
                      style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                    <button onClick={disableSingleMethod} disabled={!disableMethodPassword || disableMethodCode.length < 6 || disableMethodLoading}
                      style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: disableMethodPassword && disableMethodCode.length >= 6 ? "#ef4444" : "rgba(239,68,68,0.3)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: disableMethodPassword && disableMethodCode.length >= 6 ? "pointer" : "not-allowed" }}>
                      {disableMethodLoading ? "Removing…" : "Remove method"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Add device modal ── */}
            {showAddDevice && addDeviceData && (
              <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
                <div style={{ background: "var(--color-surface, #1a2332)", border: "1px solid var(--color-border, rgba(255,255,255,0.08))", borderRadius: 20, padding: "32px 28px 24px", maxWidth: 420, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--color-text-primary)" }}>Add authenticator device</h3>
                    <button onClick={() => { setShowAddDevice(false); setAddDeviceData(null); setAddDeviceCode(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}><X size={18} /></button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <div style={{ background: "#fff", borderRadius: 10, padding: 8, display: "inline-block" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={addDeviceData.qrCodeDataUrl} alt="QR" style={{ width: 150, height: 150, display: "block" }} />
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--color-text-secondary)", textAlign: "center", marginBottom: 6 }}>Scan with your authenticator app on the new device.</p>
                  <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", textAlign: "center", marginBottom: 14 }}>Manual: <code style={{ fontFamily: "monospace" }}>{addDeviceData.secret}</code></p>
                  <input type="text" placeholder="Device label (e.g. iPhone 15)" value={addDeviceLabel} onChange={e => setAddDeviceLabel(e.target.value)} maxLength={40}
                    style={{ width: "100%", padding: "9px 12px", marginBottom: 10, borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "var(--color-input-bg)", color: "var(--color-text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                  <input type="text" inputMode="numeric" maxLength={6} placeholder="Enter 6-digit code" value={addDeviceCode} autoFocus
                    onChange={e => setAddDeviceCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={e => { if (e.key === "Enter") confirmAddDevice(); }}
                    style={{ width: "100%", padding: "12px", textAlign: "center", fontSize: 24, fontFamily: "monospace", letterSpacing: "0.2em", background: "rgba(255,255,255,0.05)", border: `1.5px solid ${addDeviceError ? "#ef4444" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box" }} />
                  {addDeviceError && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 6 }}>{addDeviceError}</p>}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button onClick={() => { setShowAddDevice(false); setAddDeviceData(null); setAddDeviceCode(""); }} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                    <button onClick={confirmAddDevice} disabled={addDeviceCode.length !== 6 || addDeviceLoading} style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: addDeviceCode.length === 6 ? "linear-gradient(135deg, #0f766e, #0d9488)" : "rgba(255,255,255,0.06)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: addDeviceCode.length === 6 ? "pointer" : "not-allowed" }}>{addDeviceLoading ? "Adding…" : "Add device"}</button>
                  </div>
                </div>
              </div>
            )}
          </>
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
