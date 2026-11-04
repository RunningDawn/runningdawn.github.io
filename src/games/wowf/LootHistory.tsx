import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { DataTable, type Column } from '../../components/DataTable'
import { Select, type SelectOption } from '../../components/Select'
import { listDrops, listEvents, type ApiDrop, type ApiEvent } from './api'
import { WowfGate } from './WowfGate'
import { formatWhen } from './eventTime'
import { DropKind, Spinner } from './eventUi'
import { CLASS_COLORS } from './roster'

const ANY = ''

function History() {
  const [rows, setRows] = useState<ApiDrop[] | null>(null)
  const [events, setEvents] = useState<ApiEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [eventId, setEventId] = useState(ANY)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let live = true
    listDrops({ event_id: eventId || undefined }).then(res => {
      if (!live) return
      if (res.status === 'ok') setRows(res.payload)
      else setError(res.message)
    })
    return () => { live = false }
  }, [eventId])
  useEffect(() => {
    listEvents().then(res => { if (res.status === 'ok') setEvents(res.payload.filter(e => e.kind === 'raid')) })
  }, [])

  const eventOpts = useMemo<SelectOption[]>(() => [{ value: ANY, label: 'All raids' }, ...events.map(e => ({ value: e.id, label: `${formatWhen(e.starts_at)} ${e.name}` }))], [events])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (rows ?? []).filter(d => !q || d.item.name.toLowerCase().includes(q) || d.character?.name.toLowerCase().includes(q))
  }, [rows, search])

  if (error && !rows) return <p className="text-sm text-red-400">{error}</p>
  if (!rows) return <Spinner />

  const columns: Column<ApiDrop>[] = [
    { key: 'event', label: 'Event', sortKey: d => d.event.starts_at ?? '', render: d => (
      <Link to={`/wow-forever/loot/${d.event.id}`} className="text-[#9ca3af] hover:text-[#c4af64]">
        <span className="text-xs text-[#6b7280]">{d.event.starts_at ? formatWhen(d.event.starts_at) : ''}</span> {d.event.name}
      </Link>
    ) },
    { key: 'item', label: 'Item', sortKey: d => d.item.name.toLowerCase(), render: d => <>{d.item.name}{d.boss && <span className="text-xs text-[#6b7280]"> · {d.boss.name}</span>}</> },
    { key: 'winner', label: 'Winner', sortKey: d => d.character?.name.toLowerCase() ?? '', render: d => d.character
      ? <span style={{ color: CLASS_COLORS[d.character.class] ?? '#e2e4ed' }}>{d.character.name}</span>
      : <span className="text-[#6b7280]">Disenchanted</span> },
    { key: 'kind', label: 'How', sortKey: d => d.character ? (d.sr ? 2 : 1) : 0, render: d => <DropKind drop={d} /> },
    { key: 'when', label: 'Recorded', sortKey: d => d.created_at ?? '', render: d => <span className="text-xs text-[#6b7280]">{d.created_at ? formatWhen(d.created_at) : ''}</span> },
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-72"><Select aria-label="Event filter" options={eventOpts} value={eventOpts.find(o => o.value === eventId) ?? eventOpts[0]} onChange={o => setEventId(o?.value ?? ANY)} /></div>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search item or winner…" aria-label="Search"
          className="bg-[#1a1d27] border border-[#2a2d3a] text-[#e2e4ed] rounded px-3 py-1.5 text-xs w-56 focus:outline-none focus:border-[#c4af64] placeholder-[#6b7280]" />
      </div>
      {filtered.length === 0
        ? <p className="text-sm text-[#6b7280] py-6 text-center">No loot recorded yet.</p>
        : <DataTable columns={columns} data={filtered} rowKey={d => d.id} defaultSort="event" defaultSortDir="desc" footer={`${filtered.length} drop${filtered.length === 1 ? '' : 's'}`} />}
    </div>
  )
}

export function LootHistory() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#e2e4ed]">Loot History</h1>
        <p className="text-sm text-[#6b7280]">Everything that dropped on guild raids and who took it. SR wins show the +X the winner had at the time.</p>
      </div>
      <WowfGate>
        <History />
      </WowfGate>
    </div>
  )
}
