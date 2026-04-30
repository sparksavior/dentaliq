'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface ClinicContextType {
  selectedClinicId: string | null
  setSelectedClinicId: (id: string | null) => void
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined)

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('diq_selected_clinic')
    if (saved) setSelectedClinicId(saved)
  }, [])

  const handleSetSelectedClinic = (id: string | null) => {
    setSelectedClinicId(id)
    if (id) {
      localStorage.setItem('diq_selected_clinic', id)
    } else {
      localStorage.removeItem('diq_selected_clinic')
    }
  }

  return (
    <ClinicContext.Provider value={{ selectedClinicId, setSelectedClinicId: handleSetSelectedClinic }}>
      {children}
    </ClinicContext.Provider>
  )
}

export function useClinic() {
  const context = useContext(ClinicContext)
  if (context === undefined) {
    throw new Error('useClinic must be used within a ClinicProvider')
  }
  return context
}
