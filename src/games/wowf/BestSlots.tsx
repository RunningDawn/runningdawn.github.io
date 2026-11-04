import { Select, type SelectOption } from '../../components/Select'
import type { ApiBestSlot } from './api'
import { ROLE_TILES } from './roster'
import { HOUR, windowKeys } from './weekTime'

const LENGTH_OPTS: SelectOption[] = [1, 2, 3, 4, 5, 6].map(h => ({ value: String(h), label: `${h}h` }))

const when = (iso: string, tz: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz, ...opts })

// The guild's best windows this week (most people free for the whole stretch).
// Hovering or focusing one hands its hour keys up so the grid can highlight them.
export function BestSlots({ best, tz, length, onLength, onHover }: {
  best: ApiBestSlot[] | null; tz: string; length: number
  onLength: (hours: number) => void; onHover: (keys: Set<string> | null) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="forge-label">Best times</span>
        <div className="w-20"><Select aria-label="Window length" options={LENGTH_OPTS} value={LENGTH_OPTS.find(o => o.value === String(length))!} onChange={o => o && onLength(Number(o.value))} /></div>
      </div>
      {best === null && <p className="text-xs text-[#6b7280]">Loading…</p>}
      {best?.length === 0 && <p className="text-xs text-[#6b7280]">Nobody is free for {length}h straight this week yet.</p>}
      <ul className="space-y-1" onMouseLeave={() => onHover(null)}>
        {best?.map(b => (
          <li key={b.start} tabIndex={0} aria-label={`Best time ${when(b.start, tz, { weekday: 'short' })}`}
            onMouseEnter={() => onHover(windowKeys(b.start, b.hours))} onFocus={() => onHover(windowKeys(b.start, b.hours))} onBlur={() => onHover(null)}
            className="rounded px-2 py-1.5 bg-[#0f1117] hover:bg-[#2a2d3a] focus:bg-[#2a2d3a] outline-none cursor-default">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-[#e2e4ed]">{when(b.start, tz, { weekday: 'short' })} to {when(new Date(Date.parse(b.start) + b.hours * HOUR).toISOString(), tz, {})}</span>
              <span className="text-xs text-[#c4af64] shrink-0">{b.total} free</span>
            </div>
            <div className="flex gap-2 text-[10px]">
              {ROLE_TILES.filter(t => b[t.key] > 0).map(t => <span key={t.key} className={t.text}>{b[t.key]} {b[t.key] === 1 ? t.one : t.label}</span>)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
