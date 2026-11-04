// Availability time maths. Storage is UTC (Monday 00:00 UTC + hour offset 0..167);
// the grid is drawn in the member's timezone, so a local week spans up to two UTC weeks.
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const HOUR = 3600_000
export const DAY = 24 * HOUR
export const WEEK = 7 * DAY

export const browserTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

// Settings tells open pages when the saved timezone changes.
const TZ_EVENT = 'wowf:tz'
export const announceTz = (tz: string) => window.dispatchEvent(new CustomEvent(TZ_EVENT, { detail: tz }))
export function onTzChange(cb: (tz: string) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<string>).detail)
  window.addEventListener(TZ_EVENT, handler)
  return () => window.removeEventListener(TZ_EVENT, handler)
}

export function tzOptions(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
  const list = intl.supportedValuesOf?.('timeZone') ?? []
  const mine = browserTz()
  return list.includes(mine) ? list : [mine, ...list]
}

// Wall-clock parts of an instant in `tz`; weekday 0 = Monday.
export function utcToZoned(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric',
  }).formatToParts(date)
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value)
  const y = get('year'), m = get('month'), d = get('day'), h = get('hour')
  return { y, m, d, h, weekday: (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7 }
}

// The instant at which `tz` reads y-m-d h:00. Two passes so a DST shift between guess and answer is absorbed.
export function zonedToUtc(y: number, m: number, d: number, h: number, tz: string): Date {
  const want = Date.UTC(y, m - 1, d, h)
  const offset = (t: number) => { const z = utcToZoned(new Date(t), tz); return Date.UTC(z.y, z.m - 1, z.d, z.h) - t }
  const first = want - offset(want)
  return new Date(want - offset(first))
}

// A local week is keyed by its Monday's wall date, held as that date's UTC-midnight ms (plain day arithmetic).
export function localMonday(now: Date, tz: string): number {
  const z = utcToZoned(now, tz)
  return Date.UTC(z.y, z.m - 1, z.d) - z.weekday * DAY
}

export function cellInstant(wall: number, weekday: number, hour: number, tz: string): Date {
  const w = new Date(wall + weekday * DAY)
  return zonedToUtc(w.getUTCFullYear(), w.getUTCMonth() + 1, w.getUTCDate(), hour, tz)
}

export function utcMonday(date: Date): Date {
  const day = (date.getUTCDay() + 6) % 7
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day))
}

export const isoDate = (d: Date) => d.toISOString().slice(0, 10)

// API encoding of one instant.
export function toSlot(instant: Date) {
  const mon = utcMonday(instant)
  return { week_start: isoDate(mon), h: Math.floor((instant.getTime() - mon.getTime()) / HOUR) }
}

export const slotKey = (instant: Date) => `${instant.toISOString().slice(0, 13)}:00:00Z`
// Hour keys of a window starting at `start` (ISO) for `hours` hours.
export const windowKeys = (start: string, hours: number) =>
  new Set(Array.from({ length: hours }, (_, i) => slotKey(new Date(Date.parse(start) + i * HOUR))))
export const slotInstant = (weekStart: string, h: number) => new Date(Date.parse(`${weekStart}T00:00:00Z`) + h * HOUR)

export const weekLabel = (wall: number) => new Date(wall).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
export const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`

// 'UTC-04:00' style offset of a zone right now (DST-aware).
export function tzOffset(tz: string, now = new Date()): string {
  const opts = { timeZone: tz, timeZoneName: 'longOffset' } as Intl.DateTimeFormatOptions
  const part = new Intl.DateTimeFormat('en-US', opts).formatToParts(now).find(p => p.type === 'timeZoneName')?.value ?? 'GMT'
  return part === 'GMT' ? 'UTC+00:00' : part.replace('GMT', 'UTC')
}

// 'UTC-04:00' -> -240, for sorting zones west to east.
export function offsetMinutes(off: string): number {
  const m = /([+-])(\d{2}):(\d{2})/.exec(off)
  if (!m) return 0
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]))
}
