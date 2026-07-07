import { useState, type ReactNode } from 'react'

// Uncontrolled by default; pass open + onToggle to control it (the MM sidebar
// does, to persist collapse state in localStorage via useSidebarCollapse).
export function CollapsibleSection({ title, defaultOpen = true, open: controlledOpen, onToggle, children }: {
  title: string
  defaultOpen?: boolean
  open?: boolean
  onToggle?: () => void
  children: ReactNode
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const open = controlledOpen ?? uncontrolledOpen
  return (
    <div>
      <button
        onClick={onToggle ?? (() => setUncontrolledOpen(o => !o))}
        className="w-full flex items-center justify-between pl-[11px] pr-3 pt-1 pb-0 text-xs font-medium text-[#6b7280] uppercase tracking-wider hover:text-[#9ca3af] transition-colors cursor-pointer"
      >
        {title}
        <span className={`transition-transform duration-200 leading-none ${open ? 'rotate-0' : '-rotate-90'}`}>▾</span>
      </button>
      {open && <div className="flex flex-col">{children}</div>}
    </div>
  )
}
