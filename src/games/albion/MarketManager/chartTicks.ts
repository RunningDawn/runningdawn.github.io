// Shared x-axis tick generator for the MM price charts (gold + item detail). `period` is the
// visible window in hours: intraday windows tick every 6h, week-scale daily, month-scale
// every 5 days.
export function chartTicks(times: number[], period: number): number[] {
  if (times.length < 2) return times
  const min = Math.min(...times)
  const max = Math.max(...times)
  const ticks: number[] = []
  if (period <= 24) {
    const start = new Date(min)
    start.setMinutes(0, 0, 0)
    const end = new Date(max)
    const cursor = new Date(start)
    while (cursor <= end) {
      ticks.push(cursor.getTime())
      cursor.setHours(cursor.getHours() + 6)
    }
    return ticks
  }
  const stepDays = period <= 168 ? 1 : 5
  const start = new Date(min)
  start.setHours(0, 0, 0, 0)
  const end = new Date(max)
  end.setHours(0, 0, 0, 0)
  const cursor = new Date(start)
  while (cursor <= end) {
    ticks.push(cursor.getTime())
    cursor.setDate(cursor.getDate() + stepDays)
  }
  return ticks
}

export function tickLabel(t: number, period: number): string {
  const d = new Date(t)
  if (period <= 24) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
