import { NavLink } from 'react-router'
import { SidebarShell } from '../../components/Sidebar/SidebarShell'
import { SidebarHeader } from '../../components/Sidebar/SidebarHeader'
import { SidebarFooter } from '../../components/Sidebar/SidebarFooter'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block pl-4 pr-8 py-2 md:py-0 text-sm leading-5 transition-colors ${
    isActive
      ? 'bg-[#c4af64]/10 text-[#c4af64] border-r-2 border-[#c4af64]'
      : 'text-[#9ca3af] hover:text-[#e2e4ed] hover:bg-[#2a2d3a]'
  }`

// Top-level Albion tools. Add new Albion tools here (mirrors forge-web's GamesSidebar).
// Each tool that wants its own chrome swaps in a sub-sidebar/bottom-bar via LayoutOverride
// (see MarketManager -> MarketManagerSidebar/MarketManagerBottomBar).
const tools: { path: string; label: string }[] = [
  { path: '/albion/market-manager', label: 'Market Manager' },
]

export interface AlbionSidebarProps {
  isOpen: boolean
  onClose: () => void
  onOpenSettings: () => void
  onOpenLogin: () => void
}

export function AlbionSidebar({ isOpen, onClose, onOpenSettings, onOpenLogin }: AlbionSidebarProps) {
  return (
    <SidebarShell isOpen={isOpen}>
      <SidebarHeader to="/albion" onClose={onClose} />

      <nav className="flex-1 overflow-y-auto py-1 min-w-0">
        {tools.map(tool => (
          <NavLink key={tool.path} to={tool.path} onClick={onClose} className={navLinkClass}>
            {tool.label}
          </NavLink>
        ))}
      </nav>

      <SidebarFooter onOpenSettings={onOpenSettings} onOpenLogin={onOpenLogin} />
    </SidebarShell>
  )
}
