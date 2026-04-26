'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ─────────────────────────────────────────────────────────
// DentalIQ — Marketing Landing Page
// Design from App.jsx — uses CSS variables for dark mode
// ─────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 199,
    desc: '1 clinic location',
    features: ['Real-time cost estimator', 'Patient-facing explanations', 'Up to 300 estimates/mo', 'Email support'],
    color: '#0f766e',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 349,
    desc: 'Up to 3 locations',
    features: ['Everything in Starter', 'Claim risk detection', 'Pre-auth drafting', 'Priority support', 'Analytics dashboard'],
    color: '#0e7490',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    desc: 'Unlimited locations',
    features: ['Everything in Pro', 'Custom integrations', 'Dedicated success manager', 'SLA guarantee', 'SSO / SAML'],
    color: '#4f46e5',
  },
]

const SECURITY = [
  { icon: '🔒', label: 'PHIPA Compliant',        desc: 'Ontario health data protection' },
  { icon: '🇨🇦', label: 'Data Stored in Canada',  desc: 'AWS ca-central-1 only' },
  { icon: '🔐', label: 'AES-256 Encryption',      desc: 'At rest and in transit' },
  { icon: '📋', label: 'Audit Logs',              desc: 'Full access trail' },
  { icon: '👥', label: 'Role-Based Access',       desc: 'Granular permissions' },
  { icon: '🛡️', label: 'PIPEDA Aligned',          desc: 'Federal privacy standards' },
]

export default function LandingPage() {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState('pro')

  const goSignup = () => router.push(`/signup?plan=${selectedPlan}`)

  return (
    <div style={{ fontFamily: "'Georgia', serif", background: 'var(--color-background-primary)', minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.2rem 2rem', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 16, fontFamily: 'monospace' }}>+</span>
          </div>
          <span style={{ fontWeight: 600, fontSize: 16, fontFamily: 'system-ui', color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>DentalIQ</span>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {['Features', 'Pricing', 'Security', 'Docs'].map((l) => (
            <span key={l} style={{ fontSize: 14, color: 'var(--color-text-secondary)', cursor: 'pointer', fontFamily: 'system-ui' }}>{l}</span>
          ))}
          <Link href="/login" style={{ fontSize: 14, color: 'var(--color-text-secondary)', fontFamily: 'system-ui', textDecoration: 'none' }}>Sign in</Link>
          <button onClick={goSignup} style={{ background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 14, cursor: 'pointer', fontFamily: 'system-ui' }}>
            Get started
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '5rem 2rem 3rem' }}>
        {/* Hero */}
        <div style={{ display: 'inline-block', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 20, padding: '4px 14px', fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'system-ui', marginBottom: '1.5rem' }}>
          Now with Open Dental integration
        </div>
        <h1 style={{ fontSize: 48, fontWeight: 400, lineHeight: 1.15, marginBottom: '1.2rem', color: 'var(--color-text-primary)', letterSpacing: '-0.03em' }}>
          Insurance clarity,<br /><em style={{ color: '#0f766e' }}>instantly</em>
        </h1>
        <p style={{ fontSize: 18, color: 'var(--color-text-secondary)', fontFamily: 'system-ui', lineHeight: 1.6, maxWidth: 540, marginBottom: '2rem' }}>
          AI-powered cost estimates, claim risk detection, and pre-authorization drafting for Ontario dental clinics. Integrates in minutes.
        </p>
        <div style={{ display: 'flex', gap: 12, marginBottom: '3rem' }}>
          <button onClick={goSignup} style={{ background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, padding: '13px 28px', fontSize: 15, cursor: 'pointer', fontFamily: 'system-ui' }}>
            Start free trial →
          </button>
          <Link href="/login" style={{ display: 'flex', alignItems: 'center', background: 'transparent', color: 'var(--color-text-primary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 8, padding: '13px 24px', fontSize: 15, cursor: 'pointer', fontFamily: 'system-ui', textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: '4rem' }}>
          {[
            { num: '$6.4K', label: 'avg. monthly revenue recovered' },
            { num: '23%',   label: 'reduction in claim rejections' },
            { num: '94min', label: 'saved per clinic per week' },
          ].map((s) => (
            <div key={s.num} style={{ background: 'var(--color-background-secondary)', borderRadius: 12, padding: '1.2rem', border: '0.5px solid var(--color-border-tertiary)' }}>
              <div style={{ fontSize: 28, fontWeight: 400, color: '#0f766e', marginBottom: 4 }}>{s.num}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'system-ui' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: '3rem', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: 26, fontWeight: 400, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>How it works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { step: '01', title: 'Sign up & connect', desc: 'Register your clinic, connect Open Dental — takes under 5 minutes. Works automatically.' },
              { step: '02', title: 'Input procedure + patient', desc: 'Front desk enters CDT code and insurance. AI returns estimate and risk flags instantly.' },
              { step: '03', title: 'Collect & recover', desc: 'Fewer rejected claims, higher treatment acceptance, less time on hold with insurers.' },
            ].map((s) => (
              <div key={s.step} style={{ padding: '1.2rem', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12 }}>
                <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#0f766e', marginBottom: 8 }}>{s.step}</div>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8, fontFamily: 'system-ui', color: 'var(--color-text-primary)' }}>{s.title}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'system-ui', lineHeight: 1.55 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: '3rem', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: 26, fontWeight: 400, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Pricing</h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', fontFamily: 'system-ui', marginBottom: '1.5rem' }}>14-day free trial. No credit card required.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {PLANS.map((p) => (
              <div key={p.id} onClick={() => setSelectedPlan(p.id)}
                style={{ padding: '1.4rem', border: selectedPlan === p.id ? `2px solid ${p.color}` : '0.5px solid var(--color-border-tertiary)', borderRadius: 12, cursor: 'pointer', position: 'relative', background: 'var(--color-background-primary)' }}>
                {p.popular && (
                  <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#0e7490', color: '#fff', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontFamily: 'system-ui', whiteSpace: 'nowrap' }}>
                    Most popular
                  </div>
                )}
                <div style={{ fontSize: 15, fontWeight: 500, fontFamily: 'system-ui', color: 'var(--color-text-primary)', marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'system-ui', marginBottom: 10 }}>{p.desc}</div>
                <div style={{ fontSize: 26, fontWeight: 400, color: p.color, marginBottom: 12 }}>
                  {p.price ? `$${p.price}` : 'Custom'}
                  <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'system-ui' }}>{p.price ? '/mo' : ''}</span>
                </div>
                {p.features.map((f) => (
                  <div key={f} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 6 }}>
                    <span style={{ color: p.color, fontSize: 12, marginTop: 2, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'system-ui' }}>{f}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: '3rem', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: 26, fontWeight: 400, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>Built for PHIPA compliance</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {SECURITY.map((s) => (
              <div key={s.label} style={{ padding: '1rem', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12 }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>{s.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'system-ui', color: 'var(--color-text-primary)', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'system-ui' }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 16, padding: '2.5rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: 26, fontWeight: 400, marginBottom: '0.8rem', color: 'var(--color-text-primary)' }}>Ready to recover lost revenue?</h2>
          <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', fontFamily: 'system-ui', marginBottom: '1.5rem' }}>Sign up in under 3 minutes. Connect Open Dental. Done.</p>
          <button onClick={goSignup} style={{ background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, padding: '13px 32px', fontSize: 15, cursor: 'pointer', fontFamily: 'system-ui' }}>
            Create free account →
          </button>
        </div>
      </div>
    </div>
  )
}
