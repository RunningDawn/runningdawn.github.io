import { Link } from 'react-router'

export function SidebarHeader({ to, onClose }: { to: string; onClose?: () => void }) {
  return (
    <div className="border-b border-[#2a2d3a]">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link to="/" className="shrink-0 rounded hover:opacity-75 transition-opacity">
          <img src="/favicon.png" alt="Running Dawn" className="w-8 h-8 rounded" />
        </Link>
        <Link to={to} onClick={onClose} className="text-[#e2e4ed] font-semibold text-base tracking-wide hover:opacity-75 transition-opacity">
          Albion <span className="text-[#c4af64]">Online</span>
        </Link>
      </div>
    </div>
  )
}
