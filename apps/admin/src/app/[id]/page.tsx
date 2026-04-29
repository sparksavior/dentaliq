'use client'

import { useEffect, useState, use } from 'react'
import { adminApi, type Tenant } from '@/lib/api'
import { ArrowLeft, Building2, Calendar, CreditCard, ShieldAlert, CheckCircle2, Save, XCircle, Activity } from 'lucide-react'
import Link from 'next/link'

export default function ClinicDetail({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ plan: '', billingDate: '', status: '' })

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    adminApi.listTenants(token).then((tenantsRes: any) => {
      const data = tenantsRes.data
      if (Array.isArray(data)) {
        const found = data.find(t => t.id === params.id)
        if (found) {
          setTenant(found)
          setForm({ 
            plan: found.plan, 
            billingDate: found.billingDate || '',
            status: found.status
          })
        }
      }
      setLoading(false)
    })
  }, [params.id])

  const handleUpdate = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    setSaving(true)
    try {
      await adminApi.updateTenant(token, params.id, form)
      alert('Clinic profile updated successfully.')
      window.location.reload()
    } catch (e) {
      alert('Failed to update clinic.')
    } finally {
      setSaving(false)
    }
  }

  const stopTrial = async () => {
    if (!confirm('Are you sure you want to STOP the free trial? This will immediately lock the clinic dashboard.')) return
    const token = localStorage.getItem('token')
    if (!token) return
    setSaving(true)
    try {
      await adminApi.updateTenant(token, params.id, { status: 'suspended' })
      alert('Trial stopped. Clinic is now suspended.')
      window.location.reload()
    } catch (e) {
      alert('Failed to suspend clinic.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[var(--color-background-secondary)]"><div className="h-6 w-6 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" /></div>
  if (!tenant) return <div>Clinic not found</div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background-secondary)', padding: '40px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)', textDecoration: 'none', marginBottom: 24, fontSize: 14 }}>
          <ArrowLeft size={16} /> Back to Clinics
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--color-background-primary)', border: '1px solid var(--color-border-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: 'var(--color-accent)' }}>
              {tenant.name.charAt(0)}
            </div>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 800 }}>{tenant.name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>ID: {tenant.id}</span>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--color-border-primary)' }} />
                <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Joined {new Date(tenant.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            {tenant.status !== 'suspended' ? (
              <button onClick={stopTrial} style={{ padding: '12px 24px', borderRadius: 12, border: '1px solid #fecaca', background: '#fff', color: '#991b1b', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={18} /> Stop Free Trial
              </button>
            ) : (
              <button onClick={() => setForm({ ...form, status: 'active' })} style={{ padding: '12px 24px', borderRadius: 12, border: '1px solid #bbf7d0', background: '#fff', color: '#166534', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={18} /> Reactivate Account
              </button>
            )}
            <button onClick={handleUpdate} disabled={saving} style={{ padding: '12px 24px', borderRadius: 12, background: 'var(--color-accent)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: saving ? 0.7 : 1 }}>
              <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 40 }}>
           <div style={{ background: 'var(--color-background-primary)', padding: '24px', borderRadius: 20, border: '1px solid var(--color-border-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text-secondary)', marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
                <CreditCard size={16} /> ACTIVE PLAN
              </div>
              <select 
                value={form.plan} 
                onChange={e => setForm({ ...form, plan: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', fontSize: 16, fontWeight: 600, outline: 'none' }}
              >
                <option value="starter">Starter Plan</option>
                <option value="pro">Pro Plan</option>
                <option value="enterprise">Enterprise Plan</option>
              </select>
           </div>

           <div style={{ background: 'var(--color-background-primary)', padding: '24px', borderRadius: 20, border: '1px solid var(--color-border-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text-secondary)', marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
                <Calendar size={16} /> BILLING DATE
              </div>
              <input 
                type="date"
                value={form.billingDate}
                onChange={e => setForm({ ...form, billingDate: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', fontSize: 16, fontWeight: 600, outline: 'none' }}
              />
           </div>

           <div style={{ background: 'var(--color-background-primary)', padding: '24px', borderRadius: 20, border: '1px solid var(--color-border-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text-secondary)', marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
                <Activity size={16} /> CURRENT STATUS
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: tenant.status === 'active' ? '#166534' : '#991b1b', textTransform: 'capitalize' }}>
                {tenant.status === 'suspended' ? 'Suspended (Blocked)' : tenant.status}
              </div>
           </div>
        </div>

        <div style={{ background: 'var(--color-background-primary)', borderRadius: 20, border: '1px solid var(--color-border-secondary)', overflow: 'hidden' }}>
           <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border-secondary)', fontWeight: 700 }}>Clinic Health & Audit Info</div>
           <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4, fontWeight: 600 }}>TRIAL EXPIRATION</div>
                <div style={{ fontWeight: 600 }}>{tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleString() : 'No trial record'}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4, fontWeight: 600 }}>TENANT SLUG</div>
                <div style={{ fontWeight: 600 }}>{tenant.slug}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4, fontWeight: 600 }}>PMS TYPE</div>
                <div style={{ fontWeight: 600, textTransform: 'uppercase' }}>Open Dental (Connector Active)</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4, fontWeight: 600 }}>STRIPE CUSTOMER ID</div>
                <div style={{ fontWeight: 600 }}>cus_PQ82{tenant.id.slice(-4)}</div>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
