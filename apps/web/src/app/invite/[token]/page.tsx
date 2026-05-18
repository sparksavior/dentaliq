'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { inviteApi, type InviteDetails, type PermissionKey, PERMISSION_LABELS } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'

// ── CSS keyframes ─────────────────────────────────────────────
const STYLES = `
@keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
@keyframes spinRing { to { transform:rotate(360deg) } }
@keyframes shimmer { 0%,100% { background-position:0% 50% } 50% { background-position:100% 50% } }
@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
@keyframes checkPop { 0% { transform:scale(0) } 60% { transform:scale(1.2) } 100% { transform:scale(1) } }
`

type Step = 'loading' | 'error' | 'welcome' | 'password' | 'mfa' | 'tos' | 'completing' | 'done'

function ProgressBar({ step }: { step: Step }) {
  const steps = ['welcome', 'password', 'mfa', 'tos']
  const current = steps.indexOf(step)
  if (current < 0) return null
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 32, alignItems: 'center' }}>
      {steps.map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700,
            background: i < current ? 'linear-gradient(135deg,#0f766e,#0d9488)' :
              i === current ? 'linear-gradient(135deg,#0f766e,#0d9488)' : 'rgba(255,255,255,0.06)',
            color: i <= current ? '#fff' : 'rgba(255,255,255,0.3)',
            border: i <= current ? 'none' : '1.5px solid rgba(255,255,255,0.12)',
            transition: 'all 0.3s',
          }}>
            {i < current ? '✓' : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div style={{
              flex: 1, height: 2, borderRadius: 2,
              background: i < current ? 'linear-gradient(90deg,#0f766e,#0d9488)' : 'rgba(255,255,255,0.08)',
              transition: 'all 0.3s',
            }} />
          )}
        </div>
      ))}
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 20,
      padding: '2.5rem',
      backdropFilter: 'blur(20px)',
      animation: 'fadeUp 0.4s ease both',
      ...style,
    }}>
      {children}
    </div>
  )
}

