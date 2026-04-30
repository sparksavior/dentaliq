'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useClinic } from '@/contexts/clinic-context'
import { estimateApi, tenantsApi, type Tenant, type EstimateHistoryItem } from '@/lib/api'
import PreAuthPdfModal from '@/components/PreAuthPdfModal'

type RiskFilter = 'all' | 'high' | 'medium' | 'low'

const riskStyle = {
  low:    { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', dot: '#10b981', label: 'Low risk' },
  medium: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', dot: '#f59e0b', label: 'Medium risk' },
  high:   { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', dot: '#ef4444', label: 'High risk' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(dateStr).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

export default function ClaimsPage() {
  const { accessToken } = useAuth()
  const [history, setHistory] = useState<EstimateHistoryItem[]>([])
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<RiskFilter>('all')
  const [narrativeTarget, setNarrativeTarget] = useState<EstimateHistoryItem | null>(null)
  const [narrativeText, setNarrativeText] = useState<string | null>(null)
  const [narrativeLoading, setNarrativeLoading] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [insurer, setInsurer] = useState('Sun Life Financial')
  const [copied, setCopied] = useState(false)

  const { selectedClinicId } = useClinic()
  const load = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const [hist, t] = await Promise.all([
        estimateApi.getHistory(accessToken),
        tenantsApi.getTenant(accessToken).catch(() => null),
      ])
      setHistory(hist)
      setTenant(t)
    } finally {
      setLoading(false)
    }
  }, [accessToken, selectedClinicId])

  useEffect(() => { load() }, [load, selectedClinicId])

  const counts = {
    all: history.length,
    high: history.filter(h => h.claim_risk === 'high').length,
    medium: history.filter(h => h.claim_risk === 'medium').length,
    low: history.filter(h => h.claim_risk === 'low').length,
  }

  const filtered = filter === 'all' ? history : history.filter(h => h.claim_risk === filter)

  const openPreAuth = (item: EstimateHistoryItem) => {
    setNarrativeTarget(item)
    setNarrativeText(null)
    setInsurer('Sun Life Financial')
  }

  const generateNarrative = async (revisionInstructions?: string | any) => {
    if (!accessToken || !narrativeTarget) return
    setNarrativeLoading(true)

    // Ensure we don't pass the React Event object as instructions
    const instructions = typeof revisionInstructions === 'string' ? revisionInstructions : undefined

    try {
      const text = await estimateApi.generateNarrative(accessToken, {
        cdtCode: narrativeTarget.cdt_code,
        insurerName: insurer,
        previousNarrative: narrativeText || undefined,
        revisionInstructions: instructions
      })
      setNarrativeText(text)
      setShowPdfModal(true)
    } catch (err: any) {
      setNarrativeText('Failed to generate narrative. Please try again.')
    } finally {
      setNarrativeLoading(false)
    }
  }

  const copyNarrative = () => {
    if (!narrativeText) return
    navigator.clipboard.writeText(narrativeText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const INSURERS = ['Sun Life Financial', 'Manulife', 'Canada Life', 'Green Shield Canada', 'Desjardins', 'OTIP/RAEO', 'Empire Life']

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto', color: 'var(--color-text-primary)' }}>
      {/* PDF Modal */}
      {showPdfModal && narrativeText && (
        <PreAuthPdfModal
          narrative={narrativeText}
          clinicName={tenant?.name || 'Your Clinic'}
          insurerName={insurer}
          patientName={narrativeTarget.first_name ? `${narrativeTarget.first_name} ${narrativeTarget.last_name}` : undefined}
          date={new Date(narrativeTarget.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
          onClose={() => setShowPdfModal(false)}
          onRevise={async (instr) => { await generateNarrative(instr) }}
          onSave={async () => {
            if (!accessToken || !narrativeTarget || !narrativeText) return
            await estimateApi.saveLetter(accessToken, narrativeTarget.id, narrativeText)
          }}
        />
      )}
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.03em', marginBottom: 4 }}>Claims</h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Review estimate risk flags and draft pre-authorization letters.</p>
      </div>

      {/* Risk summary cards */}
      {!loading && history.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
          {(['high', 'medium', 'low'] as const).map(risk => {
            const rs = riskStyle[risk]
            return (
              <div key={risk} onClick={() => setFilter(risk === filter ? 'all' : risk)}
                style={{ background: filter === risk ? rs.bg : 'var(--color-background-primary)', border: `1.5px solid ${filter === risk ? rs.dot : 'var(--color-border-secondary)'}`, borderRadius: 12, padding: '1rem 1.2rem', cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: rs.dot }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: filter === risk ? rs.text : 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{rs.label}</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: filter === risk ? rs.text : 'var(--color-text-primary)' }}>{counts[risk]}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>estimate{counts[risk] !== 1 ? 's' : ''}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.2rem' }}>
        {(['all', 'high', 'medium', 'low'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{ padding: '6px 16px', borderRadius: 20, border: '1.5px solid', borderColor: filter === f ? 'var(--color-accent)' : 'var(--color-border-secondary)', background: filter === f ? 'var(--color-accent)' : 'var(--color-background-primary)', color: filter === f ? '#fff' : 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize' }}
          >
            {f === 'all' ? `All (${counts.all})` : `${f} (${counts[f]})`}
          </button>
        ))}
      </div>

      {/* Claims table */}
      <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-secondary)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14 }}>Loading claims…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>🛡</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 6 }}>
              {history.length === 0 ? 'No claims yet' : `No ${filter}-risk claims`}
            </div>
            <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 20, maxWidth: 340, margin: '0 auto 20px' }}>
              {history.length === 0
                ? 'Run insurance estimates to see claim risk assessments here.'
                : `There are no ${filter}-risk estimates in your history.`}
            </div>
            {history.length === 0 && (
              <a href="/dashboard/estimates" style={{ display: 'inline-block', padding: '10px 24px', background: 'var(--color-accent)', color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                Run an estimate →
              </a>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--color-background-secondary)', borderBottom: '1px solid var(--color-border-secondary)' }}>
                {['CDT Code', 'Coverage', 'Patient pays', 'Insurer pays', 'Risk', 'Risk factors', 'Date', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: h === 'Actions' ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const rs = riskStyle[item.claim_risk as keyof typeof riskStyle] ?? riskStyle.low
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border-tertiary)', transition: 'background 0.1s' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>{item.cdt_code}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--color-accent)', fontWeight: 600 }}>{item.coverage_percent}%</td>
                    <td style={{ padding: '12px 14px', color: 'var(--color-text-primary)', fontWeight: 600 }}>${(item.patient_cost || 0).toLocaleString('en-CA', { maximumFractionDigits: 0 })}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)' }}>${(item.insurer_pays || 0).toLocaleString('en-CA', { maximumFractionDigits: 0 })}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: rs.bg, color: rs.text, fontWeight: 600, textTransform: 'capitalize', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: rs.dot, display: 'inline-block' }} />
                        {item.claim_risk}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', maxWidth: 200 }}>
                      {item.plain_explanation ? (
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }} title={item.plain_explanation}>
                          {item.plain_explanation}
                        </div>
                      ) : <span style={{ color: 'var(--color-text-secondary)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)', fontSize: 12, whiteSpace: 'nowrap' }}>{timeAgo(item.created_at)}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      {(item.claim_risk === 'high' || item.claim_risk === 'medium') && (
                        tenant?.plan === 'starter' ? (
                          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: 'rgba(14,116,144,0.08)', color: '#0e7490', fontWeight: 500, whiteSpace: 'nowrap' }}>
                            Pro only
                          </span>
                        ) : (
                          <button
                            onClick={() => openPreAuth(item)}
                            style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', color: 'var(--color-accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            ✨ Pre-auth
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pre-auth modal */}
      {narrativeTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) { setNarrativeTarget(null); setNarrativeText(null) } }}>
          <div style={{ background: 'var(--color-background-primary)', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 580, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--color-border-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 2 }}>Pre-authorization Letter</h2>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Procedure: <strong>{narrativeTarget.cdt_code}</strong></div>
              </div>
              <button onClick={() => { setNarrativeTarget(null); setNarrativeText(null) }} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--color-border-secondary)', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 5 }}>Insurer (for letter addressing)</label>
              <select
                value={insurer}
                onChange={e => setInsurer(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--color-border-secondary)', borderRadius: 9, fontSize: 14, color: 'var(--color-text-primary)', background: 'var(--color-input-bg)', outline: 'none', cursor: 'pointer' }}
              >
                {INSURERS.map(ins => <option key={ins} value={ins}>{ins}</option>)}
              </select>
            </div>

            {!narrativeText ? (
              <button
                onClick={() => generateNarrative()}
                disabled={narrativeLoading}
                style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: narrativeLoading ? 'var(--color-text-secondary)' : 'linear-gradient(135deg, #0f766e, #0d9488)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: narrativeLoading ? 'not-allowed' : 'pointer' }}
              >
                {narrativeLoading ? 'Generating letter…' : '✨ Generate pre-auth letter with AI'}
              </button>
            ) : (
              <div>
                <textarea
                  value={narrativeText}
                  onChange={e => setNarrativeText(e.target.value)}
                  style={{ width: '100%', height: 200, padding: '14px', borderRadius: 10, border: '1px solid var(--color-border-secondary)', background: 'var(--color-input-bg)', color: 'var(--color-text-primary)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.7, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
                />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => setShowPdfModal(true)} style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <FileText size={16} /> View PDF
                  </button>
                  <button onClick={() => setNarrativeText(null)} style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1.5px solid var(--color-border-secondary)', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 13, cursor: 'pointer' }}>
                    Discard
                  </button>
                  <button onClick={copyNarrative} style={{ flex: 1, padding: '10px', borderRadius: 9, border: 'none', background: copied ? '#10b981' : 'var(--color-accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', minWidth: 150 }}>
                    {copied ? '✓ Copied' : 'Copy Text'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
