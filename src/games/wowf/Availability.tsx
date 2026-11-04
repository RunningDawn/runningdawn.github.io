import { useCallback, useEffect, useMemo, useState } from 'react'
import { getMyAvailability, putAvailabilitySettings, putWeeks, type ApiAvailability } from './api'
import { HourGrid } from './HourGrid'
import { TimezoneSelect } from './TimezoneSelect'
import { Spinner } from './eventUi'
import {
  DAY, WEEK, browserTz, cellInstant, isoDate, localMonday, onTzChange, slotInstant, slotKey, toSlot, utcMonday, weekLabel,
} from './weekTime'

const WEEKS = 4
const BTN = 'forge-btn cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'

function Editor() {
  const [tz, setTz] = useState(browserTz)
  const [data, setData] = useState<ApiAvailability | null>(null)
  const [keys, setKeys] = useState<Set<string>>(new Set())
  const [fromDefault, setFromDefault] = useState<Set<string>>(new Set())
  const [defSet, setDefSet] = useState<Set<number>>(new Set())
  const [tab, setTab] = useState<number | 'default'>(0)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const firstWall = useMemo(() => localMonday(new Date(), tz), [tz])
  // Everything the four local weeks (plus the one before, for "copy last week") can touch in UTC.
  const rangeStart = useMemo(() => utcMonday(cellInstant(firstWall - WEEK, 0, 0, tz)), [firstWall, tz])

  const load = useCallback(async () => {
    const res = await getMyAvailability(isoDate(rangeStart), 7)
    if (res.status !== 'ok') { setError(res.message); return }
    setData(res.payload)
    setKeys(new Set(res.payload.weeks.flatMap(w => w.hours.map(h => slotKey(slotInstant(w.week_start, h))))))
    setFromDefault(new Set(res.payload.weeks.filter(w => w.from_default).map(w => w.week_start)))
    setDefSet(new Set(res.payload.default_hours ?? []))
    setDirty(false)
    if (res.payload.tz && res.payload.tz !== tz) setTz(res.payload.tz)
  }, [rangeStart, tz])
  useEffect(() => { load() }, [load])
  useEffect(() => onTzChange(setTz), [])

  const wall = typeof tab === 'number' ? firstWall + tab * WEEK : firstWall
  const instant = (wd: number, h: number) => cellInstant(wall, wd, h, tz)
  const touched = useMemo(() => {
    const set = new Set<string>()
    for (let wd = 0; wd < 7; wd++) for (let h = 0; h < 24; h++) set.add(toSlot(instant(wd, h)).week_start)
    return set
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wall, tz])
  const usingDefault = typeof tab === 'number' && data?.default_hours != null && [...touched].every(w => fromDefault.has(w))

  function paint(wd: number, h: number, on: boolean) {
    setDirty(true)
    setNotice(null)
    if (tab === 'default') {
      setDefSet(prev => { const next = new Set(prev); const o = wd * 24 + h; if (on) next.add(o); else next.delete(o); return next })
      return
    }
    const k = slotKey(instant(wd, h))
    setKeys(prev => { const next = new Set(prev); if (on) next.add(k); else next.delete(k); return next })
  }

  // Rewrite every cell of the shown week from a predicate.
  function fill(pred: (wd: number, h: number) => boolean) {
    setKeys(prev => {
      const next = new Set(prev)
      for (let wd = 0; wd < 7; wd++) for (let h = 0; h < 24; h++) {
        const k = slotKey(instant(wd, h))
        if (pred(wd, h)) next.add(k); else next.delete(k)
      }
      return next
    })
    setDirty(true)
    setNotice(null)
  }

  async function save() {
    setError(null)
    if (tab === 'default') {
      const res = await putAvailabilitySettings(tz, [...defSet].sort((a, b) => a - b))
      if (res.status !== 'ok') { setError(`Saving failed: ${res.message}`); return }
      setData(d => d && { ...d, default_hours: res.payload.default_hours })
      setDirty(false)
      setNotice('Default week saved. Weeks you have not filled in use it.')
      return
    }
    // A local week can spill into a second UTC week; save both so a cleared cell stays cleared.
    const hours: Record<string, number[]> = Object.fromEntries([...touched].map(w => [w, []]))
    for (const k of keys) {
      const s = toSlot(new Date(k))
      if (s.week_start in hours) hours[s.week_start].push(s.h)
    }
    const res = await putWeeks(Object.entries(hours).map(([week_start, hs]) => ({ week_start, hours: hs })))
    if (res.status !== 'ok') { setError(`Saving failed: ${res.message}`); return }
    setFromDefault(prev => { const next = new Set(prev); for (const w of touched) next.delete(w); return next })
    setDirty(false)
    setNotice('Week saved.')
  }

  async function changeTz(next: string) {
    if (dirty) { setError('Save your changes before switching timezone.'); return }
    setError(null)
    const res = await putAvailabilitySettings(next, data?.default_hours ?? null)
    if (res.status !== 'ok') { setError(`Saving timezone failed: ${res.message}`); return }
    setTz(next)
  }

  if (error && !data) return <p className="text-sm text-red-400">{error}</p>
  if (!data) return <Spinner />

  const cell = (wd: number, h: number) => tab === 'default'
    ? { on: defSet.has(wd * 24 + h) }
    : { on: keys.has(slotKey(instant(wd, h))), bg: usingDefault && keys.has(slotKey(instant(wd, h))) ? '#c4af6480' : undefined }

  return (
    <div className="forge-card space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <label className="flex flex-col gap-1 w-72"><span className="forge-label">Timezone</span>
          <TimezoneSelect value={tz} onChange={changeTz} />
        </label>
        <p className="text-xs text-[#6b7280] pb-2">Times shown in {tz.replace(/_/g, ' ')}. Saved in UTC, so the grid follows you if you change timezone.</p>
      </div>

      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: WEEKS }, (_, i) => (
          <button key={i} type="button" onClick={() => setTab(i)} className={`px-3 py-1 rounded text-xs cursor-pointer ${tab === i ? 'bg-[#c4af64]/15 text-[#c4af64]' : 'text-[#9ca3af] hover:bg-[#2a2d3a]'}`}>
            {i === 0 ? 'This week' : `Week of ${weekLabel(firstWall + i * WEEK)}`}
          </button>
        ))}
        <button type="button" onClick={() => setTab('default')} className={`px-3 py-1 rounded text-xs cursor-pointer ${tab === 'default' ? 'bg-[#c4af64]/15 text-[#c4af64]' : 'text-[#9ca3af] hover:bg-[#2a2d3a]'}`}>Default week</button>
      </div>

      {typeof tab === 'number' && (
        <p className="text-xs text-[#6b7280]">
          {weekLabel(wall)} to {weekLabel(wall + 6 * DAY)}. Click or drag the hours you can play.
          {usingDefault && <span className="text-[#c4af64]"> Showing your default week; save to make it explicit.</span>}
        </p>
      )}
      {tab === 'default' && <p className="text-xs text-[#6b7280]">Your usual week. Applies to any week you have not filled in. Saved in your local time, so it follows daylight-saving changes on its own.</p>}

      <HourGrid cell={cell} onPaint={paint} />

      <div className="flex gap-2 flex-wrap items-center">
        <button type="button" onClick={save} disabled={!dirty} className="forge-btn-active cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">{tab === 'default' ? 'Save default' : 'Save week'}</button>
        {typeof tab === 'number' && (
          <>
            <button type="button" className={BTN} onClick={() => fill((wd, h) => keys.has(slotKey(cellInstant(wall - WEEK, wd, h, tz))))}>Copy last week</button>
            <button type="button" className={BTN} disabled={data.default_hours == null} onClick={() => fill((wd, h) => defSet.has(wd * 24 + h))}>Apply default</button>
          </>
        )}
        <button type="button" className={BTN} onClick={() => (tab === 'default' ? (setDefSet(new Set()), setDirty(true)) : fill(() => false))}>Clear</button>
        {error && <span className="text-sm text-red-400">{error}</span>}
        {notice && <span className="text-sm text-[#c4af64]">{notice}</span>}
      </div>
    </div>
  )
}

export function Availability() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#e2e4ed]">Availability</h1>
        <p className="text-sm text-[#6b7280]">Mark the hours you can play, week by week. Leadership plans events around the heatmap this builds.</p>
      </div>
      <Editor />
    </div>
  )
}
