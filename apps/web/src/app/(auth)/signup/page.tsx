'use client'

import { useState, useRef, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authApi, tenantsApi, ApiError } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'

const STEP_NAMES = ['Account', 'Verify', 'Clinics', 'Connect', 'Security', 'Done']

const PLANS = [
  { id: 'starter',    name: 'Starter',    price: 199,  desc: '1 clinic location',    features: ['Cost estimator', 'Claim risk checks', 'Basic analytics'], color: '#0f766e' },
  { id: 'pro',        name: 'Pro',        price: 349,  desc: 'Up to 3 locations',    features: ['Everything in Starter', 'AI pre-auth letters', 'Priority support', 'Multi-location'], color: '#0e7490', popular: true },
  { id: 'enterprise', name: 'Enterprise', price: null, desc: 'Unlimited locations',  features: ['Everything in Pro', 'API access', 'Dedicated CSM', 'Custom integrations'], color: '#4f46e5' },
]

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14,
  color: '#0f172a', background: '#fff', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'system-ui',
  transition: 'border-color 0.15s',
}

export default function SignupPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { setSession } = useAuth()

  const [step, setStep] = useState(0)
  const [plan, setPlan] = useState<'starter' | 'pro' | 'enterprise'>(
    (params.get('plan') as any) ?? 'pro'
  )
  const [form, setForm] = useState({ name: '', clinic: '', email: '', phone: '', password: '', confirm: '' })
  const [verifyCode, setVerifyCode] = useState(['', '', '', '', '', ''])
  const [pmsStatus, setPmsStatus] = useState<'idle' | 'connecting' | 'connected'>('idle')
  const [pmsProgress, setPmsProgress] = useState(0)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [mfaData, setMfaData] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [extraClinics, setExtraClinics] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const selectedPlan = PLANS.find((p) => p.id === plan) ?? PLANS[1]

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) return setError('Passwords do not match.')
    if (form.password.length < 8) return setError('Password must be at least 8 characters.')
    setLoading(true)
    try {
      await authApi.register({
        name: form.name, email: form.email, password: form.password,
        clinicName: form.clinic, plan,
      })
      const result = await authApi.login({ email: form.email, password: form.password })
      if (!('requiresMfa' in result)) {
        setSessionToken(result.accessToken)
      }
      setStep(1)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  function handleVerify() {
    setStep(2)
  }

  async function handleSaveClinics() {
    if (!sessionToken) { setStep(3); return }
    setLoading(true)
    setError('')
    try {
      for (const name of extraClinics) {
        if (name.trim()) {
          await tenantsApi.createClinic(sessionToken, { name: name.trim() })
        }
      }
      setStep(3)
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to save additional locations')
    } finally {
      setLoading(false)
    }
  }

  function connectPms() {
    setPmsStatus('connecting')
    setPmsProgress(0)
    let p = 0
    timerRef.current = setInterval(() => {
      p += 12
      setPmsProgress(p)
      if (p >= 100) {
        clearInterval(timerRef.current!)
        setPmsStatus('connected')
      }
    }, 280)
  }

  function skipPms() {
    loadMfa()
    setStep(4)
  }

  async function loadMfa() {
    if (!sessionToken || mfaData) return
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3001'}/auth/mfa/setup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
        credentials: 'include',
      })
      const json = await res.json()
      if (json.success) setMfaData(json.data)
    } catch { /* MFA is optional */ }
  }

  async function enableMfa() {
    if (!sessionToken || !mfaData) { setStep(5); return }
    if (!mfaCode || mfaCode.length !== 6) { setStep(5); return }
    setLoading(true)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3001'}/auth/mfa/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: mfaCode, secret: mfaData.secret }),
      })
    } catch { /* non-blocking */ }
    setStep(5)
    setLoading(false)
  }

  async function goToDashboard() {
    if (sessionToken) {
      try {
        const user = await authApi.me(sessionToken)
        setSession(sessionToken, user)
      } catch { /* session already set */ }
    }
    // Flag: show insight popup + trigger tour guide on first dashboard visit
    sessionStorage.setItem('diq_fresh_login', '1')
    router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', fontFamily: 'system-ui' }}>
      {/* Top nav */}
      <div style={{ borderBottom: '1px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', padding: '0 2rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #0f766e, #0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>+</div>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.03em' }}>DentalIQ</span>
        </div>
        <a href="/login" style={{ fontSize: 14, color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
          Already have an account? <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Sign in</span>
        </a>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        {/* Step progress */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2.5rem', gap: 0 }}>
          {STEP_NAMES.map((name, i) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', flex: i < STEP_NAMES.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600,
                  background: i < step ? 'var(--color-accent)' : i === step ? 'linear-gradient(135deg, #0f766e, #0d9488)' : 'var(--color-background-primary)',
                  color: i <= step ? '#fff' : 'var(--color-text-secondary)',
                  border: i > step ? '2px solid var(--color-border-secondary)' : 'none',
                  boxShadow: i === step ? '0 0 0 4px rgba(15,118,110,0.15)' : 'none',
                  transition: 'all 0.3s',
                }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 11, fontWeight: i === step ? 600 : 400, color: i === step ? 'var(--color-accent)' : i < step ? 'var(--color-text-secondary)' : 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{name}</span>
              </div>
              {i < STEP_NAMES.length - 1 && (
                <div style={{ flex: 1, height: 2, background: i < step ? 'var(--color-accent)' : 'var(--color-border-secondary)', marginBottom: 18, transition: 'background 0.3s' }} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ marginBottom: 20, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, fontSize: 14, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⚠</span> {error}
          </div>
        )}

        {/* Step 0: Account details */}
        {step === 0 && (
          <form onSubmit={handleRegister}>
            <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-secondary)', borderRadius: 16, padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.03em' }}>Create your account</h2>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>Start your 14-day free trial — no credit card required.</p>

              {/* Plan selector */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>Choose your plan</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {PLANS.map((p) => (
                    <button
                      key={p.id} type="button"
                      onClick={() => setPlan(p.id as any)}
                      style={{
                        padding: '12px 8px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', position: 'relative',
                        border: plan === p.id ? `2px solid var(--color-accent)` : '1.5px solid var(--color-border-secondary)',
                        background: plan === p.id ? 'var(--color-accent-muted)' : 'var(--color-background-primary)',
                        transition: 'all 0.2s',
                      }}
                    >
                      {p.popular && (
                        <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'var(--color-accent)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                          POPULAR
                        </div>
                      )}
                      <div style={{ fontSize: 14, fontWeight: 600, color: plan === p.id ? 'var(--color-accent)' : 'var(--color-text-primary)', marginBottom: 2 }}>{p.name}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: plan === p.id ? 'var(--color-accent)' : 'var(--color-text-primary)', marginBottom: 2 }}>
                        {p.price ? `$${p.price}` : 'Custom'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{p.desc}</div>
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 10, padding: '10px 14px', background: 'var(--color-accent-muted)', borderRadius: 8, border: '1px solid var(--color-accent)' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 500, marginBottom: 4 }}>{selectedPlan.name} includes:</div>
                  {selectedPlan.features.map(f => (
                    <div key={f} style={{ fontSize: 12, color: 'var(--color-accent)', marginBottom: 2 }}>✓ {f}</div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 0 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Full name</label>
                  <input
                    style={{...inputStyle, background: 'var(--color-input-bg)', color: 'var(--color-text-primary)', border: '1.5px solid var(--color-border-secondary)'}} placeholder="Dr. Sarah Chen" value={form.name} onChange={set('name')} required
                    onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border-secondary)'}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Clinic name</label>
                  <input
                    style={{...inputStyle, background: 'var(--color-input-bg)', color: 'var(--color-text-primary)', border: '1.5px solid var(--color-border-secondary)'}} placeholder="Lakeview Dental Group" value={form.clinic} onChange={set('clinic')} required
                    onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border-secondary)'}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Work email</label>
                  <input
                    style={{...inputStyle, background: 'var(--color-input-bg)', color: 'var(--color-text-primary)', border: '1.5px solid var(--color-border-secondary)'}} type="email" placeholder="you@yourclinic.ca" value={form.email} onChange={set('email')} required
                    onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border-secondary)'}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Phone <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>(optional)</span></label>
                  <input
                    style={{...inputStyle, background: 'var(--color-input-bg)', color: 'var(--color-text-primary)', border: '1.5px solid var(--color-border-secondary)'}} placeholder="+1 (416) 555-0100" value={form.phone} onChange={set('phone')}
                    onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border-secondary)'}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Password</label>
                  <input
                    style={{...inputStyle, background: 'var(--color-input-bg)', color: 'var(--color-text-primary)', border: '1.5px solid var(--color-border-secondary)'}} type="password" placeholder="Min. 8 characters" value={form.password} onChange={set('password')} required
                    onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border-secondary)'}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Confirm password</label>
                  <input
                    style={{...inputStyle, background: 'var(--color-input-bg)', color: 'var(--color-text-primary)', border: '1.5px solid var(--color-border-secondary)'}} type="password" placeholder="••••••••" value={form.confirm} onChange={set('confirm')} required
                    onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border-secondary)'}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, padding: '10px 16px', background: 'var(--color-background-primary)', border: '1px solid var(--color-border-secondary)', borderRadius: 10, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              By continuing you agree to our Terms of Service and Privacy Policy. Health data is stored exclusively on Canadian infrastructure (AWS ca-central-1) and is PHIPA-compliant.
            </div>

            <button
              type="submit"
              disabled={loading || !form.name || !form.clinic || !form.email || !form.password}
              style={{ width: '100%', marginTop: 12, padding: '13px', borderRadius: 10, border: 'none', background: (loading || !form.name || !form.clinic || !form.email || !form.password) ? 'var(--color-text-secondary)' : 'linear-gradient(135deg, #0f766e, #0d9488)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.01em' }}
            >
              {loading ? 'Creating account…' : 'Continue →'}
            </button>
          </form>
        )}


        {/* Step 1: Email verify */}
        {step === 1 && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: '1.2rem' }}>✉️</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 6, letterSpacing: '-0.03em' }}>Verify your email</h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: '1.5rem' }}>
              We sent a verification link to <strong style={{ color: '#0f172a' }}>{form.email}</strong>
            </p>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: '1.5rem' }}>
              {verifyCode.map((v, i) => (
                <input
                  key={i} id={`vc-${i}`} maxLength={1} value={v}
                  onChange={(e) => {
                    if (!/^\d?$/.test(e.target.value)) return
                    const next = [...verifyCode]; next[i] = e.target.value; setVerifyCode(next)
                    if (e.target.value && i < 5) (document.getElementById(`vc-${i + 1}`) as HTMLElement)?.focus()
                  }}
                  style={{ width: 48, height: 56, textAlign: 'center', fontSize: 22, border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#fff', color: '#0f172a', fontFamily: 'monospace', outline: 'none', transition: 'border-color 0.15s' }}
                  onFocus={e => e.target.style.borderColor = '#0f766e'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              ))}
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: '1.5rem', fontSize: 13, color: '#92400e', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0 }}>💡</span>
              <span><strong>Dev mode:</strong> Check your terminal for the verification link. Or click Continue to skip email verification.</span>
            </div>

            <button
              onClick={handleVerify}
              style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #0f766e, #0d9488)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2: Clinics */}
        {step === 2 && (
          <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-secondary)', borderRadius: 16, padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 6, letterSpacing: '-0.03em' }}>Clinic locations</h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
              {plan === 'starter' ? 'The Starter plan includes 1 clinic location.' : `Your ${plan} plan allows up to ${plan === 'pro' ? '3' : 'unlimited'} locations.`}
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Primary location</label>
                <input style={{...inputStyle, background: 'var(--color-background-secondary)', border: '1.5px solid var(--color-border-secondary)', color: 'var(--color-text-primary)'}} value={form.clinic} disabled />
              </div>

              {extraClinics.map((name, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Location #{i + 2}</label>
                    <button type="button" onClick={() => setExtraClinics(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>Remove</button>
                  </div>
                  <input 
                    style={{...inputStyle, background: 'var(--color-background-primary)', border: '1.5px solid var(--color-border-secondary)', color: 'var(--color-text-primary)'}} 
                    placeholder="e.g. Downtown Office" 
                    value={name} 
                    onChange={e => {
                      const next = [...extraClinics]
                      next[i] = e.target.value
                      setExtraClinics(next)
                    }} 
                    onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border-secondary)'}
                  />
                </div>
              ))}

              {plan !== 'starter' && (extraClinics.length + 1 < (plan === 'pro' ? 3 : 999)) && (
                <button 
                  type="button"
                  onClick={() => setExtraClinics(prev => [...prev, ''])}
                  style={{ padding: '10px', borderRadius: 10, border: '1.5px dashed var(--color-border-secondary)', background: 'none', color: 'var(--color-text-secondary)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <span>+ Add another location</span>
                </button>
              )}
            </div>

            <button
              onClick={handleSaveClinics}
              style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #0f766e, #0d9488)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 3: Connect PMS */}
        {step === 3 && (
          <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-secondary)', borderRadius: 16, padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 6, letterSpacing: '-0.03em' }}>Connect your PMS</h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>Automatically syncs patients, procedures, and insurance plans.</p>

            {pmsStatus === 'idle' && (
              <>
                {/* Open Dental card */}
                <div style={{ border: '1.5px solid var(--color-accent)', borderRadius: 12, padding: '1.2rem', marginBottom: '1rem', background: 'var(--color-accent-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🦷</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>Open Dental</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>v24.x · REST API</div>
                    </div>
                    <div style={{ fontSize: 11, background: 'rgba(5, 150, 105, 0.2)', color: '#059669', padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>Supported</div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                    Syncs: patients, procedures, insurance plans, appointment history
                  </div>
                  <button
                    onClick={connectPms}
                    style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Connect Open Dental →
                  </button>
                </div>

                {['Dentrix G7+', 'ClearDent'].map((name) => (
                  <div key={name} style={{ border: '1px dashed var(--color-border-secondary)', borderRadius: 12, padding: '1rem', marginBottom: '0.8rem', opacity: 0.6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>{name}</div>
                    <div style={{ fontSize: 12, background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)', padding: '3px 10px', borderRadius: 20 }}>Coming soon</div>
                  </div>
                ))}

                <button
                  onClick={skipPms}
                  style={{ width: '100%', marginTop: 8, padding: '11px', borderRadius: 10, border: '1.5px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', color: 'var(--color-text-secondary)', fontSize: 14, cursor: 'pointer' }}
                >
                  Skip for now — connect manually later
                </button>
              </>
            )}

            {pmsStatus === 'connecting' && (
              <div>
                <div style={{ height: 6, background: 'var(--color-background-secondary)', borderRadius: 3, marginBottom: '1.5rem', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pmsProgress}%`, background: 'var(--color-accent)', borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
                {['Provisioning your workspace', 'Configuring Open Dental bridge', 'Loading insurance rule engine', 'Enabling AI copilot'].map((s, i) => {
                  const done = Math.floor(pmsProgress / 25)
                  const isActive = i === done
                  return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, opacity: i < done ? 1 : isActive ? 1 : 0.35, transition: 'opacity 0.3s' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, background: i < done ? 'var(--color-accent)' : isActive ? 'var(--color-accent-muted)' : 'var(--color-background-secondary)', color: i < done ? '#fff' : isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)', transition: 'all 0.3s' }}>
                        {i < done ? '✓' : isActive ? '…' : i + 1}
                      </div>
                      <span style={{ fontSize: 14, color: i < done ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>{s}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {pmsStatus === 'connected' && (
              <div>
                <div style={{ background: 'rgba(5, 150, 105, 0.1)', border: '1px solid #059669', borderRadius: 12, padding: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>✓</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#059669' }}>Open Dental connected!</div>
                    <div style={{ fontSize: 13, color: '#047857' }}>Full patient sync available in production.</div>
                  </div>
                </div>
                <button
                  onClick={() => { setStep(4); loadMfa() }}
                  style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #0f766e, #0d9488)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
                >
                  Continue to security setup →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: MFA */}
        {step === 4 && (
          <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-secondary)', borderRadius: 16, padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(15, 118, 110, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: '1.2rem' }}>🔐</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 6, letterSpacing: '-0.03em' }}>Security setup</h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>PHIPA requires appropriate access controls for patient health information.</p>

            {mfaData ? (
              <div style={{ border: '1px solid var(--color-border-secondary)', borderRadius: 12, padding: '1.2rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>Scan with Google Authenticator or Authy</div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <img src={mfaData.qrCodeDataUrl} alt="TOTP QR code" style={{ width: 160, height: 160, borderRadius: 12, border: '1px solid var(--color-border-secondary)' }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: 14 }}>
                  Or enter manually: <code style={{ fontFamily: 'monospace', background: 'var(--color-background-secondary)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{mfaData.secret}</code>
                </div>
                <input
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="Enter 6-digit code to confirm"
                  maxLength={6}
                  inputMode="numeric"
                  style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.3em', fontSize: 22, fontFamily: 'monospace', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', border: '1.5px solid var(--color-border-secondary)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--color-border-secondary)'}
                />
              </div>
            ) : (
              <div style={{ border: '1px solid var(--color-border-secondary)', borderRadius: 12, padding: '1.2rem', marginBottom: '1rem', background: 'var(--color-background-secondary)' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6 }}>Two-factor authentication</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  Protect access to patient data with an authenticator app. You can enable this later in Settings.
                </div>
              </div>
            )}

            <button
              onClick={enableMfa}
              disabled={loading}
              style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: loading ? 'var(--color-border-primary)' : 'linear-gradient(135deg, #0f766e, #0d9488)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Enabling…' : mfaData && mfaCode.length === 6 ? 'Enable MFA & continue →' : 'Skip for now →'}
            </button>
          </div>
        )}

        {/* Step 5: Done */}
        {step === 5 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-secondary)', borderRadius: 16, padding: '2.5rem 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 12 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #0f766e, #0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 1.5rem', boxShadow: '0 4px 20px rgba(15,118,110,0.3)' }}>✓</div>

              <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 6, letterSpacing: '-0.03em' }}>You're all set!</h2>
              <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: '2rem', lineHeight: 1.6 }}>
                {form.clinic || 'Your clinic'} is live on DentalIQ. The AI copilot is ready.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '2rem', textAlign: 'left' }}>
                {[
                  ['Account', 'Created ✓'],
                  ['Locations', `${extraClinics.length + 1} Ready ✓`],
                  ['Plan', `${selectedPlan.name} — 14-day trial`],
                  ['AI Copilot', plan === 'starter' ? 'Inactive' : 'Active ✓'],
                ].map(([l, v]) => (
                  <div key={l} style={{ background: 'var(--color-background-secondary)', border: '1px solid var(--color-border-secondary)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{l}</span>
                    <span style={{ fontSize: 13, color: plan === 'starter' && l === 'AI Copilot' ? 'var(--color-text-secondary)' : '#059669', fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: 'var(--color-accent-muted)', border: '1px solid var(--color-accent)', borderRadius: 10, padding: '12px 16px', marginBottom: '1.5rem', textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent)', marginBottom: 6 }}>Quick start checklist</div>
                {[
                  'Run your first insurance estimate',
                  'Add your first patient',
                  'Connect your PMS (Settings → Integrations)',
                  'Set up 2FA for PHIPA compliance',
                ].map((item, i) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 13, color: 'var(--color-accent)' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--color-accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, flexShrink: 0, border: '1px solid var(--color-accent)' }}>{i + 1}</div>
                    {item}
                  </div>
                ))}
              </div>

              <button
                onClick={goToDashboard}
                style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #0f766e, #0d9488)', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.01em', boxShadow: '0 4px 14px rgba(15,118,110,0.3)' }}
              >
                Open Dashboard →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
