import { GuildRoster } from './GuildRoster'
import { useMarketManagerChrome } from '../useMarketManagerChrome'

export function GuildDataPage() {
  useMarketManagerChrome()

  return (
    <div className="p-6 max-w-7xl mx-auto w-full">
      <h1 className="text-xl font-semibold text-[#e2e4ed] mb-1 tracking-wide">
        Albion Online <span className="text-[#c4af64]">Guild Data</span>
      </h1>
      <p className="text-sm text-[#6b7280] mb-6">Running Dawn Roster</p>
      <GuildRoster />
    </div>
  )
}
