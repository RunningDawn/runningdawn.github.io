import { useEffect } from 'react'
import { useAuth } from '../../../auth/authContext'
import { useLayoutOverride } from '../../../components/LayoutOverride'
import { MarketManagerSidebar } from './MarketManagerSidebar'
import { MarketManagerBottomBar } from './MarketManagerBottomBar'

// Every MM page swaps in the Market Manager sidebar + bottom bar while mounted (signed-in only).
export function useMarketManagerChrome(): void {
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
}
