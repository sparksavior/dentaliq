'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useClinic } from '@/contexts/clinic-context'
import { estimateApi, patientsApi, tenantsApi, type EstimateHistoryItem, type Patient, type Tenant } from '@/lib/api'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const riskStyle = {
  low:    { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', dot: '#10b981' },
  medium: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', dot: '#f59e0b' },
  high:   { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', dot: '#ef4444' },
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: string }) {
  return (
    <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-secondary)', borderRadius: 14, padding: '1.2rem 1.4rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{label}</div>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--color-accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.03em', marginBottom: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{sub}</div>}
    </div>
  )
}

function AiInsightStrip({ patients, history, loading }: { patients: Patient[]; history: EstimateHistoryItem[]; loading: boolean }) {
  const [insight, setInsight] = useState<string | null>(null)
  const [insightLoading, setInsightLoading] = useState(false)

  const generate = useCallback(async () => {
    if (loading) return
    setInsightLoading(true)

    const now = new Date()
    const thisMonth = history.filter(h => {
      const d = new Date(h.created_at)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const highRisk = history.filter(h => h.claim_risk === 'high').length
    const revenue = thisMonth.reduce((sum, h) => sum + (h.insurer_pays || 0), 0)
    const recentPatient = history.find(h => h.first_name)

    // Find the most common CDT code this month
    const codeCounts: Record<string, number> = {}
    thisMonth.forEach(h => { codeCounts[h.cdt_code] = (codeCounts[h.cdt_code] || 0) + 1 })
    const topCode = Object.entries(codeCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

    const fallback = () => {
      if (history.length === 0) {
        return 'No estimates yet — run your first insurance estimate to start tracking coverage and revenue recovery.'
      }
      if (highRisk > 0) {
        return `${highRisk} high-risk claim${highRisk !== 1 ? 's' : ''} need${highRisk === 1 ? 's' : ''} attention this period. Review them in Claims to avoid denial.`
      }
      if (revenue > 0) {
        return `Your clinic has recovered $${Math.round(revenue).toLocaleString()} from insurers this month across ${thisMonth.length} estimate${thisMonth.length !== 1 ? 's' : ''}.`
      }
      return `${patients.length} patient${patients.length !== 1 ? 's' : ''} on file. Run estimates to track coverage and revenue recovery.`
    }

    try {
      const prompt = `You are a dental clinic AI assistant. In ONE concise sentence (max 22 words), give the single most actionable insight for this clinic right now. Be specific with numbers. No preamble.

Patients: ${patients.length}
Estimates this month: ${thisMonth.length}
Revenue this month: $${Math.round(revenue).toLocaleString()} CAD
High-risk claims: ${highRisk}
Most common procedure this month: ${topCode || 'none yet'}
Most recent patient: ${recentPatient ? `${recentPatient.first_name} ${recentPatient.last_name}` : 'none yet'}`

      const res = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'phi3', prompt, stream: false }),
        signal: AbortSignal.timeout(10000),
      })
      const data = await res.json()
      setInsight(data.response?.trim() || fallback())
    } catch {
      setInsight(fallback())
    } finally {
      setInsightLoading(false)
    }
  }, [loading, history, patients])

  useEffect(() => {
    if (!loading) generate()
  }, [loading, generate])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'linear-gradient(135deg, rgba(15,118,110,0.06), rgba(13,148,136,0.04))',
      border: '1px solid rgba(15,118,110,0.18)',
      borderRadius: 12, padding: '12px 16px', marginBottom: '1.5rem',
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Sparkles size={16} color="#fff" />
      </div>

      {insightLoading || loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[0, 0.15, 0.3].map((delay, i) => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-accent)', opacity: 0.6, animation: `aiPulse 1.2s ease-in-out ${delay}s infinite` }} />
            ))}
          </div>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>AI is analyzing your clinic data…</span>
        </div>
      ) : (
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-accent)', marginRight: 6 }}>AI Insight</span>
          <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{insight}</span>
        </div>
      )}

      {!insightLoading && !loading && (
        <button
          onClick={generate}
          title="Refresh insight"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4, borderRadius: 6, fontSize: 14, opacity: 0.6, flexShrink: 0 }}
        >
          ↻
        </button>
      )}
    </div>
  )
}

