const HOUR = 3_600_000
const DAY = 86_400_000

// Shared 4-tier staleness ladder for market data ages.
export function freshnessClass(ageMs: number): string {
  return ageMs < HOUR ? 'text-[#4ade80]'
    : ageMs < DAY ? 'text-[#e2e4ed]'
    : ageMs < 3 * DAY ? 'text-[#facc15]'
    : 'text-[#f87171]'
}

export const SCAN_TIME_FMT: Intl.DateTimeFormatOptions = {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
}

// Compact elapsed-time label for a data age: "now" / "12m" / "3h" / "2d7h".
// Two units only once days appear, single unit below a day.
export function relativeAge(ageMs: number): string {
  const mins = Math.floor(ageMs / 60_000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  return remHours ? `${days}d${remHours}h` : `${days}d`
}
