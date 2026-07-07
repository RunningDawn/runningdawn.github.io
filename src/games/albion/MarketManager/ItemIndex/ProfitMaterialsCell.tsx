import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { tierLabel } from './itemMeta'
import { profit } from './craftCost'
import type { CraftStrategy } from '../premium'
import type { CraftAnalysis } from './types'

const CARD_WIDTH = 320

import { fmt } from '../marketFormat'

// The bold Profit (sell) cell: click to open a portal card listing exactly which materials
// to buy under the configured strategy (base = top-level recipe mats; optimized = the
// aggregated market buys across the whole tree), plus the revenue/tax/profit math.
export function ProfitMaterialsCell({
  analysis,
  revenue,
  taxRate,
  strategy,
}: {
  analysis: CraftAnalysis | null | undefined
  revenue: number | null | undefined
  taxRate: number
  strategy: CraftStrategy
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!pos) return
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setPos(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [pos])

  const cost = strategy === 'base' ? analysis?.fullBuy : analysis?.optimal
  const value = profit(revenue, cost, taxRate)
  if (analysis == null || value == null) return <span className="text-[#6b7280]">-</span>

  function toggle() {
    if (pos) {
      setPos(null)
      return
    }
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const left = Math.max(12, Math.min(r.left, window.innerWidth - CARD_WIDTH - 12))
    setPos({ top: r.bottom + 4, left })
  }

  const cls = value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : 'text-[#6b7280]'
  const lines = strategy === 'base'
    ? (analysis.baseMaterials ?? []).map(m => ({
      id: m.id, name: m.name, count: m.count, subtotal: m.subtotal,
    }))
    : (analysis.shopping ?? []).map(l => ({
      id: l.id,
      name: l.name,
      count: Math.ceil(l.count),
      subtotal: l.unitCost == null ? null : Math.ceil(l.count) * l.unitCost,
    }))
  const fees = (strategy === 'base' ? analysis.silver : analysis.shoppingSilver) + analysis.stationFee

  return (
    <>
      <button
        ref={ref}
        onClick={toggle}
        className={`${cls} font-semibold underline decoration-dotted decoration-[#6b7280] underline-offset-2 cursor-pointer select-text`}
      >
        {value > 0 ? '+' : ''}{fmt(value)}
      </button>
      {pos &&
        createPortal(
          <div
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: CARD_WIDTH }}
            className="bg-[#1a1d27] border border-[#2a2d3a] rounded-lg p-3 shadow-xl z-[200] text-xs flex flex-col gap-1.5"
          >
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wider">
              Materials to buy ({strategy === 'base' ? 'base mats' : 'optimized'})
            </p>
            {lines.map(line => (
              <div key={line.id} className="flex justify-between gap-3">
                <span className="text-[#9ca3af] truncate">
                  {line.count}× {tierLabel(line.id)} {line.name}
                </span>
                <span className="font-mono text-[#e2e4ed] shrink-0">{fmt(line.subtotal)}</span>
              </div>
            ))}
            {fees > 0 && (
              <div className="flex justify-between gap-3">
                <span className="text-[#9ca3af]">crafting + station fees</span>
                <span className="font-mono text-[#e2e4ed]">{fmt(fees)}</span>
              </div>
            )}
            <div className="border-t border-[#2a2d3a] my-0.5" />
            <div className="flex justify-between gap-3">
              <span className="text-[#c4af64]/60">Craft cost</span>
              <span className="font-mono text-[#e2e4ed]">{fmt(cost)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#c4af64]/60">Revenue − {Math.round(taxRate * 100)}% tax</span>
              <span className="font-mono text-[#e2e4ed]">{revenue == null ? '-' : fmt(revenue * (1 - taxRate))}</span>
            </div>
            <div className="flex justify-between gap-3 font-semibold">
              <span className="text-[#c4af64]">Profit</span>
              <span className={`font-mono ${cls}`}>{value > 0 ? '+' : ''}{fmt(value)}</span>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
