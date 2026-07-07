import { useLocation } from 'react-router'
import { CogIcon, UserIcon } from '../Icons'
import { mmAccess, useAuth } from '../../auth/authContext'

export function SidebarFooter({
  onOpenSettings,
  onOpenLogin,
}: {
  onOpenSettings: () => void
  onOpenLogin: () => void
}) {
  const { user, isAuthenticated } = useAuth()
  const { pathname } = useLocation()

  // Denied cue: only on Albion MM pages, when logged in but missing guild/role.
  const access = mmAccess(user)
  const deniedInAlbion =
    isAuthenticated &&
    pathname.startsWith('/albion/market-manager') &&
    (!access.member || !access.role)

  const label = isAuthenticated && user ? user.username : 'Login'

  return (
    <div className="border-t border-[#2a2d3a]">
      <button
        onClick={onOpenLogin}
        className={`flex items-center gap-1.5 w-full h-10 px-4 transition-colors cursor-pointer ${
          deniedInAlbion ? 'text-red-400 hover:text-red-300' : 'text-[#3a3d4a] hover:text-[#6b7280]'
        }`}
      >
        {isAuthenticated && user?.avatar ? (
          <img src={user.avatar} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
        ) : (
          <UserIcon />
        )}
        <span className="text-xs tracking-widest uppercase truncate">{label}</span>
      </button>
      <div className="flex border-t border-[#2a2d3a] h-10 items-center px-4">
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 text-[#3a3d4a] hover:text-[#6b7280] transition-colors cursor-pointer"
        >
          <CogIcon />
          <span className="text-xs tracking-widest uppercase">Settings</span>
        </button>
      </div>
    </div>
  )
}
