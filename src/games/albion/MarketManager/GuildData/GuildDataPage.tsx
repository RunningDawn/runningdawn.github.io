import { useEffect } from 'react'
import { useAuth } from '../../../../auth/authContext'
import { GuildRoster } from './GuildRoster'
import { useLayoutOverride } from '../../../../components/LayoutOverride'
import { MarketManagerSidebar } from '../MarketManagerSidebar'
import { MarketManagerBottomBar } from '../MarketManagerBottomBar'

export function GuildDataPage() {
  const { isAuthenticated } = useAuth()
  const { setSidebar, setBottomBar } = useLayoutOverride()

  const showMMSidebar = isAuthenticated

  useEffect(() => {
    if (showMMSidebar) {
      setSidebar(MarketManagerSidebar)
      setBottomBar(MarketManagerBottomBar)
    } else {
      setSidebar(null)
      setBottomBar(null)
    }
    return () => { setSidebar(null); setBottomBar(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMMSidebar])

  return (
    <div className="p-6 max-w-7xl mx-auto w-full">
      <h1 className="text-xl font-semibold text-[#e2e4ed] mb-1 tracking-wide">
        Albion Online <span className="text-[#c4af64]">Guild Data</span>
      </h1>
      <p className="text-sm text-[#6b7280] mb-6">Running Dawn Roster</p>
      <GuildRoster />
    </div>
  )
}
