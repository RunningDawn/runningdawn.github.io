import { freshnessClass, relativeAge, SCAN_TIME_FMT } from './freshness'

// Per-row freshness for a table cell: the scan-age dot + a readable relative age
// ("2d7h"), plus a person glyph when the price is a shared manual override (so a stale
// CUSTOM value is spottable too). source='user' rows carry their entered-at as dataAt.
export function ScanIndicator({ dataAt, fetchedAt, source, by }: {
  dataAt: Date | null
  fetchedAt: Date | null
  source?: 'adp' | 'user'
  by?: string | null
}) {
  const isUser = source === 'user'
  const when = dataAt ? dataAt.toLocaleString('en-US', SCAN_TIME_FMT) : null
  const person = isUser ? (
    <span
      className="text-[#c4af64] select-none"
      title={`Custom price${by ? ` by ${by}` : ''}${when ? ` - ${when}` : ''}`}
    >
      {'\u{1F464}'}
    </span>
  ) : null
  if (!dataAt || !fetchedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-[#4a4d5a]">
        <span className="select-none" title="Never scanned in game">●</span>
        <span className="text-xs">never</span>
        {person}
      </span>
    )
  }
  const age = Math.max(0, fetchedAt.getTime() - dataAt.getTime())
  const cls = freshnessClass(age)
  const title = isUser
    ? `Custom price${by ? ` by ${by}` : ''} - ${when}`
    : `Scanned in game ${when}`
  return (
    <span className={`inline-flex items-center gap-1 ${cls}`} title={title}>
      <span className="select-none">●</span>
      <span className="text-xs">{relativeAge(age)}</span>
      {person}
    </span>
  )
}

// Age of the underlying MARKET data (ADP's last observation), not of our fetch - the
// poller refetches every 120s but a dead market can sit unobserved for days. Age is
// measured against fetchedAt instead of the wall clock (no Date.now in render), which is
// at most one poll interval stale.
export function DataFreshness({ dataAt, fetchedAt }: {
  dataAt: Date | null
  fetchedAt: Date | null
}) {
  if (!dataAt || !fetchedAt) return null
  const age = Math.max(0, fetchedAt.getTime() - dataAt.getTime())
  return (
    <span
      className={freshnessClass(age)}
      title="Newest in-game scan in this batch - individual rows can be much older (see the Scanned column)"
    >
      · data from {dataAt.toLocaleString('en-US', SCAN_TIME_FMT)}
    </span>
  )
}
