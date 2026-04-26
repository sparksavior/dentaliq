'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { estimateApi, type EstimateResult, type CdtCodeSummary } from '@/lib/api'

// ─────────────────────────────────────────────────────────
// Dashboard — Phase 2: real estimate API + CDT codes from service
// Falls back to hardcoded list if service is unavailable
// ─────────────────────────────────────────────────────────

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

const INSURERS = [
  'Sun Life Financial', 'Manulife', 'Canada Life', 'Green Shield Canada',
  'Desjardins', 'OTIP/RAEO', 'Empire Life',
]

const riskColor = { low: '#059669', medium: '#d97706', high: '#dc2626' }
const riskBg    = { low: '#d1fae5', medium: '#fef3c7', high: '#fee2e2' }
const riskText  = { low: '#065f46', medium: '#92400e', high: '#991b1b' }

export default function DashboardPage() {
  const { user, accessToken } = useAuth()

  const [activeTab, setActiveTab] = useState<'estimates' | 'activity' | 'other'>('estimates')
  const [cdtCodes, setCdtCodes]   = useState<CdtCodeSummary[]>(FALLBACK_CDT)
  const [cdt, setCdt]             = useState('D1110')
  const [insurer, setInsurer]     = useState('Sun Life Financial')
  const [result, setResult]       = useState<EstimateResult | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [liveMode, setLiveMode]   = useState(false)

  // Load CDT codes from estimate service on mount
  useEffect(() => {
    if (!accessToken) return
    estimateApi.getCodes(accessToken)
      .then((codes) => {
        setCdtCodes(codes)
        setLiveMode(true)
      })
      .catch(() => {
        // Service not running yet — stay on fallback list silently
      })
  }, [accessToken])

  const runEstimate = useCallback(async () => {
    setLoading(true)
    setResult(null)
    setError(null)

    if (!accessToken || !liveMode) {
      // Fallback to static lookup while service is starting
      setTimeout(() => {
        const found = FALLBACK_CDT.find((c) => c.code === cdt)
        if (found) {
          setResult({
            id: 'static',
            cdtCode: found.code,
            coveragePercent: found.category === 'preventive' ? 100 : found.category === 'basic' ? 80 : found.category === 'major' ? 50 : 0,
            patientCost: Math.round(found.typicalFee * (found.category === 'preventive' ? 0 : found.category === 'basic' ? 0.2 : found.category === 'major' ? 0.5 : 1)),
            insurerPays: Math.round(found.typicalFee * (found.category === 'preventive' ? 1 : found.category === 'basic' ? 0.8 : found.category === 'major' ? 0.5 : 0)),
            plainExplanation: '(Start the estimate service to get AI-powered explanations)',
            claimRisk: found.requiresPreAuth ? 'medium' : 'low',
            riskReasons: found.requiresPreAuth ? ['Pre-authorization required'] : [],
            confidenceScore: 0.6,
          })
        }
        setLoading(false)
      }, 300)
      return
    }

    try {
      const data = await estimateApi.runEstimate(accessToken, {
        cdtCode: cdt,
        insurerName: insurer,
      })
      setResult(data)
    } catch (err: any) {
      setError(err.message ?? 'Estimate failed')
    } finally {
      setLoading(false)
    }
  }, [accessToken, liveMode, cdt, insurer])

  const sel = {
    width: '100%', padding: '10px 12px',
    border: '0.5px solid var(--color-border-secondary)',
    borderRadius: 8, fontSize: 14,
    background: 'var(--color-background-primary)',
    color: 'var(--color-text-primary)',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background-primary)', fontFamily: 'system-ui' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1.5rem', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 13, fontFamily: 'monospace' }}>+</span>
          </div>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>DentalIQ</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginLeft: 4 }}>/ {user?.tenantId?.slice(0, 8)}…</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 20,
            background: liveMode ? '#d1fae5' : '#fef3c7',
            color: liveMode ? '#065f46' : '#92400e',
          }}>
            {liveMode ? 'Phase 2 Live' : 'Phase 1 Fallback'}
          </div>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff' }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', minHeight: 'calc(100vh - 53px)' }}>
        {/* Sidebar */}
        <div style={{ borderRight: '0.5px solid var(--color-border-tertiary)', padding: '1rem' }}>
          {([
            ['estimates', 'Cost estimator'],
            ['activity',  'Activity'],
            ['claims',    'Claim risk'],
            ['preauth',   'Pre-auth'],
            ['patients',  'Patients'],
            ['settings',  'Settings'],
          ] as const).map(([id, label]) => (
            <div key={id}
              onClick={() => setActiveTab(id === 'estimates' || id === 'activity' ? id : 'other')}
              style={{
                padding: '8px 10px', borderRadius: 8, marginBottom: 2, cursor: 'pointer', fontSize: 13,
                background: (id === activeTab || (id !== 'estimates' && id !== 'activity' && activeTab === 'other')) ? 'var(--color-background-secondary)' : 'transparent',
                color: 'var(--color-text-primary)', fontWeight: activeTab === id ? 500 : 400,
              }}>
              {label}
              {(id === 'claims' || id === 'preauth' || id === 'patients') && (
                <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--color-text-secondary)', background: 'var(--color-background-secondary)', padding: '1px 6px', borderRadius: 10 }}>P2</span>
              )}
            </div>
          ))}

          <div style={{ marginTop: '2rem', padding: '10px', background: 'var(--color-background-secondary)', borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 4 }}>This month</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: '#0f766e', marginBottom: 2 }}>$4,820</div>
            <div style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>revenue recovered</div>
          </div>
        </div>

        {/* Main panel */}
        <div style={{ padding: '1.5rem' }}>
          {/* ── Estimates tab ── */}
          {activeTab === 'estimates' && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: '0.4rem', color: 'var(--color-text-primary)' }}>Real-time cost estimator</h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: '1.2rem' }}>
                {liveMode
                  ? `${cdtCodes.length} CDT codes loaded · LLM-powered explanations via POST /estimate`
                  : 'Estimate service offline — showing rule-based fallback'}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>CDT procedure code</label>
                  <select value={cdt} onChange={(e) => setCdt(e.target.value)} style={sel}>
                    {cdtCodes.map((c) => (
                      <option key={c.code} value={c.code}>{c.code} — {c.description}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Insurance provider</label>
                  <select value={insurer} onChange={(e) => setInsurer(e.target.value)} style={sel}>
                    {INSURERS.map((ins) => (
                      <option key={ins} value={ins}>{ins}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button onClick={runEstimate} disabled={loading}
                style={{ background: loading ? '#6b7280' : '#0f766e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, cursor: 'pointer', marginBottom: '1.2rem', transition: 'background 0.2s' }}>
                {loading ? 'Calculating…' : 'Run estimate →'}
              </button>

              {error && (
                <div style={{ background: '#fee2e2', border: '0.5px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#991b1b', marginBottom: '1rem' }}>
                  {error}
                </div>
              )}

              {result && (
                <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: '1.2rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '1rem' }}>
                    <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Coverage</div>
                      <div style={{ fontSize: 24, fontWeight: 500, color: '#0f766e' }}>{result.coveragePercent}%</div>
                    </div>
                    <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Patient pays</div>
                      <div style={{ fontSize: 24, fontWeight: 500, color: 'var(--color-text-primary)' }}>${result.patientCost.toLocaleString()}</div>
                    </div>
                    <div style={{ background: riskBg[result.claimRisk], borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, color: riskText[result.claimRisk], marginBottom: 4 }}>Claim risk</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: riskColor[result.claimRisk], textTransform: 'capitalize' }}>{result.claimRisk}</div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '12px', marginBottom: result.riskReasons.length > 0 ? '0.8rem' : 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Plain-language explanation for patient</div>
                    <div style={{ fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.55 }}>{result.plainExplanation}</div>
                  </div>

                  {result.riskReasons.length > 0 && (
                    <div style={{ background: '#fffbeb', border: '0.5px solid #fcd34d', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#92400e', marginBottom: 6 }}>Claim risk checklist</div>
                      {result.riskReasons.map((r, i) => (
                        <div key={i} style={{ fontSize: 12, color: '#78350f', marginBottom: 3, paddingLeft: 12, position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 0 }}>·</span>{r}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Activity tab ── */}
          {activeTab === 'activity' && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: '1.2rem', color: 'var(--color-text-primary)' }}>Recent activity</h2>
              {[
                { time: '2m ago',  action: 'Cost estimate generated', patient: 'P-3821', code: 'D1110', result: '$0 — Fully covered' },
                { time: '8m ago',  action: 'Claim risk flagged',       patient: 'P-3820', code: 'D2750', result: 'Missing X-ray ref' },
                { time: '15m ago', action: 'Pre-auth drafted',         patient: 'P-3819', code: 'D6010', result: 'Sent to Sun Life' },
                { time: '1h ago',  action: 'Cost estimate generated',  patient: 'P-3818', code: 'D2393', result: '$50 — 80% covered' },
              ].map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', width: 50, flexShrink: 0 }}>{a.time}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--color-text-primary)', marginBottom: 2 }}>{a.action}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{a.patient} · {a.code}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'right' }}>{a.result}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Phase 2 placeholder ── */}
          {activeTab === 'other' && (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <div style={{ fontSize: 40, marginBottom: '1rem' }}>🚧</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 8 }}>Coming in Phase 2</div>
              <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>
                Claim risk detection, pre-authorization drafting, patient management, and full settings are part of the Phase 2 AI engine build.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
