import { Link } from 'react-router'
import { WowfGate } from './WowfGate'
import { useWowfAccess } from './access'
import logo from './wowf-logo.png'

export function WowfSplash() {
  const { leadership } = useWowfAccess()
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center gap-6">
      <div className="flex flex-col items-center">
        <img src={logo} alt="WoW: Forever" className="w-16 h-16 mb-5 object-contain opacity-60" />
        <h1 className="text-2xl font-semibold text-[#e2e4ed] mb-2 tracking-wide">
          WoW: <span className="text-[#c4af64]">Forever</span>
        </h1>
        <p className="text-sm text-[#6b7280]">Running Dawn guild tools for World of Warcraft: Forever.</p>
      </div>
      <WowfGate>
        <div className="flex gap-6 text-sm">
          <Link to="/wow-forever/roster" className="text-[#c4af64] hover:underline">Character Roster →</Link>
          <Link to="/wow-forever/loot" className="text-[#c4af64] hover:underline">SR+ (Loot) →</Link>
          {leadership && <Link to="/wow-forever/guild" className="text-[#c4af64] hover:underline">Guild Roster →</Link>}
          {leadership && <Link to="/wow-forever/events" className="text-[#c4af64] hover:underline">Events →</Link>}
        </div>
      </WowfGate>
    </div>
  )
}
