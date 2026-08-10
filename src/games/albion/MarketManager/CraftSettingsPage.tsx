import { useMarketManagerChrome } from './useMarketManagerChrome'
import { CraftSettingsPanel } from './CraftSettingsPanel'

// Deep-linkable route wrapper; the sidebar opens the same panel as a modal so settings
// can change without leaving the current table.
export function CraftSettingsPage() {
  useMarketManagerChrome()

  return (
    <div className="p-6 max-w-6xl mx-auto w-full space-y-4">
      <h1 className="text-xl font-semibold text-[#e2e4ed] tracking-wide">
        Albion Online <span className="text-[#c4af64]">Craft Settings</span>
      </h1>
      <CraftSettingsPanel />
    </div>
  )
}
