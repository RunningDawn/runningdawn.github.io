import logo from './albion-logo.png'

export function AlbionSplash() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center select-none">
      <img src={logo} alt="Albion Online" className="w-auto h-12 mb-5 opacity-60" />
      <h1 className="text-2xl font-semibold text-[#e2e4ed] mb-2 tracking-wide">
        Albion <span className="text-[#c4af64]">Online</span>
      </h1>
      <p className="text-sm text-[#6b7280]">Select a tool from the sidebar.</p>
    </div>
  )
}
