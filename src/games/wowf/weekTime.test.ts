import { describe, expect, it } from 'vitest'
import { cellInstant, localMonday, offsetMinutes, slotInstant, slotKey, toSlot, tzOffset, utcMonday, utcToZoned, zonedToUtc } from './weekTime'

const TOR = 'America/Toronto'
const TOKYO = 'Asia/Tokyo'

describe('weekTime', () => {
  it('converts wall clock to UTC and back, across DST', () => {
    // Toronto is UTC-4 on Oct 30 2026 and UTC-5 after Nov 1 02:00.
    expect(zonedToUtc(2026, 10, 30, 20, TOR).toISOString()).toBe('2026-10-31T00:00:00.000Z')
    expect(zonedToUtc(2026, 11, 3, 20, TOR).toISOString()).toBe('2026-11-04T01:00:00.000Z')
    expect(utcToZoned(new Date('2026-11-04T01:00:00Z'), TOR)).toEqual({ y: 2026, m: 11, d: 3, h: 20, weekday: 1 })
    expect(utcToZoned(new Date('2026-11-01T23:30:00Z'), TOKYO).weekday).toBe(0)
  })

  it('finds the local Monday and maps cells to UTC slots', () => {
    const wall = localMonday(new Date('2026-11-05T03:00:00Z'), TOR)
    expect(new Date(wall).toISOString()).toBe('2026-11-02T00:00:00.000Z')
    expect(toSlot(cellInstant(wall, 1, 20, TOR))).toEqual({ week_start: '2026-11-02', h: 49 })
    // Sunday evening in Toronto is already Monday in UTC: next UTC week, hour 1.
    expect(toSlot(cellInstant(wall, 6, 20, TOR))).toEqual({ week_start: '2026-11-09', h: 1 })
    // Monday 00:00 in Tokyo is still Sunday in UTC: previous UTC week.
    expect(toSlot(cellInstant(wall, 0, 0, TOKYO))).toEqual({ week_start: '2026-10-26', h: 159 })
  })

  it('round-trips slot keys', () => {
    expect(utcMonday(new Date('2026-11-08T23:59:00Z')).toISOString()).toBe('2026-11-02T00:00:00.000Z')
    expect(slotKey(slotInstant('2026-11-02', 25))).toBe('2026-11-03T01:00:00Z')
  })
})

describe('tzOffset', () => {
  it('formats the current UTC offset, DST-aware', () => {
    expect(tzOffset('America/Toronto', new Date('2026-10-30T12:00:00Z'))).toBe('UTC-04:00')
    expect(tzOffset('America/Toronto', new Date('2026-11-05T12:00:00Z'))).toBe('UTC-05:00')
    expect(tzOffset('Asia/Kolkata', new Date('2026-11-05T12:00:00Z'))).toBe('UTC+05:30')
    expect(tzOffset('UTC', new Date('2026-11-05T12:00:00Z'))).toBe('UTC+00:00')
    expect(offsetMinutes('UTC-04:00')).toBe(-240)
    expect(offsetMinutes('UTC+05:30')).toBe(330)
  })
})
