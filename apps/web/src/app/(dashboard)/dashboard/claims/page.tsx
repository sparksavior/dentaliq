'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { estimateApi, type EstimateHistoryItem } from '@/lib/api'

type RiskFilter = 'all' | 'high' | 'medium' | 'low'

const riskStyle = {
  low:    { bg: '#d1fae5', text: '#065f46', dot: '#059669', label: 'Low risk' },
  medium: { bg: '#fef3c7', text: '#92400e', dot: '#d97706', label: 'Medium risk' },
  high:   { bg: '#fee2e2', text: '#991b1b', dot: '#dc2626', label: 'High risk' },
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
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<RiskFilter>('all')
  const [narrativeTarget, setNarrativeTarget] = useState<EstimateHistoryItem | null>(null)
  const [narrativeText, setNarrativeText] = useState<string | null>(null)
  const [narrativeLoading, setNarrativeLoading] = useState(false)
  const [insurer, setInsurer] = useState('Sun Life Financial')
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      setHistory(await estimateApi.getHistory(accessToken))
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { load() }, [load])

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

  const generateNarrative = async () => {
    if (!accessToken || !narrativeTarget) return
    setNarrativeLoading(true)
    try {
      const text = await estimateApi.generateNarrative(accessToken, {
        cdtCode: narrativeTarget.cdt_code,
        insurerName: insurer,
      })
      setNarrativeText(text)
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
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: 4 }}>Claims</h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>Review estimate risk flags and draft pre-authorization letters.</p>
      </div>

      {/* Risk summary cards */}
      {!loading && history.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
          {(['high', 'medium', 'low'] as const).map(risk => {
            const rs = riskStyle[risk]
            return (
              <div key={risk} onClick={() => setFilter(risk === filter ? 'all' : risk)}
                style={{ background: filter === risk ? rs.bg : '#fff', border: `1.5px solid ${filter === risk ? rs.dot : '#e2e8f0'}`, borderRadius: 12, padding: '1rem 1.2rem', cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: rs.dot }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: rs.text, textTransform: 'capitalize' }}>{rs.label}</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: filter === risk ? rs.text : '#0f172a' }}>{counts[risk]}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>estimate{counts[risk] !== 1 ? 's' : ''}</div>
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
            style={{ padding: '6px 16px', borderRadius: 20, border: '1.5px solid', borderColor: filter === f ? '#0f766e' : '#e2e8f0', background: filter === f ? '#0f766e' : '#fff', color: filter === f ? '#fff' : '#64748b', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize' }}
          >
            {f === 'all' ? `All (${counts.all})` : `${f} (${counts[f]})`}
          </button>
        ))}
      </div>

      {/* Claims table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Loading claims…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>🛡</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              {history.length === 0 ? 'No claims yet' : `No ${filter}-risk claims`}
            </div>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 20, maxWidth: 340, margin: '0 auto 20px' }}>
              {history.length === 0
                ? 'Run insurance estimates to see claim risk assessments here.'
                : `There are no ${filter}-risk estimates in your history.`}
            </div>
            {history.length === 0 && (
              <a href="/dashboard/estimates" style={{ display: 'inline-block', padding: '10px 24px', background: '#0f766e', color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                Run an estimate →
              </a>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['CDT Code', 'Coverage', 'Patient pays', 'Insurer pays', 'Risk', 'Risk factors', 'Date', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: h === 'Actions' ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const rs = riskStyle[item.claim_risk] ?? riskStyle.low
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafafa'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>{item.cdt_code}</td>
                    <td style={{ padding: '12px 14px', color: '#0f766e', fontWeight: 600 }}>{item.coverage_percent}%</td>
                    <td style={{ padding: '12px 14px', color: '#0f172a', fontWeight: 600 }}>${(item.patient_cost || 0).toLocaleString('en-CA', { maximumFractionDigits: 0 })}</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>${(item.insurer_pays || 0).toLocaleString('en-CA', { maximumFractionDigits: 0 })}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: rs.bg, color: rs.text, fontWeight: 600, textTransform: 'capitalize', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: rs.dot, display: 'inline-block' }} />
                        {item.claim_risk}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', maxWidth: 200 }}>
                      {item.plain_explanation ? (
                        <div style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }} title={item.plain_explanation}>
                          {item.plain_explanation}
                        </div>
                      ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>{timeAgo(item.created_at)}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      {(item.claim_risk === 'high' || item.claim_risk === 'medium') && (
                        <button
                          onClick={() => openPreAuth(item)}
                          style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', color: '#0f766e', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          ✨ Pre-auth
                        </button>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) { setNarrativeTarget(null); setNarrativeText(null) } }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 580, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>Pre-authorization Letter</h2>
                <div style={{ fontSize: 13, color: '#64748b' }}>Procedure: <strong>{narrativeTarget.cdt_code}</strong></div>
              </div>
              <button onClick={() => { setNarrativeTarget(null); setNarrativeText(null) }} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Insurer (for letter addressing)</label>
              <select
                value={insurer}
                onChange={e => setInsurer(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 14, color: '#0f172a', background: '#fff', outline: 'none', cursor: 'pointer' }}
              >
                {INSURERS.map(ins => <option key={ins} value={ins}>{ins}</option>)}
              </select>
            </div>

            {!narrativeText ? (
              <button
                onClick={generateNarrative}
                disabled={narrativeLoading}
                style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: narrativeLoading ? '#94a3b8' : 'linear-gradient(135deg, #0f766e, #0d9488)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: narrativeLoading ? 'not-allowed' : 'pointer' }}
              >
                {narrativeLoading ? 'Generating letter…' : '✨ Generate pre-auth letter with AI'}
              </button>
            ) : (
              <div>
                <textarea
                  value={narrativeText}
                  onChange={e => setNarrativeText(e.target.value)}
                  style={{ width: '100%', height: 280, padding: '14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.7, outline: 'none', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => setNarrativeText(null)} style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>
                    Regenerate
                  </button>
                  <button onClick={copyNarrative} style={{ flex: 2, padding: '10px', borderRadius: 9, border: 'none', background: copied ? '#059669' : '#0f766e', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
                    {copied ? '✓ Copied to clipboard!' : 'Copy to clipboard'}
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
