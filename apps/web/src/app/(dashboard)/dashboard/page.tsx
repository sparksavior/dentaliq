'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { estimateApi, patientsApi, clinicsApi, type EstimateResult, type CdtCodeSummary, type Patient, type ClinicLocation } from '@/lib/api'
import {
  LayoutDashboard, FileText, Activity, ShieldCheck, Users, Settings,
  ChevronLeft, Menu, CircleDollarSign, Search, LogOut, X, Bell, MessageSquare,
  Building2, ChevronDown, ChevronRight, UserCircle, PlusCircle
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

// ── Dummy Data for Overview ──
const revenueData = [
  { name: 'Jan', revenue: 24000 }, { name: 'Feb', revenue: 28000 },
  { name: 'Mar', revenue: 32000 }, { name: 'Apr', revenue: 38000 },
  { name: 'May', revenue: 42850 }, { name: 'Jun', revenue: 48000 }
]
const ageData = [
  { name: '0-18', value: 400 }, { name: '19-35', value: 300 },
  { name: '36-50', value: 300 }, { name: '51+', value: 200 }
]
const COLORS = ['#0f766e', '#14b8a6', '#5eead4', '#ccfbf1']

const recentActivity = [
  { patient: 'Sarah Jenkins', procedure: 'D2750 - Crown', amount: '$1,350', status: 'Pending', time: '10:42 AM' },
  { patient: 'Michael Chang', procedure: 'D1110 - Prophylaxis', amount: '$115', status: 'Approved', time: '09:15 AM' },
  { patient: 'Emma Watson', procedure: 'D6010 - Implant', amount: '$2,800', status: 'Pending', time: 'Yesterday' },
]

function KpiCard({ title, value, trend, highlight }: any) {
  return (
    <div style={{ background: highlight ? '#0f766e' : 'var(--color-background-secondary)', padding: '1.2rem', borderRadius: 12, border: '0.5px solid var(--color-border-tertiary)', color: highlight ? '#fff' : 'inherit' }}>
      <div style={{ fontSize: 13, color: highlight ? '#ccfbf1' : 'var(--color-text-secondary)', marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <div style={{ fontSize: 26, fontWeight: 600 }}>{value}</div>
        {trend && (
          <div style={{ fontSize: 12, fontWeight: 500, color: highlight ? '#5eead4' : (trend.startsWith('+') ? '#059669' : '#dc2626'), marginBottom: 4 }}>
            {trend}
          </div>
        )}
      </div>
    </div>
  )
}

function SidebarItem({ id, icon, label, active, onClick, collapsed }: any) {
  return (
    <div 
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: collapsed ? '10px' : '8px 12px', 
        borderRadius: 8, marginBottom: 4, cursor: 'pointer', fontSize: 13,
        background: active ? 'var(--color-background-secondary)' : 'transparent',
        color: active ? '#0f766e' : 'var(--color-text-primary)', 
        fontWeight: active ? 500 : 400,
        justifyContent: collapsed ? 'center' : 'flex-start'
      }}>
      {icon}
      {!collapsed && <span>{label}</span>}
    </div>
  )
}

function SearchableSelect({ 
  options, value, onChange, placeholder, selStyle 
}: {
  options: { label: string, value: string }[],
  value: string,
  onChange: (val: string) => void,
  placeholder: string,
  selStyle: React.CSSProperties
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  
  const selectedLabel = options.find(o => o.value === value)?.label || '';
  const displayValue = open ? query : selectedLabel;

  const filtered = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input 
        style={{ ...selStyle, boxSizing: 'border-box' }}
        placeholder={placeholder}
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setQuery(''); 
          setOpen(true);
        }}
        onBlur={() => {
          setTimeout(() => { setOpen(false); setQuery(''); }, 150);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Tab') {
            if (open && filtered.length > 0) {
              onChange(filtered[0].value);
              setOpen(false);
              setQuery('');
              if (e.key === 'Enter') e.preventDefault();
            }
          }
        }}
      />
      {open && (
        <div style={{ 
          position: 'absolute', top: '100%', left: 0, right: 0, 
          maxHeight: 200, overflowY: 'auto', 
          background: 'var(--color-background-primary)', 
          border: '0.5px solid var(--color-border-tertiary)', 
          borderRadius: 8, marginTop: 4, zIndex: 50,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--color-text-secondary)' }}>No matches</div>
          ) : filtered.map(o => (
            <div 
              key={o.value} 
              onMouseDown={(e) => e.preventDefault()} 
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              style={{ 
                padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                background: value === o.value ? 'var(--color-background-secondary)' : 'transparent',
                color: 'var(--color-text-primary)'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-background-secondary)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = value === o.value ? 'var(--color-background-secondary)' : 'transparent')}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Dashboard — Phase 2: real estimate API + CDT codes from service
// Falls back to hardcoded list if service is unavailable
// ─────────────────────────────────────────────────────────

const FALLBACK_CDT: CdtCodeSummary[] = [
  { code: 'D1110', description: 'Prophylaxis (adult)',              category: 'preventive', typicalFee: 115,  requiresPreAuth: false },
  { code: 'D1120', description: 'Prophylaxis (child)',              category: 'preventive', typicalFee: 80,   requiresPreAuth: false },
  { code: 'D2393', description: 'Composite resin — 3 surfaces',    category: 'basic',      typicalFee: 248,  requiresPreAuth: false },
  { code: 'D2750', description: 'Crown — porcelain fused to metal', category: 'major',     typicalFee: 1350, requiresPreAuth: true  },
  { code: 'D4341', description: 'Periodontal scaling',              category: 'basic',      typicalFee: 248,  requiresPreAuth: false },
  { code: 'D6010', description: 'Implant placement',               category: 'implant',    typicalFee: 2800, requiresPreAuth: true  },
  { code: 'D7140', description: 'Extraction — erupted tooth',      category: 'basic',      typicalFee: 155,  requiresPreAuth: false },
  { code: 'D8080', description: 'Orthodontics — adolescent',       category: 'ortho',      typicalFee: 5800, requiresPreAuth: true  },
]

const INSURERS = [
  'Sun Life Financial', 'Manulife', 'Canada Life', 'Green Shield Canada',
  'Desjardins', 'OTIP/RAEO', 'Empire Life',
]

const riskColor = { low: '#059669', medium: '#d97706', high: '#dc2626' }
const riskBg    = { low: '#d1fae5', medium: '#fef3c7', high: '#fee2e2' }
const riskText  = { low: '#065f46', medium: '#92400e', high: '#991b1b' }

export default function DashboardPage() {
  const { user, accessToken, clearSession } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<'overview' | 'estimates' | 'activity' | 'patients' | 'other' | 'clinics' | 'clinic-dashboard' | 'clinic-settings' | 'user-settings'>('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showWelcomePopup, setShowWelcomePopup] = useState(true)
  const [showTour, setShowTour] = useState(false)
  // Notification panel
  interface Notification { id: number; title: string; body: string; type: 'approval' | 'denial' | 'info' | 'warning'; time: Date; read: boolean }
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 1, title: 'Claim Approved', body: 'Sun Life approved claim D1110 for Emily Chen — $180 paid.', type: 'approval', time: new Date(Date.now() - 5 * 60000), read: false },
  ])
  const [showNotificationPanel, setShowNotificationPanel] = useState(false)

  // Clinics state
  const [clinics, setClinics] = useState<ClinicLocation[]>([])
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null)
  const [clinicsExpanded, setClinicsExpanded] = useState(true)
  const [clinicForm, setClinicForm] = useState<{name:string,address:string,phone:string,email:string,operatingHours:string}>({name:'',address:'',phone:'',email:'',operatingHours:''})
  const [showAddClinic, setShowAddClinic] = useState(false)
  const [clinicSaving, setClinicSaving] = useState(false)

  // User settings state
  const [userSettingsForm, setUserSettingsForm] = useState({ name: user?.name ?? '', email: user?.email ?? '' })
  const [userSettingsSaved, setUserSettingsSaved] = useState(false)

  // AI Chat State
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<{role: string, content: string}[]>([
    { role: 'assistant', content: "Hi! I'm your DentalIQ Copilot. I have analyzed your dashboard and patient data. How can I help you today?" }
  ])

  useEffect(() => {
    if (searchParams.get('tour') === 'true') {
      setShowTour(true)
      setShowWelcomePopup(false)
    }
  }, [searchParams])
  const [cdtCodes, setCdtCodes]   = useState<CdtCodeSummary[]>(FALLBACK_CDT)
  const [cdt, setCdt]             = useState('D1110')
  const [insurer, setInsurer]     = useState('Sun Life Financial')
  const [result, setResult]       = useState<EstimateResult | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [liveMode, setLiveMode]   = useState(false)
  const [patients, setPatients]   = useState<Patient[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  
  // Patient Form State
  const [showPatientForm, setShowPatientForm] = useState(false)
  const [newPatient, setNewPatient] = useState({ firstName: '', lastName: '', dateOfBirth: '', phone: '', insuranceProvider: 'Sun Life Financial' })

  // Patient Directory State
  const [patientSearchQuery, setPatientSearchQuery] = useState('')
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null)

  // Narrative State
  const [narrativeText, setNarrativeText] = useState<string | null>(null)
  const [narrativeLoading, setNarrativeLoading] = useState(false)

  // Load Patients
  // Simulated live notifications
  const SIMULATED_NOTIFS: Omit<Notification, 'id' | 'time' | 'read'>[] = [
    { title: 'Claim Denied', body: 'Manulife denied claim D2750 for Michael R. — reason: missing pre-auth.', type: 'denial' },
    { title: 'Claim Approved', body: 'Great-West Life approved D0330 for Sarah K. — $220 paid.', type: 'approval' },
    { title: 'Pre-Auth Required', body: 'D6010 for James T. requires pre-authorization before submission.', type: 'warning' },
    { title: 'Claim Approved', body: 'Sun Life approved D2391 for Priya M. — $95 paid.', type: 'approval' },
    { title: 'Action Needed', body: 'Annual maximum reached for David L. — patient responsible for remaining balance.', type: 'warning' },
  ]
  const simIdx = useRef(0)
  useEffect(() => {
    const interval = setInterval(() => {
      const notif = SIMULATED_NOTIFS[simIdx.current % SIMULATED_NOTIFS.length]
      simIdx.current += 1
      setNotifications(prev => [{ ...notif, id: Date.now(), time: new Date(), read: false }, ...prev])
    }, 25000)
    return () => clearInterval(interval)
  }, [])
  const unreadCount = notifications.filter(n => !n.read).length
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })))

  const loadPatients = useCallback(async () => {
    if (!accessToken) return
    try {
      const result = await patientsApi.getPatients(accessToken)
      setPatients(result)
    } catch (err) {
      console.error('Failed to load patients', err)
    }
  }, [accessToken])

  const loadClinics = useCallback(async () => {
    if (!accessToken) return
    try {
      const result = await clinicsApi.list(accessToken)
      setClinics(result)
    } catch (err) {
      console.error('Failed to load clinics', err)
    }
  }, [accessToken])

  const saveClinicSettings = async (clinic: ClinicLocation) => {
    if (!accessToken) return
    setClinicSaving(true)
    try {
      await clinicsApi.update(accessToken, clinic.id, {
        name: clinicForm.name || clinic.name,
        address: clinicForm.address || clinic.address,
        phone: clinicForm.phone || clinic.phone,
        email: clinicForm.email || clinic.email,
        operatingHours: clinicForm.operatingHours || clinic.operating_hours,
      })
      await loadClinics()
    } catch (err) { console.error(err) } finally { setClinicSaving(false) }
  }

  const addClinic = async () => {
    if (!accessToken || !clinicForm.name) return
    setClinicSaving(true)
    try {
      await clinicsApi.create(accessToken, clinicForm)
      setShowAddClinic(false)
      setClinicForm({name:'',address:'',phone:'',email:'',operatingHours:''})
      await loadClinics()
    } catch (err) { console.error(err) } finally { setClinicSaving(false) }
  }

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = { role: 'user', content: chatInput }
    setChatMessages(prev => [...prev, userMsg])
    setChatInput('')
    setChatLoading(true)

    try {
      // Fetch live clinic context from the backend (best-effort — never crash the chat)
      let contextData: any = null
      if (accessToken) {
        try {
          const ctxRes = await fetch(
            `${process.env.NEXT_PUBLIC_TENANT_URL ?? 'http://localhost:3002'}/patients/ai-context`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          )
          if (ctxRes.ok) {
            const ctxJson = await ctxRes.json()
            contextData = ctxJson.data ?? ctxJson
          }
        } catch (_) { /* ignore — Ollama will just have no context */ }
      }

      const systemPrompt = `You are DentalIQ Copilot, a helpful AI assistant embedded inside a dental clinic management app.
The logged-in user is: ${user?.name ?? 'the doctor'}.

Here is the LIVE clinic data you have full access to — answer ALL questions strictly based on this:

${contextData ? JSON.stringify(contextData, null, 2) : 'No data available at this time.'}

Navigation guide for the app:
- Patient records → "Patient Directory" tab in the sidebar
- Insurance claims & estimates → "Claim Risk Estimator" or "Activity Logs" tab
- Clinic settings → "Clinic Settings" tab

Rules:
1. If the data above contains the answer, state it clearly and concisely.
2. If the user asks about something NOT in the data (e.g. clinical notes, billing address), say: "I don't have access to that information at this time."
3. Keep answers short, professional, and conversational.
4. Never make up data that is not in the context above.`

      const res = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'phi3',
          messages: [
            { role: 'system', content: systemPrompt },
            ...chatMessages,
            userMsg,
          ],
          stream: false,
        }),
      })
      const data = await res.json()
      setChatMessages(prev => [...prev, data.message])
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I cannot reach the AI engine right now. Make sure Ollama is running.' }])
    } finally {
      setChatLoading(false)
    }
  }

  // Load CDT codes from estimate service on mount
  useEffect(() => {
    if (!accessToken) return
    estimateApi.getCodes(accessToken)
      .then((codes) => {
        setCdtCodes(codes)
        setLiveMode(true)
      })
      .catch(() => {
        // Service not running yet — stay on fallback list silently
      })
    loadPatients()
    loadClinics()
  }, [accessToken, loadPatients, loadClinics])

  const runEstimate = useCallback(async () => {
    setLoading(true)
    setResult(null)
    setError(null)

    if (!accessToken || !liveMode) {
      // Fallback to static lookup while service is starting
      setTimeout(() => {
        const found = FALLBACK_CDT.find((c) => c.code === cdt)
        if (found) {
          setResult({
            id: 'static',
            cdtCode: found.code,
            coveragePercent: found.category === 'preventive' ? 100 : found.category === 'basic' ? 80 : found.category === 'major' ? 50 : 0,
            patientCost: Math.round(found.typicalFee * (found.category === 'preventive' ? 0 : found.category === 'basic' ? 0.2 : found.category === 'major' ? 0.5 : 1)),
            insurerPays: Math.round(found.typicalFee * (found.category === 'preventive' ? 1 : found.category === 'basic' ? 0.8 : found.category === 'major' ? 0.5 : 0)),
            plainExplanation: '(Start the estimate service to get AI-powered explanations)',
            claimRisk: found.requiresPreAuth ? 'medium' : 'low',
            riskReasons: found.requiresPreAuth ? ['Pre-authorization required'] : [],
            confidenceScore: 0.6,
          })
        }
        setLoading(false)
      }, 300)
      return
    }

    try {
      // Calculate age if a patient is selected and has a DOB
      let age: number | undefined = undefined;
      if (selectedPatientId) {
        const p = patients.find(p => p.id === selectedPatientId);
        if (p && p.date_of_birth) {
          const dob = new Date(p.date_of_birth);
          const diff_ms = Date.now() - dob.getTime();
          age = Math.abs(new Date(diff_ms).getUTCFullYear() - 1970);
        }
      }

      const data = await estimateApi.runEstimate(accessToken, {
        cdtCode: cdt,
        insurerName: insurer,
        patientId: selectedPatientId || undefined,
        patientAge: age,
      })
      setResult(data)
      setNarrativeText(null) // Reset narrative on new estimate
    } catch (err: any) {
      setError(err.message ?? 'Estimate failed')
    } finally {
      setLoading(false)
    }
  }, [accessToken, liveMode, cdt, insurer, selectedPatientId, patients])

  const generateNarrative = async () => {
    if (!accessToken || !result) return
    setNarrativeLoading(true)
    try {
      const p = patients.find(p => p.id === selectedPatientId)
      const patientName = p ? `${p.first_name} ${p.last_name}` : undefined
      const text = await estimateApi.generateNarrative(accessToken, {
        cdtCode: result.cdtCode,
        insurerName: insurer,
        patientName,
      })
      setNarrativeText(text)
    } catch (err: any) {
      alert('Failed to generate narrative: ' + (err.message || 'Unknown error'))
    } finally {
      setNarrativeLoading(false)
    }
  }

  const sel = {
    width: '100%', padding: '10px 12px',
    border: '0.5px solid var(--color-border-secondary)',
    borderRadius: 8, fontSize: 14,
    background: 'var(--color-background-primary)',
    color: 'var(--color-text-primary)',
  }

  const DAILY_SMILES = [
    "Another day, another beautiful smile restored. Let's make today great!",
    "Your patients are lucky to have you. Have a fantastic day at the clinic!",
    "Ready to tackle those claims? You've got this, Doctor!",
    "Coffee: checked. DentalIQ: checked. Time to save some teeth!",
    "Bringing confidence back, one patient at a time. Have a wonderful day!"
  ]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background-primary)', fontFamily: 'system-ui' }}>
      
      {/* AI Chat Button & Window */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
        {isChatOpen ? (
          <div style={{ width: 360, height: 500, background: 'var(--color-background-primary)', borderRadius: 16, border: '0.5px solid var(--color-border-tertiary)', boxShadow: '0 12px 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ background: '#0f766e', padding: '16px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}><MessageSquare size={18} fill="#fff" /> DentalIQ Copilot</div>
              <button onClick={() => setIsChatOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}><X size={20} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', background: msg.role === 'user' ? '#0f766e' : 'var(--color-background-secondary)', color: msg.role === 'user' ? '#fff' : 'var(--color-text-primary)', padding: '10px 14px', borderRadius: 12, maxWidth: '85%', fontSize: 13, lineHeight: 1.5, border: msg.role === 'user' ? 'none' : '0.5px solid var(--color-border-tertiary)' }}>
                  {msg.content}
                </div>
              ))}
              {chatLoading && (
                <div style={{ alignSelf: 'flex-start', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', padding: '10px 14px', borderRadius: 12, fontSize: 13, color: 'var(--color-text-secondary)', display: 'flex', gap: 6 }}>
                  <div className="h-4 w-4 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" /> Thinking...
                </div>
              )}
            </div>
            <div style={{ padding: 12, borderTop: '0.5px solid var(--color-border-tertiary)', display: 'flex', gap: 8, background: 'var(--color-background-primary)' }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendChat()} placeholder="Ask about patients, revenue..." style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', fontSize: 13, outline: 'none' }} />
              <button onClick={handleSendChat} disabled={chatLoading || !chatInput} style={{ background: '#0f766e', color: '#fff', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: (chatLoading || !chatInput) ? 0.5 : 1 }}>
                <MessageSquare size={16} />
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setIsChatOpen(true)} style={{ background: '#0f766e', color: '#fff', border: 'none', borderRadius: '50%', width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 24px rgba(15, 118, 110, 0.4)', transition: 'transform 0.2s', animation: 'bounce 2s infinite' }} onMouseEnter={e => e.currentTarget.style.animation = 'none', e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            <MessageSquare size={24} fill="#fff" />
          </button>
        )}
      </div>

      {/* Tour Popup for New Accounts */}
      {showTour && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, animation: 'fadeIn 0.3s ease' }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: '3rem', width: 500, position: 'relative', textAlign: 'center', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 1.5rem', boxShadow: '0 4px 20px rgba(15, 118, 110, 0.2)' }}>
              🚀
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 600, color: '#111827', marginBottom: 12, letterSpacing: '-0.02em' }}>Welcome to DentalIQ!</h2>
            <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.6, marginBottom: '2.5rem', padding: '0 1rem' }}>
              You're officially set up. Our AI is now connected to your clinic(s). 
              <br/><br/>
              From this dashboard, you can view real-time estimates, run AI pre-auth analyses, and manage your patients seamlessly.
            </p>
            
            <button onClick={() => { setShowTour(false); router.replace('/dashboard') }} style={{ width: '100%', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 16, fontWeight: 500, cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 12px rgba(15, 118, 110, 0.2)' }}>
              Explore your Dashboard
            </button>
          </div>
        </div>
      )}
      
      {/* Welcome Popup */}
      {showWelcomePopup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, animation: 'fadeIn 0.3s ease' }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: '2.5rem', width: 440, boxShadow: '0 24px 48px rgba(0,0,0,0.15)', position: 'relative' }}>
            <button onClick={() => setShowWelcomePopup(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4, borderRadius: '50%', display: 'flex' }}>
              <X size={20} />
            </button>
            
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ccfbf1', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 1.2rem', boxShadow: '0 4px 12px rgba(15, 118, 110, 0.1)' }}>
                ☀️
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 600, color: '#111827', marginBottom: 8, letterSpacing: '-0.02em' }}>
                {greeting}, {user?.name?.split(' ')[0] || 'Doctor'}!
              </h2>
              <p style={{ fontSize: 14, color: '#4b5563', fontStyle: 'italic', lineHeight: 1.5, padding: '0 1rem' }}>
                "{DAILY_SMILES[Math.floor(Math.random() * DAILY_SMILES.length)]}"
              </p>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 16, padding: '1.5rem', marginBottom: '2rem', border: '0.5px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Since your last login</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 600, color: '#059669', letterSpacing: '-0.02em' }}>+12</div>
                  <div style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>New Approvals</div>
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 600, color: '#dc2626', letterSpacing: '-0.02em' }}>2</div>
                  <div style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Action Needed</div>
                </div>
                <div style={{ gridColumn: 'span 2', borderTop: '0.5px solid #e2e8f0', paddingTop: 16, marginTop: 4 }}>
                  <div style={{ fontSize: 32, fontWeight: 600, color: '#0f766e', letterSpacing: '-0.02em' }}>$4,250</div>
                  <div style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Revenue Earned</div>
                </div>
              </div>
            </div>

            <button onClick={() => setShowWelcomePopup(false)} style={{ width: '100%', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 500, cursor: 'pointer', transition: 'background 0.2s, transform 0.1s', boxShadow: '0 4px 12px rgba(15, 118, 110, 0.2)' }}>
              Let's get started
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1.5rem', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 13, fontFamily: 'monospace' }}>+</span>
          </div>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>DentalIQ</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginLeft: 4 }}>/ {user?.tenantId?.slice(0, 8)}…</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setShowNotificationPanel(p => !p); markAllRead() }}
              style={{ position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', padding: 4 }}>
              <Bell size={20} />
              {unreadCount > 0 && (
                <div style={{ position: 'absolute', top: -2, right: -2, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'bounce 0.5s' }}>
                  {unreadCount}
                </div>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotificationPanel && (
              <div style={{ position: 'absolute', top: 36, right: 0, width: 340, background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.15)', zIndex: 9000, overflow: 'hidden', animation: 'fadeIn 0.15s ease' }}>
                <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>Notifications</span>
                  <button onClick={markAllRead} style={{ fontSize: 12, color: '#0f766e', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Mark all read</button>
                </div>
                <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>All caught up! No notifications.</div>
                  ) : notifications.map(n => (
                    <div key={n.id} style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--color-border-tertiary)', background: n.read ? 'transparent' : 'rgba(15,118,110,0.04)', display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'default' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                        background: n.type === 'approval' ? 'rgba(16,185,129,0.1)' : n.type === 'denial' ? 'rgba(239,68,68,0.1)' : n.type === 'warning' ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)' }}>
                        {n.type === 'approval' ? '✅' : n.type === 'denial' ? '❌' : n.type === 'warning' ? '⚠️' : 'ℹ️'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>{n.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{n.body}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4, opacity: 0.7 }}>
                          {Math.round((Date.now() - n.time.getTime()) / 60000)} min ago
                        </div>
                      </div>
                      {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0f766e', flexShrink: 0, marginTop: 4 }} />}
                    </div>
                  ))}
                </div>
                <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--color-border-tertiary)', textAlign: 'center' }}>
                  <button onClick={() => setNotifications([])} style={{ fontSize: 12, color: 'var(--color-text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}>Clear all</button>
                </div>
              </div>
            )}
          </div>
          <div style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 20,
            background: liveMode ? '#d1fae5' : '#fef3c7',
            color: liveMode ? '#065f46' : '#92400e',
          }}>
            {liveMode ? 'Phase 2 Live' : 'Phase 1 Fallback'}
          </div>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff' }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 53px)' }}>
        {/* Sidebar */}
        <div style={{ 
          width: sidebarCollapsed ? 68 : 240, 
          transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)', 
          borderRight: '0.5px solid var(--color-border-tertiary)', 
          padding: '1rem',
          display: 'flex', flexDirection: 'column',
          flexShrink: 0,
          height: '100%',
          overflowY: 'auto'
        }}>
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-end', color: 'var(--color-text-secondary)' }}>
            {sidebarCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
          </button>
          
          {/* Main */}
          {!sidebarCollapsed && <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 8, marginTop: 8 }}>Main</div>}
          <SidebarItem id="overview" icon={<LayoutDashboard size={18} />} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} collapsed={sidebarCollapsed} />
          <SidebarItem id="estimates" icon={<CircleDollarSign size={18} />} label="Cost Estimator" active={activeTab === 'estimates'} onClick={() => setActiveTab('estimates')} collapsed={sidebarCollapsed} />
          
          {/* Operations */}
          {!sidebarCollapsed && <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 8, marginTop: 16 }}>Operations</div>}
          <SidebarItem id="activity" icon={<Activity size={18} />} label="Activity Logs" active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} collapsed={sidebarCollapsed} />
          <SidebarItem id="claims" icon={<ShieldCheck size={18} />} label="Claim Risk & Pre-auth" active={activeTab === 'other'} onClick={() => setActiveTab('other')} collapsed={sidebarCollapsed} />
          <SidebarItem id="patients" icon={<Users size={18} />} label="Patient Directory" active={activeTab === 'patients'} onClick={() => setActiveTab('patients')} collapsed={sidebarCollapsed} />
          
          {/* Clinics */}
          {!sidebarCollapsed && <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 8, marginTop: 16 }}>Clinics</div>}
          <button onClick={() => { setActiveTab('clinics'); setSelectedClinicId(null) }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, background: activeTab === 'clinics' && !selectedClinicId ? 'var(--color-background-secondary)' : 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-primary)', fontSize: 13, fontWeight: 500, marginBottom: 2, justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
            <Building2 size={18} style={{ flexShrink: 0 }} />
            {!sidebarCollapsed && <><span style={{ flex: 1, textAlign: 'left' }}>All Clinics</span>
            <div onClick={(e) => { e.stopPropagation(); setClinicsExpanded(x => !x) }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', padding: 0 }}>
              {clinicsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div></>}
          </button>

          {/* Per-clinic sub-items */}
          {!sidebarCollapsed && clinicsExpanded && clinics.map(clinic => (
            <div key={clinic.id} style={{ marginLeft: 16, borderLeft: '1px solid var(--color-border-tertiary)', paddingLeft: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', padding: '4px 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                📍 {clinic.name}
              </div>
              <button onClick={() => { setSelectedClinicId(clinic.id); setActiveTab('clinic-dashboard'); setClinicForm({ name: clinic.name, address: clinic.address ?? '', phone: clinic.phone ?? '', email: clinic.email ?? '', operatingHours: clinic.operating_hours ?? '' }) }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '5px 8px', borderRadius: 6, background: selectedClinicId === clinic.id && activeTab === 'clinic-dashboard' ? 'rgba(15,118,110,0.1)' : 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, color: selectedClinicId === clinic.id && activeTab === 'clinic-dashboard' ? '#0f766e' : 'var(--color-text-secondary)' }}>
                Dashboard
              </button>
              <button onClick={() => { setSelectedClinicId(clinic.id); setActiveTab('clinic-settings'); setClinicForm({ name: clinic.name, address: clinic.address ?? '', phone: clinic.phone ?? '', email: clinic.email ?? '', operatingHours: clinic.operating_hours ?? '' }) }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '5px 8px', borderRadius: 6, background: selectedClinicId === clinic.id && activeTab === 'clinic-settings' ? 'rgba(15,118,110,0.1)' : 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, color: selectedClinicId === clinic.id && activeTab === 'clinic-settings' ? '#0f766e' : 'var(--color-text-secondary)' }}>
                Settings
              </button>
            </div>
          ))}

          {!sidebarCollapsed && clinicsExpanded && (
            <button onClick={() => setShowAddClinic(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 16, padding: '5px 8px', borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, color: '#0f766e', fontWeight: 500 }}>
              <PlusCircle size={13} /> Add Location
            </button>
          )}

          {/* System */}
          {!sidebarCollapsed && <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 8, marginTop: 16 }}>System</div>}
          <SidebarItem id="settings" icon={<Settings size={18} />} label="Clinic Settings" active={activeTab === 'other'} onClick={() => setActiveTab('other')} collapsed={sidebarCollapsed} />
          <SidebarItem id="user-settings" icon={<UserCircle size={18} />} label="User Settings" active={activeTab === 'user-settings'} onClick={() => setActiveTab('user-settings')} collapsed={sidebarCollapsed} />
          
          <div style={{ flexGrow: 1 }} />
          
          {/* User & Logout Footer */}
          <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: 16, marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between' }}>
            {!sidebarCollapsed && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#0f766e', fontWeight: 600, flexShrink: 0 }}>
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.role?.replace('_', ' ')}</div>
                </div>
              </div>
            )}
            <button 
              onClick={clearSession}
              title="Sign Out"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 6, transition: 'background 0.2s, color 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Main panel */}
        <div style={{ padding: '1.5rem', flex: 1, overflowX: 'hidden', overflowY: 'auto' }}>
          {/* ── Overview tab ── */}
          {activeTab === 'overview' && (
            <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
              <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>Dashboard Overview</h2>
              
              {/* KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: '1.5rem' }}>
                <KpiCard title="Active Clinics" value="3" trend="+1" />
                <KpiCard title="Pending Approvals" value="24" trend="-5%" />
                <KpiCard title="Estimates Run" value="1,482" trend="+12%" />
                <KpiCard title="Total Doctors" value="12" />
                <KpiCard title="Total Patients" value="8,204" trend="+4%" />
                <KpiCard title="Revenue Recovered" value="$42,850" trend="+18%" highlight />
              </div>

              {/* Charts Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: '1.5rem' }}>
                <div style={{ background: 'var(--color-background-secondary)', padding: '1.5rem', borderRadius: 12, border: '0.5px solid var(--color-border-tertiary)' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: '1rem' }}>Revenue Over Time</h3>
                  <div style={{ height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0f766e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#0f766e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-tertiary)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} tickFormatter={(val) => `$${val/1000}k`} />
                        <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Area type="monotone" dataKey="revenue" stroke="#0f766e" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div style={{ background: 'var(--color-background-secondary)', padding: '1.5rem', borderRadius: 12, border: '0.5px solid var(--color-border-tertiary)', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: '2rem' }}>Patient Demographics</h3>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flex: 1, padding: '0 1rem' }}>
                    
                    {/* Kids */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#5eead4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <g transform="scale(0.8) translate(3, 6)">
                          <circle cx="12" cy="7" r="4" />
                          <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                        </g>
                      </svg>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Ages 0-17</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>28% (400)</div>
                      </div>
                    </div>

                    {/* Adults */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="7" r="4" />
                        <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                      </svg>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Ages 18-50</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>42% (600)</div>
                      </div>
                    </div>

                    {/* Seniors */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="10" cy="7" r="4" />
                        <path d="M5 21v-2a4 4 0 0 1 3-3.8h3a4 4 0 0 1 3.5 2.5L16 21" />
                        <path d="M19 21V11a2 2 0 0 0-4 0" />
                      </svg>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Ages 50+</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>30% (200)</div>
                      </div>
                    </div>

                  </div>
                  
                  {/* Horizontal Distribution Bar */}
                  <div style={{ display: 'flex', width: '100%', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: '2.5rem' }}>
                    <div style={{ background: '#5eead4', width: '28%' }}></div>
                    <div style={{ background: '#14b8a6', width: '42%' }}></div>
                    <div style={{ background: '#0f766e', width: '30%' }}></div>
                  </div>
                </div>
              </div>

              {/* Bottom Row */}
              <div style={{ background: 'var(--color-background-secondary)', padding: '1.5rem', borderRadius: 12, border: '0.5px solid var(--color-border-tertiary)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: '1rem' }}>Recent Claims Activity</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                  <thead style={{ borderBottom: '0.5px solid var(--color-border-tertiary)', color: 'var(--color-text-secondary)' }}>
                    <tr>
                      <th style={{ paddingBottom: 8, fontWeight: 500 }}>Patient</th>
                      <th style={{ paddingBottom: 8, fontWeight: 500 }}>Procedure</th>
                      <th style={{ paddingBottom: 8, fontWeight: 500 }}>Amount</th>
                      <th style={{ paddingBottom: 8, fontWeight: 500 }}>Status</th>
                      <th style={{ paddingBottom: 8, fontWeight: 500, textAlign: 'right' }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map((act, i) => (
                      <tr 
                        key={i} 
                        style={{ borderBottom: i === recentActivity.length - 1 ? 'none' : '0.5px solid var(--color-border-tertiary)', cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-background-secondary)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        onClick={() => {
                          const existingPat = patients.find(p => `${p.first_name} ${p.last_name}` === act.patient)
                          if (existingPat) {
                            setViewingPatient(existingPat)
                          } else {
                            setViewingPatient({
                              id: `dummy-${i}`,
                              first_name: act.patient.split(' ')[0],
                              last_name: act.patient.split(' ')[1] || '',
                              date_of_birth: '1985-06-15',
                              tenant_id: 'dummy',
                              insurance_plan_id: 'Sun Life Financial',
                              phone: '(555) 123-4567'
                            } as Patient)
                          }
                          setActiveTab('patients')
                        }}
                      >
                        <td style={{ padding: '12px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontWeight: 500, fontSize: 11 }}>
                              {act.patient.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                            <span style={{ color: '#0f766e', fontWeight: 500 }}>{act.patient}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 0', color: 'var(--color-text-secondary)' }}>{act.procedure}</td>
                        <td style={{ padding: '12px 0', color: 'var(--color-text-primary)', fontWeight: 500 }}>{act.amount}</td>
                        <td style={{ padding: '12px 0' }}>
                          <span style={{ padding: '4px 8px', borderRadius: 12, fontSize: 11, background: act.status === 'Approved' ? '#d1fae5' : '#fef3c7', color: act.status === 'Approved' ? '#065f46' : '#92400e' }}>
                            {act.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 0', textAlign: 'right', color: 'var(--color-text-secondary)' }}>{act.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* ── Estimates tab ── */}
          {activeTab === 'estimates' && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: '0.4rem', color: 'var(--color-text-primary)' }}>Real-time cost estimator</h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: '1.2rem' }}>
                {liveMode
                  ? `${cdtCodes.length} CDT codes loaded · LLM-powered explanations via POST /estimate`
                  : 'Estimate service offline — showing rule-based fallback'}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Patient (Optional)</label>
                  <SearchableSelect 
                    options={[
                      { label: '-- No Patient --', value: '' },
                      ...patients.map(p => ({ label: `${p.first_name} ${p.last_name}`, value: p.id }))
                    ]} 
                    value={selectedPatientId} 
                    onChange={(val) => {
                      setSelectedPatientId(val)
                      const p = patients.find(p => p.id === val)
                      if (p && p.insurance_plan_id) setInsurer(p.insurance_plan_id)
                    }} 
                    placeholder="Search patient..." 
                    selStyle={sel} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>CDT procedure code</label>
                  <SearchableSelect 
                    options={cdtCodes.map(c => ({ label: `${c.code} — ${c.description}`, value: c.code }))} 
                    value={cdt} 
                    onChange={(val) => setCdt(val)} 
                    placeholder="Search procedure..." 
                    selStyle={sel} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Insurance provider</label>
                  <SearchableSelect 
                    options={INSURERS.map(ins => ({ label: ins, value: ins }))} 
                    value={insurer} 
                    onChange={(val) => setInsurer(val)} 
                    placeholder="Search provider..." 
                    selStyle={sel} 
                  />
                </div>
              </div>

              <button onClick={runEstimate} disabled={loading}
                style={{ background: loading ? '#6b7280' : '#0f766e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, cursor: 'pointer', marginBottom: '1.2rem', transition: 'background 0.2s' }}>
                {loading ? 'Calculating…' : 'Run estimate →'}
              </button>

              {error && (
                <div style={{ background: '#fee2e2', border: '0.5px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#991b1b', marginBottom: '1rem' }}>
                  {error}
                </div>
              )}

              {result && (
                <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: '1.2rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '1rem' }}>
                    <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Coverage</div>
                      <div style={{ fontSize: 24, fontWeight: 500, color: '#0f766e' }}>{result.coveragePercent}%</div>
                    </div>
                    <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Patient pays</div>
                      <div style={{ fontSize: 24, fontWeight: 500, color: 'var(--color-text-primary)' }}>${result.patientCost.toLocaleString()}</div>
                    </div>
                    <div style={{ background: riskBg[result.claimRisk], borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, color: riskText[result.claimRisk], marginBottom: 4 }}>Claim risk</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: riskColor[result.claimRisk], textTransform: 'capitalize' }}>{result.claimRisk}</div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '12px', marginBottom: result.riskReasons.length > 0 ? '0.8rem' : 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Plain-language explanation for patient</div>
                    <div style={{ fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.55 }}>{result.plainExplanation}</div>
                  </div>

                  {result.riskReasons.length > 0 && (
                    <div style={{ background: '#fffbeb', border: '0.5px solid #fcd34d', borderRadius: 8, padding: '10px 12px', marginBottom: '1rem' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#92400e', marginBottom: 6 }}>Claim risk checklist</div>
                      {result.riskReasons.map((r, i) => (
                        <div key={i} style={{ fontSize: 12, color: '#78350f', marginBottom: 3, paddingLeft: 12, position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 0 }}>·</span>{r}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AI Narrative Section */}
                  <div style={{ marginTop: '1rem', borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: narrativeText ? '1rem' : 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Pre-authorization Narrative</span>
                      {!narrativeText && (
                        <button 
                          onClick={generateNarrative} 
                          disabled={narrativeLoading}
                          style={{ background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
                          {narrativeLoading ? 'Generating...' : '✨ Draft with AI'}
                        </button>
                      )}
                    </div>
                    
                    {narrativeText && (
                      <div>
                        <textarea 
                          value={narrativeText}
                          onChange={(e) => setNarrativeText(e.target.value)}
                          style={{ width: '100%', height: '180px', padding: '12px', borderRadius: 8, border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5 }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(narrativeText);
                              alert('Copied to clipboard!');
                            }}
                            style={{ background: '#0f766e', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
                            Copy to Clipboard
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Activity tab ── */}
          {activeTab === 'activity' && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: '1.2rem', color: 'var(--color-text-primary)' }}>Recent activity</h2>
              {[
                { time: '2m ago',  action: 'Cost estimate generated', patient: 'P-3821', code: 'D1110', result: '$0 — Fully covered' },
                { time: '8m ago',  action: 'Claim risk flagged',       patient: 'P-3820', code: 'D2750', result: 'Missing X-ray ref' },
                { time: '15m ago', action: 'Pre-auth drafted',         patient: 'P-3819', code: 'D6010', result: 'Sent to Sun Life' },
                { time: '1h ago',  action: 'Cost estimate generated',  patient: 'P-3818', code: 'D2393', result: '$50 — 80% covered' },
              ].map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', width: 50, flexShrink: 0 }}>{a.time}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--color-text-primary)', marginBottom: 2 }}>{a.action}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{a.patient} · {a.code}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'right' }}>{a.result}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Patients tab ── */}
          {activeTab === 'patients' && (
            <div>
              {viewingPatient ? (
                <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                  <button onClick={() => setViewingPatient(null)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ChevronLeft size={16} /> Back to Directory
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: '2rem' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#0f766e', color: '#fff', fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {viewingPatient.first_name[0]}{viewingPatient.last_name[0]}
                    </div>
                    <div>
                      <h2 style={{ fontSize: 28, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>{viewingPatient.first_name} {viewingPatient.last_name}</h2>
                      <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
                        Age: {(() => {
                           if (!viewingPatient.date_of_birth) return 'Unknown';
                           const diff = Date.now() - new Date(viewingPatient.date_of_birth).getTime();
                           return Math.abs(new Date(diff).getUTCFullYear() - 1970);
                        })()} • Phone: {viewingPatient.phone || '—'} • Insurance: {viewingPatient.insurance_plan_id || 'None'}
                      </div>
                    </div>
                  </div>

                  {/* Info Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: '2rem' }}>
                    <KpiCard title="Address" value="123 Main St, Toronto" />
                    <KpiCard title="Last Visit" value="Oct 12, 2023" />
                    <KpiCard title="Last Submission" value="Oct 14, 2023" />
                    <div style={{ background: 'var(--color-background-secondary)', padding: '1.2rem', borderRadius: 12, border: '0.5px solid var(--color-border-tertiary)' }}>
                      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Status</div>
                      <div style={{ display: 'inline-block', padding: '6px 12px', background: '#fef3c7', color: '#92400e', borderRadius: 20, fontSize: 13, fontWeight: 500 }}>Pending Review</div>
                    </div>
                  </div>

                  {/* History Log */}
                  <div style={{ background: 'var(--color-background-secondary)', padding: '1.5rem', borderRadius: 12, border: '0.5px solid var(--color-border-tertiary)' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: '1rem' }}>Treatment & Claims History</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                      <thead style={{ borderBottom: '0.5px solid var(--color-border-tertiary)', color: 'var(--color-text-secondary)' }}>
                        <tr>
                          <th style={{ paddingBottom: 8, fontWeight: 500 }}>Date</th>
                          <th style={{ paddingBottom: 8, fontWeight: 500 }}>Procedure</th>
                          <th style={{ paddingBottom: 8, fontWeight: 500 }}>Provider</th>
                          <th style={{ paddingBottom: 8, fontWeight: 500 }}>Claim Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                          <td style={{ padding: '12px 0', color: 'var(--color-text-primary)' }}>Oct 12, 2023</td>
                          <td style={{ padding: '12px 0', color: 'var(--color-text-secondary)' }}>D2750 - Crown</td>
                          <td style={{ padding: '12px 0', color: 'var(--color-text-secondary)' }}>Dr. Sarah Chen</td>
                          <td style={{ padding: '12px 0', color: '#92400e' }}>Pending Review</td>
                        </tr>
                        <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                          <td style={{ padding: '12px 0', color: 'var(--color-text-primary)' }}>Mar 04, 2023</td>
                          <td style={{ padding: '12px 0', color: 'var(--color-text-secondary)' }}>D1110 - Prophylaxis</td>
                          <td style={{ padding: '12px 0', color: 'var(--color-text-secondary)' }}>Hygienist Mike</td>
                          <td style={{ padding: '12px 0', color: '#059669' }}>Approved</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '12px 0', color: 'var(--color-text-primary)' }}>Sep 15, 2022</td>
                          <td style={{ padding: '12px 0', color: 'var(--color-text-secondary)' }}>D0120 - Exam</td>
                          <td style={{ padding: '12px 0', color: 'var(--color-text-secondary)' }}>Dr. Sarah Chen</td>
                          <td style={{ padding: '12px 0', color: '#059669' }}>Approved</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                    <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-text-primary)' }}>Patient Directory</h2>
                    <button 
                      onClick={() => setShowPatientForm(true)}
                      style={{ background: '#0f766e', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
                      + New Patient
                    </button>
                  </div>

                  {/* Big Search Bar */}
                  <div style={{ position: 'relative', marginBottom: '1.5rem', width: '100%' }}>
                    <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }}>
                      <Search size={20} />
                    </div>
                    <input 
                      placeholder="Search patients by name or phone..."
                      value={patientSearchQuery}
                      onChange={e => setPatientSearchQuery(e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '16px 16px 16px 48px', 
                        fontSize: 16, 
                        borderRadius: 12, 
                        border: '1px solid var(--color-border-secondary)', 
                        background: 'var(--color-background-secondary)',
                        color: 'var(--color-text-primary)',
                        outline: 'none',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#0f766e'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--color-border-secondary)'}
                    />
                  </div>

              {showPatientForm && (
                <div style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, padding: '1.2rem', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: '1rem' }}>Add New Patient</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>First Name</label>
                      <input style={sel} value={newPatient.firstName} onChange={e => setNewPatient({...newPatient, firstName: e.target.value})} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Last Name</label>
                      <input style={sel} value={newPatient.lastName} onChange={e => setNewPatient({...newPatient, lastName: e.target.value})} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Date of Birth</label>
                      <input type="date" style={sel} value={newPatient.dateOfBirth} onChange={e => setNewPatient({...newPatient, dateOfBirth: e.target.value})} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Phone</label>
                      <input style={sel} value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Insurance Provider</label>
                      <select style={sel} value={newPatient.insuranceProvider} onChange={e => setNewPatient({...newPatient, insuranceProvider: e.target.value})}>
                        {INSURERS.map(ins => <option key={ins} value={ins}>{ins}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowPatientForm(false)} style={{ background: 'transparent', border: '0.5px solid var(--color-border-tertiary)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                    <button 
                      onClick={async () => {
                        if (!accessToken) return;
                        await patientsApi.createPatient(accessToken, newPatient);
                        setShowPatientForm(false);
                        setNewPatient({ firstName: '', lastName: '', dateOfBirth: '', phone: '', insuranceProvider: 'Sun Life Financial' });
                        loadPatients();
                      }} 
                      style={{ background: '#0f766e', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                      Save Patient
                    </button>
                  </div>
                </div>
              )}

              <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                  <thead style={{ background: 'var(--color-background-secondary)' }}>
                    <tr>
                      <th style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--color-text-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>Name</th>
                      <th style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--color-text-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>Phone</th>
                      <th style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--color-text-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>Insurance</th>
                      <th style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--color-text-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.length === 0 ? (
                      <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No patients found. Add one above.</td></tr>
                    ) : (() => {
                      const filteredPatients = patients.filter(p => 
                        `${p.first_name} ${p.last_name}`.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
                        (p.phone && p.phone.includes(patientSearchQuery))
                      );
                      if (filteredPatients.length === 0) {
                        return <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No matching patients found.</td></tr>;
                      }
                      return filteredPatients.map(p => (
                        <tr 
                          key={p.id} 
                          onClick={() => setViewingPatient(p)}
                          style={{ borderBottom: '0.5px solid var(--color-border-tertiary)', cursor: 'pointer', transition: 'background 0.2s' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-background-secondary)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ padding: '12px 14px', color: '#0f766e', fontWeight: 500 }}>{p.first_name} {p.last_name}</td>
                          <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)' }}>{p.phone || '—'}</td>
                          <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)' }}>{p.insurance_plan_id || '—'}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!accessToken) return;
                                if (confirm('Delete patient?')) {
                                  await patientsApi.deletePatient(accessToken, p.id);
                                  loadPatients();
                                }
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>
          )}

          {/* ── Phase 2 placeholder ── */}
          {activeTab === 'other' && (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <div style={{ fontSize: 40, marginBottom: '1rem' }}>🚧</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 8 }}>Coming in Phase 2</div>
              <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>
                Claim risk detection, pre-authorization drafting, patient management, and full settings are part of the Phase 2 AI engine build.
              </div>
            </div>
          )}

          {/* ── All Clinics tab ── */}
          {activeTab === 'clinics' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)' }}>Clinic Locations</h2>
                <button onClick={() => setShowAddClinic(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                  <PlusCircle size={15} /> Add Location
                </button>
              </div>
              {clinics.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--color-border-secondary)', borderRadius: 12 }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🏥</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 8 }}>No clinic locations yet</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20 }}>Add your first clinic location to get started.</div>
                  <button onClick={() => setShowAddClinic(true)} style={{ background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, cursor: 'pointer' }}>Add First Location</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {clinics.map(clinic => (
                    <div key={clinic.id} style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: '1.5rem', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)')}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(15,118,110,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Building2 size={20} color="#0f766e" />
                        </div>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: clinic.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: clinic.status === 'active' ? '#10b981' : '#ef4444', fontWeight: 500 }}>
                          {clinic.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>{clinic.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16 }}>{clinic.address || 'No address set'}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                        <div style={{ background: 'var(--color-background-primary)', borderRadius: 8, padding: '8px 10px' }}>
                          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Phone</div>
                          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>{clinic.phone || '—'}</div>
                        </div>
                        <div style={{ background: 'var(--color-background-primary)', borderRadius: 8, padding: '8px 10px' }}>
                          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>PMS</div>
                          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>{clinic.pms_type || 'None'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => { setSelectedClinicId(clinic.id); setActiveTab('clinic-dashboard'); setClinicForm({ name: clinic.name, address: clinic.address ?? '', phone: clinic.phone ?? '', email: clinic.email ?? '', operatingHours: clinic.operating_hours ?? '' }) }}
                          style={{ flex: 1, background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                          View Dashboard
                        </button>
                        <button onClick={() => { setSelectedClinicId(clinic.id); setActiveTab('clinic-settings'); setClinicForm({ name: clinic.name, address: clinic.address ?? '', phone: clinic.phone ?? '', email: clinic.email ?? '', operatingHours: clinic.operating_hours ?? '' }) }}
                          style={{ flex: 1, background: 'transparent', color: 'var(--color-text-primary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 8, padding: '8px', fontSize: 12, cursor: 'pointer' }}>
                          Settings
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Individual Clinic Dashboard ── */}
          {activeTab === 'clinic-dashboard' && selectedClinicId && (() => {
            const clinic = clinics.find(c => c.id === selectedClinicId)
            if (!clinic) return null
            return (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
                  <button onClick={() => setActiveTab('clinics')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 13 }}>← All Clinics</button>
                  <span style={{ color: 'var(--color-border-tertiary)' }}>/</span>
                  <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{clinic.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>{clinic.name}</h2>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{clinic.address || 'No address'} · {clinic.phone || 'No phone'}</div>
                  </div>
                  <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: clinic.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: clinic.status === 'active' ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                    {clinic.status === 'active' ? '● Active' : '● Inactive'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: '1.5rem' }}>
                  {[['Total Patients', patients.length, '👥'], ['Pending Claims', '—', '📋'], ['Revenue', '$—', '💰']].map(([label, value, icon]) => (
                    <div key={String(label)} style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: '1.2rem' }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
                      <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>{value}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => { setActiveTab('clinic-settings') }}
                    style={{ background: 'transparent', border: '0.5px solid var(--color-border-secondary)', borderRadius: 8, padding: '10px 20px', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-primary)' }}>
                    Clinic Settings →
                  </button>
                </div>
              </div>
            )
          })()}

          {/* ── Individual Clinic Settings ── */}
          {activeTab === 'clinic-settings' && selectedClinicId && (() => {
            const clinic = clinics.find(c => c.id === selectedClinicId)
            if (!clinic) return null
            return (
              <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: 600 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
                  <button onClick={() => setActiveTab('clinic-dashboard')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 13 }}>← Dashboard</button>
                  <span style={{ color: 'var(--color-border-tertiary)' }}>/</span>
                  <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>Settings</span>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '1.5rem' }}>{clinic.name} — Settings</h2>
                {[
                  { label: 'Clinic Name', key: 'name', placeholder: 'e.g. Lakeview Dental Downtown' },
                  { label: 'Address', key: 'address', placeholder: '123 Main St, Toronto, ON M5V 1A1' },
                  { label: 'Phone', key: 'phone', placeholder: '+1 (416) 555-0100' },
                  { label: 'Email', key: 'email', placeholder: 'info@yourclinic.ca' },
                  { label: 'Operating Hours', key: 'operatingHours', placeholder: 'Mon–Fri 9am–6pm' },
                ].map(field => (
                  <div key={field.key} style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>{field.label}</label>
                    <input
                      value={clinicForm[field.key as keyof typeof clinicForm]}
                      onChange={e => setClinicForm(f => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 12, marginTop: '1.5rem' }}>
                  <button onClick={() => saveClinicSettings(clinic)} disabled={clinicSaving}
                    style={{ background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: clinicSaving ? 0.7 : 1 }}>
                    {clinicSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button onClick={async () => { if (!accessToken || !confirm('Delete this clinic location?')) return; await clinicsApi.remove(accessToken, clinic.id); await loadClinics(); setActiveTab('clinics') }}
                    style={{ background: 'transparent', color: '#ef4444', border: '0.5px solid #fca5a5', borderRadius: 8, padding: '12px 24px', fontSize: 14, cursor: 'pointer' }}>
                    Delete Location
                  </button>
                </div>
              </div>
            )
          })()}

          {/* ── User Settings ── */}
          {activeTab === 'user-settings' && (
            <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: 560 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>User Settings</h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>Manage your personal account details.</p>

              <div style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: '1.5rem' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 600, color: '#0f766e' }}>
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>{user?.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{user?.role?.replace('_', ' ')} · {user?.email}</div>
                  </div>
                </div>
                {[
                  { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Dr. Jane Smith' },
                  { label: 'Email Address', key: 'email', type: 'email', placeholder: 'jane@yourclinic.ca' },
                ].map(field => (
                  <div key={field.key} style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>{field.label}</label>
                    <input
                      type={field.type}
                      value={userSettingsForm[field.key as keyof typeof userSettingsForm]}
                      onChange={e => setUserSettingsForm(f => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 12 }}>Account Info</div>
                {[['User ID', user?.id ?? '—'], ['Tenant ID', user?.tenantId ?? '—'], ['Role', user?.role?.replace('_', ' ') ?? '—']].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid var(--color-border-tertiary)', fontSize: 13 }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{l}</span>
                    <span style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontFamily: 'monospace', fontSize: 12 }}>{v}</span>
                  </div>
                ))}
              </div>

              {userSettingsSaved && <div style={{ background: 'rgba(16,185,129,0.1)', border: '0.5px solid #10b981', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#10b981', marginBottom: 12 }}>Settings saved!</div>}
              <button onClick={() => setUserSettingsSaved(true)}
                style={{ background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                Save Changes
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Add Clinic Modal */}
      {showAddClinic && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998 }}>
          <div style={{ background: 'var(--color-background-primary)', borderRadius: 16, padding: '2rem', width: 480, border: '0.5px solid var(--color-border-tertiary)', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)' }}>Add Clinic Location</h3>
              <button onClick={() => setShowAddClinic(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}><X size={20} /></button>
            </div>
            {[
              { label: 'Clinic Name *', key: 'name', placeholder: 'e.g. Lakeview Dental — West End' },
              { label: 'Address', key: 'address', placeholder: '456 King St W, Toronto, ON' },
              { label: 'Phone', key: 'phone', placeholder: '+1 (416) 555-0200' },
              { label: 'Email', key: 'email', placeholder: 'westend@lakeviewdental.ca' },
              { label: 'Operating Hours', key: 'operatingHours', placeholder: 'Mon–Fri 9am–5pm' },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 5 }}>{field.label}</label>
                <input value={clinicForm[field.key as keyof typeof clinicForm]} onChange={e => setClinicForm(f => ({ ...f, [field.key]: e.target.value }))} placeholder={field.placeholder}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: '1rem' }}>
              <button onClick={() => setShowAddClinic(false)} style={{ flex: 1, background: 'transparent', border: '0.5px solid var(--color-border-secondary)', borderRadius: 8, padding: '12px', fontSize: 14, cursor: 'pointer', color: 'var(--color-text-primary)' }}>Cancel</button>
              <button onClick={addClinic} disabled={clinicSaving || !clinicForm.name} style={{ flex: 2, background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: (clinicSaving || !clinicForm.name) ? 0.6 : 1 }}>
                {clinicSaving ? 'Adding...' : 'Add Location'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
