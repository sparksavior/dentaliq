'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, User, Calendar, Mail, Phone, Clock, Shield, FileText, CheckCircle2, AlertTriangle, Activity } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { patientsApi, tenantsApi, type Patient, type EstimateHistoryItem } from '@/lib/api'
import PreAuthPdfModal from '@/components/PreAuthPdfModal'

const AVATAR_COLORS = [
  { bg: 'linear-gradient(135deg, #0f766e, #0d9488)' },
  { bg: 'linear-gradient(135deg, #0e7490, #06b6d4)' },
  { bg: 'linear-gradient(135deg, #4f46e5, #7c3aed)' },
  { bg: 'linear-gradient(135deg, #059669, #10b981)' },
  { bg: 'linear-gradient(135deg, #b45309, #d97706)' },
]
function avatarColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
function initials(first: string, last: string) { return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() }

const riskConfig = {
  high:   { icon: AlertTriangle, bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.2)', label: 'High Risk' },
  medium: { icon: Clock,         bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.2)', label: 'Medium Risk' },
  low:    { icon: CheckCircle2,  bg: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'rgba(16,185,129,0.2)', label: 'Low Risk' },
}

export default function PatientDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { accessToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [patient, setPatient] = useState<(Patient & { history: EstimateHistoryItem[] }) | null>(null)
  const [tenant, setTenant] = useState<any>(null)
  const [error, setError] = useState('')
  const [showPdfModal, setShowPdfModal] = useState<string | null>(null)
  const [pdfMeta, setPdfMeta] = useState<{ patientName: string; insurer: string; date: string } | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [backHover, setBackHover] = useState(false)

  const load = useCallback(async () => {
    if (!accessToken || !id) return
    setLoading(true)
    try {
      const [pData, tData] = await Promise.all([
        patientsApi.getPatient(accessToken, id),
        tenantsApi.getTenant(accessToken).catch(() => null)
      ])
      setPatient(pData)
      setTenant(tData)
    } catch (err) {
      console.error('Failed to load patient detail', err)
      setError('Could not load patient records.')
    } finally {
      setLoading(false)
    }
  }, [accessToken, id])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-background-primary)' }}>
        <div style={{
          padding: '1.75rem 2rem 1.5rem',
          background: 'linear-gradient(135deg, var(--color-background-primary) 0%, var(--color-accent-muted) 100%)',
          borderBottom: '1px solid var(--color-border-secondary)',
        }}>
          <div style={{ height: 44, width: 280, borderRadius: 12 }} className="skeleton" />
        </div>
        <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {[120, 160].map((h, i) => <div key={i} style={{ height: h, borderRadius: 16 }} className="skeleton" />)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 100, borderRadius: 16 }} className="skeleton" />)}
          </div>
        </div>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-primary)' }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 12px' }}>⚠</div>
        <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error || 'Patient not found'}</p>
        <button onClick={() => router.push('/dashboard/patients')} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 600 }}>
          ← Back to patients
        </button>
      </div>
    )
  }

  const stats = {
    totalEstimates: patient.history.length,
    insurerPays: patient.history.reduce((sum, h) => sum + (h.insurer_pays || 0), 0),
    patientPays: patient.history.reduce((sum, h) => sum + (h.patient_cost || 0), 0),
    highRisk: patient.history.filter(h => h.claim_risk === 'high').length
  }

  const color = avatarColor(patient.first_name + patient.last_name)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }}>
      {/* PDF Modal */}
      {showPdfModal && pdfMeta && (
        <PreAuthPdfModal
          narrative={showPdfModal}
          clinicName={tenant?.name || 'Your Clinic'}
          insurerName={pdfMeta.insurer}
          patientName={pdfMeta.patientName}
          date={pdfMeta.date}
          onClose={() => setShowPdfModal(null)}
          onRevise={async () => {}}
        />
      )}

      {/* Premium page header */}
      <div style={{
        padding: '1.5rem 2rem',
        background: 'linear-gradient(135deg, var(--color-background-primary) 0%, var(--color-accent-muted) 100%)',
        borderBottom: '1px solid var(--color-border-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => router.push('/dashboard/patients')}
            onMouseEnter={() => setBackHover(true)}
            onMouseLeave={() => setBackHover(false)}
            style={{
              width: 38, height: 38, borderRadius: 11,
              border: '1.5px solid var(--color-border-secondary)',
              background: backHover ? 'var(--color-accent-muted)' : 'var(--color-background-primary)',
              color: backHover ? 'var(--color-accent)' : 'var(--color-text-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
              borderColor: backHover ? 'var(--color-accent)' : 'var(--color-border-secondary)',
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: color.bg, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 800, letterSpacing: '0.02em',
              boxShadow: '0 4px 14px rgba(0,0,0,0.2)', flexShrink: 0,
            }}>
              {initials(patient.first_name, patient.last_name)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Patient Dossier</span>
                {stats.highRisk > 0 && (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 700, border: '1px solid rgba(239,68,68,0.2)' }}>
                    {stats.highRisk} high-risk
                  </span>
                )}
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
                {patient.first_name} {patient.last_name}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '2rem', maxWidth: 1300, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.75rem' }}>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Personal info card */}
            <div style={{
              background: 'var(--color-background-primary)', borderRadius: 20, overflow: 'hidden',
              border: '1px solid var(--color-border-secondary)', boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{
                padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border-secondary)',
                background: 'linear-gradient(135deg, var(--color-background-secondary) 0%, var(--color-accent-muted) 100%)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #0f766e, #0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity size={13} color="white" />
                </div>
                <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>Personal Information</h3>
              </div>
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { icon: Calendar, label: 'Birth Date', value: patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
                  { icon: Mail, label: 'Email Address', value: patient.email || '—' },
                  { icon: Phone, label: 'Phone Number', value: patient.phone || 'No phone listed' },
                  { icon: Shield, label: 'Insurance Plan', value: patient.insurance_plan_id || 'Self-Pay', accent: !!patient.insurance_plan_id },
                ].map(({ icon: Icon, label, value, accent }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                      background: 'var(--color-accent-muted)', border: '1px solid var(--color-accent-subtle)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={15} color="var(--color-accent)" />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: accent ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial summary */}
            <div style={{
              background: 'var(--color-background-primary)', borderRadius: 20, overflow: 'hidden',
              border: '1px solid var(--color-border-secondary)', boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{
                padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border-secondary)',
                background: 'linear-gradient(135deg, var(--color-background-secondary) 0%, var(--color-accent-muted) 100%)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #0f766e, #0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={13} color="white" />
                </div>
                <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>Financial Summary</h3>
              </div>
              <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Insurer Paid', value: `$${stats.insurerPays.toFixed(2)}`, color: 'var(--color-accent)' },
                  { label: 'Patient Paid', value: `$${stats.patientPays.toFixed(2)}`, color: 'var(--color-text-primary)' },
                  { label: 'Total Estimates', value: String(stats.totalEstimates), color: 'var(--color-text-primary)' },
                  { label: 'High-Risk Items', value: String(stats.highRisk), color: stats.highRisk > 0 ? '#ef4444' : 'var(--color-text-primary)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    background: 'var(--color-background-secondary)', padding: '0.9rem 1rem',
                    borderRadius: 12, border: '1px solid var(--color-border-secondary)',
                  }}>
                    <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Clinical history */}
          <div>
            <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Clinical History</h2>
              <div style={{
                fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)',
                padding: '4px 12px', borderRadius: 20,
                background: 'var(--color-background-secondary)',
                border: '1px solid var(--color-border-secondary)',
              }}>{stats.totalEstimates} Record{stats.totalEstimates !== 1 ? 's' : ''}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {patient.history.length === 0 ? (
                <div style={{
                  padding: '4rem 2rem', textAlign: 'center',
                  background: 'var(--color-background-secondary)', borderRadius: 20,
                  border: '1.5px dashed var(--color-border-secondary)',
                }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--color-accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <FileText size={24} color="var(--color-accent)" />
                  </div>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: 15, margin: 0 }}>No clinical records or estimates found for this patient.</p>
                </div>
              ) : (
                patient.history.map(item => {
                  const rc = riskConfig[item.claim_risk as keyof typeof riskConfig] ?? riskConfig.low
                  const RiskIcon = rc.icon
                  const isHov = hoveredCard === item.id
                  const letter = item.pre_auth_letter || (item as any).preAuthLetter || (item as any).PRE_AUTH_LETTER
                  return (
                    <div
                      key={item.id}
                      onMouseEnter={() => setHoveredCard(item.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      style={{
                        background: 'var(--color-background-primary)', borderRadius: 16,
                        padding: '1.25rem 1.5rem',
                        border: `1px solid ${isHov ? rc.border : 'var(--color-border-secondary)'}`,
                        display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'center',
                        transition: 'all 0.18s ease',
                        boxShadow: isHov ? 'var(--shadow-md)' : 'var(--shadow-xs)',
                        transform: isHov ? 'translateY(-1px)' : 'translateY(0)',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{
                          width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                          background: rc.bg, border: `1px solid ${rc.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: rc.color,
                        }}>
                          <RiskIcon size={20} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                            <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'monospace', color: 'var(--color-text-primary)' }}>{item.cdt_code}</span>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                              background: rc.bg, color: rc.color,
                              border: `1px solid ${rc.border}`, textTransform: 'uppercase',
                              display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                              <span style={{ width: 4, height: 4, borderRadius: '50%', background: rc.color, animation: item.claim_risk === 'high' ? 'pulseDot 1.2s ease-in-out infinite' : 'none' }} />
                              {rc.label}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                            {new Date(item.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {item.plain_explanation && (
                            <p style={{ fontSize: 13, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.55, opacity: 0.85 }}>
                              {item.plain_explanation.length > 120 ? item.plain_explanation.substring(0, 120) + '…' : item.plain_explanation}
                            </p>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 120 }}>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Coverage</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-accent)' }}>{item.coverage_percent}%</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Insurer pays</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)' }}>${item.insurer_pays?.toFixed(2) || '0.00'}</div>
                        </div>
                        {letter ? (
                          <button
                            onClick={() => {
                              setPdfMeta({
                                patientName: `${patient.first_name} ${patient.last_name}`,
                                insurer: patient.insurance_plan_id || 'Insurer',
                                date: new Date(item.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
                              })
                              setShowPdfModal(letter)
                            }}
                            style={{
                              marginTop: 4, padding: '7px 12px', borderRadius: 9,
                              border: '1.5px solid var(--color-accent-subtle)',
                              background: 'var(--color-accent-muted)', color: 'var(--color-accent)',
                              fontSize: 12, fontWeight: 700, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-accent)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-accent-muted)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-accent)' }}
                          >
                            <FileText size={12} /> View Letter
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontStyle: 'italic', marginTop: 4 }}>No letter archived</span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
