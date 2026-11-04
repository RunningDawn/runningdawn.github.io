import { useEffect, useRef } from 'react'
import { DAYS, hourLabel } from './weekTime'

// mark = event outline, glow = highlighted window, label = small count in the cell.
export interface GridCell { on: boolean; bg?: string; title?: string; mark?: boolean; glow?: boolean; label?: string | number }

interface Props {
  cell: (weekday: number, hour: number) => GridCell
  onPaint?: (weekday: number, hour: number, on: boolean) => void
  onHover?: (weekday: number | null, hour: number | null) => void
}

const HOURS = Array.from({ length: 24 }, (_, h) => h)

// 7 x 24 hour grid. Drag paints: the first cell decides whether the stroke turns cells on or off.
export function HourGrid({ cell, onPaint, onHover }: Props) {
  const mode = useRef<boolean | null>(null)
  useEffect(() => {
    const up = () => { mode.current = null }
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  return (
    <div className="grid gap-px select-none text-[10px]" style={{ gridTemplateColumns: '2.75rem repeat(7, minmax(0, 1fr))' }} onMouseLeave={() => onHover?.(null, null)}>
      <div />
      {DAYS.map(d => <div key={d} className="text-center text-[#9ca3af] pb-1">{d}</div>)}
      {HOURS.map(h => (
        <div key={h} className="contents">
          <div className="text-right pr-2 text-[#6b7280] leading-5">{hourLabel(h)}</div>
          {DAYS.map((d, wd) => {
            const c = cell(wd, h)
            return (
              <button
                key={d}
                type="button"
                aria-label={`${d} ${hourLabel(h)}`}
                aria-pressed={c.on}
                title={c.title}
                className={`h-5 rounded-sm border border-[#1f2230] text-[9px] leading-none font-semibold text-[#e2e4ed] ${onPaint ? 'cursor-pointer' : 'cursor-default'}`}
                style={{
                  background: c.bg ?? (c.on ? '#c4af64' : '#141620'), outline: c.mark ? '2px solid #60a5fa' : undefined, outlineOffset: '-2px',
                  boxShadow: c.glow ? '0 0 0 2px #f8fafc, 0 0 8px 1px #f8fafc' : undefined, zIndex: c.glow ? 1 : undefined, position: c.glow ? 'relative' : undefined,
                  textShadow: c.label ? '0 0 2px #000' : undefined,
                }}
                onMouseDown={onPaint && (e => { e.preventDefault(); mode.current = !c.on; onPaint(wd, h, mode.current) })}
                onMouseEnter={() => { onHover?.(wd, h); if (onPaint && mode.current !== null) onPaint(wd, h, mode.current) }}
                onFocus={() => onHover?.(wd, h)}
                onKeyDown={onPaint && (e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onPaint(wd, h, !c.on) } })}
              >{c.label}</button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
