'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function LogoutPage() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (countdown <= 0) {
      router.push('/login')
    }
  }, [countdown, router])

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 0) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-background-primary)', padding: '2rem' }}>
      <div style={{ maxWidth: 450, width: '100%', textAlign: 'center' }}>
        <div style={{ 
          width: 80, height: 80, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem',
          color: '#10b981'
        }}>
          <CheckCircle2 size={40} />
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '1rem', letterSpacing: '-0.03em' }}>
          See you soon!
        </h1>
        
        <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', marginBottom: '2.5rem', lineHeight: 1.6 }}>
          You have been safely signed out of your DentalIQ account. 
          Redirecting to login in {countdown} seconds...
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link 
            href="/login"
            style={{ 
              padding: '14px', borderRadius: 12, background: 'var(--color-accent)', color: '#fff',
              fontSize: 15, fontWeight: 600, textDecoration: 'none', transition: 'transform 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            <LogOut size={18} /> Sign back in
          </Link>
          
          <Link 
            href="/"
            style={{ 
              padding: '14px', borderRadius: 12, border: '1.5px solid var(--color-border-secondary)',
              color: 'var(--color-text-primary)', fontSize: 15, fontWeight: 600, textDecoration: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            <ArrowLeft size={18} /> Back to homepage
          </Link>
        </div>

        <div style={{ marginTop: '4rem', padding: '2rem', borderRadius: 24, background: 'var(--color-background-secondary)', border: '1px solid var(--color-border-secondary)' }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
            "DentalIQ — Precision in every estimate, care in every interaction."
          </p>
        </div>
      </div>
    </div>
  )
}
