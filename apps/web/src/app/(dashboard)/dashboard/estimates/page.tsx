'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { estimateApi, patientsApi, type EstimateResult, type CdtCodeSummary, type Patient, type EstimateHistoryItem } from '@/lib/api'

const FALLBACK_CDT: CdtCodeSummary[] = [
  { code: 'D1110', description: 'Prophylaxis (adult)',              category: 'preventive', typicalFee: 115,  requiresPreAuth: false },
  { code: 'D1120', description: 'Prophylaxis (child)',              category: 'preventive', typicalFee: 80,   requiresPreAuth: false },
  { code: 'D2393', description: 'Composite resin — 3 surfaces',    category: 'basic',      typicalFee: 248,  requiresPreAuth: false },
  { code: 'D2750', description: 'Crown — porcelain fused to metal', category: 'major',     typicalFee: 1350, requiresPreAuth: true  },
  { code: 'D4341', description: 'Periodontal scaling',              category: 'basic',      typicalFee: 248,  requiresPreAuth: false },
  { code: 'D6010', description: 'Implant placement',               category: 'implant',    typicalFee: 2800, requiresPreAuth: true  },
  { code: 'D7140', description: 'Extraction — erupted tooth',      category: 'basic',      typicalFee: 155,  requiresPreAuth: false },
  { code: 'D8080', description: 'Orthodontics — adolescent',       category: 'ortho',      typicalFee: 5800, requiresPreAuth: true  },
]

const INSURERS = ['Sun Life Financial', 'Manulife', 'Canada Life', 'Green Shield Canada', 'Desjardins', 'OTIP/RAEO', 'Empire Life']

const riskStyle = {
  low:    { bg: '#d1fae5', text: '#065f46', label: 'Low Risk' },
  medium: { bg: '#fef3c7', text: '#92400e', label: 'Medium Risk' },
  high:   { bg: '#fee2e2', text: '#991b1b', label: 'High Risk' },
}

