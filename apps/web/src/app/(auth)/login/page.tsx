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
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-xl font-semibold text-slate-900 mb-1">
          {requiresMfa ? 'Two-factor authentication' : 'Sign in to your account'}
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          {requiresMfa
            ? 'Enter the 6-digit code from your authenticator app.'
            : 'Welcome back. Enter your credentials below.'}
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!requiresMfa ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="you@yourclinic.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                <div className="mt-1.5 text-right">
                  <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">
                    Forgot password?
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
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
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="000000"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in…' : requiresMfa ? 'Verify' : 'Sign in'}
          </button>
        </form>

        {!requiresMfa && (
          <p className="mt-6 text-center text-sm text-slate-500">
            New to DentalIQ?{' '}
            <Link href="/signup" className="font-medium text-blue-600 hover:underline">
              Create an account
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
