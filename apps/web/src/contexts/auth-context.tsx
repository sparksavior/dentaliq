'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { authApi, type AuthUser } from '@/lib/api'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  setSession: (token: string, user: AuthUser) => void
  clearSession: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEY = 'diq_access_token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    loading: true,
  })

  const setSession = useCallback((token: string, user: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, token)
    setState({ user, accessToken: token, loading: false })
  }, [])

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    authApi.logout().catch(() => null)
    setState({ user: null, accessToken: null, loading: false })
    window.location.href = '/logout'
  }, [])

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setState((s) => ({ ...s, loading: false }))
      return
    }
    authApi
      .me(token)
      .then((user) => setState({ user, accessToken: token, loading: false }))
      .catch(() => {
        // Token expired — try silent refresh
        authApi
          .refresh()
          .then(({ accessToken }) => authApi.me(accessToken).then((user) => setSession(accessToken, user)))
          .catch(() => {
            localStorage.removeItem(TOKEN_KEY)
            setState({ user: null, accessToken: null, loading: false })
          })
      })
  }, [setSession])

  return (
    <AuthContext.Provider value={{ ...state, setSession, clearSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
