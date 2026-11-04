import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { DataTable, type Column } from '../../components/DataTable'
import { Select, type SelectOption } from '../../components/Select'
import { getAudit, getAuditFacets, type ApiAudit, type ApiAuditFacets } from './api'
import { useWowfAccess } from './access'
import { WowfGate } from './WowfGate'
import { formatWhen } from './eventTime'
import { Spinner } from './eventUi'

const PAGE = 100
const ANY = ''
const SEARCH_DELAY_MS = 300
const FILTERS = ['q', 'type', 'action', 'actor', 'target', 'from', 'to'] as const
type Filters = Record<(typeof FILTERS)[number], string>

// Detail object as a compact "key: value" line.
const detailText = (d: ApiAudit['detail']) =>
  Object.entries(d ?? {}).map(([k, v]) => `${k}: ${v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join(', ')

const targetLabel = (a: ApiAudit) => (typeof a.detail?.name === 'string' ? a.detail.name : a.target_id?.slice(0, 8) ?? '')

// A local calendar day as the UTC instant it starts (`days` later for an end bound).
const dayStart = (day: string, days = 0) => {
  const d = new Date(`${day}T00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

const anyOpt = (label: string): SelectOption => ({ value: ANY, label })
const pick = (opts: SelectOption[], v: string) => opts.find(o => o.value === v) ?? opts[0]

function Log() {
  const [params, setParams] = useSearchParams()
  const f = Object.fromEntries(FILTERS.map(k => [k, params.get(k) ?? ANY])) as Filters
  const [text, setText] = useState(f.q)
  const [rows, setRows] = useState<ApiAudit[] | null>(null)
  const [more, setMore] = useState(false)
  const [facets, setFacets] = useState<ApiAuditFacets>({ actions: [], target_types: [], actors: [] })
  const [error, setError] = useState<string | null>(null)

  const setFilter = useCallback((patch: Partial<Filters>) => {
    setParams(prev => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v)
        else next.delete(k)
      }
      return next
    }, { replace: true })
  }, [setParams])

  // Search as you type, once typing pauses.
  useEffect(() => {
    if (text.trim() === f.q) return
    const t = setTimeout(() => setFilter({ q: text.trim() }), SEARCH_DELAY_MS)
    return () => clearTimeout(t)
  }, [text, f.q, setFilter])

  useEffect(() => {
    getAuditFacets().then(res => { if (res.status === 'ok') setFacets(res.payload) })
  }, [])

  const query = useMemo(() => ({
    q: f.q || undefined, target_type: f.type || undefined, action: f.action || undefined,
    actor: f.actor || undefined, target_id: f.target || undefined,
    since: f.from ? dayStart(f.from) : undefined, until: f.to ? dayStart(f.to, 1) : undefined,
  }), [f.q, f.type, f.action, f.actor, f.target, f.from, f.to])

  const seq = useRef(0)
  const load = useCallback(async (before?: string) => {
    const n = ++seq.current
    setError(null)
    const { until, ...rest } = query
    const res = await getAudit({ ...rest, limit: PAGE, before: before ?? until })
    if (n !== seq.current) return  // superseded by a newer load
    if (res.status !== 'ok') { setError(res.message); return }
    setRows(prev => (before && prev ? [...prev, ...res.payload] : res.payload))
    setMore(res.payload.length === PAGE)
  }, [query])

  useEffect(() => { load() }, [load])

  const typeOpts = [anyOpt('All types'), ...facets.target_types.map(t => ({ value: t, label: t }))]
  const actionOpts = [anyOpt('All actions'), ...facets.actions.map(a => ({ value: a, label: a }))]
  const actorOpts = [anyOpt('Everyone'), ...facets.actors.map(a => ({ value: a.id, label: a.username }))]
  const filtered = FILTERS.some(k => f[k])
  const targetRow = f.target ? rows?.find(a => a.target_id === f.target) : undefined

  const columns: Column<ApiAudit>[] = [
    { key: 'time', label: 'Time', render: a => <span className="text-xs text-[#9ca3af]" title={a.created_at}>{formatWhen(a.created_at)}</span> },
    {
      key: 'actor', label: 'Actor', render: a => (a.actor
        ? <button type="button" onClick={() => setFilter({ actor: a.actor!.id })} title="Only this person" className="hover:text-[#c4af64] cursor-pointer">{a.actor.username}</button>
        : <span className="text-[#6b7280]">system</span>),
    },
    { key: 'action', label: 'Action', render: a => <button type="button" onClick={() => setFilter({ action: a.action })} title="Only this action" className="text-[#c4af64] hover:text-[#e2e4ed] cursor-pointer">{a.action}</button> },
    {
      key: 'target', label: 'Target', render: a => (
        <span className="text-[#9ca3af]">
          {a.target_type}
          {a.target_id && <> <button type="button" onClick={() => setFilter({ target: a.target_id!, type: a.target_type })} title="History of this target" className="text-xs text-[#6b7280] hover:text-[#c4af64] cursor-pointer">{targetLabel(a)}</button></>}
        </span>
      ),
    },
    { key: 'detail', label: 'Details', render: a => <span className="text-xs text-[#6b7280]">{detailText(a.detail)}</span> },
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <input type="search" aria-label="Search the log" placeholder="Search names, actions, details" value={text} onChange={e => setText(e.target.value)} maxLength={100} className="forge-input w-64" />
        <div className="w-40"><Select aria-label="Target type" options={typeOpts} value={pick(typeOpts, f.type)} onChange={o => setFilter({ type: o?.value ?? ANY, target: ANY })} /></div>
        <div className="w-48"><Select aria-label="Action" options={actionOpts} value={pick(actionOpts, f.action)} onChange={o => setFilter({ action: o?.value ?? ANY })} /></div>
        <div className="w-40"><Select aria-label="Actor" options={actorOpts} value={pick(actorOpts, f.actor)} onChange={o => setFilter({ actor: o?.value ?? ANY })} /></div>
        <label className="text-xs text-[#6b7280] flex flex-col gap-1">From<input type="date" aria-label="From" value={f.from} max={f.to || undefined} onChange={e => setFilter({ from: e.target.value })} className="forge-input" /></label>
        <label className="text-xs text-[#6b7280] flex flex-col gap-1">To<input type="date" aria-label="To" value={f.to} min={f.from || undefined} onChange={e => setFilter({ to: e.target.value })} className="forge-input" /></label>
        {filtered && <button type="button" onClick={() => { setText(''); setFilter(Object.fromEntries(FILTERS.map(k => [k, ANY]))) }} className="text-xs text-[#6b7280] hover:text-[#e2e4ed] cursor-pointer pb-2">Clear filters</button>}
      </div>
      {f.target && (
        <p className="text-sm text-[#9ca3af]">
          History of {f.type || 'target'} <span className="text-[#e2e4ed]">{targetRow ? targetLabel(targetRow) : f.target.slice(0, 8)}</span>{' '}
          <button type="button" onClick={() => setFilter({ target: ANY })} aria-label="Show every target" className="text-[#6b7280] hover:text-[#e2e4ed] cursor-pointer">×</button>
        </p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!rows && !error && <Spinner />}
      {rows && rows.length === 0 && <p className="text-sm text-[#6b7280]">{filtered ? 'Nothing matches these filters.' : 'Nothing logged yet.'}</p>}
      {rows && rows.length > 0 && <DataTable columns={columns} data={rows} rowKey={a => a.id} footer={`${rows.length}${more ? '+' : ''} entr${rows.length === 1 && !more ? 'y' : 'ies'}`} />}
      {rows && more && <button type="button" onClick={() => load(rows[rows.length - 1].created_at)} className="forge-btn cursor-pointer">Load more</button>}
    </div>
  )
}

export function AuditLog() {
  const { leadership } = useWowfAccess()
  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#e2e4ed]">Audit Log</h1>
      </div>
      <WowfGate>
        {leadership ? <Log /> : <p className="text-sm text-red-400">This page is for WoW guild leadership.</p>}
      </WowfGate>
    </div>
  )
}
