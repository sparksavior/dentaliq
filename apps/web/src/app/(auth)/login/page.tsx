'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authApi, ApiError } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'

export default function LoginPage() {
  const router = useRouter()
  const { setSession } = useAuth()

  const [form, setForm] = useState({ email: '', password: '', totpCode: '' })
  const [requiresMfa, setRequiresMfa] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await authApi.login({
        email: form.email,
        password: form.password,
        totpCode: requiresMfa ? form.totpCode : undefined,
      })

      if ('requiresMfa' in result) {
        setRequiresMfa(true)
        setLoading(false)
        return
      }

      sessionStorage.setItem('diq_fresh_login', '1')
      setSession(result.accessToken, result.user)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      {/* Left panel — brand */}
      <div style={{
        background: 'linear-gradient(150deg, #0f766e 0%, #0d9488 50%, #115e59 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '3rem', color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '3rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>+</div>
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em' }}>DentalIQ</span>
          </div>

          <h1 style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.25, marginBottom: '1rem', letterSpacing: '-0.03em' }}>
            Stop losing $3K/month<br />to insurance guesswork.
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, maxWidth: 340 }}>
            Real-time coverage estimates, claim risk detection, and AI-drafted pre-auth letters — built for Ontario dental clinics.
          </p>
        </div>

        <div style={{ position: 'relative' }}>
          {[
            { icon: '⚡', text: 'Coverage answers in under 2 seconds' },
            { icon: '🛡', text: 'PHIPA-compliant · Canadian data centres' },
            { icon: '🤖', text: 'AI pre-auth letters in 90 seconds' },
          ].map((f) => (
            <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{f.icon}</div>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>{f.text}</span>
            </div>
          ))}

          <div style={{ marginTop: '2rem', padding: '1.2rem', background: 'rgba(255,255,255,0.1)', borderRadius: 12, backdropFilter: 'blur(8px)' }}>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 1.6, fontStyle: 'italic', marginBottom: 10 }}>
              "We recovered $7,200 in the first month. The pre-auth drafting alone saves us 2 hours a day."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>KM</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Dr. K. Mehta</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Oakville Family Dental</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', background: 'var(--color-background-primary)' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 6, letterSpacing: '-0.02em' }}>
            {requiresMfa ? 'Two-factor authentication' : 'Welcome back'}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
            {requiresMfa
              ? 'Enter the 6-digit code from your authenticator app.'
              : 'Sign in to your DentalIQ account.'}
          </p>

          {error && (
            <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, fontSize: 14, color: '#dc2626' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {!requiresMfa ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Email address</label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="you@yourclinic.com"
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid var(--color-border-secondary)', borderRadius: 10, fontSize: 14, color: 'var(--color-text-primary)', outline: 'none', boxSizing: 'border-box', background: 'var(--color-input-bg)', transition: 'border-color 0.15s' }}
                    onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border-secondary)'}
                  />
                </div>

                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Password</label>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid var(--color-border-secondary)', borderRadius: 10, fontSize: 14, color: 'var(--color-text-primary)', outline: 'none', boxSizing: 'border-box', background: 'var(--color-input-bg)', transition: 'border-color 0.15s' }}
                    onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border-secondary)'}
                  />
                  <div style={{ textAlign: 'right', marginTop: 6 }}>
                    <Link href="/forgot-password" style={{ fontSize: 12, color: 'var(--color-accent)', textDecoration: 'none' }}>Forgot password?</Link>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Authenticator code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  autoFocus
                  value={form.totpCode}
                  onChange={(e) => setForm((f) => ({ ...f, totpCode: e.target.value }))}
                  placeholder="000000"
                  style={{ width: '100%', padding: '14px', border: '1.5px solid var(--color-border-secondary)', borderRadius: 10, fontSize: 24, color: 'var(--color-text-primary)', outline: 'none', boxSizing: 'border-box', textAlign: 'center', letterSpacing: '0.3em', fontFamily: 'monospace', background: 'var(--color-input-bg)', transition: 'border-color 0.15s' }}
                  onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--color-border-secondary)'}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', marginTop: 8, padding: '12px', borderRadius: 10, border: 'none',
                background: loading ? 'var(--color-text-secondary)' : 'linear-gradient(135deg, #0f766e, #0d9488)',
                color: '#fff', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', letterSpacing: '-0.01em',
              }}
            >
              {loading ? 'Signing in…' : requiresMfa ? 'Verify →' : 'Sign in →'}
            </button>
          </form>

          {!requiresMfa && (
            <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: 14, color: 'var(--color-text-secondary)' }}>
              New to DentalIQ?{' '}
              <Link href="/signup" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>
                Create an account
              </Link>
            </p>
          )}

          <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border-tertiary)', display: 'flex', justifyContent: 'center', gap: 20 }}>
            {['PHIPA Compliant', 'SOC 2 Ready', 'Canadian Data'].map(badge => (
              <div key={badge} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                <span style={{ color: 'var(--color-accent)' }}>✓</span> {badge}
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
