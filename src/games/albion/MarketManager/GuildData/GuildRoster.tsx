import { useState, useEffect, useMemo } from 'react'
import { DataTable, type Column } from '../../../../components/DataTable'
import { albionFetch } from '../../api'
const DAY_MS = 86_400_000
const MONTH_MS = 30 * DAY_MS
const FORTY8_H_MS = 2 * DAY_MS

interface LifetimeStats {
  Total: number; Royal: number; Outlands: number; Avalon: number
  Hellgate: number; CorruptedDungeon: number; Mists: number
}

interface GatheringStats {
  Fiber: LifetimeStats; Hide: LifetimeStats; Ore: LifetimeStats
  Rock: LifetimeStats; Wood: LifetimeStats; All: LifetimeStats
}

interface MemberData {
  Name: string; Id: string; GuildName: string; GuildId: string
  AllianceName: string | null; AllianceId: string; AllianceTag: string
  KillFame: number; DeathFame: number; FameRatio: number
  LifetimeStatistics: {
    PvE: LifetimeStats; Gathering: GatheringStats; Crafting: LifetimeStats
    CrystalLeague: number; FishingFame: number; FarmingFame: number; Timestamp: string | null
  }
}

type ZoneKey = keyof LifetimeStats

const ZONES: { key: ZoneKey; label: string }[] = [
  { key: 'Total', label: 'All' },
  { key: 'Royal', label: 'Royal' },
  { key: 'Outlands', label: 'Outlands' },
  { key: 'Avalon', label: 'Avalon' },
  { key: 'Hellgate', label: 'Hellgate' },
  { key: 'CorruptedDungeon', label: 'Corrupted Dungeon' },
  { key: 'Mists', label: 'Mists' },
]

function fmt(n: number | undefined): string { return (n ?? 0).toLocaleString('en-US') }
function zoneCell(v: number | undefined) {
  if (v === undefined) return <span className="text-[#2a2d3a] select-none">-</span>
  return <>{fmt(v)}</>
}

function totalFame(m: MemberData): number {
  return m.LifetimeStatistics.PvE.Total
    + m.LifetimeStatistics.Gathering.All.Total
    + m.LifetimeStatistics.Crafting.Total
    + m.KillFame
}

function tsCell(ts: string | null) {
  if (!ts) return <span className="text-red-400">Never</span>
  const age = Date.now() - new Date(ts).getTime()
  const color = age > MONTH_MS ? 'text-red-400' : age < FORTY8_H_MS ? 'text-green-400' : 'text-[#9ca3af]'
  const d = new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return <span className={color}>{d}</span>
}

