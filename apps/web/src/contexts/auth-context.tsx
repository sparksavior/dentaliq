"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { authApi, type AuthUser } from "@/lib/api";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  setSession: (token: string, user: AuthUser) => void;
  clearSession: (reason?: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "diq_access_token";

// ── Session-expired overlay ───────────────────────────────────
function SessionExpiredOverlay({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        animation: "diqFadeIn 0.2s ease-out",
      }}
    >
      <style>{`
        @keyframes diqFadeIn { from { opacity:0; transform:scale(0.96) } to { opacity:1; transform:scale(1) } }
      `}</style>
      <div
        style={{
          background: "var(--color-background-secondary)",
          border: "1px solid var(--color-border-primary)",
          borderRadius: 20,
          padding: "36px 32px 28px",
          maxWidth: 400,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 18,
            background: "rgba(245,158,11,0.12)",
            border: "1.5px solid rgba(245,158,11,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            margin: "0 auto 20px",
          }}
        >
          🔒
        </div>

        <h2
          style={{
            margin: "0 0 10px",
            fontSize: 20,
            fontWeight: 700,
            color: "var(--color-text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          You've been signed out
        </h2>

        <p
          style={{
            margin: "0 0 28px",
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--color-text-secondary)",
          }}
        >
          {message}
        </p>

        <button
          onClick={onDismiss}
          style={{
            width: "100%",
            padding: "12px 0",
            background: "linear-gradient(135deg, #0f766e, #0d9488)",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(15,118,110,0.3)",
          }}
        >
          Sign in again
        </button>

        <p
          style={{
            marginTop: 14,
            fontSize: 12,
            color: "var(--color-text-tertiary, #64748b)",
          }}
        >
          Your work is saved — you won't lose anything.
        </p>
      </div>
    </div>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    loading: true,
  });
  const [expiredMessage, setExpiredMessage] = useState<string | null>(null);

  const handleDismissExpired = useCallback(() => {
    setExpiredMessage(null);
    window.location.href = "/login";
  }, []);

  const setSession = useCallback((token: string, user: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    setState({ user, accessToken: token, loading: false });
  }, []);

  const clearSession = useCallback((reason?: string) => {
    localStorage.removeItem(TOKEN_KEY);
    authApi.logout().catch(() => null);
    setState({ user: null, accessToken: null, loading: false });

    if (reason) {
      // Show friendly overlay instead of silent redirect
      setExpiredMessage(reason);
    } else {
      // Voluntary logout — go to the logout page as normal
      window.location.href = "/logout";
    }
  }, []);

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    authApi
      .me(token)
      .then((user) => setState({ user, accessToken: token, loading: false }))
      .catch(() => {
        // Token may be expired — try silent refresh first
        authApi
          .refresh()
          .then(({ accessToken }) =>
            authApi
              .me(accessToken)
              .then((user) => setSession(accessToken, user)),
          )
          .catch(() => {
            localStorage.removeItem(TOKEN_KEY);
            setState({ user: null, accessToken: null, loading: false });
            // Don't show the overlay here — could be a fresh browser open with a stale token,
            // not a mid-session expiry. Just silently redirect to login.
            window.location.href = "/login";
          });
      });
  }, [setSession]);

  // Proactive silent refresh — renew 1 min before the 15-min access token expires
  useEffect(() => {
    if (!state.accessToken) return;
    const id = setInterval(
      async () => {
        try {
          const { accessToken } = await authApi.refresh();
          const user = await authApi.me(accessToken);
          setSession(accessToken, user);
        } catch {
          // Refresh token expired — show friendly message, don't just vanish
          clearSession(
            "For your security, sessions automatically expire after a period of inactivity. Please sign in again to continue.",
          );
        }
      },
      14 * 60 * 1000,
    ); // every 14 minutes
    return () => clearInterval(id);
  }, [state.accessToken, setSession, clearSession]);

  return (
    <AuthContext.Provider value={{ ...state, setSession, clearSession }}>
      {children}
      {expiredMessage && (
        <SessionExpiredOverlay
          message={expiredMessage}
          onDismiss={handleDismissExpired}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
