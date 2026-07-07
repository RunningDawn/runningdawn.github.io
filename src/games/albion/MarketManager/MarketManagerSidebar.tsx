import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import { Modal } from '../../../components/Modal'
import { SidebarShell } from '../../../components/Sidebar/SidebarShell'
import { SidebarHeader } from '../../../components/Sidebar/SidebarHeader'
import { SidebarDivider } from '../../../components/Sidebar/SidebarDivider'
import { SidebarFooter } from '../../../components/Sidebar/SidebarFooter'
import { mmAccess, useAuth } from '../../../auth/authContext'
import { useSidebarCollapse } from '../../../hooks/useSidebarCollapse'
import { STORAGE_KEYS } from '../../../config/storageKeys'
import { CollapsibleSection } from './CollapsibleSection'
import { CraftSettingsPanel } from './CraftSettingsPanel'
import { MARKET_CATEGORY_SECTIONS } from './marketCategories'

function MMNavLink({ to, children, onClick }: { to: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `block pl-6 pr-8 py-2 md:py-0 text-xs leading-5 transition-colors ${
          isActive
            ? 'bg-[#c4af64]/10 text-[#c4af64] border-r-2 border-[#c4af64]'
            : 'text-[#9ca3af] hover:text-[#e2e4ed] hover:bg-[#2a2d3a]'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

interface MarketManagerSidebarProps {
  isOpen: boolean
  onClose: () => void
  onOpenSettings: () => void
  onOpenLogin: () => void
}

export function MarketManagerSidebar({ isOpen, onClose, onOpenSettings, onOpenLogin }: MarketManagerSidebarProps) {
  const { isAuthenticated, user } = useAuth()
  const access = mmAccess(user)
  const { collapsed, toggle } = useSidebarCollapse(STORAGE_KEYS.albionMMCollapsed)
  const [craftSettingsOpen, setCraftSettingsOpen] = useState(false)

  return (
    <SidebarShell isOpen={isOpen}>
      <SidebarHeader to="/albion" onClose={onClose} />

      <nav className="flex-1 overflow-y-auto py-1 min-w-0">
        {isAuthenticated && access.member && access.role && (
          <>
          <NavLink
            to="/albion/market-manager/guild-data"
            onClick={onClose}
            className={({ isActive }) =>
              `block pl-4 pr-8 py-2 md:py-0 text-sm leading-5 transition-colors ${
                isActive
                  ? 'bg-[#c4af64]/10 text-[#c4af64] border-r-2 border-[#c4af64]'
                  : 'text-[#9ca3af] hover:text-[#e2e4ed] hover:bg-[#2a2d3a]'
              }`
            }
          >
            Guild Data
          </NavLink>
          <SidebarDivider />
          </>
        )}

        {isAuthenticated && (
          <>
          <NavLink
            to="/albion/market-manager/gold"
            onClick={onClose}
            className={({ isActive }) =>
              `block pl-4 pr-8 py-2 md:py-0 text-sm leading-5 transition-colors ${
                isActive
                  ? 'bg-[#c4af64]/10 text-[#c4af64] border-r-2 border-[#c4af64]'
                  : 'text-[#9ca3af] hover:text-[#e2e4ed] hover:bg-[#2a2d3a]'
              }`
            }
          >
            Gold Price
          </NavLink>

          <NavLink
            to="/albion/market-manager/item-index"
            onClick={onClose}
            className={({ isActive }) =>
              `block pl-4 pr-8 py-2 md:py-0 text-sm leading-5 transition-colors ${
                isActive
                  ? 'bg-[#c4af64]/10 text-[#c4af64] border-r-2 border-[#c4af64]'
                  : 'text-[#9ca3af] hover:text-[#e2e4ed] hover:bg-[#2a2d3a]'
              }`
            }
          >
            Item Index
          </NavLink>
          <SidebarDivider />

          <NavLink
            to="/albion/market-manager/favourites"
            onClick={onClose}
            className={({ isActive }) =>
              `block pl-4 pr-8 py-2 md:py-0 text-sm leading-5 transition-colors ${
                isActive
                  ? 'bg-[#c4af64]/10 text-[#c4af64] border-r-2 border-[#c4af64]'
                  : 'text-[#9ca3af] hover:text-[#e2e4ed] hover:bg-[#2a2d3a]'
              }`
            }
          >
            Favourites
          </NavLink>

          <NavLink
            to="/albion/market-manager/best-value"
            onClick={onClose}
            className={({ isActive }) =>
              `block pl-4 pr-8 py-2 md:py-0 text-sm leading-5 transition-colors ${
                isActive
                  ? 'bg-[#c4af64]/10 text-[#c4af64] border-r-2 border-[#c4af64]'
                  : 'text-[#9ca3af] hover:text-[#e2e4ed] hover:bg-[#2a2d3a]'
              }`
            }
          >
            Best Value
          </NavLink>

          {/* Modal, not a route: settings change without leaving the current table
              (the /craft-settings route still exists for deep links). */}
          <button
            onClick={() => setCraftSettingsOpen(true)}
            className="block w-full text-left pl-4 pr-8 py-2 md:py-0 text-sm leading-5 transition-colors text-[#9ca3af] hover:text-[#e2e4ed] hover:bg-[#2a2d3a] cursor-pointer"
          >
            Craft Settings
          </button>

          <div className="mt-0.5 mb-0.5">
            <CollapsibleSection
              title="Market Fixing"
              open={!collapsed['Market Fixing']}
              onToggle={() => toggle('Market Fixing')}
            >
              <MMNavLink to="/albion/market-manager/market-fixing/x-city-arbitrage" onClick={onClose}>X-City Arbitrage</MMNavLink>
              <MMNavLink to="/albion/market-manager/market-fixing/velocity-flip" onClick={onClose}>Velocity Flip</MMNavLink>
              <MMNavLink to="/albion/market-manager/market-fixing/route-risk-reward" onClick={onClose}>Route Risk/Reward</MMNavLink>
              <MMNavLink to="/albion/market-manager/market-fixing/bm-volume-predict" onClick={onClose}>BM Volume Predict</MMNavLink>
            </CollapsibleSection>

            {MARKET_CATEGORY_SECTIONS.map(section => (
              <CollapsibleSection
                key={section.title}
                title={section.title}
                open={!collapsed[section.title]}
                onToggle={() => toggle(section.title)}
              >
                {section.items.map(item => (
                  <MMNavLink key={item.slug} to={`/albion/market-manager/${item.slug}`} onClick={onClose}>
                    {item.label}
                  </MMNavLink>
                ))}
              </CollapsibleSection>
            ))}
          </div>

          <NavLink
            to="/albion/market-manager/prototype/unreleased"
            onClick={onClose}
            className={({ isActive }) =>
              `block pl-4 pr-8 py-2 md:py-0 text-sm leading-5 transition-colors ${
                isActive
                  ? 'bg-[#c4af64]/10 text-[#c4af64] border-r-2 border-[#c4af64]'
                  : 'text-[#9ca3af] hover:text-[#e2e4ed] hover:bg-[#2a2d3a]'
              }`
            }
          >
            Unreleased
          </NavLink>
          </>
        )}
      </nav>

      <div className="border-t border-[#2a2d3a]">
        <Link
          to="/albion"
          onClick={onClose}
          className="block pl-4 pr-8 py-2 text-sm leading-5 transition-colors text-[#9ca3af] hover:text-[#e2e4ed] hover:bg-[#2a2d3a]"
        >
          ← Back to Albion
        </Link>
      </div>

      <SidebarFooter onOpenSettings={onOpenSettings} onOpenLogin={onOpenLogin} />

      <Modal
        open={craftSettingsOpen}
        onClose={() => setCraftSettingsOpen(false)}
        title="Craft Settings"
        maxWidth="max-w-6xl"
      >
        <div className="px-5 py-4 max-h-[80vh] overflow-y-auto">
          <CraftSettingsPanel />
        </div>
      </Modal>
    </SidebarShell>
  )
}
