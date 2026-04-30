'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { supportApi } from '@/lib/api'

export default function SupportPage() {
  const { accessToken } = useAuth()
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    border: '1.5px solid var(--color-border-secondary)', borderRadius: 9,
    fontSize: 14, color: 'var(--color-text-primary)',
    background: 'var(--color-input-bg)', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'system-ui', transition: 'border-color 0.15s',
  }

  const submit = async () => {
    if (!accessToken) return
    if (!subject.trim() || !description.trim()) {
      setError('Subject and description are required.')
      return
    }
    setSending(true)
    setError('')
    try {
      await supportApi.createTicket(accessToken, { subject: subject.trim(), description: description.trim() })
      setSuccess(true)
      setSubject('')
      setDescription('')
    } catch (err: any) {
      setError(err.message ?? 'Failed to submit ticket')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 680, margin: '0 auto', color: 'var(--color-text-primary)' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.03em', marginBottom: 4 }}>Support</h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
          Have a question or issue? Submit a ticket and our team will get back to you.
        </p>
      </div>

      {success ? (
        <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-secondary)', borderRadius: 16, padding: '3rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 1.5rem' }}>✓</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>Ticket submitted!</h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Your support request has been received. Our team will review it and follow up shortly.
          </p>
          <button
            onClick={() => setSuccess(false)}
            style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Submit another ticket
          </button>
        </div>
      ) : (
        <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-secondary)', borderRadius: 16, padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {error && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 9, fontSize: 13, color: '#dc2626' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                Subject <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                style={inp}
                placeholder="e.g. Issue with patient import"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--color-border-secondary)'}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                Description <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                style={{ ...inp, height: 160, resize: 'vertical', lineHeight: 1.6 }}
                placeholder="Describe your issue or question in detail…"
                value={description}
                onChange={e => setDescription(e.target.value)}
                onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--color-border-secondary)'}
              />
            </div>

            <div style={{ padding: '12px 16px', background: 'var(--color-background-secondary)', borderRadius: 10, border: '1px solid var(--color-border-secondary)', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              Your clinic name and email will be automatically included with your ticket. Tickets are reviewed during business hours (Mon–Fri, 9am–5pm ET).
            </div>

            <button
              onClick={submit}
              disabled={sending || !subject.trim() || !description.trim()}
              style={{
                padding: '12px', borderRadius: 10, border: 'none',
                background: (sending || !subject.trim() || !description.trim()) ? 'var(--color-text-secondary)' : 'linear-gradient(135deg, #0f766e, #0d9488)',
                color: '#fff', fontSize: 15, fontWeight: 600,
                cursor: (sending || !subject.trim() || !description.trim()) ? 'not-allowed' : 'pointer',
              }}
            >
              {sending ? 'Submitting…' : 'Submit ticket →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
