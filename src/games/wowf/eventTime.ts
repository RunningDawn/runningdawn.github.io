import type { ApiEvent } from './api'
import { HOUR, slotKey } from './weekTime'

// UTC hour key -> names of the events covering it (start hour up to, not including, the end).
export function eventHours(events: ApiEvent[]): Map<string, string[]> {
  const m = new Map<string, string[]>()
  for (const e of events) {
    const end = Date.parse(e.ends_at)
    const first = Math.floor(Date.parse(e.starts_at) / HOUR) * HOUR
    for (let t = first; t === first || t < end; t += HOUR) {
      const k = slotKey(new Date(t))
      m.set(k, [...(m.get(k) ?? []), e.name])
    }
  }
  return m
}

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}
