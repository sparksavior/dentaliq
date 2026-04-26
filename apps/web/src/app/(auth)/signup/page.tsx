'use client'

import { useState, useRef, type FormEvent } from 'react'
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
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const selectedPlan = PLANS.find((p) => p.id === plan) ?? PLANS[1]

  // ── Step 0: Register + auto-login ─────────────────────────
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
    router.push('/dashboard')
  }

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
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2.5rem' }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 14, fontFamily: 'monospace' }}>+</span>
          </div>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>DentalIQ</span>
        </div>

        <ProgressBar />

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fef2f2', border: '0.5px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
            {error}
          </div>
        )}

        {/* ── Step 0: Account ── */}
        {step === 0 && (
          <form onSubmit={handleRegister}>
            {/* Plan banner */}
            <div style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 10, padding: '12px 16px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{selectedPlan.name} plan</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{selectedPlan.price ? `$${selectedPlan.price}/month` : 'Custom pricing'} · 14-day free trial</div>
              </div>
              <div style={{ fontSize: 18, color: selectedPlan.color }}>{selectedPlan.price ? `$${selectedPlan.price}` : 'Custom'}</div>
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 500, marginBottom: '1.2rem', color: 'var(--color-text-primary)' }}>Create your account</h2>

            <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Full name</label>
            <input style={inp} placeholder="Dr. Sarah Chen" value={form.name} onChange={set('name')} required />

            <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Clinic name</label>
            <input style={inp} placeholder="Lakeview Dental Group" value={form.clinic} onChange={set('clinic')} required />

            <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Work email</label>
            <input style={inp} type="email" placeholder="sarah@lakeviewdental.ca" value={form.email} onChange={set('email')} required />

            <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Phone (optional)</label>
            <input style={inp} placeholder="+1 (416) 555-0100" value={form.phone} onChange={set('phone')} />

            <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Password</label>
            <input style={inp} type="password" placeholder="Min. 8 characters" value={form.password} onChange={set('password')} required />

            <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Confirm password</label>
            <input style={inp} type="password" placeholder="••••••••" value={form.confirm} onChange={set('confirm')} required />

            {/* Plan selector */}
            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>Plan</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {PLANS.map((p) => (
                  <button key={p.id} type="button" onClick={() => setPlan(p.id as any)}
                    style={{ flex: 1, padding: '8px 4px', border: plan === p.id ? `2px solid ${p.color}` : '0.5px solid var(--color-border-tertiary)', borderRadius: 8, background: 'var(--color-background-primary)', cursor: 'pointer', fontSize: 12, fontWeight: plan === p.id ? 600 : 400, color: plan === p.id ? p.color : 'var(--color-text-secondary)' }}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 14px', marginBottom: '1.2rem', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              By continuing you agree to our Terms of Service and Privacy Policy. Your health data is stored exclusively on Canadian infrastructure (AWS ca-central-1) and is PHIPA-compliant.
            </div>

            <button type="submit" disabled={loading || !form.name || !form.clinic || !form.email || !form.password}
              style={{ width: '100%', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Creating account…' : 'Continue →'}
            </button>

            <p style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Already have an account?{' '}
              <a href="/login" style={{ color: '#0f766e', textDecoration: 'none' }}>Sign in</a>
            </p>
          </form>
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

            <div style={{ background: '#fffbeb', border: '0.5px solid #fcd34d', borderRadius: 8, padding: '10px 14px', marginBottom: '1.5rem', fontSize: 12, color: '#92400e' }}>
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
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🦷</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Open Dental</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>v24.x · REST API · Recommended</div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: 11, background: '#d1fae5', color: '#065f46', padding: '3px 10px', borderRadius: 20 }}>Supported</div>
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
                <div style={{ background: '#d1fae5', border: '0.5px solid #6ee7b7', borderRadius: 12, padding: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>✅</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#065f46' }}>Open Dental connected</div>
                    <div style={{ fontSize: 12, color: '#047857' }}>Full sync available in Phase 2</div>
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
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 1.5rem' }}>✅</div>
            <h2 style={{ fontSize: 24, fontWeight: 500, marginBottom: '0.6rem', color: 'var(--color-text-primary)' }}>You're all set!</h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
              {form.clinic} is live on DentalIQ. The AI copilot is ready.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1.5rem', textAlign: 'left' }}>
              {[
                ['Account', 'Created ✓'],
                ['Clinic', form.clinic || 'Created ✓'],
                ['Plan', selectedPlan.name],
                ['Trial ends', '14 days'],
              ].map(([l, v]) => (
                <div key={l} style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{l}</span>
                  <span style={{ fontSize: 12, color: '#059669', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
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
