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

      setSession(result.accessToken, result.user)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed')
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 440 }}>
      <div style={{ background: 'var(--color-background-secondary)', borderRadius: 16, border: '0.5px solid var(--color-border-tertiary)', padding: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>
          {requiresMfa ? 'Two-factor authentication' : 'Sign in to your account'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
          {requiresMfa
            ? 'Enter the 6-digit code from your authenticator app.'
            : 'Welcome back. Enter your credentials below.'}
        </p>

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fef2f2', border: '0.5px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!requiresMfa ? (
            <>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                  Email address
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontSize: 14, outline: 'none' }}
                  placeholder="you@yourclinic.com"
                  onFocus={(e) => e.target.style.borderColor = '#0f766e'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--color-border-secondary)'}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontSize: 14, outline: 'none' }}
                  placeholder="••••••••"
                  onFocus={(e) => e.target.style.borderColor = '#0f766e'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--color-border-secondary)'}
                />
                <div style={{ marginTop: 8, textAlign: 'right' }}>
                  <Link href="/forgot-password" style={{ fontSize: 12, color: '#0f766e', textDecoration: 'none' }}>
                    Forgot password?
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                Authenticator code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                autoFocus
                value={form.totpCode}
                onChange={(e) => setForm((f) => ({ ...f, totpCode: e.target.value }))}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontSize: 20, textAlign: 'center', letterSpacing: '0.2em', outline: 'none' }}
                placeholder="000000"
                onFocus={(e) => e.target.style.borderColor = '#0f766e'}
                onBlur={(e) => e.target.style.borderColor = 'var(--color-border-secondary)'}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '12px', background: '#0f766e', color: '#fff', fontSize: 15, fontWeight: 500, border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'background 0.2s', marginTop: '1rem' }}
          >
            {loading ? 'Signing in…' : requiresMfa ? 'Verify' : 'Sign in'}
          </button>
        </form>

        {!requiresMfa && (
          <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: 14, color: 'var(--color-text-secondary)' }}>
            New to DentalIQ?{' '}
            <Link href="/signup" style={{ color: '#0f766e', fontWeight: 500, textDecoration: 'none' }}>
              Create an account
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
