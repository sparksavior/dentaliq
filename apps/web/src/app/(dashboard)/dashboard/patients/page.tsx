'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { patientsApi, type Patient, type CreatePatientInput } from '@/lib/api'

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
      setPatients(await patientsApi.getPatients(accessToken))
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

  const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 14, color: '#0f172a', background: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'system-ui', transition: 'border-color 0.15s' }

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: 4 }}>Patients</h1>
          <p style={{ fontSize: 14, color: '#64748b' }}>{loading ? '…' : `${patients.length} patient${patients.length !== 1 ? 's' : ''} registered`}</p>
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
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 16 }}>⌕</div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, email, or insurance…"
          style={{ width: '100%', padding: '10px 14px 10px 40px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#0f172a', background: '#fff', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
          onFocus={e => e.target.style.borderColor = '#0f766e'}
          onBlur={e => e.target.style.borderColor = '#e2e8f0'}
        />
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Loading patients…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>👥</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              {search ? 'No patients match your search' : 'No patients yet'}
            </div>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 20, maxWidth: 320, margin: '0 auto 20px' }}>
              {search ? 'Try a different search term.' : 'Add your first patient to start running estimates and tracking coverage.'}
            </div>
            {!search && (
              <button onClick={openAdd} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#0f766e', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                + Add first patient
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Patient', 'Date of Birth', 'Phone', 'Email', 'Insurance', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: h === 'Actions' ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafafa'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {initials(p.first_name, p.last_name)}
                      </div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.first_name} {p.last_name}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>{formatDob(p.date_of_birth)}</td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>{p.phone || '—'}</td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>{p.email || '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    {p.insurance_plan_id ? (
                      <span style={{ fontSize: 12, padding: '3px 10px', background: '#f0fdfa', color: '#0f766e', borderRadius: 20, fontWeight: 500 }}>{p.insurance_plan_id}</span>
                    ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => openEdit(p)}
                        style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', color: '#0f172a', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                      >Edit</button>
                      <button
                        onClick={() => setDeleteConfirm(p.id)}
                        style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{editingId ? 'Edit patient' : 'Add new patient'}</h2>
              <button onClick={() => setShowModal(false)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {error && <div style={{ marginBottom: 14, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 9, fontSize: 13, color: '#dc2626' }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>First name <span style={{ color: '#dc2626' }}>*</span></label>
                <input style={inp} value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = '#0f766e'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Last name <span style={{ color: '#dc2626' }}>*</span></label>
                <input style={inp} value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = '#0f766e'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Date of birth</label>
                <input type="date" style={inp} value={form.dateOfBirth ?? ''} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = '#0f766e'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Phone</label>
                <input style={inp} placeholder="+1 (416) 555-0100" value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = '#0f766e'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Email</label>
                <input type="email" style={inp} value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = '#0f766e'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Insurance provider</label>
                <select style={{ ...inp, cursor: 'pointer' }} value={form.insuranceProvider ?? ''} onChange={e => setForm(f => ({ ...f, insuranceProvider: e.target.value }))}>
                  <option value="">— None —</option>
                  {INSURERS.map(ins => <option key={ins} value={ins}>{ins}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '9px 18px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: saving ? '#94a3b8' : 'linear-gradient(135deg, #0f766e, #0d9488)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add patient'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: '1rem' }}>🗑</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Delete patient?</h3>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              This will permanently remove the patient and cannot be undone. Their estimate history will remain for audit purposes.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
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
