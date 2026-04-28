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
  starter:    { label: 'Starter',    color: '#0f766e', bg: '#f0fdfa' },
  pro:        { label: 'Pro',        color: '#0e7490', bg: '#ecfeff' },
  enterprise: { label: 'Enterprise', color: '#4f46e5', bg: '#eef2ff' },
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  trial:     { label: 'Trial',     color: '#d97706', bg: '#fffbeb' },
  active:    { label: 'Active',    color: '#059669', bg: '#d1fae5' },
  suspended: { label: 'Suspended', color: '#dc2626', bg: '#fee2e2' },
}

const emptyPlan: CreateInsurancePlanInput = {
  insurerName: '', planName: '', groupNumber: '', annualMax: undefined,
  preventiveCoverage: 100, basicCoverage: 80, majorCoverage: 50, orthoCoverage: 50,
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: 16 }}>
      <div style={{ marginBottom: '1.2rem' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: desc ? 3 : 0 }}>{title}</h2>
        {desc && <p style={{ fontSize: 13, color: '#64748b' }}>{desc}</p>}
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

  const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 14, color: '#0f172a', background: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'system-ui', transition: 'border-color 0.15s' }

  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: 780, margin: '0 auto' }}>
        <div style={{ fontSize: 14, color: '#94a3b8' }}>Loading settings…</div>
      </div>
    )
  }

  const planBadge = tenant ? PLAN_LABELS[tenant.plan] : null
  const statusBadge = tenant ? STATUS_LABELS[tenant.status] : null

  return (
    <div style={{ padding: '2rem', maxWidth: 780, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: 4 }}>Settings</h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>Manage your clinic, integrations, and insurance plans.</p>
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
              <div style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: '#f8fafc', color: '#64748b', fontWeight: 500 }}>
                Trial ends {new Date(tenant.trialEndsAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}
            <div style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: '#f8fafc', color: '#64748b', fontWeight: 500 }}>
              {tenant.memberCount} member{tenant.memberCount !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Clinic name</label>
            <input
              style={inp} value={clinicName}
              onChange={e => setClinicName(e.target.value)}
              onFocus={e => e.target.style.borderColor = '#0f766e'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
          <button
            onClick={saveClinicName}
            disabled={savingClinic || clinicName === tenant?.name}
            style={{ padding: '10px 20px', borderRadius: 9, border: 'none', background: (savingClinic || clinicName === tenant?.name) ? '#f1f5f9' : '#0f766e', color: (savingClinic || clinicName === tenant?.name) ? '#94a3b8' : '#fff', fontSize: 14, fontWeight: 600, cursor: (savingClinic || clinicName === tenant?.name) ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
          >
            {savingClinic ? 'Saving…' : 'Save'}
          </button>
        </div>
        {clinicMsg && (
          <div style={{ marginTop: 8, fontSize: 13, color: clinicMsg.startsWith('Error') ? '#dc2626' : '#059669', fontWeight: 500 }}>{clinicMsg}</div>
        )}
      </Section>

      {/* PMS integration */}
      <Section title="Practice Management Software" desc="Connect your PMS to sync patients, procedures, and insurance plans automatically.">
        {tenant?.pmsConnected ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 10, marginBottom: '1rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🦷</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#065f46' }}>{PMS_LABELS[tenant.pmsType] || tenant.pmsType} connected</div>
                <div style={{ fontSize: 12, color: '#047857' }}>Patient sync active</div>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669' }} />
            </div>
            <button
              onClick={disconnectPms}
              disabled={savingPms}
              style={{ padding: '8px 18px', borderRadius: 9, border: '1.5px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              {savingPms ? 'Disconnecting…' : 'Disconnect PMS'}
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>PMS software</label>
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
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>API Key</label>
                <input
                  type="password"
                  placeholder="Enter your PMS API key…"
                  style={inp}
                  value={pmsApiKey}
                  onChange={e => setPmsApiKey(e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#0f766e'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
            </div>
            <button
              onClick={connectPms}
              disabled={savingPms || !pmsApiKey.trim()}
              style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: (savingPms || !pmsApiKey.trim()) ? '#f1f5f9' : '#0f766e', color: (savingPms || !pmsApiKey.trim()) ? '#94a3b8' : '#fff', fontSize: 14, fontWeight: 600, cursor: (savingPms || !pmsApiKey.trim()) ? 'not-allowed' : 'pointer' }}
            >
              {savingPms ? 'Connecting…' : 'Connect PMS'}
            </button>
            {pmsMsg && <div style={{ marginTop: 8, fontSize: 13, color: pmsMsg.startsWith('Error') ? '#dc2626' : '#059669', fontWeight: 500 }}>{pmsMsg}</div>}
          </div>
        )}
      </Section>

      {/* Insurance plans */}
      <Section title="Insurance Plans" desc="Manage the insurance plans your clinic accepts. Used to assign coverage to patients.">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button
            onClick={openAddPlan}
            style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: '#0f766e', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            + Add plan
          </button>
        </div>

        {plans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🏥</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>No insurance plans yet</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>Add your clinic's insurance plans to enable accurate coverage matching.</div>
            <button onClick={openAddPlan} style={{ padding: '8px 20px', borderRadius: 9, border: 'none', background: '#0f766e', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              + Add first plan
            </button>
          </div>
        ) : (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Insurer', 'Plan name', 'Annual max', 'Prev.', 'Basic', 'Major', 'Ortho', ''].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: h === '' ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plans.map(plan => (
                  <tr key={plan.id} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafafa'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '11px 12px', fontWeight: 600, color: '#0f172a' }}>{plan.insurer_name}</td>
                    <td style={{ padding: '11px 12px', color: '#64748b' }}>{plan.plan_name || '—'}</td>
                    <td style={{ padding: '11px 12px', color: '#64748b' }}>{plan.annual_max ? `$${plan.annual_max.toLocaleString()}` : '—'}</td>
                    <td style={{ padding: '11px 12px', color: '#0f766e', fontWeight: 600 }}>{plan.preventive_coverage}%</td>
                    <td style={{ padding: '11px 12px', color: '#0f766e', fontWeight: 600 }}>{plan.basic_coverage}%</td>
                    <td style={{ padding: '11px 12px', color: '#0f766e', fontWeight: 600 }}>{plan.major_coverage}%</td>
                    <td style={{ padding: '11px 12px', color: '#0f766e', fontWeight: 600 }}>{plan.ortho_coverage}%</td>
                    <td style={{ padding: '11px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => openEditPlan(plan)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#0f172a', fontSize: 11, cursor: 'pointer' }}>Edit</button>
                        <button onClick={() => setDeleteConfirm(plan.id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: 11, cursor: 'pointer' }}>Del</button>
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
            <div key={label} style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 9, border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: label === 'MFA' && value === '⚠ Not enabled' ? '#d97706' : '#0f172a' }}>{value}</div>
            </div>
          ))}
        </div>
        {!user?.mfaEnabled && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9, fontSize: 13, color: '#92400e' }}>
            <strong>PHIPA reminder:</strong> Enable two-factor authentication to secure access to patient health information.
          </div>
        )}
      </Section>

      {/* Insurance plan modal */}
      {showPlanModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setShowPlanModal(false) }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 540, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{editingPlanId ? 'Edit plan' : 'Add insurance plan'}</h2>
              <button onClick={() => setShowPlanModal(false)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {planError && <div style={{ marginBottom: 14, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 9, fontSize: 13, color: '#dc2626' }}>{planError}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Insurer name <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  style={inp} placeholder="e.g. Sun Life Financial" value={planForm.insurerName}
                  onChange={e => setPlanForm(f => ({ ...f, insurerName: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = '#0f766e'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Plan name</label>
                <input
                  style={inp} placeholder="e.g. Group Benefits Basic" value={planForm.planName ?? ''}
                  onChange={e => setPlanForm(f => ({ ...f, planName: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = '#0f766e'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Group number</label>
                <input
                  style={inp} value={planForm.groupNumber ?? ''}
                  onChange={e => setPlanForm(f => ({ ...f, groupNumber: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = '#0f766e'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Annual maximum ($)</label>
                <input
                  type="number" style={inp} placeholder="e.g. 1500"
                  value={planForm.annualMax ?? ''}
                  onChange={e => setPlanForm(f => ({ ...f, annualMax: e.target.value ? Number(e.target.value) : undefined }))}
                  onFocus={e => e.target.style.borderColor = '#0f766e'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '1rem', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Coverage tiers (%)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {([
                  ['Preventive', 'preventiveCoverage'],
                  ['Basic', 'basicCoverage'],
                  ['Major', 'majorCoverage'],
                  ['Ortho', 'orthoCoverage'],
                ] as [string, keyof CreateInsurancePlanInput][]).map(([label, key]) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>{label}</label>
                    <input
                      type="number" min={0} max={100}
                      style={{ ...inp, textAlign: 'center', fontWeight: 700, color: '#0f766e' }}
                      value={(planForm[key] as number) ?? 0}
                      onChange={e => setPlanForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                      onFocus={e => e.target.style.borderColor = '#0f766e'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPlanModal(false)} style={{ padding: '9px 18px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
              <button
                onClick={savePlan}
                disabled={savingPlan}
                style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: savingPlan ? '#94a3b8' : '#0f766e', color: '#fff', fontSize: 14, fontWeight: 600, cursor: savingPlan ? 'not-allowed' : 'pointer' }}
              >
                {savingPlan ? 'Saving…' : editingPlanId ? 'Save changes' : 'Add plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete plan confirmation */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: '1rem' }}>🗑</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Delete insurance plan?</h3>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.6 }}>This will remove the plan. Patients assigned to this plan will have their insurance field cleared.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
              <button onClick={() => confirmDeletePlan(deleteConfirm)} style={{ flex: 1, padding: '10px', borderRadius: 9, border: 'none', background: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
