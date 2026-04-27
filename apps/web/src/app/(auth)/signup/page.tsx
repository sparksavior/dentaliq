'use client'

import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authApi, ApiError } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'

// ─────────────────────────────────────────────────────────
// 5-step signup flow from App.jsx, wired to real auth API
// Step 0: Account details + plan
// Step 1: Email verify (dev → check terminal)
// Step 2: Connect PMS (Open Dental, coming Phase 2)
// Step 3: Security / MFA setup
// Step 4: Done — go to dashboard
// ─────────────────────────────────────────────────────────

const STEP_NAMES = ['Account', 'Verify', 'Connect', 'Security', 'Done']

const PLANS = [
  { id: 'starter',    name: 'Starter',    price: 199,  desc: '1 clinic location',    color: '#0f766e' },
  { id: 'pro',        name: 'Pro',        price: 349,  desc: 'Up to 3 locations',    color: '#0e7490', popular: true },
  { id: 'enterprise', name: 'Enterprise', price: null, desc: 'Unlimited locations',  color: '#4f46e5' },
]

const inp = {
  width: '100%', padding: '10px 12px',
  border: '0.5px solid var(--color-border-secondary)',
  borderRadius: 8, fontSize: 14, boxSizing: 'border-box' as const,
  marginBottom: 12, background: 'var(--color-background-primary)',
  color: 'var(--color-text-primary)', fontFamily: 'system-ui',
  outline: 'none',
}

