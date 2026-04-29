'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, X } from 'lucide-react'
import type { EstimateHistoryItem, Patient } from '@/lib/api'

export const FRESH_LOGIN_KEY = 'diq_fresh_login'

interface Props {
  patients: Patient[]
  history: EstimateHistoryItem[]
  clinicName: string
  userName: string
}

export function ClinicInsightPopup({ patients, history, clinicName, userName }: Props) {
  const [visible, setVisible] = useState(false)
  const [insight, setInsight] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const now = new Date()
  const thisMonth = history.filter(h => {
    const d = new Date(h.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const highRisk = history.filter(h => h.claim_risk === 'high').length
  const medRisk = history.filter(h => h.claim_risk === 'medium').length
  const revenueRecovered = thisMonth.reduce((sum, h) => sum + (h.insurer_pays || 0), 0)

  const buildFallback = useCallback(() => {
    if (history.length === 0) {
      return `Welcome back to ${clinicName}! You're all set up — head to Estimates to run your first insurance coverage check.`
    }
    const attentionNote = highRisk > 0
      ? ` ${highRisk} high-risk claim${highRisk !== 1 ? 's need' : ' needs'} attention.`
      : ' All current claims look healthy!'
    return `${clinicName} has ${patients.length} patient${patients.length !== 1 ? 's' : ''} on file with $${Math.round(revenueRecovered).toLocaleString()} in insurer payments tracked this month.${attentionNote}`
  }, [clinicName, history.length, highRisk, patients.length, revenueRecovered])

  const generateInsight = useCallback(async () => {
    setLoading(true)
    try {
      const prompt = `You are a dental practice management AI. Write a warm, helpful 2-3 sentence summary of how this clinic is currently doing, based on real data below. Be specific, encouraging, and actionable. Address the team directly. No preamble — start with the insight.

Clinic: ${clinicName}
Total Patients on File: ${patients.length}
Estimates This Month: ${thisMonth.length}
Revenue Recovered This Month: $${Math.round(revenueRecovered).toLocaleString()} CAD
High-Risk Claims: ${highRisk}
Medium-Risk Claims: ${medRisk}
Total Lifetime Estimates: ${history.length}`

      const res = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'phi3', prompt, stream: false }),
        signal: AbortSignal.timeout(12000),
      })
      const data = await res.json()
      setInsight(data.response?.trim() || buildFallback())
    } catch {
      setInsight(buildFallback())
    } finally {
      setLoading(false)
    }
  }, [clinicName, patients.length, thisMonth.length, revenueRecovered, highRisk, medRisk, history.length, buildFallback])

  useEffect(() => {
    const flag = sessionStorage.getItem(FRESH_LOGIN_KEY)
    if (flag) {
      sessionStorage.removeItem(FRESH_LOGIN_KEY)
      // Wait for data to populate then show
      const t = setTimeout(() => {
        setVisible(true)
        generateInsight()
      }, 600)
      return () => clearTimeout(t)
    }
  }, [generateInsight])

  if (!visible) return null

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={() => setVisible(false)}
      />

      {/* Popup */}
      <div
        style={{
          position: 'fixed', zIndex: 9001,
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 500, maxWidth: 'calc(100vw - 2rem)',
          background: 'var(--color-background-primary)',
          border: '1px solid var(--color-border-secondary)',
          borderRadius: 20,
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
          overflow: 'hidden',
          animation: 'insightSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #0f766e, #0d9488)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{greeting}, {userName.split(' ')[0]}!</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{clinicName} · AI Clinic Summary</div>
            </div>
          </div>
          <button
            onClick={() => setVisible(false)}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '20px 24px 24px' }}>
          {/* AI insight text */}
          <div style={{ background: 'var(--color-background-secondary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 12, padding: '16px 18px', marginBottom: 20, minHeight: 72, display: 'flex', alignItems: 'center' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <div
                      key={i}
                      style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-accent)', animation: `insightDot 1.2s ease-in-out ${delay}s infinite` }}
                    />
                  ))}
                </div>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Analyzing your clinic data…</span>
              </div>
            ) : (
              <p style={{ fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.7, margin: 0 }}>
                {insight}
              </p>
            )}
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Patients', value: patients.length.toString(), icon: '👥', alert: false },
              { label: 'This Month', value: `${thisMonth.length} est.`, icon: '📊', alert: false },
              { label: 'Revenue', value: `$${(revenueRecovered / 1000).toFixed(1)}k`, icon: '💰', alert: false },
              { label: 'High Risk', value: highRisk.toString(), icon: '⚠️', alert: highRisk > 0 },
            ].map(stat => (
              <div key={stat.label} style={{
                background: stat.alert ? 'rgba(239,68,68,0.06)' : 'var(--color-background-secondary)',
                border: `1px solid ${stat.alert ? 'rgba(239,68,68,0.2)' : 'var(--color-border-tertiary)'}`,
                borderRadius: 10, padding: '12px 8px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 18, marginBottom: 4, lineHeight: 1 }}>{stat.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: stat.alert ? '#ef4444' : 'var(--color-text-primary)', lineHeight: 1.2 }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setVisible(false)}
            style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.01em' }}
          >
            Let's go →
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes insightSlideIn {
          from { opacity: 0; transform: translate(-50%, calc(-50% + 16px)); }
          to   { opacity: 1; transform: translate(-50%, -50%); }
        }
        @keyframes insightDot {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1);   }
        }
      `}</style>
    </>
  )
}
