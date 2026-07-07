import { describe, it, expect } from 'vitest'
import { relativeAge, freshnessClass } from './freshness'

const HOUR = 3_600_000
const DAY = 86_400_000

describe('relativeAge', () => {
  it('formats compact ages, two units only once days appear', () => {
    expect(relativeAge(0)).toBe('now')
    expect(relativeAge(30_000)).toBe('now') // under a minute
    expect(relativeAge(5 * 60_000)).toBe('5m')
    expect(relativeAge(3 * HOUR)).toBe('3h')
    expect(relativeAge(2 * DAY + 7 * HOUR)).toBe('2d7h')
    expect(relativeAge(2 * DAY)).toBe('2d') // no remainder hours -> single unit
  })
})

describe('freshnessClass', () => {
  it('maps age to the staleness ladder', () => {
    expect(freshnessClass(30 * 60_000)).toContain('#4ade80') // <1h green
    expect(freshnessClass(5 * HOUR)).toContain('#e2e4ed') // <1d neutral
    expect(freshnessClass(2 * DAY)).toContain('#facc15') // <3d yellow
    expect(freshnessClass(4 * DAY)).toContain('#f87171') // >=3d red
  })
})
