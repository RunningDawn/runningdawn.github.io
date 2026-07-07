import { useEffect, useRef, useState } from 'react'
import { savePriceOverride, clearPriceOverride } from './albionItemsApi'
import { emitOverridesChanged } from '../premium'

// Inline pencil that sets or clears a shared manual price override for one market
// (item + city + quality). Use it when the crowdsourced ADP price is stale or wrong:
// the entered value replaces the ADP price for everyone, on the item tables and in
// Best Value. Saving/clearing bumps the overrides signal so open tables refetch.
//
// The popover is position:fixed anchored to the pencil so the table's internal
// overflow-auto scroll container can't clip it; it dismisses on Escape or outside click.
export function PriceOverrideEditor({ itemId, city, quality, current, isOverride, label }: {
  itemId: string
  city: string
  quality: number
  current: number | null
  isOverride: boolean
  label?: string // when set, render a full text button instead of the bare ✎ pencil
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  const open = pos !== null

  function toggle() {
    if (open) {
      setPos(null)
      return
    }
    setValue(current != null ? String(current) : '')
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) setPos({ top: rect.bottom + 4, left: rect.left })
  }

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPos(null)
    }
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (!popRef.current?.contains(t) && !btnRef.current?.contains(t)) setPos(null)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [open])

  async function save() {
    const n = Math.round(Number(value))
    if (!Number.isFinite(n) || n <= 0) return
    setBusy(true)
    const res = await savePriceOverride(itemId, city, quality, n)
    setBusy(false)
    if (res.status === 'ok') {
      emitOverridesChanged()
      setPos(null)
    }
  }

  async function clear() {
    setBusy(true)
    const res = await clearPriceOverride(itemId, city, quality)
    setBusy(false)
    if (res.status === 'ok') {
      emitOverridesChanged()
      setPos(null)
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className={label
          ? `rounded border px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
              isOverride
                ? 'border-[#c4af64]/50 text-[#c4af64] hover:bg-[#2a2d3a]'
                : 'border-[#2a2d3a] text-[#9ca3af] hover:border-[#c4af64] hover:text-[#c4af64]'
            }`
          : `rounded px-1 text-sm leading-none cursor-pointer transition-colors ${
              isOverride
                ? 'text-[#c4af64] hover:text-[#dcc87e]'
                : 'text-[#9ca3af] hover:text-[#c4af64] hover:bg-[#2a2d3a]'
            }`}
        title={isOverride
          ? 'Edit the manual price for this market'
          : 'Set a manual price (when the scanned data is stale)'}
        aria-label="Edit market price"
      >
        {label ? (isOverride ? 'Edit Price Override' : label) : '✎'}
      </button>
      {open && (
        <div
          ref={popRef}
          className="fixed z-50 flex items-center gap-2 rounded-md border border-[#2a2d3a] bg-[#1a1d27] p-2.5 shadow-xl"
          style={{ top: pos.top, left: pos.left }}
        >
          <input
            type="number"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save() }}
            placeholder="price in silver"
            className="w-36 rounded border border-[#2a2d3a] bg-[#0f1117] px-2.5 py-1.5 text-sm text-[#e2e4ed] focus:border-[#c4af64] focus:outline-none"
            aria-label="Manual price in silver"
            autoFocus
          />
          <button
            onClick={save}
            disabled={busy}
            className="cursor-pointer rounded px-2 py-1 text-sm text-[#4ade80] hover:bg-[#2a2d3a] hover:text-[#86efac]"
            title="Save"
          >
            {'✓'}
          </button>
          {isOverride && (
            <button
              onClick={clear}
              disabled={busy}
              className="cursor-pointer rounded px-2 py-1 text-sm text-[#f87171] hover:bg-[#2a2d3a] hover:text-[#fca5a5]"
              title="Clear override (fall back to scanned data)"
            >
              {'✕'}
            </button>
          )}
        </div>
      )}
    </>
  )
}
