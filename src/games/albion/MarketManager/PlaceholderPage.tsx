import { useEffect } from 'react'
import { useAuth } from '../../../auth/authContext'
import { useLayoutOverride } from '../../../components/LayoutOverride'
import { MarketManagerSidebar } from './MarketManagerSidebar'
import { MarketManagerBottomBar } from './MarketManagerBottomBar'

export function PlaceholderPage({ title }: { title: string }) {
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
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center select-none">
      <p className="text-lg font-medium text-[#6b7280]">{title}</p>
      <p className="text-xs text-[#4a4d5a] mt-2">coming soon</p>
    </div>
  )
}
