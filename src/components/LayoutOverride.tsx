/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode, type ComponentType } from 'react'

type SidebarProps = { isOpen: boolean; onClose: () => void; onOpenSettings: () => void; onOpenLogin: () => void }
type SidebarComp = ComponentType<SidebarProps>
type BottomBarComp = ComponentType

interface LayoutOverrideValue {
  sidebar: SidebarComp | null
  bottomBar: BottomBarComp | null
}

const LayoutOverrideContext = createContext<{
  override: LayoutOverrideValue
  setOverride: React.Dispatch<React.SetStateAction<LayoutOverrideValue>>
} | null>(null)

export function LayoutOverrideProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<LayoutOverrideValue>({ sidebar: null, bottomBar: null })
  const value = useMemo(() => ({ override, setOverride }), [override])
  return (
    <LayoutOverrideContext.Provider value={value}>
      {children}
    </LayoutOverrideContext.Provider>
  )
}

export function useLayoutOverride() {
  const ctx = useContext(LayoutOverrideContext)
  if (!ctx) throw new Error('useLayoutOverride must be used within LayoutOverrideProvider')

  const setSidebar = useCallback((comp: SidebarComp | null) => {
    ctx.setOverride(prev => ({ ...prev, sidebar: comp }))
  }, [ctx])

  const setBottomBar = useCallback((comp: BottomBarComp | null) => {
    ctx.setOverride(prev => ({ ...prev, bottomBar: comp }))
  }, [ctx])

  return { setSidebar, setBottomBar }
}

export function useLayoutOverrideValue() {
  const ctx = useContext(LayoutOverrideContext)
  return ctx?.override ?? { sidebar: null, bottomBar: null }
}
