import { Link } from 'react-router'
import type { ApiEvent } from './api'
import { formatWhen } from './eventTime'
import { CancelledBadge, KindBadge, StyleBadge } from './eventUi'
import { eventStyle } from './roster'

// Upcoming / past split used by both the member Loot page and the leadership Events page.
export function EventList({ events, linkBase, emptyText }: { events: ApiEvent[]; linkBase: string; emptyText: string }) {
  const cutoff = Date.now() - 6 * 3600_000
  const upcoming = events.filter(e => Date.parse(e.starts_at) >= cutoff).reverse()
  const past = events.filter(e => Date.parse(e.starts_at) < cutoff)

  const row = (e: ApiEvent) => (
    <Link key={e.id} to={`${linkBase}/${e.id}`} className="forge-card flex items-center gap-4 py-3 hover:border-[#3a4060] transition-colors">
      <div className="w-36 shrink-0 text-xs text-[#9ca3af]">{formatWhen(e.starts_at)}</div>
      <KindBadge kind={e.kind} />
      <StyleBadge style={eventStyle(e.data)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#e2e4ed] truncate">{e.name}</p>
        <p className="text-xs text-[#6b7280]">{e.ruleset}{e.raid && <> &middot; {e.raid.name}</>}</p>
      </div>
      {e.kind === 'raid' && <span className="text-xs text-[#6b7280]">{e.reserve_limit} SR</span>}
      {e.locked && <span className="text-[10px] uppercase tracking-widest text-red-400">locked</span>}
      {e.cancelled && <CancelledBadge />}
    </Link>
  )

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="forge-label">Upcoming</h2>
        {upcoming.length === 0 && <p className="text-sm text-[#6b7280]">{emptyText}</p>}
        {upcoming.map(row)}
      </section>
      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="forge-label">Past</h2>
          {past.map(row)}
        </section>
      )}
    </div>
  )
}
