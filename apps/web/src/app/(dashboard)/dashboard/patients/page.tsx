'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText, Clock, Shield, Calendar, History, Phone, Mail, User, ChevronRight, Search, Plus, Filter, MoreHorizontal, Edit, Trash } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { patientsApi, tenantsApi, type Patient, type CreatePatientInput, type Tenant } from '@/lib/api'

const INSURERS = ['Sun Life Financial', 'Manulife', 'Canada Life', 'Green Shield Canada', 'Desjardins', 'OTIP/RAEO', 'Empire Life']

const emptyForm: CreatePatientInput = { firstName: '', lastName: '', dateOfBirth: '', phone: '', email: '', insuranceProvider: '' }

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

function formatDob(dob?: string) {
  if (!dob) return '—'
  try {
    const d = new Date(dob)
    const age = Math.floor((Date.now() - d.getTime()) / 31557600000)
    return `${d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })} (age ${age})`
  } catch { return dob }
}

export default function PatientsPage() {
  const { accessToken } = useAuth()
  const [patients, setPatients] = useState<Patient[]>([])
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [showModal, setShowModal] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CreatePatientInput>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const [pts, t] = await Promise.all([
        patientsApi.getPatients(accessToken),
        tenantsApi.getTenant(accessToken).catch(() => null)
      ])
      setPatients(pts)
      setTenant(t)
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { load() }, [load])


  const openAdd = () => {
    setEditingId(null); setForm(emptyForm); setError(''); setShowModal(true)
  }

  const openEdit = (p: Patient) => {
    setEditingId(p.id)
    setForm({ firstName: p.first_name, lastName: p.last_name, dateOfBirth: p.date_of_birth ?? '', phone: p.phone ?? '', email: p.email ?? '', insuranceProvider: p.insurance_plan_id ?? '' })
    setError(''); setShowModal(true)
  }

  const save = async () => {
    if (!accessToken) return
    if (!form.firstName.trim() || !form.lastName.trim()) { setError('First and last name are required.'); return }
    setSaving(true); setError('')
    try {
      if (editingId) {
        await patientsApi.updatePatient(accessToken, editingId, form)
      } else {
        await patientsApi.createPatient(accessToken, form)
      }
      setShowModal(false)
      await load()
    } catch (err: any) {
      setError(err.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async (id: string) => {
    if (!accessToken) return
    try {
      await patientsApi.deletePatient(accessToken, id)
      setDeleteConfirm(null)
      await load()
    } catch (err: any) {
      setError(err.message ?? 'Delete failed')
    }
  }

  const filtered = patients.filter(p => {
    const q = search.toLowerCase()
    return `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      (p.phone ?? '').includes(q) ||
      (p.email ?? '').toLowerCase().includes(q) ||
      (p.insurance_plan_id ?? '').toLowerCase().includes(q)
  })

  const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1.5px solid var(--color-border-secondary)', borderRadius: 9, fontSize: 14, color: 'var(--color-text-primary)', background: 'var(--color-input-bg)', outline: 'none', boxSizing: 'border-box', fontFamily: 'system-ui', transition: 'border-color 0.15s' }

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto', color: 'var(--color-text-primary)' }}>
      {/* Patients List */}


      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.03em', marginBottom: 4 }}>Patients</h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{loading ? '…' : `${patients.length} patient${patients.length !== 1 ? 's' : ''} registered`}</p>
        </div>
        <button
          onClick={openAdd}
          style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #0f766e, #0d9488)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          + Add patient
        </button>
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: '1.2rem', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontSize: 16 }}>⌕</div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, email, or insurance…"
          style={{ width: '100%', padding: '10px 14px 10px 40px', border: '1.5px solid var(--color-border-secondary)', borderRadius: 10, fontSize: 14, color: 'var(--color-text-primary)', background: 'var(--color-background-primary)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
          onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--color-border-secondary)'}
        />
      </div>

      {/* Table */}
      <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-secondary)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14 }}>Loading patients…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>👥</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 6 }}>
              {search ? 'No patients match your search' : 'No patients yet'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 20, maxWidth: 320, margin: '0 auto 20px' }}>
              {search ? 'Try a different search term.' : 'Add your first patient to start running estimates and tracking coverage.'}
            </div>
            {!search && (
              <button onClick={openAdd} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                + Add first patient
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--color-background-secondary)', borderBottom: '1px solid var(--color-border-secondary)' }}>
                {['Patient', 'Date of Birth', 'Phone', 'Email', 'Insurance', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: h === 'Actions' ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border-tertiary)', transition: 'background 0.1s' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <Link 
                      href={`/dashboard/patients/${p.id}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', transition: 'opacity 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--color-accent-muted)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {initials(p.first_name, p.last_name)}
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--color-accent)' }}>
                        {p.first_name} {p.last_name}
                      </div>
                    </Link>
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)' }}>{formatDob(p.date_of_birth)}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)' }}>{p.phone || '—'}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)' }}>{p.email || '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    {p.insurance_plan_id ? (
                      <span style={{ fontSize: 12, padding: '3px 10px', background: 'var(--color-accent-muted)', color: 'var(--color-accent)', borderRadius: 20, fontWeight: 500 }}>{p.insurance_plan_id}</span>
                    ) : <span style={{ color: 'var(--color-text-secondary)' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => openEdit(p)}
                        style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                      >Edit</button>
                      <button
                        onClick={() => setDeleteConfirm(p.id)}
                        style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #fecaca', background: 'transparent', color: '#ef4444', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                      >Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div style={{ background: 'var(--color-background-primary)', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--color-border-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>{editingId ? 'Edit patient' : 'Add new patient'}</h2>
              <button onClick={() => setShowModal(false)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--color-border-secondary)', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {error && <div style={{ marginBottom: 14, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 9, fontSize: 13, color: '#dc2626' }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 5 }}>First name <span style={{ color: '#ef4444' }}>*</span></label>
                <input style={inp} value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 5 }}>Last name <span style={{ color: '#ef4444' }}>*</span></label>
                <input style={inp} value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 5 }}>Date of birth</label>
                <input type="date" style={inp} value={form.dateOfBirth ?? ''} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 5 }}>Phone</label>
                <input style={inp} placeholder="+1 (416) 555-0100" value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 5 }}>Email</label>
                <input type="email" style={inp} value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 5 }}>Insurance provider</label>
                <select style={{ ...inp, cursor: 'pointer' }} value={form.insuranceProvider ?? ''} onChange={e => setForm(f => ({ ...f, insuranceProvider: e.target.value }))}>
                  <option value="">— None —</option>
                  {INSURERS.map(ins => <option key={ins} value={ins}>{ins}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '9px 18px', borderRadius: 9, border: '1.5px solid var(--color-border-secondary)', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: saving ? 'var(--color-text-secondary)' : 'linear-gradient(135deg, #0f766e, #0d9488)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add patient'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--color-background-primary)', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: '1px solid var(--color-border-secondary)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: '1rem' }}>🗑</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 6 }}>Delete patient?</h3>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              This will permanently remove the patient and cannot be undone. Their estimate history will remain for audit purposes.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1.5px solid var(--color-border-secondary)', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
                Cancel
              </button>
              <button onClick={() => confirmDelete(deleteConfirm)} style={{ flex: 1, padding: '10px', borderRadius: 9, border: 'none', background: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
