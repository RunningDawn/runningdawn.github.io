import { useEffect } from 'react'
import { mmAccess, useAuth } from '../../../auth/authContext'
import { useLayoutOverride } from '../../../components/LayoutOverride'
import { MarketManagerSidebar } from './MarketManagerSidebar'
import { MarketManagerBottomBar } from './MarketManagerBottomBar'

export function MarketManager() {
  const { user, loading, isAuthenticated, login } = useAuth()
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[80vh] text-center select-none">
        <div className="w-8 h-8 border-2 border-[#c4af64] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center select-none">
        <h1 className="text-2xl font-semibold text-[#e2e4ed] mb-2 tracking-wide">
          Albion Online <span className="text-[#c4af64]">Market Manager</span>
        </h1>
        <p className="text-sm text-[#6b7280] mb-8">Sign in with Discord to continue.</p>

        <button onClick={login}
          className="flex items-center gap-3 px-6 py-3 rounded-lg text-white font-semibold text-sm tracking-wide transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-lg"
          style={{ backgroundColor: '#5865F2' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09-.01-.02-.04-.03-.07-.03a14.06 14.06 0 0 0-2.27.33c-.01 0-.02.01-.03.02C4.28 6.59 3.42 9.79 3.66 12.97c0 .02.01.04.03.05a14.4 14.4 0 0 0 4.34 2.19c.04.01.08 0 .1-.02a10.6 10.6 0 0 0 1.13-1.83c.03-.06.01-.12-.04-.15-.61-.46-1.18-1.01-1.7-1.59-.09-.1-.06-.24.05-.28.13-.06.27-.12.4-.18.04-.02.08-.01.11.01 3 1.36 6.24 1.36 9.2 0 .03-.02.07-.03.11-.01.13.06.27.12.4.18.11.04.14.18.05.28-.52.58-1.09 1.13-1.7 1.59-.05.03-.07.09-.04.15.33.65.72 1.26 1.13 1.83.02.02.06.03.1.02a14.4 14.4 0 0 0 4.34-2.19.04.04 0 0 0 .03-.05c.27-3.66-.71-6.87-2.97-9.62-.01-.01-.02-.02-.04-.02zM9.38 11.22c-.71 0-1.28-.65-1.28-1.44s.56-1.44 1.28-1.44c.73 0 1.3.65 1.29 1.44 0 .79-.56 1.44-1.29 1.44zm5.24 0c-.71 0-1.28-.65-1.28-1.44s.56-1.44 1.28-1.44c.73 0 1.3.65 1.29 1.44 0 .79-.56 1.44-1.29 1.44z" fill="currentColor"/>
          </svg>
          Login with Discord
        </button>
      </div>
    )
  }

  const access = mmAccess(user)
  const denied: string[] = []
  if (!access.member) denied.push('Not a Running Dawn guild member.')
  if (!access.role) denied.push("You don't have the needed discord role.")

  if (denied.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center select-none">
        <h1 className="text-2xl font-semibold text-[#e2e4ed] mb-2 tracking-wide">
          Albion Online <span className="text-[#c4af64]">Market Manager</span>
        </h1>
        <p className="text-sm text-[#6b7280] mb-4">Signed in as {user?.username}</p>
        {denied.map(msg => (
          <p key={msg} className="text-sm text-red-400 mb-1">{msg}</p>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center select-none">
      <h1 className="text-2xl font-semibold text-[#e2e4ed] mb-2 tracking-wide">
        Albion Online <span className="text-[#c4af64]">Market Manager</span>
      </h1>
      <p className="text-sm text-[#6b7280] mb-8">Welcome, {user?.username}</p>
    </div>
  )
}
