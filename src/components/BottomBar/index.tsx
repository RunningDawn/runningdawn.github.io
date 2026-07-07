import forgehavenLogo from '../../assets/forgehaven-logo.png'

// runningdawn is powered by the Forgehaven API — the attribution sits at the bottom
// right of every bottom bar. Content (ticker, etc.) flows on the left.
export function BottomBar({ children }: { children?: React.ReactNode }) {
  return (
    <footer className="h-10 bg-[#1a1d27] border-t border-[#2a2d3a] flex items-center px-2 sm:px-4 gap-1.5 sm:gap-3 text-xs shrink-0 overflow-hidden">
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 overflow-hidden">
        {children}
      </div>
      <a
        href="https://forgehaven.io"
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 inline-flex items-center gap-1.5 text-[#6b7280] hover:text-[#e2e4ed] transition-colors"
      >
        <span className="hidden sm:inline">Powered by</span>
        <span className="font-semibold tracking-wide">FORGEHAVEN</span>
        <img src={forgehavenLogo} alt="Forgehaven" className="h-4 w-auto" />
      </a>
    </footer>
  )
}

export function BottomBarDivider() {
  return <span className="text-[#2a2d3a] select-none">|</span>
}
