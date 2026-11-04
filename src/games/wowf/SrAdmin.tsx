import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ConfirmButton } from '../../components/ConfirmButton'
import { DataTable, type Column } from '../../components/DataTable'
import { Select, type SelectOption } from '../../components/Select'
import {
  bossNames, deleteReserve, listAllReserves, listEvents, listItems, setReserveOutcome,
  type ApiEvent, type ApiItem, type ApiReserveWithEvent,
} from './api'
import { useWowfAccess } from './access'
import { WowfGate } from './WowfGate'
import { formatWhen } from './eventTime'
import { Spinner } from './eventUi'
import { CLASS_COLORS, RESERVE_OUTCOMES } from './roster'

const opt = (v: string): SelectOption => ({ value: v, label: v })
const OUTCOME_OPTS = RESERVE_OUTCOMES.map(opt)
const ANY = ''

function Admin() {
  const [params, setParams] = useSearchParams()
  const [rows, setRows] = useState<ApiReserveWithEvent[] | null>(null)
  const [events, setEvents] = useState<ApiEvent[]>([])
  const [items, setItems] = useState<ApiItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const eventId = params.get('event') ?? ANY
  const itemId = params.get('item') ?? ANY
  const outcome = params.get('outcome') ?? ANY

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const seq = useRef(0)
  const reload = useCallback(async () => {
    const n = ++seq.current
    const res = await listAllReserves({ event_id: eventId || undefined, item_id: itemId || undefined, outcome: outcome || undefined })
    if (n !== seq.current) return  // a newer filter's load won
    if (res.status === 'ok') setRows(res.payload)
    else setError(res.message)
  }, [eventId, itemId, outcome])

  useEffect(() => { reload() }, [reload])
  useEffect(() => {
    listEvents().then(res => { if (res.status === 'ok') setEvents(res.payload.filter(e => e.kind === 'raid')) })
    listItems().then(res => { if (res.status === 'ok') setItems(res.payload) })
  }, [])

  async function run(action: () => Promise<{ status: string; message?: string }>, what: string) {
    setError(null)
    const res = await action()
    if (res.status !== 'ok') setError(`${what} failed: ${res.message}`)
    await reload()
  }

  const eventOpts = useMemo<SelectOption[]>(() => [{ value: ANY, label: 'All raids' }, ...events.map(e => ({ value: e.id, label: `${formatWhen(e.starts_at)} ${e.name}` }))], [events])
  const itemOpts = useMemo<SelectOption[]>(() => [{ value: ANY, label: 'All items' }, ...items.map(i => ({ value: i.id, label: i.name }))], [items])
  const outcomeOpts = useMemo<SelectOption[]>(() => [{ value: ANY, label: 'Any outcome' }, ...OUTCOME_OPTS], [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (rows ?? []).filter(r => !q || r.character.name.toLowerCase().includes(q) || r.item.name.toLowerCase().includes(q))
  }, [rows, search])

  if (error && !rows) return <p className="text-sm text-red-400">{error}</p>
  if (!rows) return <Spinner />

  const columns: Column<ApiReserveWithEvent>[] = [
    { key: 'event', label: 'Event', sortKey: r => r.event.starts_at ?? '', render: r => (
      <Link to={`/wow-forever/events/${r.event.id}`} className="text-[#9ca3af] hover:text-[#c4af64]">
        <span className="text-xs text-[#6b7280]">{r.event.starts_at ? formatWhen(r.event.starts_at) : ''}</span> {r.event.name}
      </Link>
    ) },
    { key: 'character', label: 'Character', sortKey: r => r.character.name.toLowerCase(), render: r => <span style={{ color: CLASS_COLORS[r.character.class] ?? '#e2e4ed' }}>{r.character.name}</span> },
    { key: 'item', label: 'Item', sortKey: r => r.item.name.toLowerCase(), render: r => <>{r.item.name}{r.item.bosses.length > 0 && <span className="text-xs text-[#6b7280]"> · {bossNames(r.item)}</span>}</> },
    { key: 'plus', label: 'SR+', sortKey: r => r.plus, render: r => <span className="text-[#c4af64]">+{r.plus}</span>, className: 'text-right' },
    { key: 'outcome', label: 'Outcome', sortKey: r => r.outcome, render: r => (
      <div className="w-32"><Select aria-label={`Outcome ${r.character.name} ${r.item.name}`} options={OUTCOME_OPTS} value={opt(r.outcome)} onChange={o => o && run(() => setReserveOutcome(r.id, o.value), 'Setting the outcome')} /></div>
    ) },
    { key: 'actions', label: '', render: r => (
      <ConfirmButton label="Remove" ariaLabel={`Remove reserve ${r.character.name} ${r.item.name}`} confirmPrompt="Remove?" onConfirm={() => run(() => deleteReserve(r.id), 'Removing the reserve')} className="text-xs text-[#4b5563] hover:text-red-400" />
    ), className: 'w-20 text-right' },
  ]

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-72"><Select aria-label="Event filter" options={eventOpts} value={eventOpts.find(o => o.value === eventId) ?? eventOpts[0]} onChange={o => setFilter('event', o?.value ?? ANY)} /></div>
        <div className="w-56"><Select aria-label="Item filter" options={itemOpts} isSearchable value={itemOpts.find(o => o.value === itemId) ?? itemOpts[0]} onChange={o => setFilter('item', o?.value ?? ANY)} /></div>
        <div className="w-40"><Select aria-label="Outcome filter" options={outcomeOpts} value={outcomeOpts.find(o => o.value === outcome) ?? outcomeOpts[0]} onChange={o => setFilter('outcome', o?.value ?? ANY)} /></div>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search character or item…" aria-label="Search"
          className="bg-[#1a1d27] border border-[#2a2d3a] text-[#e2e4ed] rounded px-3 py-1.5 text-xs w-56 focus:outline-none focus:border-[#c4af64] placeholder-[#6b7280]" />
      </div>
      {filtered.length === 0
        ? <p className="text-sm text-[#6b7280] py-6 text-center">No reserves match.</p>
        : <DataTable columns={columns} data={filtered} rowKey={r => r.id} defaultSort="event" defaultSortDir="desc" footer={`${filtered.length} reserve${filtered.length === 1 ? '' : 's'}`} />}
    </div>
  )
}

export function SrAdmin() {
  const { leadership } = useWowfAccess()
  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#e2e4ed]">SR+ Admin</h1>
        <p className="text-sm text-[#6b7280]">Every reserve across the guild. Set outcomes after the loot drops; a win ends that character's streak (+10 per consecutive reserve) on the item.</p>
      </div>
      <WowfGate>
        {leadership ? <Admin /> : <p className="text-sm text-red-400">This page is for WoW guild leadership.</p>}
      </WowfGate>
    </div>
  )
}
