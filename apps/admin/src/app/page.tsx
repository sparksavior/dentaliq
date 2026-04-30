'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApi, type Tenant, type SupportTicket } from '@/lib/api'
import { Users, Building2, Calendar, Activity, LogOut, LifeBuoy } from 'lucide-react'
import Link from 'next/link'

type NavTab = 'clinics' | 'tickets'

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string; label: string }> = {
  open:        { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', label: 'Open' },
  in_progress: { bg: '#fffbeb', color: '#92400e', border: '#fde68a', label: 'In Progress' },
  resolved:    { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', label: 'Resolved' },
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<NavTab>('clinics')
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [token, setToken] = useState<string | null>(null)

  const loadTickets = useCallback(async (t: string) => {
    try {
      const res = await adminApi.listTickets(t)
      if (res.success) setTickets(res.data)
    } catch { /* noop */ }
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('token')
    if (!stored) {
      window.location.href = '/login'
      return
    }
    setToken(stored)

    const load = async () => {
      try {
        const response = await adminApi.getMe(stored)
        const me = response.data
        if (!me) {
          window.location.href = '/login'
          return
        }
        if (me.role !== 'admin') {
          alert('Access Denied: You must be an admin.')
          window.location.href = 'http://localhost:3000/dashboard'
          return
        }
        setUser(me)
        const tenantsRes = await adminApi.listTenants(stored) as any
        setTenants(Array.isArray(tenantsRes.data) ? tenantsRes.data : [])
        await loadTickets(stored)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [loadTickets])

  // Poll for new tickets every 8 seconds when on the tickets tab
  useEffect(() => {
    if (tab !== 'tickets' || !token) return
    const interval = setInterval(() => loadTickets(token), 8000)
    return () => clearInterval(interval)
  }, [tab, token, loadTickets])

  const updateTicketStatus = async (id: string, status: string) => {
    if (!token) return
    await adminApi.updateTicket(token, id, status)
    await loadTickets(token)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background-secondary)]">
      <div className="h-6 w-6 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" />
    </div>
  )

  const openCount = tickets.filter(t => t.status === 'open').length

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-background-secondary)' }}>
      {/* Sidebar */}
      <aside style={{ width: 260, background: 'var(--color-background-primary)', borderRight: '1px solid var(--color-border-secondary)', padding: '24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #0f766e, #0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>+</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Dental<span style={{ color: 'var(--color-accent)' }}>IQ</span> <span style={{ fontSize: 12, opacity: 0.6 }}>ADMIN</span></div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          <button
            onClick={() => setTab('clinics')}
            style={{ background: tab === 'clinics' ? 'var(--color-accent-muted)' : 'transparent', color: tab === 'clinics' ? 'var(--color-accent)' : 'var(--color-text-secondary)', padding: '12px 16px', borderRadius: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 12, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}
          >
            <Building2 size={18} /> Clinics
          </button>
          <button
            onClick={() => setTab('tickets')}
            style={{ background: tab === 'tickets' ? 'var(--color-accent-muted)' : 'transparent', color: tab === 'tickets' ? 'var(--color-accent)' : 'var(--color-text-secondary)', padding: '12px 16px', borderRadius: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 12, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', position: 'relative' }}
          >
            <LifeBuoy size={18} /> Support Tickets
            {openCount > 0 && (
              <span style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '2px 7px', minWidth: 20, textAlign: 'center' }}>
                {openCount}
              </span>
            )}
          </button>
          <div style={{ padding: '12px 16px', borderRadius: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'not-allowed', opacity: 0.5 }}>
            <Users size={18} /> Users
          </div>
          <div style={{ padding: '12px 16px', borderRadius: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'not-allowed', opacity: 0.5 }}>
            <Activity size={18} /> System Logs
          </div>
        </nav>

        <button
          onClick={() => { localStorage.removeItem('token'); window.location.href = '/login' }}
          style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--color-border-secondary)', background: 'transparent', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}
        >
          <LogOut size={16} /> Sign Out
        </button>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        {tab === 'clinics' && (
          <>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Clinic Management</h1>
              <p style={{ color: 'var(--color-text-secondary)' }}>Monitoring {tenants.length} registered clinics across DentalIQ Canada.</p>
            </div>

            <div style={{ background: 'var(--color-background-primary)', borderRadius: 20, border: '1px solid var(--color-border-secondary)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)' }}>
                    <th style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>CLINIC NAME</th>
                    <th style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>STATUS</th>
                    <th style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>PLAN</th>
                    <th style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>TRIAL EXPIRATION</th>
                    <th style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>CREATED</th>
                    <th style={{ padding: '16px 24px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--color-border-tertiary)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ fontWeight: 600 }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{t.slug}.dentaliq.ca</div>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
                          background: t.status === 'active' ? '#f0fdf4' : t.status === 'trial' ? '#eff6ff' : '#fef2f2',
                          color: t.status === 'active' ? '#166534' : t.status === 'trial' ? '#1e40af' : '#991b1b',
                          border: `1px solid ${t.status === 'active' ? '#bbf7d0' : t.status === 'trial' ? '#bfdbfe' : '#fecaca'}`
                        }}>
                          {t.status === 'suspended' ? 'Trial Ended' : t.status}
                        </span>
                      </td>
                      <td style={{ padding: '20px 24px', fontSize: 14, textTransform: 'capitalize' }}>{t.plan}</td>
                      <td style={{ padding: '20px 24px', fontSize: 14, color: 'var(--color-text-secondary)' }}>
                        {t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ padding: '20px 24px', fontSize: 14, color: 'var(--color-text-secondary)' }}>
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <Link href={`/${t.id}`} style={{ color: 'var(--color-accent)', background: 'var(--color-accent-muted)', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, width: 'fit-content' }}>
                          Manage →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'tickets' && (
          <>
            <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Support Tickets</h1>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                  {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} total · {openCount} open
                  <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--color-text-secondary)', opacity: 0.7 }}>
                    (auto-refreshes every 8s)
                  </span>
                </p>
              </div>
              <button
                onClick={() => token && loadTickets(token)}
                style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}
              >
                ↻ Refresh
              </button>
            </div>

            {tickets.length === 0 ? (
              <div style={{ background: 'var(--color-background-primary)', borderRadius: 20, border: '1px solid var(--color-border-secondary)', padding: '4rem', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎫</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>No tickets yet</div>
                <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Support tickets from clinics will appear here in real time.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {tickets.map(ticket => {
                  const sc = STATUS_COLORS[ticket.status] ?? STATUS_COLORS.open
                  return (
                    <div key={ticket.id} style={{ background: 'var(--color-background-primary)', borderRadius: 16, border: '1px solid var(--color-border-secondary)', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>{ticket.subject}</span>
                            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, fontWeight: 600 }}>
                              {sc.label}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                            <span>🏥 {ticket.clinic_name}</span>
                            <span>👤 {ticket.user_name}</span>
                            <span>✉ {ticket.user_email}</span>
                            <span>🕐 {new Date(ticket.created_at).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          {ticket.status !== 'in_progress' && (
                            <button
                              onClick={() => updateTicketStatus(ticket.id, 'in_progress')}
                              style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #fde68a', background: '#fffbeb', color: '#92400e', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                            >
                              In Progress
                            </button>
                          )}
                          {ticket.status !== 'resolved' && (
                            <button
                              onClick={() => updateTicketStatus(ticket.id, 'resolved')}
                              style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                            >
                              Mark Resolved
                            </button>
                          )}
                          {ticket.status === 'resolved' && (
                            <button
                              onClick={() => updateTicketStatus(ticket.id, 'open')}
                              style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1e40af', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                            >
                              Reopen
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ padding: '12px 14px', background: 'var(--color-background-secondary)', borderRadius: 10, fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {ticket.description}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
