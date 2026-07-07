import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { tierLabel } from './itemMeta'
import type { CraftAnalysis } from './types'

const CARD_WIDTH = 300

const MODE_COLORS = {
  buy: 'text-[#6b7280]',
  craft: 'text-[#60a5fa]',
  upgrade: 'text-[#a78bfa]',
} as const

import { fmt } from '../marketFormat'

// Craft-cost cell: shows the optimal cost; hovering (or focusing) reveals the full breakdown in
// a portal card (portal avoids the table's overflow-x clipping). Lives in its own file so the
// react-refresh rule is satisfied (itemColumns exports a non-component factory).
export function CraftCell({ analysis }: { analysis: CraftAnalysis | null | undefined }) {
  const ref = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  if (!analysis || analysis.optimal == null) return <span className="text-[#6b7280]">-</span>

  function show() {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const left = Math.max(12, Math.min(r.left, window.innerWidth - CARD_WIDTH - 12))
    setPos({ top: r.bottom + 4, left })
  }
  function hide() {
    setPos(null)
  }

  return (
    <>
      <button
        ref={ref}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="text-[#c4af64] font-medium underline decoration-dotted decoration-[#6b7280] underline-offset-2 cursor-help select-text"
      >
        {fmt(analysis.optimal)}
      </button>
      {pos &&
        createPortal(
          <div
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: CARD_WIDTH }}
            className="bg-[#1a1d27] border border-[#2a2d3a] rounded-lg p-3 shadow-xl z-[200] text-xs flex flex-col gap-1.5 pointer-events-none"
          >
            <Row label="Base mats" value={fmt(analysis.fullBuy)} />
            <Row label="Full-craft" value={fmt(analysis.fullCraft)} />
            <Row label="Optimized" value={fmt(analysis.optimal)} strong />
            <div className="border-t border-[#2a2d3a] my-0.5" />
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wider">Base materials</p>
            {analysis.baseMaterials.map(m => (
              <div key={`base-${m.id}`} className="flex justify-between gap-3">
                <span className="text-[#9ca3af] truncate">
                  {m.count}× {tierLabel(m.id)} {m.name}
                </span>
                <span className="font-mono text-[#e2e4ed] text-right shrink-0">{fmt(m.subtotal)}</span>
              </div>
            ))}
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wider pt-1">Optimized materials</p>
            {analysis.materials.map(m => (
              <div key={m.id} className="flex justify-between gap-3">
                <span className="text-[#9ca3af] truncate">
                  {m.count}× {tierLabel(m.id)} {m.name}
                </span>
                <span className="font-mono text-right shrink-0">
                  <span className={MODE_COLORS[m.mode]}>{m.mode}</span>{' '}
                  <span className="text-[#e2e4ed]">{fmt(m.subtotal)}</span>
                </span>
              </div>
            ))}
            {analysis.silver > 0 && (
              <p className="text-[10px] text-[#6b7280] pt-0.5">+ {fmt(analysis.silver)} silver crafting fee</p>
            )}
            {analysis.stationFee > 0 && (
              <p className="text-[10px] text-[#6b7280] pt-0.5">+ {fmt(analysis.stationFee)} station fee (Craft Settings)</p>
            )}
            {analysis.amount > 1 && (
              <p className="text-[10px] text-[#6b7280] pt-0.5">per unit · crafts {analysis.amount} at once</p>
            )}
            <p className="text-[10px] text-[#6b7280] pt-0.5">bonus-aware return rates applied</p>
          </div>,
          document.body,
        )}
    </>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-6 ${strong ? 'font-semibold' : ''}`}>
      <span className={strong ? 'text-[#c4af64]' : 'text-[#c4af64]/60'}>{label}</span>
      <span className={`font-mono ${strong ? 'text-[#c4af64]' : 'text-[#e2e4ed]'}`}>{value}</span>
    </div>
  )
}
