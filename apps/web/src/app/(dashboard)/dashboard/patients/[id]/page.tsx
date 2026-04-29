'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, User, Calendar, Mail, Phone, MapPin, 
  Clock, Shield, FileText, CheckCircle2, AlertTriangle, 
  ChevronRight, ExternalLink, Activity
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { patientsApi, tenantsApi, type Patient, type EstimateHistoryItem } from '@/lib/api'
import PreAuthPdfModal from '@/components/PreAuthPdfModal'

export default function PatientDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { accessToken } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [patient, setPatient] = useState<(Patient & { history: EstimateHistoryItem[] }) | null>(null)
  const [tenant, setTenant] = useState<any>(null)
  const [error, setError] = useState('')

  const [showPdfModal, setShowPdfModal] = useState<string | null>(null)
  const [pdfMeta, setPdfMeta] = useState<{ patientName: string; insurer: string; date: string } | null>(null)

  const load = useCallback(async () => {
    if (!accessToken || !id) return
    setLoading(true)
    try {
      const [pData, tData] = await Promise.all([
        patientsApi.getPatient(accessToken, id),
        tenantsApi.getTenant(accessToken).catch(() => null)
      ])
      setPatient(pData)
      setTenant(tData)
    } catch (err) {
      console.error('Failed to load patient detail', err)
      setError('Could not load patient records.')
    } finally {
      setLoading(false)
    }
  }, [accessToken, id])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>Loading patient dossier...</div>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#ef4444' }}>{error || 'Patient not found'}</p>
        <button onClick={() => router.push('/dashboard/patients')} style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 600 }}>
          Back to list
        </button>
      </div>
    )
  }

  const stats = {
    totalEstimates: patient.history.length,
    insurerPays: patient.history.reduce((sum, h) => sum + (h.insurer_pays || 0), 0),
    patientPays: patient.history.reduce((sum, h) => sum + (h.patient_cost || 0), 0),
    highRisk: patient.history.filter(h => h.claim_risk === 'high').length
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 1400, margin: '0 auto', color: 'var(--color-text-primary)' }}>
      {/* PDF Modal */}
      {showPdfModal && pdfMeta && (
        <PreAuthPdfModal
          narrative={showPdfModal}
          clinicName={tenant?.name || 'Your Clinic'}
          insurerName={pdfMeta.insurer}
          patientName={pdfMeta.patientName}
          date={pdfMeta.date}
          onClose={() => setShowPdfModal(null)}
          onRevise={async () => {}}
        />
      )}

      {/* Header / Nav */}
      <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            onClick={() => router.push('/dashboard/patients')}
            style={{ 
              width: 40, height: 40, borderRadius: 12, border: '1.5px solid var(--color-border-secondary)',
              background: 'transparent', color: 'var(--color-text-primary)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 4 }}>
              <User size={14} /> PATIENT DOSSIER
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em' }}>
              {patient.first_name} {patient.last_name}
            </h1>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Edit Profile
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '2rem' }}>
        {/* Sidebar: Demographics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'var(--color-background-secondary)', borderRadius: 24, padding: '1.5rem', border: '1px solid var(--color-border-secondary)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} color="var(--color-accent)" /> Personal Information
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(var(--color-accent-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
                  <Calendar size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600 }}>BIRTH DATE</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{new Date(patient.date_of_birth).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(var(--color-accent-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
                  <Mail size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600 }}>EMAIL ADDRESS</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{patient.email}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(var(--color-accent-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
                  <Phone size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600 }}>PHONE NUMBER</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{patient.phone || 'No phone listed'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(var(--color-accent-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
                  <MapPin size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600 }}>INSURANCE PLAN</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-accent)' }}>
                    {patient.insurance_plan_id || 'Self-Pay'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--color-background-secondary)', borderRadius: 24, padding: '1.5rem', border: '1px solid var(--color-border-secondary)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: '1.25rem' }}>Financial Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: 'var(--color-background-primary)', padding: '1rem', borderRadius: 16, border: '1px solid var(--color-border-secondary)' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: 4 }}>INSURER PAID</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>${stats.insurerPays.toFixed(2)}</div>
              </div>
              <div style={{ background: 'var(--color-background-primary)', padding: '1rem', borderRadius: 16, border: '1px solid var(--color-border-secondary)' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: 4 }}>PATIENT PAID</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>${stats.patientPays.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content: History */}
        <div>
          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>Clinical History</h2>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{stats.totalEstimates} Total Records</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {patient.history.length === 0 ? (
              <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--color-background-secondary)', borderRadius: 24, border: '1px dashed var(--color-border-secondary)' }}>
                <div style={{ fontSize: 40, marginBottom: '1rem', opacity: 0.2 }}>📋</div>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 15 }}>No clinical records or estimates found for this patient.</p>
              </div>
            ) : (
              patient.history.map((item) => (
                <div 
                  key={item.id}
                  style={{ 
                    background: 'var(--color-background-secondary)', borderRadius: 20, padding: '1.25rem',
                    border: '1px solid var(--color-border-secondary)', display: 'grid',
                    gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'center',
                    transition: 'transform 0.2s, border-color 0.2s', cursor: 'default'
                  }}
                >
                  <div style={{ display: 'flex', gap: '1.25rem' }}>
                    <div style={{ 
                      width: 50, height: 50, borderRadius: 14, 
                      background: item.claim_risk === 'high' ? 'rgba(239, 68, 68, 0.1)' : item.claim_risk === 'medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: item.claim_risk === 'high' ? '#ef4444' : item.claim_risk === 'medium' ? '#f59e0b' : '#10b981'
                    }}>
                      {item.claim_risk === 'high' ? <AlertTriangle size={24} /> : item.claim_risk === 'medium' ? <Clock size={24} /> : <CheckCircle2 size={24} />}
                    </div>
                    
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 16, fontWeight: 700 }}>{item.cdt_code}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: item.claim_risk === 'high' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(var(--color-accent-rgb), 0.1)', color: item.claim_risk === 'high' ? '#ef4444' : 'var(--color-accent)', textTransform: 'uppercase' }}>
                          {item.claim_risk} Risk
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                        {new Date(item.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <p style={{ fontSize: 14, color: 'var(--color-text-primary)', margin: 0, opacity: 0.8, lineHeight: 1.5 }}>
                        {item.plain_explanation.length > 120 ? item.plain_explanation.substring(0, 120) + '...' : item.plain_explanation}
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                      ${item.insurer_pays?.toFixed(2) || '0.00'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600 }}>ESTIMATED COVERAGE</div>
                    
                    {(() => {
                      const letter = item.pre_auth_letter || (item as any).preAuthLetter || (item as any).PRE_AUTH_LETTER;
                      const formattedDate = new Date(item.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
                      
                      return letter ? (
                        <button 
                          onClick={() => {
                            setPdfMeta({ 
                              patientName: `${patient.first_name} ${patient.last_name}`, 
                              insurer: patient.insurance_plan_id || 'Insurer',
                              date: formattedDate
                            });
                            setShowPdfModal(letter);
                          }}
                          style={{ 
                            marginTop: 8, padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--color-accent)',
                            background: 'transparent', color: 'var(--color-accent)', fontSize: 12, fontWeight: 700,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            transition: 'all 0.2s'
                          }}
                        >
                          <FileText size={14} /> View Document
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontStyle: 'italic', marginTop: 8 }}>
                          No letter archived
                        </span>
                      )
                    })()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
