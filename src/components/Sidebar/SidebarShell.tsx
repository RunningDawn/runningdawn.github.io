export function SidebarShell({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) {
  return (
    <>
      <aside className={`md:hidden fixed inset-y-0 left-0 z-50 w-max shrink-0 bg-[#1a1d27] border-r border-[#2a2d3a] flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {children}
      </aside>
      <aside className="hidden md:flex flex-col w-max shrink-0 bg-[#1a1d27] border-r border-[#2a2d3a]">
        {children}
      </aside>
    </>
  )
}
