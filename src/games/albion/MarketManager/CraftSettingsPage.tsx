import { useEffect } from 'react'
import { useAuth } from '../../../auth/authContext'
import { useLayoutOverride } from '../../../components/LayoutOverride'
import { MarketManagerSidebar } from './MarketManagerSidebar'
import { MarketManagerBottomBar } from './MarketManagerBottomBar'
import { CraftSettingsPanel } from './CraftSettingsPanel'

// Deep-linkable route wrapper; the sidebar opens the same panel as a modal so settings
// can change without leaving the current table.
export function CraftSettingsPage() {
  const { isAuthenticated } = useAuth()
  const { setSidebar, setBottomBar } = useLayoutOverride()

  useEffect(() => {
    if (isAuthenticated) {
      setSidebar(MarketManagerSidebar)
      setBottomBar(MarketManagerBottomBar)
    } else {
      setSidebar(null)
      setBottomBar(null)
    }
    return () => { setSidebar(null); setBottomBar(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  return (
    <div className="p-6 max-w-6xl mx-auto w-full space-y-4">
      <h1 className="text-xl font-semibold text-[#e2e4ed] tracking-wide">
        Albion Online <span className="text-[#c4af64]">Craft Settings</span>
      </h1>
      <CraftSettingsPanel />
    </div>
  )
}
