'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { tenantsApi, insurancePlansApi, type Tenant, type InsurancePlan, type CreateInsurancePlanInput } from '@/lib/api'

const PMS_LABELS: Record<string, string> = {
  open_dental: 'Open Dental',
  dentrix: 'Dentrix G7+',
  cleardent: 'ClearDent',
  none: 'Not connected',
}

const PLAN_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  starter:    { label: 'Starter',    color: '#0f766e', bg: 'rgba(15, 118, 110, 0.1)' },
  pro:        { label: 'Pro',        color: '#0e7490', bg: 'rgba(14, 116, 144, 0.1)' },
  enterprise: { label: 'Enterprise', color: '#4f46e5', bg: 'rgba(79, 70, 229, 0.1)' },
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  trial:     { label: 'Trial',     color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  active:    { label: 'Active',    color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
  suspended: { label: 'Suspended', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
}

const emptyPlan: CreateInsurancePlanInput = {
  insurerName: '', planName: '', groupNumber: '', annualMax: undefined,
  preventiveCoverage: 100, basicCoverage: 80, majorCoverage: 50, orthoCoverage: 50,
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-secondary)', borderRadius: 14, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: 16 }}>
      <div style={{ marginBottom: '1.2rem' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: desc ? 3 : 0 }}>{title}</h2>
        {desc && <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{desc}</p>}
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { user, accessToken } = useAuth()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [plans, setPlans] = useState<InsurancePlan[]>([])
  const [loading, setLoading] = useState(true)

  // Clinic name edit
  const [clinicName, setClinicName] = useState('')
  const [savingClinic, setSavingClinic] = useState(false)
  const [clinicMsg, setClinicMsg] = useState('')

  // PMS connect
  const [pmsType, setPmsType] = useState<'open_dental' | 'dentrix' | 'cleardent'>('open_dental')
  const [pmsApiKey, setPmsApiKey] = useState('')
  const [savingPms, setSavingPms] = useState(false)
  const [pmsMsg, setPmsMsg] = useState('')

  // Insurance plan modal
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [planForm, setPlanForm] = useState<CreateInsurancePlanInput>(emptyPlan)
  const [savingPlan, setSavingPlan] = useState(false)
  const [planError, setPlanError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const [t, ps] = await Promise.all([
        tenantsApi.getTenant(accessToken).catch(() => null),
        insurancePlansApi.getPlans(accessToken).catch(() => [] as InsurancePlan[]),
      ])
      if (t) { setTenant(t); setClinicName(t.name) }
      setPlans(ps)
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { load() }, [load])

  const saveClinicName = async () => {
    if (!accessToken || !clinicName.trim()) return
    setSavingClinic(true); setClinicMsg('')
    try {
      await tenantsApi.updateTenant(accessToken, { name: clinicName.trim() })
      setClinicMsg('Saved!')
      setTimeout(() => setClinicMsg(''), 2500)
      await load()
    } catch (err: any) {
      setClinicMsg('Error: ' + (err.message ?? 'Save failed'))
    } finally {
      setSavingClinic(false)
    }
  }

  const connectPms = async () => {
    if (!accessToken || !pmsApiKey.trim()) return
    setSavingPms(true); setPmsMsg('')
    try {
      await tenantsApi.connectPms(accessToken, { pmsType, pmsApiKey: pmsApiKey.trim() })
      setPmsMsg('Connected!')
      setPmsApiKey('')
      setTimeout(() => setPmsMsg(''), 2500)
      await load()
    } catch (err: any) {
      setPmsMsg('Error: ' + (err.message ?? 'Connection failed'))
    } finally {
      setSavingPms(false)
    }
  }

  const disconnectPms = async () => {
    if (!accessToken) return
    setSavingPms(true)
    try {
      await tenantsApi.disconnectPms(accessToken)
      await load()
    } catch { /* noop */ }
    setSavingPms(false)
  }

  const openAddPlan = () => {
    setEditingPlanId(null); setPlanForm(emptyPlan); setPlanError(''); setShowPlanModal(true)
  }

  const openEditPlan = (plan: InsurancePlan) => {
    setEditingPlanId(plan.id)
    setPlanForm({
      insurerName: plan.insurer_name,
      planName: plan.plan_name ?? '',
      groupNumber: plan.group_number ?? '',
      annualMax: plan.annual_max ?? undefined,
      preventiveCoverage: plan.preventive_coverage,
      basicCoverage: plan.basic_coverage,
      majorCoverage: plan.major_coverage,
      orthoCoverage: plan.ortho_coverage,
    })
    setPlanError(''); setShowPlanModal(true)
  }

  const savePlan = async () => {
    if (!accessToken) return
    if (!planForm.insurerName.trim()) { setPlanError('Insurer name is required.'); return }
    setSavingPlan(true); setPlanError('')
    try {
      if (editingPlanId) {
        await insurancePlansApi.updatePlan(accessToken, editingPlanId, planForm)
      } else {
        await insurancePlansApi.createPlan(accessToken, planForm)
      }
      setShowPlanModal(false)
      await load()
    } catch (err: any) {
      setPlanError(err.message ?? 'Save failed')
    } finally {
      setSavingPlan(false)
    }
  }

  const confirmDeletePlan = async (id: string) => {
    if (!accessToken) return
    try {
      await insurancePlansApi.deletePlan(accessToken, id)
      setDeleteConfirm(null)
      await load()
    } catch { /* noop */ }
  }

  const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1.5px solid var(--color-border-secondary)', borderRadius: 9, fontSize: 14, color: 'var(--color-text-primary)', background: 'var(--color-input-bg)', outline: 'none', boxSizing: 'border-box', fontFamily: 'system-ui', transition: 'border-color 0.15s' }

  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: 780, margin: '0 auto' }}>
        <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Loading settings…</div>
      </div>
    )
  }

  const planBadge = tenant ? PLAN_LABELS[tenant.plan] : null
  const statusBadge = tenant ? STATUS_LABELS[tenant.status] : null

  return (
    <div style={{ padding: '2rem', maxWidth: 780, margin: '0 auto', color: 'var(--color-text-primary)' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.03em', marginBottom: 4 }}>Settings</h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Manage your clinic, integrations, and insurance plans.</p>
      </div>

      {/* Clinic profile */}
      <Section title="Clinic Profile" desc="Update your clinic name and view your account details.">
        {tenant && (
          <div style={{ display: 'flex', gap: 12, marginBottom: '1rem', flexWrap: 'wrap' }}>
            {planBadge && (
              <div style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: planBadge.bg, color: planBadge.color, fontWeight: 600 }}>
                {planBadge.label} Plan
              </div>
            )}
            {statusBadge && (
              <div style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: statusBadge.bg, color: statusBadge.color, fontWeight: 600 }}>
                {statusBadge.label}
              </div>
            )}
            {tenant.status === 'trial' && tenant.trialEndsAt && (
              <div style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                Trial ends {new Date(tenant.trialEndsAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}
            <div style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              {tenant.memberCount} member{tenant.memberCount !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 5 }}>Clinic name</label>
            <input
              style={inp} value={clinicName}
              onChange={e => setClinicName(e.target.value)}
            />
          </div>
          <button
            onClick={saveClinicName}
            disabled={savingClinic || clinicName === tenant?.name}
            style={{ padding: '10px 20px', borderRadius: 9, border: 'none', background: (savingClinic || clinicName === tenant?.name) ? 'var(--color-background-secondary)' : 'var(--color-accent)', color: (savingClinic || clinicName === tenant?.name) ? 'var(--color-text-secondary)' : '#fff', fontSize: 14, fontWeight: 600, cursor: (savingClinic || clinicName === tenant?.name) ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
          >
            {savingClinic ? 'Saving…' : 'Save'}
          </button>
        </div>
        {clinicMsg && (
          <div style={{ marginTop: 8, fontSize: 13, color: clinicMsg.startsWith('Error') ? '#ef4444' : '#10b981', fontWeight: 500 }}>{clinicMsg}</div>
        )}
      </Section>

      {/* PMS integration */}
      <Section title="Practice Management Software" desc="Connect your PMS to sync patients, procedures, and insurance plans automatically.">
        {tenant?.pmsConnected ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--color-accent-muted)', border: '1px solid var(--color-accent)', borderRadius: 10, marginBottom: '1rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🦷</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-accent)' }}>{PMS_LABELS[tenant.pmsType] || tenant.pmsType} connected</div>
                <div style={{ fontSize: 12, color: 'var(--color-accent)' }}>Patient sync active</div>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
            </div>
            <button
              onClick={disconnectPms}
              disabled={savingPms}
              style={{ padding: '8px 18px', borderRadius: 9, border: '1.5px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              {savingPms ? 'Disconnecting…' : 'Disconnect PMS'}
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 5 }}>PMS software</label>
                <select
                  style={{ ...inp, cursor: 'pointer' }}
                  value={pmsType}
                  onChange={e => setPmsType(e.target.value as any)}
                >
                  <option value="open_dental">Open Dental</option>
                  <option value="dentrix">Dentrix G7+</option>
                  <option value="cleardent">ClearDent</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 5 }}>API Key</label>
                <input
                  type="password"
                  placeholder="Enter your PMS API key…"
                  style={inp}
                  value={pmsApiKey}
                  onChange={e => setPmsApiKey(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={connectPms}
              disabled={savingPms || !pmsApiKey.trim()}
              style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: (savingPms || !pmsApiKey.trim()) ? 'var(--color-background-secondary)' : 'var(--color-accent)', color: (savingPms || !pmsApiKey.trim()) ? 'var(--color-text-secondary)' : '#fff', fontSize: 14, fontWeight: 600, cursor: (savingPms || !pmsApiKey.trim()) ? 'not-allowed' : 'pointer' }}
            >
              {savingPms ? 'Connecting…' : 'Connect PMS'}
            </button>
            {pmsMsg && <div style={{ marginTop: 8, fontSize: 13, color: pmsMsg.startsWith('Error') ? '#ef4444' : '#10b981', fontWeight: 500 }}>{pmsMsg}</div>}
          </div>
        )}
      </Section>

      {/* Insurance plans */}
      <Section title="Insurance Plans" desc="Manage the insurance plans your clinic accepts. Used to assign coverage to patients.">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button
            onClick={openAddPlan}
            style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            + Add plan
          </button>
        </div>

        {plans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--color-background-secondary)', borderRadius: 10, border: '1px dashed var(--color-border-secondary)' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🏥</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>No insurance plans yet</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 14 }}>Add your clinic's insurance plans to enable accurate coverage matching.</div>
            <button onClick={openAddPlan} style={{ padding: '8px 20px', borderRadius: 9, border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              + Add first plan
            </button>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--color-border-secondary)', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--color-background-secondary)', borderBottom: '1px solid var(--color-border-secondary)' }}>
                  {['Insurer', 'Plan name', 'Annual max', 'Prev.', 'Basic', 'Major', 'Ortho', ''].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: h === '' ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plans.map(plan => (
                  <tr key={plan.id} style={{ borderBottom: '1px solid var(--color-border-tertiary)', transition: 'background 0.1s' }}>
                    <td style={{ padding: '11px 12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{plan.insurer_name}</td>
                    <td style={{ padding: '11px 12px', color: 'var(--color-text-secondary)' }}>{plan.plan_name || '—'}</td>
                    <td style={{ padding: '11px 12px', color: 'var(--color-text-secondary)' }}>{plan.annual_max ? `$${plan.annual_max.toLocaleString()}` : '—'}</td>
                    <td style={{ padding: '11px 12px', color: 'var(--color-accent)', fontWeight: 600 }}>{plan.preventive_coverage}%</td>
                    <td style={{ padding: '11px 12px', color: 'var(--color-accent)', fontWeight: 600 }}>{plan.basic_coverage}%</td>
                    <td style={{ padding: '11px 12px', color: 'var(--color-accent)', fontWeight: 600 }}>{plan.major_coverage}%</td>
                    <td style={{ padding: '11px 12px', color: 'var(--color-accent)', fontWeight: 600 }}>{plan.ortho_coverage}%</td>
                    <td style={{ padding: '11px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => openEditPlan(plan)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--color-border-secondary)', background: 'transparent', color: 'var(--color-text-primary)', fontSize: 11, cursor: 'pointer' }}>Edit</button>
                        <button onClick={() => setDeleteConfirm(plan.id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Account info */}
      <Section title="Account" desc="Your user account details.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            ['Name', user?.name ?? '—'],
            ['Email', user?.email ?? '—'],
            ['Role', (user?.role ?? '').replace('_', ' ')],
            ['MFA', user?.mfaEnabled ? '✓ Enabled' : '⚠ Not enabled'],
          ].map(([label, value]) => (
            <div key={label} style={{ padding: '12px 14px', background: 'var(--color-background-secondary)', borderRadius: 9, border: '1px solid var(--color-border-secondary)' }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: label === 'MFA' && value === '⚠ Not enabled' ? '#f59e0b' : 'var(--color-text-primary)' }}>{value}</div>
            </div>
          ))}
        </div>
        {!user?.mfaEnabled && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 9, fontSize: 13, color: '#f59e0b' }}>
            <strong>PHIPA reminder:</strong> Enable two-factor authentication to secure access to patient health information.
          </div>
        )}
      </Section>

      {/* Insurance plan modal */}
      {showPlanModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setShowPlanModal(false) }}>
          <div style={{ background: 'var(--color-background-primary)', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 540, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--color-border-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)' }}>{editingPlanId ? 'Edit plan' : 'Add insurance plan'}</h2>
              <button onClick={() => setShowPlanModal(false)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--color-border-secondary)', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {planError && <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #fecaca', borderRadius: 9, fontSize: 13, color: '#ef4444' }}>{planError}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 5 }}>Insurer name <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  style={inp} placeholder="e.g. Sun Life Financial" value={planForm.insurerName}
                  onChange={e => setPlanForm(f => ({ ...f, insurerName: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 5 }}>Plan name</label>
                <input
                  style={inp} placeholder="e.g. Group Benefits Basic" value={planForm.planName ?? ''}
                  onChange={e => setPlanForm(f => ({ ...f, planName: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 5 }}>Group number</label>
                <input
                  style={inp} value={planForm.groupNumber ?? ''}
                  onChange={e => setPlanForm(f => ({ ...f, groupNumber: e.target.value }))}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 5 }}>Annual maximum ($)</label>
                <input
                  type="number" style={inp} placeholder="e.g. 1500"
                  value={planForm.annualMax ?? ''}
                  onChange={e => setPlanForm(f => ({ ...f, annualMax: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </div>
            </div>

            <div style={{ background: 'var(--color-background-secondary)', borderRadius: 10, padding: '1rem', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 10 }}>Coverage tiers (%)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {([
                  ['Preventive', 'preventiveCoverage'],
                  ['Basic', 'basicCoverage'],
                  ['Major', 'majorCoverage'],
                  ['Ortho', 'orthoCoverage'],
                ] as [string, keyof CreateInsurancePlanInput][]).map(([label, key]) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>{label}</label>
                    <input
                      type="number" min={0} max={100}
                      style={{ ...inp, textAlign: 'center', fontWeight: 700, color: 'var(--color-accent)' }}
                      value={(planForm[key] as number) ?? 0}
                      onChange={e => setPlanForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPlanModal(false)} style={{ padding: '9px 18px', borderRadius: 9, border: '1.5px solid var(--color-border-secondary)', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
              <button
                onClick={savePlan}
                disabled={savingPlan}
                style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: savingPlan ? 'var(--color-background-secondary)' : 'var(--color-accent)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: savingPlan ? 'not-allowed' : 'pointer' }}
              >
                {savingPlan ? 'Saving…' : editingPlanId ? 'Save changes' : 'Add plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete plan confirmation */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--color-background-primary)', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: '1px solid var(--color-border-secondary)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: '1rem' }}>🗑</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 6 }}>Delete insurance plan?</h3>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>This will remove the plan. Patients assigned to this plan will have their insurance field cleared.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1.5px solid var(--color-border-secondary)', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
              <button onClick={() => confirmDeletePlan(deleteConfirm)} style={{ flex: 1, padding: '10px', borderRadius: 9, border: 'none', background: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
