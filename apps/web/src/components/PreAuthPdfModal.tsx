'use client'

import { useState, useEffect, useRef } from 'react'
import { jsPDF } from 'jspdf'
import { X, Download, RefreshCw, Send, FileText } from 'lucide-react'

interface PreAuthPdfModalProps {
  narrative: string
  clinicName: string
  insurerName: string
  patientName?: string
  date?: string
  onClose: () => void
  onRevise: (instructions: string) => Promise<void>
  onSave?: () => Promise<void>
}

export default function PreAuthPdfModal({
  narrative,
  clinicName,
  insurerName,
  patientName,
  date = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }),
  onClose,
  onRevise,
  onSave
}: PreAuthPdfModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [revisionNote, setRevisionNote] = useState('')
  const [isRevising, setIsRevising] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showRevisionInput, setShowRevisionInput] = useState(false)

  const generatePdf = () => {
    const doc = new jsPDF()
    const margin = 20
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 30

    // Header - Clinic Name
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text(clinicName.toUpperCase(), margin, y)
    y += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('ONTARIO DENTAL CARE CLINIC', margin, y)
    y += 15

    // Date
    doc.setFont('helvetica', 'bold')
    doc.text('DATE:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(date, margin + 15, y)
    y += 10

    // Recipient
    doc.setFont('helvetica', 'bold')
    doc.text('TO:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(insurerName, margin + 15, y)
    y += 10

    // Subject
    doc.setFont('helvetica', 'bold')
    doc.text('RE:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(`PRE-AUTHORIZATION NARRATIVE FOR ${patientName?.toUpperCase() || 'PATIENT'}`, margin + 15, y)
    y += 15

    // Body
    doc.setFontSize(11)
    const splitText = doc.splitTextToSize(narrative, pageWidth - margin * 2)
    doc.text(splitText, margin, y)
    
    // Add space for body
    y += (splitText.length * 6) + 20

    // Footer / Signature
    if (y > 250) {
      doc.addPage()
      y = 30
    }
    
    doc.setFont('helvetica', 'normal')
    doc.text('Sincerely,', margin, y)
    y += 15
    doc.line(margin, y, margin + 60, y) // Signature line
    y += 5
    doc.setFontSize(10)
    doc.text('Authorized Dental Practitioner', margin, y)
    y += 5
    doc.text(clinicName, margin, y)

    // Convert to Blob URL
    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    setPdfUrl(url)
  }

  useEffect(() => {
    generatePdf()
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [narrative, clinicName, insurerName, patientName, date])

  const handleDownload = () => {
    if (!pdfUrl) return
    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = `PreAuth_${patientName?.replace(/\s+/g, '_') || 'Patient'}_${new Date().getTime()}.pdf`
    link.click()
  }

  const handleReviseSubmit = async () => {
    if (!revisionNote.trim() || isRevising) return
    setIsRevising(true)
    try {
      await onRevise(revisionNote)
      setRevisionNote('')
      setShowRevisionInput(false)
    } catch (err) {
      console.error('Revision failed', err)
    } finally {
      setIsRevising(false)
    }
  }

  const handleSave = async () => {
    if (!onSave || isSaving || saved) return
    setIsSaving(true)
    try {
      await onSave()
      setSaved(true)
    } catch (err) {
      console.error('Save failed', err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'var(--color-background-primary)', borderRadius: 20, width: '90%', maxWidth: 1000, height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--color-border-secondary)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-background-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-accent-muted)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>Pre-Authorization Document</h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Generated for {patientName || 'Patient'} · {insurerName}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              onClick={handleDownload}
              style={{ padding: '8px 16px', borderRadius: 10, background: 'var(--color-accent)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              <Download size={18} /> Download PDF
            </button>
            <button 
              onClick={onClose}
              style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid var(--color-border-secondary)', background: 'transparent', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* PDF Preview */}
          <div style={{ flex: 1, background: '#525659', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            {pdfUrl ? (
              <iframe 
                src={`${pdfUrl}#toolbar=0`} 
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: 4, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }} 
                title="PDF Preview"
              />
            ) : (
              <div style={{ color: '#fff' }}>Generating preview...</div>
            )}
          </div>

          {/* Controls / Revision Side Panel */}
          <div style={{ width: 320, borderLeft: '1px solid var(--color-border-secondary)', display: 'flex', flexDirection: 'column', background: 'var(--color-background-primary)' }}>
            <div style={{ padding: '24px' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 16 }}>Actions</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {!showRevisionInput ? (
                  <button 
                    onClick={() => setShowRevisionInput(true)}
                    style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-border-tertiary)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--color-background-secondary)'}
                  >
                    <RefreshCw size={18} /> Revise with AI
                  </button>
                ) : (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>What would you like to change?</label>
                    <textarea 
                      value={revisionNote}
                      onChange={e => setRevisionNote(e.target.value)}
                      placeholder="e.g. Include more detail about the X-ray findings..."
                      style={{ width: '100%', height: 120, padding: '12px', borderRadius: 12, border: '1px solid var(--color-border-secondary)', background: 'var(--color-input-bg)', color: 'var(--color-text-primary)', fontSize: 13, resize: 'none', outline: 'none', marginBottom: 12 }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        onClick={() => setShowRevisionInput(false)}
                        style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--color-border-secondary)', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleReviseSubmit}
                        disabled={!revisionNote.trim() || isRevising}
                        style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--color-accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: isRevising ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        {isRevising ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                        Update
                      </button>
                    </div>
                  </div>
                )}

                {onSave && (
                  <button 
                    onClick={handleSave}
                    disabled={isSaving || saved}
                    style={{ width: '100%', padding: '12px', borderRadius: 12, border: saved ? 'none' : '1px solid var(--color-border-secondary)', background: saved ? '#10b981' : 'var(--color-background-secondary)', color: saved ? '#fff' : 'var(--color-text-primary)', fontSize: 14, fontWeight: 600, cursor: (isSaving || saved) ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.2s' }}
                  >
                    {isSaving ? <RefreshCw size={18} className="animate-spin" /> : saved ? <FileText size={18} /> : <FileText size={18} />}
                    {saved ? 'Saved to Profile' : 'Save to Patient Profile'}
                  </button>
                )}
              </div>

              <div style={{ marginTop: 32 }}>
                <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Document Info</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Status:</span> Draft
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Format:</span> Ontario Dental Standard
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 'auto', padding: '24px', borderTop: '1px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)' }}>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                This document is a generated clinical narrative. Please review carefully before signing.
              </p>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
