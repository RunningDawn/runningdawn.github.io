import { NavLink } from 'react-router'
import { SidebarShell } from '../../components/Sidebar/SidebarShell'
import { SidebarHeader } from '../../components/Sidebar/SidebarHeader'
import { SidebarFooter } from '../../components/Sidebar/SidebarFooter'
import { SidebarDivider } from '../../components/Sidebar/SidebarDivider'
import { useWowfAccess } from './access'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block pl-4 pr-8 py-2 md:py-0 text-sm leading-5 transition-colors ${
    isActive
      ? 'bg-[#c4af64]/10 text-[#c4af64] border-r-2 border-[#c4af64]'
      : 'text-[#9ca3af] hover:text-[#e2e4ed] hover:bg-[#2a2d3a]'
  }`

const tools: { path: string; label: string; leadership?: boolean }[] = [
  { path: '/wow-forever/roster', label: 'Character Roster' },
  { path: '/wow-forever/availability', label: 'Availability' },
  { path: '/wow-forever/register', label: 'Event Registration' },
  { path: '/wow-forever/loot', label: 'SR+ (Loot)' },
  { path: '/wow-forever/loot-history', label: 'Loot History' },
  { path: '/wow-forever/guild', label: 'Guild Roster', leadership: true },
  { path: '/wow-forever/events', label: 'Events', leadership: true },
  { path: '/wow-forever/availability-viewer', label: 'Availability Viewer', leadership: true },
  { path: '/wow-forever/sr-admin', label: 'SR+ Admin', leadership: true },
  { path: '/wow-forever/raids', label: 'Raids', leadership: true },
  { path: '/wow-forever/audit', label: 'Audit Log', leadership: true },
]

export interface WowfSidebarProps {
  isOpen: boolean
  onClose: () => void
  onOpenSettings: () => void
  onOpenLogin: () => void
}

export function WowfSidebar({ isOpen, onClose, onOpenSettings, onOpenLogin }: WowfSidebarProps) {
  const { leadership } = useWowfAccess()
  const members = tools.filter(t => !t.leadership)
  const admin = leadership ? tools.filter(t => t.leadership) : []
  return (
    <SidebarShell isOpen={isOpen}>
      <SidebarHeader to="/wow-forever" onClose={onClose} />

      <nav className="flex-1 overflow-y-auto py-1 min-w-0">
        {members.map(tool => (
          <NavLink key={tool.path} to={tool.path} onClick={onClose} className={navLinkClass}>
            {tool.label}
          </NavLink>
        ))}
        {admin.length > 0 && <SidebarDivider />}
        {admin.map(tool => (
          <NavLink key={tool.path} to={tool.path} onClick={onClose} className={navLinkClass}>
            {tool.label}
          </NavLink>
        ))}
      </nav>

      <SidebarFooter onOpenSettings={onOpenSettings} onOpenLogin={onOpenLogin} />
    </SidebarShell>
  )
}
