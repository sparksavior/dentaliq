import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        .auth-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background: var(--color-background-primary);
          transition: background 0.3s;
        }
        @media (prefers-color-scheme: dark) {
          .auth-root { background: var(--color-background-primary); }
        }
      `}</style>
      <div className="auth-root">
        <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 16, fontFamily: 'monospace', fontWeight: 700 }}>+</span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--color-text-primary)' }}>
              Dental<span style={{ color: '#0f766e' }}>IQ</span>
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
            AI-powered insurance intelligence for dental practices
          </p>
        </div>
        {children}
      </div>
    </>
  )
}
