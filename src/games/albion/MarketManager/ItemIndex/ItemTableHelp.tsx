import { useState } from 'react'
import { Modal } from '../../../../components/Modal'

function Entry({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold text-[#e2e4ed] mb-1">{title}</p>
      <p className="text-[#9ca3af] text-xs leading-relaxed">{children}</p>
    </div>
  )
}

// "?" glossary for the item tables (mirrors the Gold page's HelpModal pattern): what each
// column means and exactly how it is calculated.
export function ItemTableHelp() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Explain the table columns"
        className="w-5 h-5 rounded-full bg-[#2a2d3a] border border-[#3a3d4a] text-[#9ca3af] hover:text-[#e2e4ed] hover:border-[#c4af64] text-xs flex items-center justify-center transition-colors cursor-pointer"
      >
        ?
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Item Table Columns" maxWidth="max-w-xl">
        <div className="px-5 py-4 space-y-4 text-sm max-h-[70vh] overflow-y-auto">
          <Entry title="Sell (min)">
            The cheapest sell order on the market right now, at the selected town and quality.
            It is what you would pay to buy one instantly - and the price to list <em>under</em> if
            you want to sell first.
          </Entry>
          <Entry title="Buy (max)">
            The highest buy order. Selling into it moves your item instantly, at a worse price
            than listing a sell order and waiting.
          </Entry>
          <Entry title="Scanned">
            When this exact market (item + town + quality) was last scanned in game. ADP data is
            crowdsourced, so every row ages on its own - the dot and age are{' '}
            <span className="text-[#4ade80]">green</span> under an hour,{' '}
            <span className="text-[#e2e4ed]">white</span> under a day,{' '}
            <span className="text-[#facc15]">yellow</span> under three, and{' '}
            <span className="text-[#f87171]">red</span> beyond; a gray “never” means no player has
            ever scanned it. Sort the column to pull the stalest rows to the top.
          </Entry>
          <Entry title="Sold/day">
            Units that actually traded over the last 24h at this town and quality, from ADP's
            hourly history. Low or zero means a thin market - distrust its prices however fresh
            they look. On Best Value a yellow <span className="text-[#facc15]">*</span> flags that
            the lowest ask sat above the 24h traded average, so profit used the lower traded price
            instead of the ask.
          </Entry>
          <Entry title="Manual price (✎)">
            When the scan is stale or wrong, click the <span className="text-[#c4af64]">✎</span> by a
            Sell price to enter the real in-game ask. It is{' '}
            <strong className="text-[#e2e4ed]">shared with the whole guild</strong> and replaces the
            scanned price everywhere - these tables and Best Value - shown with a{' '}
            <span className="text-[#c4af64]">👤</span> and a dotted underline. Clear it to fall back
            to live scanned data.
          </Entry>
          <Entry title="Craft (base)">
            The cost to craft one, buying every <strong className="text-[#e2e4ed]">top-level recipe material</strong> at
            its current market price - no sub-crafting. Includes the resource return rate and the
            station fee.
          </Entry>
          <Entry title="Craft (optimized)">
            The cheapest way to produce one: every material is compared as
            <span className="text-[#6b7280]"> buy</span> vs
            <span className="text-[#60a5fa]"> craft from raw</span> vs
            <span className="text-[#a78bfa]"> transmute up</span>, recursively through the whole
            recipe tree. Always ≤ Craft (base). Hover it for the full breakdown.
          </Entry>
          <Entry title="Profit (sell) - the primary column">
            <span className="font-mono text-xs">Sell(min) × (1 − tax) − Craft cost</span> -
            craft it, list it just under the current cheapest sell order, pay your sales tax.
            <strong className="text-[#e2e4ed]"> Click a value</strong> to see exactly which
            materials to buy for that item under your current toggles.
          </Entry>
          <Entry title="Profit (buy)">
            <span className="font-mono text-xs">Buy(max) × (1 − tax) − Craft cost</span> -
            craft it and dump it instantly into the best buy order. The pessimistic floor.
          </Entry>
          <Entry title='Toggle "Mats": Instant buy / Buy orders'>
            How you acquire materials. <strong className="text-[#e2e4ed]">Instant buy</strong>{' '}
            pays the lowest sell order right now. <strong className="text-[#e2e4ed]">Buy
            orders</strong> prices them at the current highest buy order - place your orders
            just above it and wait; cheaper, but not guaranteed to fill at that price. This
            changes every craft cost on the page.
          </Entry>
          <Entry title='Toggle "Craft": Optimized / Base mats'>
            Which craft cost the profit columns use.{' '}
            <strong className="text-[#e2e4ed]">Optimized</strong> assumes you do the cheap
            sub-refining/transmuting; <strong className="text-[#e2e4ed]">Base mats</strong>{' '}
            assumes you buy the top-level materials as-is and only do the final craft.
          </Entry>
          <p className="text-xs text-[#6b7280] leading-relaxed border-t border-[#2a2d3a] pt-3">
            The numbers behind these come from Craft Settings: sales tax follows your premium
            toggle (4% / 8%), resource return rates are bonus-aware per town and craft line
            (15.2% base, more in an item's specialty city, more again with focus), and station
            fees are the shared per-town values. Materials are always priced at Normal quality
            in the selected town. The Best Value page follows the same two toggles
            (server-side) and always assumes sell-order resale.
          </p>
        </div>
      </Modal>
    </>
  )
}