function SearchableSelect({ options, value, onChange, placeholder }: {
  options: { label: string; value: string }[]
  value: string
  onChange: (val: string) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selectedLabel = options.find(o => o.value === value)?.label ?? ''
  const filtered = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={open ? query : selectedLabel}
        placeholder={placeholder}
        onChange={e => { setQuery(e.target.value); if (!open) setOpen(true) }}
        onFocus={() => { setQuery(''); setOpen(true) }}
        onBlur={() => setTimeout(() => { setOpen(false); setQuery('') }, 150)}
        onKeyDown={e => {
          if ((e.key === 'Enter' || e.key === 'Tab') && open && filtered.length > 0) {
            onChange(filtered[0].value); setOpen(false); setQuery('')
            if (e.key === 'Enter') e.preventDefault()
          }
        }}
        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#0f172a', background: '#fff', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
        onMouseEnter={e => (e.target as HTMLInputElement).style.borderColor = '#0f766e'}
        onMouseLeave={e => { if (document.activeElement !== e.target) (e.target as HTMLInputElement).style.borderColor = '#e2e8f0' }}
      />
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: 220, overflowY: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, marginTop: 4, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
          {filtered.length === 0
            ? <div style={{ padding: '10px 14px', fontSize: 13, color: '#94a3b8' }}>No matches</div>
            : filtered.map(o => (
              <div key={o.value}
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onChange(o.value); setOpen(false) }}
                style={{ padding: '10px 14px', fontSize: 14, cursor: 'pointer', background: value === o.value ? '#f0fdfa' : '#fff', color: '#0f172a', borderBottom: '1px solid #f8fafc' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = value === o.value ? '#f0fdfa' : '#fff'}
              >
                {o.label}
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function EstimatesPage() {
  const { accessToken } = useAuth()
  const [cdtCodes, setCdtCodes] = useState<CdtCodeSummary[]>(FALLBACK_CDT)
  const [patients, setPatients] = useState<Patient[]>([])
  const [history, setHistory] = useState<EstimateHistoryItem[]>([])
  const [liveMode, setLiveMode] = useState(false)

  const [cdt, setCdt] = useState('D1110')
  const [insurer, setInsurer] = useState('Sun Life Financial')
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [result, setResult] = useState<EstimateResult | null>(null)
  const [narrativeText, setNarrativeText] = useState<string | null>(null)
  const [narrativeLoading, setNarrativeLoading] = useState(false)
  const [estimating, setEstimating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    if (!accessToken) return
    const [codes, pts, hist] = await Promise.all([
      estimateApi.getCodes(accessToken).catch(() => null),
      patientsApi.getPatients(accessToken).catch(() => [] as Patient[]),
      estimateApi.getHistory(accessToken).catch(() => [] as EstimateHistoryItem[]),
    ])
    if (codes) { setCdtCodes(codes); setLiveMode(true) }
    setPatients(pts)
    setHistory(hist)
  }, [accessToken])

  useEffect(() => { load() }, [load])

  const runEstimate = async () => {
    setEstimating(true); setResult(null); setError(null); setNarrativeText(null)

    if (!accessToken || !liveMode) {
      await new Promise(r => setTimeout(r, 400))
      const found = FALLBACK_CDT.find(c => c.code === cdt)
      if (found) {
        const pct = found.category === 'preventive' ? 100 : found.category === 'basic' ? 80 : found.category === 'major' ? 50 : 0
        setResult({ id: 'static', cdtCode: found.code, coveragePercent: pct, patientCost: Math.round(found.typicalFee * (1 - pct / 100)), insurerPays: Math.round(found.typicalFee * pct / 100), plainExplanation: 'Start the estimate service for AI-powered explanations.', claimRisk: found.requiresPreAuth ? 'medium' : 'low', riskReasons: found.requiresPreAuth ? ['Pre-authorization required for this procedure'] : [], confidenceScore: 0.6 })
      }
      setEstimating(false); return
    }

    try {
      let age: number | undefined
      if (selectedPatientId) {
        const p = patients.find(p => p.id === selectedPatientId)
        if (p?.date_of_birth) age = Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / 31557600000)
      }
      const data = await estimateApi.runEstimate(accessToken, { cdtCode: cdt, insurerName: insurer, patientId: selectedPatientId || undefined, patientAge: age })
      setResult(data)
      // Refresh history after new estimate
      estimateApi.getHistory(accessToken).then(setHistory).catch(() => {})
    } catch (err: any) {
      setError(err.message ?? 'Estimate failed')
    } finally {
      setEstimating(false)
    }
  }

  const generateNarrative = async () => {
    if (!accessToken || !result) return
    setNarrativeLoading(true)
    try {
      const p = patients.find(p => p.id === selectedPatientId)
      const text = await estimateApi.generateNarrative(accessToken, {
        cdtCode: result.cdtCode, insurerName: insurer,
        patientName: p ? `${p.first_name} ${p.last_name}` : undefined,
      })
      setNarrativeText(text)
    } catch (err: any) {
      setError('Failed to generate narrative: ' + (err.message ?? 'Unknown error'))
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

  const rs = result ? (riskStyle[result.claimRisk] ?? riskStyle.low) : null

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: 4 }}>Cost Estimator</h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>
          {liveMode ? `${cdtCodes.length} CDT codes loaded · AI-powered explanations` : 'Estimate service offline — using fallback rules'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left: Estimator */}
        <div>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: '1.2rem' }}>Run an estimate</h2>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#64748b', display: 'block', marginBottom: 5 }}>Patient <span style={{ fontWeight: 400 }}>(optional)</span></label>
              <SearchableSelect
                options={[{ label: '— No patient selected —', value: '' }, ...patients.map(p => ({ label: `${p.first_name} ${p.last_name}`, value: p.id }))]}
                value={selectedPatientId}
                onChange={val => { setSelectedPatientId(val); if (val) { const p = patients.find(p => p.id === val); if (p?.insurance_plan_id) setInsurer(p.insurance_plan_id) } }}
                placeholder="Search patient…"
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#64748b', display: 'block', marginBottom: 5 }}>CDT procedure code</label>
              <SearchableSelect
                options={cdtCodes.map(c => ({ label: `${c.code} — ${c.description}`, value: c.code }))}
                value={cdt}
                onChange={setCdt}
                placeholder="Search procedure…"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#64748b', display: 'block', marginBottom: 5 }}>Insurance provider</label>
              <SearchableSelect
                options={INSURERS.map(ins => ({ label: ins, value: ins }))}
                value={insurer}
                onChange={setInsurer}
                placeholder="Search provider…"
              />
            </div>

            {error && (
              <div style={{ marginBottom: 12, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, fontSize: 13, color: '#dc2626' }}>{error}</div>
            )}

            <button
              onClick={runEstimate}
              disabled={estimating}
              style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: estimating ? '#94a3b8' : 'linear-gradient(135deg, #0f766e, #0d9488)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: estimating ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
            >
              {estimating ? 'Calculating…' : 'Run estimate →'}
            </button>
          </div>

          {/* Result card */}
          {result && rs && (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: '1rem' }}>
                <div style={{ background: '#f0fdfa', borderRadius: 10, padding: '12px' }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Coverage</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#0f766e' }}>{result.coveragePercent}%</div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px' }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Patient pays</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a' }}>${result.patientCost.toLocaleString()}</div>
                </div>
                <div style={{ background: rs.bg, borderRadius: 10, padding: '12px' }}>
                  <div style={{ fontSize: 11, color: rs.text, marginBottom: 4 }}>Claim risk</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: rs.text, textTransform: 'capitalize' }}>{rs.label}</div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px', marginBottom: result.riskReasons.length > 0 ? '0.8rem' : 0 }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 500 }}>Plain-language explanation</div>
                <div style={{ fontSize: 14, color: '#0f172a', lineHeight: 1.6 }}>{result.plainExplanation}</div>
              </div>

              {result.riskReasons.length > 0 && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px', marginBottom: '1rem' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 8 }}>Claim risk checklist</div>
                  {result.riskReasons.map((r, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#78350f', marginBottom: 4, display: 'flex', gap: 6 }}>
                      <span style={{ color: '#d97706', flexShrink: 0 }}>⚠</span> {r}
                    </div>
                  ))}
                </div>
              )}

              {/* Pre-auth section */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: narrativeText ? 10 : 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Pre-authorization letter</div>
                  {!narrativeText && (
                    <button
                      onClick={generateNarrative}
                      disabled={narrativeLoading}
                      style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontSize: 13, fontWeight: 500, cursor: narrativeLoading ? 'not-allowed' : 'pointer' }}
                    >
                      {narrativeLoading ? 'Generating…' : '✨ Draft with AI'}
                    </button>
                  )}
                </div>
                {narrativeText && (
                  <div>
                    <textarea
                      value={narrativeText}
                      onChange={e => setNarrativeText(e.target.value)}
                      style={{ width: '100%', height: 180, padding: '12px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.55, outline: 'none', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                      <button onClick={() => setNarrativeText(null)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>Discard</button>
                      <button onClick={copyNarrative} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: copied ? '#059669' : '#0f766e', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
                        {copied ? '✓ Copied!' : 'Copy to Clipboard'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: History */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: '1rem' }}>Estimate history</h2>

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>No estimates yet</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Run your first estimate using the form on the left.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Code</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coverage</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Patient</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>When</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => {
                    const style = riskStyle[item.claim_risk] ?? riskStyle.low
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f8fafc' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafafa'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                      >
                        <td style={{ padding: '10px 10px', fontWeight: 600, color: '#0f172a' }}>{item.cdt_code}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right', color: '#0f766e', fontWeight: 600 }}>{item.coverage_percent}%</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right', color: '#0f172a' }}>${(item.patient_cost || 0).toLocaleString('en-CA', { maximumFractionDigits: 0 })}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: style.bg, color: style.text, fontWeight: 500, textTransform: 'capitalize' }}>{item.claim_risk}</span>
                        </td>
                        <td style={{ padding: '10px 10px', textAlign: 'right', color: '#94a3b8' }}>{timeAgo(item.created_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