export default function SignupPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { setSession } = useAuth()

  const [step, setStep] = useState(0)
  const [subStep, setSubStep] = useState(0)
  const [plan, setPlan] = useState<'starter' | 'pro' | 'enterprise'>(
    (params.get('plan') as any) ?? 'pro'
  )
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' })
  const [numClinics, setNumClinics] = useState(1)
  const [clinicNames, setClinicNames] = useState([''])
  const [verifyCode, setVerifyCode] = useState(['', '', '', '', '', ''])
  const [pmsStatus, setPmsStatus] = useState<'idle' | 'connecting' | 'connected'>('idle')
  const [pmsProgress, setPmsProgress] = useState(0)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [mfaData, setMfaData] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ollamaMsg, setOllamaMsg] = useState('')
  const [ollamaLoading, setOllamaLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const selectedPlan = PLANS.find((p) => p.id === plan) ?? PLANS[1]

  // ── Step 0: Register + auto-login ─────────────────────────
  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const combinedClinicName = clinicNames.filter(Boolean).join(' & ') || 'My Clinic'
      await authApi.register({
        name: form.name, email: form.email, password: form.password,
        clinicName: combinedClinicName, plan,
      })
      // Auto-login to get token for subsequent steps
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

  // ── Step 1: Email verify (dev mode = skip) ────────────────
  function handleVerify() {
    setStep(2)
  }

  // ── Step 2: Simulate PMS connection ───────────────────────
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

  // ── Step 3: MFA setup ─────────────────────────────────────
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
    } catch { /* MFA setup is optional during onboarding */ }
  }

  async function enableMfa() {
    if (!sessionToken || !mfaData) { setStep(4); return }
    if (!mfaCode || mfaCode.length !== 6) { setStep(4); return }
    setLoading(true)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3001'}/auth/mfa/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: mfaCode, secret: mfaData.secret }),
      })
    } catch { /* non-blocking */ }
    setStep(4)
    setLoading(false)
  }

  // ── Step 4: Complete — set session + go to dashboard ──────
  async function goToDashboard() {
    if (sessionToken) {
      try {
        const user = await authApi.me(sessionToken)
        setSession(sessionToken, user)
      } catch { /* session already set or expired */ }
    }
    router.push('/dashboard?tour=true')
  }

  // Generate Ollama message when reaching step 4
  useEffect(() => {
    if (step === 4) {
      setOllamaLoading(true)
      fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'phi3',
          prompt: `Write a very short (1 to 2 sentences max) encouraging welcome message for a dentist named Dr. ${form.name.split(' ')[0]} who just joined DentalIQ software to manage their ${numClinics} clinic(s). Make it uplifting, professional, and exciting! Do not include any formatting or quotes, just the text.`,
          stream: false
        })
      })
      .then(r => r.json())
      .then(d => setOllamaMsg(d.response || 'Welcome to DentalIQ! We are thrilled to have you.'))
      .catch(() => setOllamaMsg('Welcome to DentalIQ! We are thrilled to have you.'))
      .finally(() => setOllamaLoading(false))
    }
  }, [step, form.name, numClinics])

  // ── Progress bar ──────────────────────────────────────────
  const ProgressBar = () => (
    <div style={{ display: 'flex', gap: 6, marginBottom: '2.5rem' }}>
      {STEP_NAMES.map((s, i) => (
        <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
          <div style={{ height: 3, width: '100%', borderRadius: 2, background: i <= step ? '#0f766e' : 'var(--color-border-tertiary)' }} />
          <span style={{ fontSize: 11, color: i <= step ? '#0f766e' : 'var(--color-text-secondary)' }}>{s}</span>
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background-primary)', fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 2rem' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2.5rem' }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 14, fontFamily: 'monospace' }}>+</span>
          </div>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>DentalIQ</span>
        </div>

        <ProgressBar />

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(220, 38, 38, 0.1)', border: '0.5px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#ef4444' }}>
            {error}
          </div>
        )}

        {/* ── Step 0: Account Wizard ── */}
        {step === 0 && (
          <div style={{ overflow: 'hidden', position: 'relative' }}>
            <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
              {subStep === 0 && "Let's start with your name"}
              {subStep === 1 && "What's your contact info?"}
              {subStep === 2 && "Secure your account"}
              {subStep === 3 && "How many clinics do you run?"}
              {subStep === 4 && "Name your clinic(s)"}
              {subStep === 5 && "Choose your plan"}
            </h2>

            <form onSubmit={(e) => {
              e.preventDefault()
              if (subStep === 2 && form.password !== form.confirm) return setError('Passwords do not match.')
              if (subStep === 2 && form.password.length < 8) return setError('Password must be at least 8 characters.')
              setError('')
              
              if (subStep < 5) setSubStep(s => s + 1)
              else handleRegister(e)
            }}>
              
              {subStep === 0 && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <label style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Full name</label>
                  <input style={inp} placeholder="Dr. Sarah Chen" value={form.name} onChange={set('name')} required autoFocus />
                </div>
              )}

              {subStep === 1 && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <label style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Work email</label>
                  <input style={inp} type="email" placeholder="sarah@lakeviewdental.ca" value={form.email} onChange={set('email')} required autoFocus />

                  <label style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6, marginTop: 12 }}>Phone (optional)</label>
                  <input style={inp} placeholder="+1 (416) 555-0100" value={form.phone} onChange={set('phone')} />
                </div>
              )}

              {subStep === 2 && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <label style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Password</label>
                  <input style={inp} type="password" placeholder="Min. 8 characters" value={form.password} onChange={set('password')} required autoFocus />

                  <label style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6, marginTop: 12 }}>Confirm password</label>
                  <input style={inp} type="password" placeholder="••••••••" value={form.confirm} onChange={set('confirm')} required />
                </div>
              )}

              {subStep === 3 && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <label style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Number of locations</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <input type="range" min="1" max="10" value={numClinics} onChange={(e) => {
                      const num = parseInt(e.target.value)
                      setNumClinics(num)
                      setClinicNames(Array(num).fill(''))
                    }} style={{ flex: 1, accentColor: '#0f766e' }} />
                    <div style={{ fontSize: 24, fontWeight: 600, color: '#0f766e', width: 40, textAlign: 'center' }}>{numClinics}</div>
                  </div>
                </div>
              )}

              {subStep === 4 && (
                <div style={{ animation: 'fadeIn 0.3s ease', maxHeight: 300, overflowY: 'auto', paddingRight: 10 }}>
                  {clinicNames.map((name, i) => (
                    <div key={i} style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Clinic #{i + 1} Name</label>
                      <input style={inp} placeholder={`e.g. Lakeview Dental - Location ${i + 1}`} value={name} onChange={(e) => {
                        const newNames = [...clinicNames]
                        newNames[i] = e.target.value
                        setClinicNames(newNames)
                      }} required autoFocus={i === 0} />
                    </div>
                  ))}
                </div>
              )}

              {subStep === 5 && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ marginBottom: '1.2rem' }}>
                    <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                      {PLANS.map((p) => (
                        <div key={p.id} onClick={() => setPlan(p.id as any)}
                          style={{ padding: '16px', border: plan === p.id ? `2px solid ${p.color}` : '1px solid var(--color-border-tertiary)', borderRadius: 12, background: plan === p.id ? 'var(--color-background-secondary)' : 'var(--color-background-primary)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.name}</div>
                            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{p.desc}</div>
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 600, color: plan === p.id ? p.color : 'var(--color-text-primary)' }}>
                            {p.price ? `$${p.price}/mo` : 'Custom'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 14px', marginBottom: '1.2rem', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    By continuing you agree to our Terms of Service and Privacy Policy. Your health data is stored exclusively on Canadian infrastructure (AWS ca-central-1) and is PHIPA-compliant.
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: '2rem' }}>
                {subStep > 0 && (
                  <button type="button" onClick={() => setSubStep(s => s - 1)}
                    style={{ flex: 1, background: 'transparent', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-secondary)', borderRadius: 8, padding: '14px', fontSize: 15, cursor: 'pointer', transition: 'background 0.2s' }}>
                    Back
                  </button>
                )}
                <button type="submit" disabled={loading}
                  style={{ flex: 2, background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, padding: '14px', fontSize: 15, fontWeight: 500, cursor: 'pointer', opacity: loading ? 0.7 : 1, transition: 'background 0.2s' }}>
                  {loading ? 'Creating account…' : subStep < 5 ? 'Next' : 'Create Account'}
                </button>
              </div>

              {subStep === 0 && (
                <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: 'var(--color-text-secondary)' }}>
                  Already have an account?{' '}
                  <a href="/login" style={{ color: '#0f766e', fontWeight: 500, textDecoration: 'none' }}>Sign in</a>
                </p>
              )}
            </form>
          </div>
        )}

        {/* ── Step 1: Email verify ── */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 500, marginBottom: '0.6rem', color: 'var(--color-text-primary)' }}>Verify your email</h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
              We sent a verification link to <strong style={{ color: 'var(--color-text-primary)' }}>{form.email}</strong>
            </p>

            {/* 6-digit input row */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: '1.5rem' }}>
              {verifyCode.map((v, i) => (
                <input key={i} id={`vc-${i}`} maxLength={1} value={v}
                  onChange={(e) => {
                    if (!/^\d?$/.test(e.target.value)) return
                    const next = [...verifyCode]; next[i] = e.target.value; setVerifyCode(next)
                    if (e.target.value && i < 5) (document.getElementById(`vc-${i + 1}`) as HTMLElement)?.focus()
                  }}
                  style={{ width: 44, height: 52, textAlign: 'center', fontSize: 20, border: '0.5px solid var(--color-border-secondary)', borderRadius: 8, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontFamily: 'monospace' }}
                />
              ))}
            </div>

            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '0.5px solid #fcd34d', borderRadius: 8, padding: '10px 14px', marginBottom: '1.5rem', fontSize: 12, color: '#d97706' }}>
              <strong>Dev mode:</strong> Check your terminal — the verification link is printed there. Or click Continue to proceed without verifying.
            </div>

            <button onClick={handleVerify} style={{ width: '100%', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, cursor: 'pointer' }}>
              Continue →
            </button>
          </div>
        )}

        {/* ── Step 2: Connect PMS ── */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 500, marginBottom: '0.6rem', color: 'var(--color-text-primary)' }}>Connect Open Dental</h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>Automatically syncs patients, procedures, and insurance plans.</p>

            {pmsStatus === 'idle' && (
              <>
                <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: '1.2rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '0.8rem' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🦷</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Open Dental</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>v24.x · REST API · Recommended</div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: 11, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '3px 10px', borderRadius: 20 }}>Supported</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 10 }}>Syncs: patients, procedures, insurance plans, claim history</div>
                  <button onClick={connectPms} style={{ width: '100%', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, cursor: 'pointer' }}>
                    Connect Open Dental →
                  </button>
                </div>
                {['Dentrix G7+', 'ClearDent'].map((name) => (
                  <div key={name} style={{ border: '0.5px dashed var(--color-border-tertiary)', borderRadius: 12, padding: '1rem', marginBottom: '0.8rem', opacity: 0.6 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>{name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Coming Phase 2</div>
                  </div>
                ))}
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                  <span onClick={() => { setStep(3); loadMfa() }} style={{ fontSize: 13, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>Skip for now — set up manually later</span>
                </div>
              </>
            )}

            {pmsStatus === 'connecting' && (
              <div>
                <div style={{ height: 6, background: 'var(--color-background-secondary)', borderRadius: 3, marginBottom: '1.5rem' }}>
                  <div style={{ height: '100%', width: `${pmsProgress}%`, background: '#0f766e', borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
                {['Provisioning your workspace', 'Configuring Open Dental bridge', 'Loading insurance rule engine', 'Enabling AI copilot'].map((s, i) => {
                  const done = Math.floor(pmsProgress / 25)
                  return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, opacity: i < done ? 1 : i === done ? 0.7 : 0.3 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: i < done ? '#0f766e' : 'var(--color-background-secondary)', border: `0.5px solid ${i < done ? '#0f766e' : 'var(--color-border-tertiary)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {i < done && <span style={{ color: '#fff', fontSize: 11 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{s}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {pmsStatus === 'connected' && (
              <div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '0.5px solid #6ee7b7', borderRadius: 12, padding: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>✅</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#10b981' }}>Open Dental connected</div>
                    <div style={{ fontSize: 12, color: '#059669' }}>Full sync available in Phase 2</div>
                  </div>
                </div>
                <button onClick={() => { setStep(3); loadMfa() }} style={{ width: '100%', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, cursor: 'pointer' }}>
                  Continue to security setup →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Security / MFA ── */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 500, marginBottom: '0.6rem', color: 'var(--color-text-primary)' }}>Security setup</h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>PHIPA requires appropriate safeguards for PHI access.</p>

            {mfaData ? (
              <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: '1.2rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 8 }}>Scan with your authenticator app</div>
                <img src={mfaData.qrCodeDataUrl} alt="TOTP QR code" style={{ width: 160, height: 160, display: 'block', margin: '0 auto 12px', borderRadius: 8 }} />
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: 12 }}>
                  Or enter the secret manually: <code style={{ fontFamily: 'monospace', fontSize: 11 }}>{mfaData.secret}</code>
                </div>
                <input
                  value={mfaCode} onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="Enter 6-digit code to confirm"
                  maxLength={6} inputMode="numeric"
                  style={{ ...inp, textAlign: 'center', letterSpacing: '0.2em', fontSize: 18, marginBottom: 0 }}
                />
              </div>
            ) : (
              <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: '1.2rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 6 }}>Two-factor authentication</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Protects patient health information per PHIPA. Set up via Settings after login.</div>
              </div>
            )}

            <button onClick={enableMfa} disabled={loading} style={{ width: '100%', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, cursor: 'pointer', marginBottom: 10 }}>
              {loading ? 'Enabling…' : mfaData && mfaCode.length === 6 ? 'Enable MFA & continue →' : 'Skip for now →'}
            </button>
          </div>
        )}

        {/* ── Step 4: Done ── */}
        {step === 4 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 1.5rem' }}>✅</div>
            <h2 style={{ fontSize: 24, fontWeight: 500, marginBottom: '0.6rem', color: 'var(--color-text-primary)' }}>You're all set!</h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
              {form.clinic} is live on DentalIQ. The AI copilot is ready.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1.5rem', textAlign: 'left' }}>
              {[
                ['Account', 'Created ✓'],
                ['Clinics', `${numClinics} Registered ✓`],
                ['Plan', selectedPlan.name],
                ['Trial ends', '14 days'],
              ].map(([l, v]) => (
                <div key={l} style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{l}</span>
                  <span style={{ fontSize: 12, color: '#10b981', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Ollama Encouraging Message */}
            <div style={{ background: 'rgba(15, 118, 110, 0.08)', border: '1px solid var(--color-border-tertiary)', borderRadius: 12, padding: '1.5rem', marginBottom: '2rem', animation: 'fadeIn 0.5s ease' }}>
              {ollamaLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#0f766e' }}>
                  <div className="h-4 w-4 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>DentalIQ AI is generating your welcome...</span>
                </div>
              ) : (
                <div style={{ color: '#0f766e', fontSize: 15, lineHeight: 1.5, fontStyle: 'italic', fontWeight: 500 }}>
                  "{ollamaMsg}"
                </div>
              )}
            </div>

            <button onClick={goToDashboard} style={{ width: '100%', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, padding: '13px', fontSize: 15, cursor: 'pointer' }}>
              Open dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