export default function OverviewPage() {
  const { user, accessToken } = useAuth()
  const [history, setHistory] = useState<EstimateHistoryItem[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)

  const { selectedClinicId } = useClinic()
  const loadData = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const [hist, pts, t] = await Promise.all([
        estimateApi.getHistory(accessToken).catch(() => [] as EstimateHistoryItem[]),
        patientsApi.getPatients(accessToken).catch(() => [] as Patient[]),
        tenantsApi.getTenant(accessToken).catch(() => null),
      ])
      setHistory(hist)
      setPatients(pts)
      setTenant(t)
    } finally {
      setLoading(false)
    }
  }, [accessToken, selectedClinicId])

  useEffect(() => { loadData() }, [loadData, selectedClinicId])

  const now = new Date()
  const thisMonth = history.filter(h => {
    const d = new Date(h.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const revenueRecovered = thisMonth.reduce((sum, h) => sum + (h.insurer_pays || 0), 0)
  const highRiskCount = history.filter(h => h.claim_risk === 'high').length
  const recent = history.slice(0, 8)

  // Build contextual sub-labels
  const lastMonthEstimates = history.filter(h => {
    const d = new Date(h.created_at)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear()
  }).length
  const monthDelta = thisMonth.length - lastMonthEstimates

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto', color: 'var(--color-text-primary)' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.03em', marginBottom: 4 }}>
          Good {now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
          {now.toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* AI Insight strip — Pro/Enterprise only */}
      {tenant?.plan !== 'starter' && (
        <AiInsightStrip patients={patients} history={history} loading={loading} />
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: '2rem' }}>
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} style={{ background: 'var(--color-background-secondary)', border: '1px solid var(--color-border-secondary)', borderRadius: 14, padding: '1.2rem 1.4rem', height: 110, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))
        ) : (
          <>
            <StatCard
              label="Total Patients"
              value={patients.length.toString()}
              sub={patients.length === 0 ? 'Add your first patient' : `${patients.length} registered patient${patients.length !== 1 ? 's' : ''}`}
              icon="👥"
            />
            <StatCard
              label="Estimates This Month"
              value={thisMonth.length.toString()}
              sub={monthDelta > 0 ? `+${monthDelta} vs last month` : monthDelta < 0 ? `${monthDelta} vs last month` : 'Same as last month'}
              icon="📊"
            />
            <StatCard
              label="Revenue Recovered"
              value={`$${revenueRecovered.toLocaleString('en-CA', { maximumFractionDigits: 0 })}`}
              sub={thisMonth.length > 0 ? `avg $${Math.round(revenueRecovered / thisMonth.length).toLocaleString()} per estimate` : 'insurer payments this month'}
              icon="💰"
            />
            <StatCard
              label="High-Risk Claims"
              value={highRiskCount.toString()}
              sub={highRiskCount === 0 ? 'No high-risk flags' : `${highRiskCount} claim${highRiskCount !== 1 ? 's' : ''} need attention`}
              icon="⚠️"
            />
          </>
        )}
      </div>

      {/* Quick actions + activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
        {/* Quick actions */}
        <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-secondary)', borderRadius: 14, padding: '1.4rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '1rem' }}>Quick actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { href: '/dashboard/estimates', icon: '⚡', label: 'Run an estimate', desc: 'Check coverage instantly' },
              { href: '/dashboard/patients', icon: '👤', label: 'Add a patient', desc: 'Register new patient' },
              { href: '/dashboard/claims', icon: '🛡', label: 'Review claims', desc: 'Check risk flags' },
              { href: '/dashboard/settings', icon: '⚙️', label: 'Settings', desc: 'Clinic & integrations' },
            ].map(a => (
              <Link key={a.href} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-border-tertiary)', textDecoration: 'none', background: 'var(--color-background-secondary)', transition: 'all 0.15s' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--color-accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{a.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 1 }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{a.desc}</div>
                </div>
                <div style={{ marginLeft: 'auto', color: 'var(--color-text-secondary)', fontSize: 14 }}>›</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-secondary)', borderRadius: 14, padding: '1.4rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>Recent activity</h2>
            <Link href="/dashboard/estimates" style={{ fontSize: 12, color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}>View all →</Link>
          </div>

          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} style={{ height: 52, borderRadius: 8, marginBottom: 8, background: 'var(--color-background-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))
          ) : recent.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6 }}>No activity yet</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>Run your first insurance estimate to get started.</div>
              <Link href="/dashboard/estimates" style={{ display: 'inline-block', padding: '9px 20px', background: 'var(--color-accent)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                Run first estimate →
              </Link>
            </div>
          ) : (
            <div>
              {recent.map((item) => {
                const rs = riskStyle[item.claim_risk as keyof typeof riskStyle] ?? riskStyle.low
                const patientLabel = item.first_name
                  ? `${item.first_name} ${item.last_name ?? ''}`.trim()
                  : null
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--color-border-tertiary)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: rs.dot, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.cdt_code}</span>
                        {patientLabel && (
                          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>· {patientLabel}</span>
                        )}
                        <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 20, background: rs.bg, color: rs.text, fontWeight: 500 }}>{item.claim_risk}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.coverage_percent}% covered · Patient pays ${(item.patient_cost || 0).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} · Insurer pays ${(item.insurer_pays || 0).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', flexShrink: 0 }}>{timeAgo(item.created_at)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Getting started banner (shown only when no estimates) */}
      {!loading && history.length === 0 && (
        <div style={{ marginTop: 16, background: 'linear-gradient(135deg, #0f766e, #0d9488)', borderRadius: 14, padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(15,118,110,0.2)' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Ready to recover revenue?</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>Clinics using DentalIQ recover an average of $6,400/month.</div>
          </div>
          <Link href="/dashboard/estimates" style={{ padding: '10px 22px', background: '#fff', color: '#0f766e', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
            Run first estimate →
          </Link>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes aiPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50%       { opacity: 1;   transform: scale(1);    }
        }
      `}</style>
    </div>
  )
}
