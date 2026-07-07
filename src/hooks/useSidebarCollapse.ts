import { useState } from 'react'

export function useSidebarCollapse(storageKey: string) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? '{}') } catch { return {} }
  })

  function toggle(section: string) {
    setCollapsed(prev => {
      const next = { ...prev, [section]: !prev[section] }
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }

  return { collapsed, toggle }
}
