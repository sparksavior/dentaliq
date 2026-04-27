'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { estimateApi, patientsApi, type EstimateResult, type CdtCodeSummary, type Patient } from '@/lib/api'

function SearchableSelect({ 
  options, value, onChange, placeholder, selStyle 
}: {
  options: { label: string, value: string }[],
  value: string,
  onChange: (val: string) => void,
  placeholder: string,
  selStyle: React.CSSProperties
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  
  const selectedLabel = options.find(o => o.value === value)?.label || '';
  const displayValue = open ? query : selectedLabel;

  const filtered = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input 
        style={{ ...selStyle, boxSizing: 'border-box' }}
        placeholder={placeholder}
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setQuery(''); 
          setOpen(true);
        }}
        onBlur={() => {
          setTimeout(() => { setOpen(false); setQuery(''); }, 150);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Tab') {
            if (open && filtered.length > 0) {
              onChange(filtered[0].value);
              setOpen(false);
              setQuery('');
              if (e.key === 'Enter') e.preventDefault();
            }
          }
        }}
      />
      {open && (
        <div style={{ 
          position: 'absolute', top: '100%', left: 0, right: 0, 
          maxHeight: 200, overflowY: 'auto', 
          background: 'var(--color-background-primary)', 
          border: '0.5px solid var(--color-border-tertiary)', 
          borderRadius: 8, marginTop: 4, zIndex: 50,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--color-text-secondary)' }}>No matches</div>
          ) : filtered.map(o => (
            <div 
              key={o.value} 
              onMouseDown={(e) => e.preventDefault()} 
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              style={{ 
                padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                background: value === o.value ? 'var(--color-background-secondary)' : 'transparent',
                color: 'var(--color-text-primary)'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-background-secondary)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = value === o.value ? 'var(--color-background-secondary)' : 'transparent')}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

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

  const [activeTab, setActiveTab] = useState<'estimates' | 'activity' | 'patients' | 'other'>('estimates')
  const [cdtCodes, setCdtCodes]   = useState<CdtCodeSummary[]>(FALLBACK_CDT)
  const [cdt, setCdt]             = useState('D1110')
  const [insurer, setInsurer]     = useState('Sun Life Financial')
  const [result, setResult]       = useState<EstimateResult | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [liveMode, setLiveMode]   = useState(false)
  const [patients, setPatients]   = useState<Patient[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  
  // Patient Form State
  const [showPatientForm, setShowPatientForm] = useState(false)
  const [newPatient, setNewPatient] = useState({ firstName: '', lastName: '', dateOfBirth: '', phone: '', insuranceProvider: 'Sun Life Financial' })

  // Narrative State
  const [narrativeText, setNarrativeText] = useState<string | null>(null)
  const [narrativeLoading, setNarrativeLoading] = useState(false)

  // Load Patients
  const loadPatients = useCallback(async () => {
    if (!accessToken) return
    try {
      const data = await patientsApi.getPatients(accessToken)
      setPatients(data)
    } catch (e) {
      console.error('Failed to load patients', e)
    }
  }, [accessToken])

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
    loadPatients()
  }, [accessToken, loadPatients])

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
      // Calculate age if a patient is selected and has a DOB
      let age: number | undefined = undefined;
      if (selectedPatientId) {
        const p = patients.find(p => p.id === selectedPatientId);
        if (p && p.date_of_birth) {
          const dob = new Date(p.date_of_birth);
          const diff_ms = Date.now() - dob.getTime();
          age = Math.abs(new Date(diff_ms).getUTCFullYear() - 1970);
        }
      }

      const data = await estimateApi.runEstimate(accessToken, {
        cdtCode: cdt,
        insurerName: insurer,
        patientId: selectedPatientId || undefined,
        patientAge: age,
      })
      setResult(data)
      setNarrativeText(null) // Reset narrative on new estimate
    } catch (err: any) {
      setError(err.message ?? 'Estimate failed')
    } finally {
      setLoading(false)
    }
  }, [accessToken, liveMode, cdt, insurer, selectedPatientId, patients])

  const generateNarrative = async () => {
    if (!accessToken || !result) return
    setNarrativeLoading(true)
    try {
      const p = patients.find(p => p.id === selectedPatientId)
      const patientName = p ? `${p.first_name} ${p.last_name}` : undefined
      const text = await estimateApi.generateNarrative(accessToken, {
        cdtCode: result.cdtCode,
        insurerName: insurer,
        patientName,
      })
      setNarrativeText(text)
    } catch (err: any) {
      alert('Failed to generate narrative: ' + (err.message || 'Unknown error'))
    } finally {
      setNarrativeLoading(false)
    }
  }

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
              onClick={() => setActiveTab(id === 'estimates' || id === 'activity' || id === 'patients' ? id : 'other')}
              style={{
                padding: '8px 10px', borderRadius: 8, marginBottom: 2, cursor: 'pointer', fontSize: 13,
                background: (id === activeTab || (id !== 'estimates' && id !== 'activity' && id !== 'patients' && activeTab === 'other')) ? 'var(--color-background-secondary)' : 'transparent',
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Patient (Optional)</label>
                  <SearchableSelect 
                    options={[
                      { label: '-- No Patient --', value: '' },
                      ...patients.map(p => ({ label: `${p.first_name} ${p.last_name}`, value: p.id }))
                    ]} 
                    value={selectedPatientId} 
                    onChange={(val) => {
                      setSelectedPatientId(val)
                      const p = patients.find(p => p.id === val)
                      if (p && p.insurance_plan_id) setInsurer(p.insurance_plan_id)
                    }} 
                    placeholder="Search patient..." 
                    selStyle={sel} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>CDT procedure code</label>
                  <SearchableSelect 
                    options={cdtCodes.map(c => ({ label: `${c.code} — ${c.description}`, value: c.code }))} 
                    value={cdt} 
                    onChange={(val) => setCdt(val)} 
                    placeholder="Search procedure..." 
                    selStyle={sel} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Insurance provider</label>
                  <SearchableSelect 
                    options={INSURERS.map(ins => ({ label: ins, value: ins }))} 
                    value={insurer} 
                    onChange={(val) => setInsurer(val)} 
                    placeholder="Search provider..." 
                    selStyle={sel} 
                  />
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
                    <div style={{ background: '#fffbeb', border: '0.5px solid #fcd34d', borderRadius: 8, padding: '10px 12px', marginBottom: '1rem' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#92400e', marginBottom: 6 }}>Claim risk checklist</div>
                      {result.riskReasons.map((r, i) => (
                        <div key={i} style={{ fontSize: 12, color: '#78350f', marginBottom: 3, paddingLeft: 12, position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 0 }}>·</span>{r}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AI Narrative Section */}
                  <div style={{ marginTop: '1rem', borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: narrativeText ? '1rem' : 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Pre-authorization Narrative</span>
                      {!narrativeText && (
                        <button 
                          onClick={generateNarrative} 
                          disabled={narrativeLoading}
                          style={{ background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
                          {narrativeLoading ? 'Generating...' : '✨ Draft with AI'}
                        </button>
                      )}
                    </div>
                    
                    {narrativeText && (
                      <div>
                        <textarea 
                          value={narrativeText}
                          onChange={(e) => setNarrativeText(e.target.value)}
                          style={{ width: '100%', height: '180px', padding: '12px', borderRadius: 8, border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5 }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(narrativeText);
                              alert('Copied to clipboard!');
                            }}
                            style={{ background: '#0f766e', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
                            Copy to Clipboard
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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

          {/* ── Patients tab ── */}
          {activeTab === 'patients' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-text-primary)' }}>Patient Directory</h2>
                <button 
                  onClick={() => setShowPatientForm(true)}
                  style={{ background: '#0f766e', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
                  + New Patient
                </button>
              </div>

              {showPatientForm && (
                <div style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, padding: '1.2rem', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: '1rem' }}>Add New Patient</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>First Name</label>
                      <input style={sel} value={newPatient.firstName} onChange={e => setNewPatient({...newPatient, firstName: e.target.value})} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Last Name</label>
                      <input style={sel} value={newPatient.lastName} onChange={e => setNewPatient({...newPatient, lastName: e.target.value})} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Date of Birth</label>
                      <input type="date" style={sel} value={newPatient.dateOfBirth} onChange={e => setNewPatient({...newPatient, dateOfBirth: e.target.value})} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Phone</label>
                      <input style={sel} value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Insurance Provider</label>
                      <select style={sel} value={newPatient.insuranceProvider} onChange={e => setNewPatient({...newPatient, insuranceProvider: e.target.value})}>
                        {INSURERS.map(ins => <option key={ins} value={ins}>{ins}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowPatientForm(false)} style={{ background: 'transparent', border: '0.5px solid var(--color-border-tertiary)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                    <button 
                      onClick={async () => {
                        if (!accessToken) return;
                        await patientsApi.createPatient(accessToken, newPatient);
                        setShowPatientForm(false);
                        setNewPatient({ firstName: '', lastName: '', dateOfBirth: '', phone: '', insuranceProvider: 'Sun Life Financial' });
                        loadPatients();
                      }} 
                      style={{ background: '#0f766e', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                      Save Patient
                    </button>
                  </div>
                </div>
              )}

              <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                  <thead style={{ background: 'var(--color-background-secondary)' }}>
                    <tr>
                      <th style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--color-text-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>Name</th>
                      <th style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--color-text-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>Phone</th>
                      <th style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--color-text-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>Insurance</th>
                      <th style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--color-text-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.length === 0 ? (
                      <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No patients found. Add one above.</td></tr>
                    ) : patients.map(p => (
                      <tr key={p.id} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                        <td style={{ padding: '12px 14px', color: 'var(--color-text-primary)' }}>{p.first_name} {p.last_name}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)' }}>{p.phone || '—'}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)' }}>{p.insurance_plan_id || '—'}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <button 
                            onClick={async () => {
                              if (!accessToken) return;
                              if (confirm('Delete patient?')) {
                                await patientsApi.deletePatient(accessToken, p.id);
                                loadPatients();
                              }
                            }}
                            style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
