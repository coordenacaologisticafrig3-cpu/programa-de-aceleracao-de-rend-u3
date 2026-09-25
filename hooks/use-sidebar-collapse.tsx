'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

interface SidebarContextType {
  collapsed: boolean
  setCollapsed: (value: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved) {
      setCollapsed(JSON.parse(saved))
      return
    }

    // Em telas pequenas, inicia recolhida para manter o app usavel no mobile.
    if (window.matchMedia('(max-width: 768px)').matches) {
      setCollapsed(true)
    }
  }, [])

  const handleSetCollapsed = (value: boolean) => {
    setCollapsed(value)
    localStorage.setItem('sidebar-collapsed', JSON.stringify(value))
  }

  return (
    <SidebarContext.Provider value={{ collapsed: mounted ? collapsed : false, setCollapsed: handleSetCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebarCollapse() {
  const context = useContext(SidebarContext)
  if (!context) throw new Error('useSidebarCollapse must be used within SidebarProvider')
  return context
}
