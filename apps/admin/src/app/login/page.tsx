'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()

      if (data.success && data.data?.accessToken) {
        if (data.data.user.role !== 'admin') {
          setError('Access Denied: You are not an admin.')
          return
        }
        localStorage.setItem('token', data.data.accessToken)
        router.push('/')
      } else {
        setError(data.message || data.error || 'Login failed - check credentials')
      }
    } catch (err) {
      setError('Connection failed to auth service')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-background-secondary)' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '40px', background: 'var(--color-background-primary)', borderRadius: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.1)', border: '1px solid var(--color-border-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, justifyContent: 'center' }}>
           <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #0f766e, #0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 20 }}>+</div>
           <h1 style={{ fontSize: 24, fontWeight: 800 }}>DentalIQ <span style={{ fontSize: 14, color: 'var(--color-accent)' }}>ADMIN</span></h1>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && <div style={{ padding: '12px', background: '#fef2f2', color: '#991b1b', borderRadius: 12, fontSize: 13, border: '1px solid #fecaca' }}>{error}</div>}
          
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-secondary)' }}>ADMIN EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', outline: 'none' }} placeholder="admin@dentaliq.dev" />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-secondary)' }}>PASSWORD</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', outline: 'none' }} placeholder="••••••••" />
          </div>

          <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'var(--color-accent)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', marginTop: 10, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Authenticating...' : 'Sign In to Admin Portal'}
          </button>
        </form>
      </div>
    </div>
  )
}
