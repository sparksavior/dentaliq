'use client'

import { useEffect, useState } from 'react'
import { adminApi, type Tenant } from '@/lib/api'
import { Users, Building2, Calendar, ShieldCheck, ChevronRight, Activity, Clock, LogOut } from 'lucide-react'
import Link from 'next/link'

export default function AdminDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      window.location.href = '/login'
      return
    }

    const load = async () => {
      try {
        const response = await adminApi.getMe(token)
        const me = response.data

        if (me.role !== 'admin') {
          alert('Access Denied: You must be an admin.')
          window.location.href = 'http://localhost:3000/dashboard'
          return
        }
        setUser(me)
        const tenantsRes = await adminApi.listTenants(token) as any
        setTenants(Array.isArray(tenantsRes.data) ? tenantsRes.data : [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[var(--color-background-secondary)]"><div className="h-6 w-6 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" /></div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-background-secondary)' }}>
      {/* Sidebar */}
      <aside style={{ width: 260, background: 'var(--color-background-primary)', borderRight: '1px solid var(--color-border-secondary)', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #0f766e, #0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>+</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Dental<span style={{ color: 'var(--color-accent)' }}>IQ</span> <span style={{ fontSize: 12, opacity: 0.6 }}>ADMIN</span></div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent)', padding: '12px 16px', borderRadius: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Building2 size={18} /> Clinics
          </div>
          <div style={{ padding: '12px 16px', borderRadius: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'not-allowed' }}>
            <Users size={18} /> Users
          </div>
          <div style={{ padding: '12px 16px', borderRadius: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'not-allowed' }}>
            <Activity size={18} /> System Logs
          </div>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: 20 }}>
           <button onClick={() => { localStorage.removeItem('token'); window.location.href = '/login' }} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--color-border-secondary)', background: 'transparent', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
             <LogOut size={16} /> Sign Out
           </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: '40px' }}>
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
                      Manage <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
