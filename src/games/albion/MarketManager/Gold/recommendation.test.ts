import { describe, it, expect } from 'vitest'
import { recStyle } from './recommendation'

describe('recStyle', () => {
  it('maps the server recommendation enum (buy/hold/sell) to labels', () => {
    expect(recStyle('buy').label).toBe('Buy')
    expect(recStyle('sell').label).toBe('Sell')
    expect(recStyle('hold').label).toBe('Hold')
  })

  it('falls back to Hold for unknown/legacy keys (the bug that pinned the badge)', () => {
    expect(recStyle('buy_gold').label).toBe('Hold')
    expect(recStyle('sell_gold').label).toBe('Hold')
    expect(recStyle('').label).toBe('Hold')
  })
})
