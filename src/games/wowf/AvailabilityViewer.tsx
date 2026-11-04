import { useEffect, useMemo, useState } from 'react'
import { getHeatmap, getMyAvailability, listEvents, type ApiEvent, type ApiHeatmap } from './api'
import { useWowfAccess } from './access'
import { HourGrid } from './HourGrid'
import { Spinner } from './eventUi'
import { WowfGate } from './WowfGate'
import { roleCounts, roleSummary } from './roster'
import { DAY, DAYS, WEEK, browserTz, cellInstant, hourLabel, isoDate, localMonday, slotKey, utcMonday, weekLabel } from './weekTime'

const WEEKS = 4

function Viewer() {
  const [tz, setTz] = useState(browserTz)
  const [data, setData] = useState<ApiHeatmap | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState(0)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [hover, setHover] = useState<{ wd: number; h: number } | null>(null)
  const [events, setEvents] = useState<ApiEvent[]>([])
  const [showEvents, setShowEvents] = useState(false)

  const firstWall = useMemo(() => localMonday(new Date(), tz), [tz])
  const rangeStart = useMemo(() => utcMonday(cellInstant(firstWall, 0, 0, tz)), [firstWall, tz])

  useEffect(() => {
    // Own saved timezone drives the grid; the heatmap itself is UTC.
    getMyAvailability(isoDate(rangeStart), 1).then(res => { if (res.status === 'ok' && res.payload.tz) setTz(res.payload.tz) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    listEvents().then(res => { if (res.status === 'ok') setEvents(res.payload.filter(e => !e.cancelled)) })
  }, [])
  useEffect(() => {
    let live = true
    getHeatmap(isoDate(rangeStart), 6).then(res => {
      if (!live) return
      if (res.status === 'ok') setData(res.payload)
      else setError(res.message)
    })
    return () => { live = false }
  }, [rangeStart])

  const wall = firstWall + tab * WEEK
  const names = useMemo(() => new Map((data?.users ?? []).map(u => [u.user_id, u.nickname ?? u.username])), [data])
  const roles = useMemo(() => new Map((data?.users ?? []).map(u => [u.user_id, u.role])), [data])
  const eventsAt = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const e of events) {
      // Every hour cell from the start hour up to (not including) the end.
      const end = Date.parse(e.ends_at)
      const first = Math.floor(Date.parse(e.starts_at) / 3600_000) * 3600_000
      for (let t = first; t === first || t < end; t += 3600_000) {
        const k = slotKey(new Date(t)); m.set(k, [...(m.get(k) ?? []), e.name])
      }
    }
    return m
  }, [events])
  const evAt = (wd: number, h: number) => (showEvents ? eventsAt.get(slotKey(cellInstant(wall, wd, h, tz))) ?? [] : [])
  const who = (wd: number, h: number) => data?.slots[slotKey(cellInstant(wall, wd, h, tz))] ?? []
  const max = useMemo(() => Math.max(1, ...Object.values(data?.slots ?? {}).map(v => v.length)), [data])
  const quiet = useMemo(() => {
    const seen = new Set(Object.values(data?.slots ?? {}).flat())
    return (data?.users ?? []).filter(u => !seen.has(u.user_id))
  }, [data])

  const cell = (wd: number, h: number) => {
    const ids = who(wd, h)
    const ev = evAt(wd, h)
    const extra = { title: ev.length ? ev.join(', ') : undefined, mark: ev.length > 0 }
    if (picked.size === 0) return { on: ids.length > 0, bg: ids.length ? `rgba(196,175,100,${0.15 + 0.85 * ids.length / max})` : undefined, ...extra }
    const hits = [...picked].filter(id => ids.includes(id)).length
    return { on: hits > 0, bg: hits === picked.size ? '#22c55e' : hits > 0 ? '#d97706' : undefined, ...extra }
  }
  const togglePick = (id: string) => setPicked(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })

  if (error) return <p className="text-sm text-red-400">{error}</p>
  if (!data) return <Spinner />

  const hovered = hover ? who(hover.wd, hover.h) : []
  const hoveredEvents = hover ? evAt(hover.wd, hover.h) : []
  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: WEEKS }, (_, i) => (
          <button key={i} type="button" onClick={() => setTab(i)} className={`px-3 py-1 rounded text-xs cursor-pointer ${tab === i ? 'bg-[#c4af64]/15 text-[#c4af64]' : 'text-[#9ca3af] hover:bg-[#2a2d3a]'}`}>
            {i === 0 ? 'This week' : `Week of ${weekLabel(firstWall + i * WEEK)}`}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-[#9ca3af] cursor-pointer">
          <input type="checkbox" checked={showEvents} onChange={e => setShowEvents(e.target.checked)} /> Show events
        </label>
      </div>
      <p className="text-xs text-[#6b7280]">{weekLabel(wall)} to {weekLabel(wall + 6 * DAY)}, shown in {tz.replace(/_/g, ' ')}. Hover a cell for who is free and their mains' roles; pick people below to see when they overlap (green = everyone picked, amber = some).</p>

      <div className="flex flex-wrap gap-1.5">
        {data.users.map(u => (
          <button key={u.user_id} type="button" aria-pressed={picked.has(u.user_id)} onClick={() => togglePick(u.user_id)}
            className={`px-2 py-0.5 rounded text-xs cursor-pointer border ${picked.has(u.user_id) ? 'border-[#c4af64] text-[#c4af64] bg-[#c4af64]/10' : 'border-[#2a2d3a] text-[#9ca3af] hover:text-[#e2e4ed]'}`}>
            {u.nickname ?? u.username}
          </button>
        ))}
        {picked.size > 0 && <button type="button" onClick={() => setPicked(new Set())} className="text-xs text-[#6b7280] hover:text-[#e2e4ed] cursor-pointer px-2">Clear picks</button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_14rem] gap-4 items-start">
        <div className="forge-card"><HourGrid cell={cell} onHover={(wd, h) => setHover(wd === null || h === null ? null : { wd, h })} /></div>
        <aside className="forge-card text-sm min-h-24" aria-live="polite">
          {hover
            ? (
              <>
                <p className="text-[#e2e4ed]">{DAYS[hover.wd]} {hourLabel(hover.h)} &middot; {hovered.length} available</p>
                <p className="text-xs text-[#9ca3af]">{roleSummary(roleCounts(hovered.map(id => roles.get(id))), hovered.length)}</p>
                {hoveredEvents.length > 0 && <p className="text-xs text-sky-300">Event: {hoveredEvents.join(', ')}</p>}
                <ul className="mt-2 space-y-0.5 text-xs text-[#9ca3af]">
                  {hovered.map(id => <li key={id} className={picked.has(id) ? 'text-[#c4af64]' : ''}>{names.get(id) ?? id}</li>)}
                </ul>
              </>
            )
            : <p className="text-[#6b7280]">Hover a cell.</p>}
        </aside>
      </div>

      {quiet.length > 0 && <p className="text-xs text-[#6b7280]">Nothing entered yet: {quiet.map(u => u.nickname ?? u.username).join(', ')}</p>}
    </div>
  )
}

export function AvailabilityViewer() {
  const { leadership } = useWowfAccess()
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#e2e4ed]">Availability Viewer</h1>
        <p className="text-sm text-[#6b7280]">When the guild can play, week by week.</p>
      </div>
      <WowfGate>{leadership ? <Viewer /> : <p className="text-sm text-red-400">Leadership only.</p>}</WowfGate>
    </div>
  )
}
