'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { estimateApi, patientsApi, type EstimateHistoryItem, type Patient } from '@/lib/api'

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
  low:    { bg: '#d1fae5', text: '#065f46', dot: '#059669' },
  medium: { bg: '#fef3c7', text: '#92400e', dot: '#d97706' },
  high:   { bg: '#fee2e2', text: '#991b1b', dot: '#dc2626' },
}

function StatCard({ label, value, sub, color = '#0f766e', icon }: { label: string; value: string; sub?: string; color?: string; icon: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.2rem 1.4rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>{label}</div>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#94a3b8' }}>{sub}</div>}
    </div>
  )
}

export default function OverviewPage() {
  const { user, accessToken } = useAuth()
  const [history, setHistory] = useState<EstimateHistoryItem[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const [hist, pts] = await Promise.all([
        estimateApi.getHistory(accessToken).catch(() => [] as EstimateHistoryItem[]),
        patientsApi.getPatients(accessToken).catch(() => [] as Patient[]),
      ])
      setHistory(hist)
      setPatients(pts)
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { loadData() }, [loadData])

  const now = new Date()
  const thisMonth = history.filter(h => {
    const d = new Date(h.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const revenueRecovered = thisMonth.reduce((sum, h) => sum + (h.insurer_pays || 0), 0)
  const highRiskCount = history.filter(h => h.claim_risk === 'high').length
  const recent = history.slice(0, 8)

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: 4 }}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}
        </h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>Here's what's happening at your clinic today.</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: '2rem' }}>
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.2rem 1.4rem', height: 110, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))
        ) : (
          <>
            <StatCard label="Total Patients" value={patients.length.toString()} sub="in your clinic" icon="👥" color="#0f766e" />
            <StatCard label="Estimates This Month" value={thisMonth.length.toString()} sub="cost estimates run" icon="📊" color="#0e7490" />
            <StatCard label="Revenue Recovered" value={`$${revenueRecovered.toLocaleString('en-CA', { maximumFractionDigits: 0 })}`} sub="insurer payments this month" icon="💰" color="#059669" />
            <StatCard label="High-Risk Claims" value={highRiskCount.toString()} sub="need attention" icon="⚠️" color="#dc2626" />
          </>
        )}
      </div>

      {/* Quick actions + activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
        {/* Quick actions */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.4rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: '1rem' }}>Quick actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { href: '/dashboard/estimates', icon: '⚡', label: 'Run an estimate', desc: 'Check coverage instantly' },
              { href: '/dashboard/patients', icon: '👤', label: 'Add a patient', desc: 'Register new patient' },
              { href: '/dashboard/claims', icon: '🛡', label: 'Review claims', desc: 'Check risk flags' },
              { href: '/dashboard/settings', icon: '⚙️', label: 'Settings', desc: 'Clinic & integrations' },
            ].map(a => (
              <Link key={a.href} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: '1px solid #f1f5f9', textDecoration: 'none', background: '#fafafa', transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f0fdfa'; (e.currentTarget as HTMLElement).style.borderColor = '#99f6e4' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fafafa'; (e.currentTarget as HTMLElement).style.borderColor = '#f1f5f9' }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{a.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 1 }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{a.desc}</div>
                </div>
                <div style={{ marginLeft: 'auto', color: '#cbd5e1', fontSize: 14 }}>›</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.4rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Recent activity</h2>
            <Link href="/dashboard/estimates" style={{ fontSize: 12, color: '#0f766e', textDecoration: 'none', fontWeight: 500 }}>View all →</Link>
          </div>

          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} style={{ height: 52, borderRadius: 8, marginBottom: 8, background: 'linear-gradient(90deg, #f8fafc 25%, #f1f5f9 50%, #f8fafc 75%)', backgroundSize: '200% 100%', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))
          ) : recent.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>No activity yet</div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Run your first insurance estimate to get started.</div>
              <Link href="/dashboard/estimates" style={{ display: 'inline-block', padding: '9px 20px', background: '#0f766e', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                Run first estimate →
              </Link>
            </div>
          ) : (
            <div>
              {recent.map((item) => {
                const rs = riskStyle[item.claim_risk] ?? riskStyle.low
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: rs.dot, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{item.cdt_code}</span>
                        <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 20, background: rs.bg, color: rs.text, fontWeight: 500 }}>{item.claim_risk}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.coverage_percent}% covered · Patient pays ${(item.patient_cost || 0).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>{timeAgo(item.created_at)}</div>
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

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