function Input({
  label, type = 'text', value, onChange, placeholder, hint, error, autoFocus,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string; error?: string; autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 7 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '11px 14px',
          background: 'rgba(255,255,255,0.06)',
          border: `1.5px solid ${error ? '#ef4444' : focused ? '#0d9488' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 10,
          color: '#fff',
          fontSize: 15,
          outline: 'none',
          fontFamily: 'inherit',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: focused ? `0 0 0 3px ${error ? 'rgba(239,68,68,0.15)' : 'rgba(13,148,136,0.15)'}` : 'none',
        }}
      />
      {hint && !error && <p style={{ margin: '5px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{hint}</p>}
      {error && <p style={{ margin: '5px 0 0', fontSize: 12, color: '#f87171' }}>{error}</p>}
    </div>
  )
}

function PrimaryButton({ children, onClick, loading, disabled, style }: {
  children: React.ReactNode; onClick?: () => void;
  loading?: boolean; disabled?: boolean; style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: '100%', padding: '13px 24px',
        background: disabled || loading
          ? 'rgba(255,255,255,0.08)'
          : 'linear-gradient(135deg,#0f766e,#0d9488)',
        color: disabled || loading ? 'rgba(255,255,255,0.3)' : '#fff',
        border: 'none', borderRadius: 10, cursor: disabled || loading ? 'default' : 'pointer',
        fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'all 0.2s',
        ...style,
      }}
    >
      {loading && (
        <div style={{
          width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
          borderTopColor: '#fff', borderRadius: '50%', animation: 'spinRing 0.7s linear infinite',
        }} />
      )}
      {children}
    </button>
  )
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Contains a number', ok: /\d/.test(password) },
    { label: 'Contains uppercase', ok: /[A-Z]/.test(password) },
    { label: 'Contains special character', ok: /[^A-Za-z0-9]/.test(password) },
  ]
  const score = checks.filter(c => c.ok).length
  const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#10b981']
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i < score ? colors[score] : 'rgba(255,255,255,0.1)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      {password && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
            {checks.map(c => (
              <span key={c.label} style={{ fontSize: 11, color: c.ok ? '#34d399' : 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>{c.ok ? '✓' : '○'}</span> {c.label}
              </span>
            ))}
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: colors[score], flexShrink: 0, marginLeft: 8 }}>
            {labels[score]}
          </span>
        </div>
      )}
    </div>
  )
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const { setSession } = useAuth()
  const token = params.token as string

  const [step, setStep] = useState<Step>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [invite, setInvite] = useState<InviteDetails | null>(null)

  // Password step
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // MFA step
  const [mfaMethod, setMfaMethod] = useState<'totp' | 'email' | null>(null) // null = not picked yet
  const [mfaData, setMfaData] = useState<{ secret: string; qrCodeDataUrl: string; backupCodes: string[] } | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaError, setMfaError] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [backupSaved, setBackupSaved] = useState(false)
  const [mfaResendCooldown, setMfaResendCooldown] = useState(0)

  // TOS step
  const [tosChecked, setTosChecked] = useState(false)
  const [tosScrolled, setTosScrolled] = useState(false)

  // Completing
  const [completing, setCompleting] = useState(false)

  // Load invite details on mount
  useEffect(() => {
    inviteApi.getDetails(token)
      .then(data => { setInvite(data); setStep('welcome') })
      .catch(err => { setErrorMsg(err.message ?? 'This invite link is invalid or has expired.'); setStep('error') })
  }, [token])

  const loadMfa = useCallback(async () => {
    if (mfaData) return
    setMfaLoading(true)
    try {
      const data = await inviteApi.setupMfa(token)
      setMfaData(data)
    } catch (err: any) {
      setMfaError(err.message ?? 'Failed to set up 2FA. Please go back and try again.')
    } finally {
      setMfaLoading(false)
    }
  }, [token, mfaData])

  async function startEmailMfa() {
    setMfaLoading(true)
    setMfaError('')
    try {
      await inviteApi.setupEmailMfa(token)
      setMfaMethod('email')
      setMfaResendCooldown(30)
      const t = setInterval(() => setMfaResendCooldown(c => { if (c <= 1) { clearInterval(t); return 0 } return c - 1 }), 1000)
    } catch (err: any) {
      setMfaError(err.message ?? 'Failed to send email code.')
    } finally {
      setMfaLoading(false)
    }
  }

  const handlePasswordNext = () => {
    setPasswordError('')
    if (password.length < 8) { setPasswordError('Password must be at least 8 characters.'); return }
    if (password !== confirmPassword) { setPasswordError('Passwords do not match.'); return }
    setStep('mfa')
    // Don't auto-load TOTP yet — let user pick method first
  }

  const handleComplete = async () => {
    if (!tosChecked) return
    setCompleting(true)
    setStep('completing')
    try {
      const result = await inviteApi.complete(token, { password, mfaCode, tosAgreed: true, mfaMethod: mfaMethod ?? 'totp' })
      setSession(result.accessToken, result.user)
      setStep('done')
      setTimeout(() => router.replace('/dashboard'), 1500)
    } catch (err: any) {
      setCompleting(false)
      setStep('tos')
      setErrorMsg(err.message ?? 'Something went wrong. Please try again.')
    }
  }

  const bg = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0d0d1a 0%, #0d1a2e 50%, #0d0d1a 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    position: 'relative' as const,
    overflow: 'hidden',
  }

  const orb = (top: string, left: string, color: string) => ({
    position: 'absolute' as const,
    width: 400, height: 400,
    borderRadius: '50%',
    background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
    filter: 'blur(80px)',
    opacity: 0.15,
    top, left,
    pointerEvents: 'none' as const,
  })

  const maxW = { width: '100%', maxWidth: 480, position: 'relative' as const, zIndex: 1 }

  const logo = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'linear-gradient(135deg,#0f766e,#0d9488)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 800, color: '#fff',
      }}>+</div>
      <span style={{ color: '#fff', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>DentalIQ</span>
    </div>
  )

  // ── Loading ──────────────────────────────────────────────
  if (step === 'loading') return (
    <div style={bg}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div style={orb('10%', '-10%', '#0d9488')} />
      <div style={maxW}>
        {logo}
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '1rem 0' }}>
            <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spinRing 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: 14 }}>Validating your invite…</p>
          </div>
        </Card>
      </div>
    </div>
  )

  // ── Error ────────────────────────────────────────────────
  if (step === 'error') return (
    <div style={bg}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div style={orb('10%', '-10%', '#ef4444')} />
      <div style={maxW}>
        {logo}
        <Card>
          <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
            <h2 style={{ color: '#fff', margin: '0 0 12px', fontSize: 22, fontWeight: 700 }}>Invalid Invite</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0 0 24px', fontSize: 14, lineHeight: 1.6 }}>{errorMsg}</p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0 }}>
              Contact your clinic admin for a new invitation link.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )

  // ── Welcome ──────────────────────────────────────────────
  if (step === 'welcome' && invite) return (
    <div style={bg}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div style={orb('10%', '-10%', '#0d9488')} />
      <div style={orb('60%', '70%', '#8b5cf6')} />
      <div style={maxW}>
        {logo}
        <ProgressBar step={step} />
        <Card>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px',
            background: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.3)',
            borderRadius: 100, marginBottom: 20,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0d9488', display: 'inline-block', animation: 'pulse 2s ease infinite' }} />
            <span style={{ fontSize: 12, color: '#5eead4', fontWeight: 600 }}>You've been invited</span>
          </div>

          <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.03em', lineHeight: 1.25 }}>
            Welcome to {invite.clinicName}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, margin: '0 0 28px', lineHeight: 1.6 }}>
            <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{invite.adminName}</strong> has created access for <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{invite.name}</strong> to the clinic on DentalIQ.
          </p>

          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14, padding: '16px 18px', marginBottom: 28,
          }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Your access includes
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {invite.permissions.map((p: PermissionKey) => (
                <span key={p} style={{
                  padding: '4px 10px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                  background: 'rgba(13,148,136,0.15)', color: '#5eead4',
                  border: '1px solid rgba(13,148,136,0.25)',
                }}>
                  {PERMISSION_LABELS[p]}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
            {[
              { n: '01', label: 'Set your password' },
              { n: '02', label: 'Enable 2-factor authentication' },
              { n: '03', label: 'Agree to terms of service' },
            ].map(({ n, label }) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#0d9488', flexShrink: 0 }}>{n}</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>{label}</span>
              </div>
            ))}
          </div>

          <PrimaryButton onClick={() => setStep('password')}>
            Get started →
          </PrimaryButton>
        </Card>
      </div>
    </div>
  )

  // ── Password ─────────────────────────────────────────────
  if (step === 'password') return (
    <div style={bg}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div style={orb('10%', '-10%', '#0d9488')} />
      <div style={maxW}>
        {logo}
        <ProgressBar step={step} />
        <Card>
          <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>Set your password</h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: '0 0 28px' }}>
            Choose a secure password for your <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{invite?.email}</strong> account.
          </p>

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Create a strong password"
            autoFocus
          />
          <PasswordStrength password={password} />
          <Input
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={v => { setConfirmPassword(v); setPasswordError('') }}
            placeholder="Re-enter your password"
            error={passwordError}
          />

          <PrimaryButton onClick={handlePasswordNext} disabled={password.length < 8 || !confirmPassword}>
            Continue
          </PrimaryButton>
          <button onClick={() => setStep('welcome')} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 13, padding: '8px 0', fontFamily: 'inherit' }}>
            ← Back
          </button>
        </Card>
      </div>
    </div>
  )

  // ── MFA Setup ────────────────────────────────────────────
  if (step === 'mfa') return (
    <div style={bg}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div style={orb('10%', '-10%', '#8b5cf6')} />
      <div style={maxW}>
        {logo}
        <ProgressBar step={step} />
        <Card>
          <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>Enable 2-factor authentication</h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: '0 0 24px' }}>
            Required to protect patient data. Choose your preferred verification method.
          </p>

          {mfaLoading && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spinRing 0.8s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontSize: 13 }}>Setting up…</p>
            </div>
          )}

          {mfaError && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
              <p style={{ color: '#f87171', margin: 0, fontSize: 13 }}>{mfaError}</p>
            </div>
          )}

          {/* ── Method picker (shown until user picks) ── */}
          {!mfaMethod && !mfaLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
              <button
                onClick={() => { setMfaMethod('totp'); loadMfa(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, border: '1.5px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.06)', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ fontSize: 26 }}>📱</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Authenticator app</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Google Authenticator, Authy, 1Password</div>
                </div>
                <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: 'rgba(16,185,129,0.15)', color: '#34d399', fontWeight: 700, flexShrink: 0 }}>Recommended</span>
              </button>

              <button
                onClick={startEmailMfa}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ fontSize: 26 }}>✉️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Email code</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>6-digit code sent to {invite?.email}</div>
                </div>
              </button>
            </div>
          )}

          {/* ── TOTP path ── */}
          {mfaMethod === 'totp' && mfaData && (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mfaData.qrCodeDataUrl}
                  alt="QR code for 2FA setup"
                  style={{ width: 180, height: 180, borderRadius: 12, border: '3px solid rgba(139,92,246,0.3)' }}
                />
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, padding: '12px 14px', marginBottom: 20,
              }}>
                <p style={{ margin: '0 0 6px', fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                  Can't scan? Enter this code manually:
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <code style={{
                    flex: 1, fontSize: 13,
                    color: showSecret ? '#a78bfa' : 'transparent',
                    background: showSecret ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.05)',
                    padding: '6px 10px', borderRadius: 7,
                    fontFamily: '"Courier New", monospace',
                    letterSpacing: '0.1em',
                    filter: showSecret ? 'none' : 'blur(5px)',
                    userSelect: showSecret ? 'all' : 'none',
                    transition: 'filter 0.2s',
                    wordBreak: 'break-all',
                  }}>
                    {mfaData.secret}
                  </code>
                  <button onClick={() => setShowSecret(!showSecret)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12, flexShrink: 0, padding: '4px 8px', fontFamily: 'inherit' }}>
                    {showSecret ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div style={{
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: 12, padding: '12px 14px', marginBottom: 20,
              }}>
                <p style={{ margin: '0 0 6px', fontSize: 12, color: 'rgba(245,158,11,0.9)', fontWeight: 700 }}>
                  Save your backup codes
                </p>
                <p style={{ margin: '0 0 10px', fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                  Store these somewhere safe. You'll need one if you lose your phone.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                  {mfaData.backupCodes.map((code, i) => (
                    <code key={i} style={{
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 7, padding: '5px 8px', fontSize: 12,
                      fontFamily: '"Courier New", monospace', color: 'rgba(255,255,255,0.7)',
                      letterSpacing: '0.05em', textAlign: 'center' as const,
                    }}>{code}</code>
                  ))}
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={backupSaved}
                    onChange={e => setBackupSaved(e.target.checked)}
                    style={{ width: 15, height: 15, accentColor: '#f59e0b', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>I've saved my backup codes</span>
                </label>
              </div>

              <Input
                label="Enter the 6-digit code from your app"
                value={mfaCode}
                onChange={v => { setMfaCode(v.replace(/\D/g, '').slice(0, 6)); setMfaError('') }}
                placeholder="000000"
                error={mfaError}
              />

              <PrimaryButton
                onClick={() => {
                  if (mfaCode.length !== 6) { setMfaError('Enter the 6-digit code from your authenticator app.'); return }
                  if (!backupSaved) { setMfaError('Please confirm you saved your backup codes.'); return }
                  setStep('tos')
                }}
                disabled={mfaCode.length !== 6 || !backupSaved}
              >
                Verify & Continue
              </PrimaryButton>
            </>
          )}

          {/* ── Email OTP path ── */}
          {mfaMethod === 'email' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>✉️</div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: 0 }}>
                  We sent a 6-digit code to <strong style={{ color: 'rgba(255,255,255,0.9)' }}>{invite?.email}</strong>
                </p>
              </div>

              <Input
                label="Enter the 6-digit code"
                value={mfaCode}
                onChange={v => { setMfaCode(v.replace(/\D/g, '').slice(0, 6)); setMfaError('') }}
                placeholder="000000"
                error={mfaError}
              />

              <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: '8px 0 16px' }}>
                Didn't get it?{' '}
                <button type="button" onClick={startEmailMfa} disabled={mfaResendCooldown > 0} style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, fontWeight: 600, color: mfaResendCooldown > 0 ? 'rgba(255,255,255,0.25)' : '#a78bfa', cursor: mfaResendCooldown > 0 ? 'default' : 'pointer' }}>
                  {mfaResendCooldown > 0 ? `Resend in ${mfaResendCooldown}s` : 'Resend code'}
                </button>
              </p>

              <PrimaryButton
                onClick={() => {
                  if (mfaCode.length !== 6) { setMfaError('Enter the 6-digit code from your email.'); return }
                  setStep('tos')
                }}
                disabled={mfaCode.length !== 6}
              >
                Verify & Continue
              </PrimaryButton>

              <button onClick={() => { setMfaMethod(null); setMfaCode(''); setMfaError(''); }} style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 13, padding: '6px 0', fontFamily: 'inherit' }}>
                ← Choose a different method
              </button>
            </>
          )}

          <button onClick={() => setStep('password')} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 13, padding: '8px 0', fontFamily: 'inherit' }}>
            ← Back
          </button>
        </Card>
      </div>
    </div>
  )

  // ── Terms of Service ─────────────────────────────────────
  if (step === 'tos') return (
    <div style={bg}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div style={orb('10%', '-10%', '#0d9488')} />
      <div style={maxW}>
        {logo}
        <ProgressBar step={step} />
        <Card>
          <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>Review & agree to terms</h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: '0 0 20px' }}>
            Please read and accept DentalIQ's terms before accessing the clinic dashboard.
          </p>

          {errorMsg && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
              <p style={{ color: '#f87171', margin: 0, fontSize: 13 }}>{errorMsg}</p>
            </div>
          )}

          <div
            onScroll={e => { const el = e.currentTarget; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) setTosScrolled(true) }}
            style={{
              maxHeight: 300,
              overflowY: 'auto',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '16px 18px',
              marginBottom: 16,
              fontSize: 13,
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.7,
            }}
          >
            <p style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700, margin: '0 0 12px' }}>DentalIQ Terms of Service — Summary</p>
            <p><strong style={{ color: 'rgba(255,255,255,0.7)' }}>1. Authorized Use</strong><br />
            You are being granted access to DentalIQ as an authorized team member of {invite?.clinicName}. Your access is limited to the modules enabled by your clinic administrator. You agree to use the platform only for legitimate dental practice management purposes.</p>
            <p><strong style={{ color: 'rgba(255,255,255,0.7)' }}>2. Patient Data & PHIPA</strong><br />
            You will handle all patient information in accordance with the Personal Health Information Protection Act (PHIPA) of Ontario and applicable provincial legislation. You must not share, export, or access patient records beyond your clinical role.</p>
            <p><strong style={{ color: 'rgba(255,255,255,0.7)' }}>3. Account Security</strong><br />
            You are responsible for keeping your password and 2FA codes secure. You must not share your account credentials. Report suspected unauthorized access to your clinic administrator immediately.</p>
            <p><strong style={{ color: 'rgba(255,255,255,0.7)' }}>4. AI-Generated Content</strong><br />
            DentalIQ uses AI to generate insurance estimates, pre-authorization narratives, and agent recommendations. All AI-generated content must be reviewed and verified by a qualified dental professional before use. DentalIQ is not liable for clinical decisions based on AI output.</p>
            <p><strong style={{ color: 'rgba(255,255,255,0.7)' }}>5. Acceptable Use</strong><br />
            You must not attempt to access areas of the platform beyond your assigned permissions, attempt to bypass security controls, introduce malware or unauthorized code, or use the platform to harm patients or the clinic.</p>
            <p><strong style={{ color: 'rgba(255,255,255,0.7)' }}>6. Audit Logging</strong><br />
            All actions on DentalIQ are logged for PHIPA compliance purposes. These logs may be reviewed by your clinic administrator and, in certain circumstances, by regulatory authorities.</p>
            <p style={{ margin: 0 }}><strong style={{ color: 'rgba(255,255,255,0.7)' }}>7. Full Terms</strong><br />
            The full Terms of Service are available at dentaliq.ca/legal/terms. By creating your account, you confirm you have read and agree to be bound by all terms.</p>
          </div>

          {!tosScrolled && (
            <p style={{ fontSize: 12, color: 'rgba(245,158,11,0.8)', marginBottom: 12, textAlign: 'center' }}>
              ↑ Scroll to read the full terms before agreeing
            </p>
          )}

          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, cursor: tosScrolled ? 'pointer' : 'default',
            marginBottom: 20, opacity: tosScrolled ? 1 : 0.4, transition: 'opacity 0.3s',
          }}>
            <input
              type="checkbox"
              checked={tosChecked}
              onChange={e => tosScrolled && setTosChecked(e.target.checked)}
              disabled={!tosScrolled}
              style={{ width: 16, height: 16, marginTop: 2, accentColor: '#0d9488', cursor: tosScrolled ? 'pointer' : 'default', flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
              I have read and agree to DentalIQ's <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Terms of Service</strong>, <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Privacy Policy</strong>, and <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Data Processing Agreement</strong>.
            </span>
          </label>

          <PrimaryButton onClick={handleComplete} disabled={!tosChecked} loading={completing}>
            {completing ? 'Creating your account…' : 'Agree & Create Account'}
          </PrimaryButton>
          <button onClick={() => { setErrorMsg(''); setStep('mfa') }} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 13, padding: '8px 0', fontFamily: 'inherit' }}>
            ← Back
          </button>
        </Card>
      </div>
    </div>
  )

  // ── Completing ───────────────────────────────────────────
  if (step === 'completing' || step === 'done') return (
    <div style={bg}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div style={orb('20%', '20%', '#0d9488')} />
      <div style={maxW}>
        {logo}
        <Card style={{ textAlign: 'center' }}>
          {step === 'completing' ? (
            <>
              <div style={{ width: 56, height: 56, border: '3px solid rgba(255,255,255,0.08)', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spinRing 0.8s linear infinite', margin: '0 auto 20px' }} />
              <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Setting up your account…</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>Just a moment</p>
            </>
          ) : (
            <>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#0f766e,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28, animation: 'checkPop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) both' }}>✓</div>
              <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>You're all set!</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0 }}>Redirecting to your dashboard…</p>
            </>
          )}
        </Card>
      </div>
    </div>
  )

  return null
}
