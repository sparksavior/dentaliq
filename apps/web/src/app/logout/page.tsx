'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useTheme } from '@/hooks/useTheme'

export default function LogoutPage() {
  const router = useRouter()
  // Ensure we clear the session on this page too, just in case
  const { clearSession } = useAuth()
  useTheme('diq_pub_theme')

  useEffect(() => {
    // Redirect after a short delay
    const timer = setTimeout(() => {
      router.replace('/login')
    }, 2200)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--background)',
      color: 'var(--foreground)',
      textAlign: 'center',
      padding: '20px',
    }}>
      <div style={{
        width: 68,
        height: 68,
        borderRadius: 22,
        background: 'linear-gradient(135deg, #0f766e, #0d9488)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 34,
        fontWeight: 800,
        color: '#fff',
        boxShadow: '0 12px 30px rgba(15,118,110,0.25)',
        marginBottom: 32,
        animation: 'popIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        +
      </div>
      
      <h1 style={{ 
        fontSize: 26, 
        fontWeight: 800, 
        letterSpacing: '-0.04em',
        marginBottom: 12,
        animation: 'fadeInUp 0.6s ease-out'
      }}>
        Signing you out
      </h1>
      
      <p style={{ 
        fontSize: 16, 
        color: 'var(--color-text-secondary)',
        marginBottom: 36,
        animation: 'fadeInUp 0.7s ease-out',
        maxWidth: 320,
        lineHeight: 1.5
      }}>
        Thank you for choosing DentalIQ. Your session is being securely closed.
      </p>

      {/* Loading Spinner */}
      <div style={{
        width: 32,
        height: 32,
        border: '3px solid var(--color-border-secondary)',
        borderTopColor: 'var(--color-accent)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />

      {/* Background Decor */}
      <div style={{
        position: 'absolute',
        bottom: '8%',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: 11,
        color: 'var(--color-text-tertiary)',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        opacity: 0.6
      }}>
        DentalIQ Security Protocol
      </div>
    </div>
  )
}