export function GuildRoster() {
  const [members, setMembers] = useState<MemberData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zone, setZone] = useState<ZoneKey>('Total')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    async function fetchMembers() {
      try {
        const res = await albionFetch<MemberData[]>('/game/albion/guild-data')
        if (cancelled) return
        if (res.status === 'ok') setMembers(res.payload)
        else setError(res.message || 'Failed to load')
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchMembers()
    return () => { cancelled = true }
  }, [])

  const filtered = search
    ? members.filter(m => m.Name.toLowerCase().includes(search.toLowerCase()))
    : members

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dayA = a.LifetimeStatistics.Timestamp
        ? new Date(a.LifetimeStatistics.Timestamp).setHours(0, 0, 0, 0) : 0
      const dayB = b.LifetimeStatistics.Timestamp
        ? new Date(b.LifetimeStatistics.Timestamp).setHours(0, 0, 0, 0) : 0
      if (dayA !== dayB) return dayB - dayA
      return totalFame(b) - totalFame(a)
    })
  }, [filtered])

  const latestTs = useMemo(() => {
    let max = 0
    for (const m of members) {
      if (m.LifetimeStatistics.Timestamp) {
        const t = new Date(m.LifetimeStatistics.Timestamp).getTime()
        if (t > max) max = t
      }
    }
    return max ? new Date(max) : null
  }, [members])

  if (loading) return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-[#c4af64] border-t-transparent rounded-full animate-spin" /></div>
  if (error) return <p className="text-sm text-red-400 text-center py-8">Failed to load guild data: {error}</p>
  if (members.length === 0) return <p className="text-sm text-[#6b7280] text-center py-8">No guild members found.</p>

  const columns: Column<MemberData>[] = [
    { key: '#', label: '', render: (_m, i) => <span className="text-[#3a3d4a] font-mono text-xs tabular-nums">{(i + 1).toLocaleString()}</span>, className: 'w-8 text-center' },
    { key: 'Name', label: 'Name', sortKey: m => m.Name.toLowerCase(), render: m => <span className="text-[#e2e4ed] font-medium">{m.Name}</span> },
    { key: 'totalFame', label: 'Total Fame', sortKey: m => totalFame(m), render: m => <span className="text-[#c4af64] font-medium">{fmt(totalFame(m))}</span> },
    { key: 'LastLogin', label: 'Last Login', sortKey: m => m.LifetimeStatistics.Timestamp ? new Date(m.LifetimeStatistics.Timestamp).getTime() : 0, render: m => tsCell(m.LifetimeStatistics.Timestamp) },
    { key: 'PvE', label: 'PvE Fame', sortKey: m => m.LifetimeStatistics.PvE[zone], render: m => zoneCell(m.LifetimeStatistics.PvE[zone]) },
    { key: 'Kill', label: 'Kill Fame', sortKey: m => m.KillFame, render: m => <>{fmt(m.KillFame)}</> },
    { key: 'Death', label: 'Death Fame', sortKey: m => m.DeathFame, render: m => <>{fmt(m.DeathFame)}</> },
    { key: 'KD', label: 'K/D', sortKey: m => m.FameRatio, render: m => <>{(m.FameRatio * 100).toFixed(1)}%</> },
    { key: 'Gathering', label: 'Gathering', sortKey: m => m.LifetimeStatistics.Gathering.All[zone], render: m => zoneCell(m.LifetimeStatistics.Gathering.All[zone]) },
    { key: 'Crafting', label: 'Crafting', sortKey: m => m.LifetimeStatistics.Crafting[zone], render: m => zoneCell(m.LifetimeStatistics.Crafting[zone]) },
    { key: 'Fishing', label: 'Fishing', sortKey: m => m.LifetimeStatistics.FishingFame, render: m => <>{fmt(m.LifetimeStatistics.FishingFame)}</> },
    { key: 'Farming', label: 'Farming', sortKey: m => m.LifetimeStatistics.FarmingFame, render: m => <>{fmt(m.LifetimeStatistics.FarmingFame)}</> },
    { key: 'Alliance', label: 'Alliance', sortKey: m => (m.AllianceName || '').toLowerCase(), render: m => <>{m.AllianceName || ''}</> },
  ]

  return (
    <div className="w-full">
      {latestTs && (
        <p className="text-xs text-[#6b7280] mb-2">
          Albion API snapshot: {latestTs.toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
          })}
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap gap-1.5">
          {ZONES.map(z => (
            <button
              key={z.key}
              onClick={() => setZone(z.key)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                zone === z.key
                  ? 'bg-[#c4af64] text-white'
                  : 'bg-[#1a1d27] text-[#9ca3af] border border-[#2a2d3a] hover:text-[#e2e4ed] hover:bg-[#2a2d3a]'
              }`}
            >
              {z.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search character…"
          className="bg-[#1a1d27] border border-[#2a2d3a] text-[#e2e4ed] rounded px-3 py-1 text-xs w-48 focus:outline-none focus:border-[#c4af64] transition-colors placeholder-[#6b7280]"
        />
      </div>
      <DataTable
        columns={columns}
        data={sorted}
        rowKey={m => m.Id}
        defaultSort=""
        footer={search ? `${filtered.length} of ${members.length} members` : `${members.length} members`}
      />
    </div>
  )
}
