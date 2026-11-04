import { useCallback, useEffect, useRef, useState } from 'react'
import { DataTable, type Column } from '../../components/DataTable'
import { Select, type SelectOption } from '../../components/Select'
import { getAudit, type ApiAudit } from './api'
import { useWowfAccess } from './access'
import { WowfGate } from './WowfGate'
import { formatWhen } from './eventTime'
import { Spinner } from './eventUi'

const PAGE = 100
const ANY = ''
const TYPE_OPTS: SelectOption[] = [ANY, 'raid', 'boss', 'item', 'character', 'event'].map(t => ({ value: t, label: t || 'All types' }))

// Detail object as a compact "key: value" line.
const detailText = (d: ApiAudit['detail']) =>
  Object.entries(d ?? {}).map(([k, v]) => `${k}: ${v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join(', ')

const columns: Column<ApiAudit>[] = [
  { key: 'time', label: 'Time', render: a => <span className="text-xs text-[#9ca3af]" title={a.created_at}>{formatWhen(a.created_at)}</span> },
  { key: 'actor', label: 'Actor', render: a => <>{a.actor?.username ?? <span className="text-[#6b7280]">system</span>}</> },
  { key: 'action', label: 'Action', render: a => <span className="text-[#c4af64]">{a.action}</span> },
  { key: 'target', label: 'Target', render: a => <span className="text-[#9ca3af]">{a.target_type}{a.target_id && <span className="text-xs text-[#4b5563]" title={a.target_id}> {a.target_id.slice(0, 8)}</span>}</span> },
  { key: 'detail', label: 'Details', render: a => <span className="text-xs text-[#6b7280]">{detailText(a.detail)}</span> },
]

function Log() {
  const [rows, setRows] = useState<ApiAudit[] | null>(null)
  const [type, setType] = useState(ANY)
  const [more, setMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const seq = useRef(0)
  const load = useCallback(async (targetType: string, before?: string) => {
    const n = ++seq.current
    setError(null)
    const res = await getAudit({ limit: PAGE, before, target_type: targetType || undefined })
    if (n !== seq.current) return  // superseded by a newer load
    if (res.status !== 'ok') { setError(res.message); return }
    setRows(prev => (before && prev ? [...prev, ...res.payload] : res.payload))
    setMore(res.payload.length === PAGE)
  }, [])

  useEffect(() => { load(type) }, [load, type])

  if (error && !rows) return <p className="text-sm text-red-400">{error}</p>
  if (!rows) return <Spinner />
  return (
    <div className="space-y-3">
      <div className="w-48"><Select aria-label="Target type" options={TYPE_OPTS} value={TYPE_OPTS.find(o => o.value === type) ?? TYPE_OPTS[0]} onChange={o => { setRows(null); setType(o?.value ?? ANY) }} /></div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {rows.length === 0 && <p className="text-sm text-[#6b7280]">Nothing logged yet.</p>}
      <DataTable columns={columns} data={rows} rowKey={a => a.id} />
      {more && <button type="button" onClick={() => load(type, rows[rows.length - 1].created_at)} className="forge-btn cursor-pointer">Load more</button>}
    </div>
  )
}

export function AuditLog() {
  const { leadership } = useWowfAccess()
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#e2e4ed]">Audit Log</h1>
        <p className="text-sm text-[#6b7280]">Who changed what, newest first. Leadership only.</p>
      </div>
      <WowfGate>
        {leadership ? <Log /> : <p className="text-sm text-red-400">This page is for WoW guild leadership.</p>}
      </WowfGate>
    </div>
  )
}
