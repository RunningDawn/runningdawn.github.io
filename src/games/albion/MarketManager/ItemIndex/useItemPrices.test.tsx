import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useLiveItemPrices, priceKey } from './useItemPrices'

class FakeWS {
  static instances: FakeWS[] = []
  url: string
  onopen: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(url: string) {
    this.url = url
    FakeWS.instances.push(this)
  }
  close() {}
}

const fetchSpy = vi.fn()
globalThis.fetch = fetchSpy
vi.stubGlobal('WebSocket', FakeWS)

function ok(payload: unknown) {
  return new Response(JSON.stringify({ status: 'ok', message: '', payload }), { status: 200 })
}

function Probe() {
  const { prices } = useLiveItemPrices(['T4_BAG'], 'Caerleon', [1])
  const sell = prices.get(priceKey('T4_BAG', 'Caerleon', 1))?.sell_price_min
  return <div data-testid="sell">{sell ?? 'none'}</div>
}

let sellPrice = 1234

beforeEach(() => {
  vi.useFakeTimers()
  fetchSpy.mockReset()
  FakeWS.instances = []
  sellPrice = 1234
  fetchSpy.mockImplementation(() => Promise.resolve(ok([
    { item_id: 'T4_BAG', city: 'Caerleon', quality: 1, sell_price_min: sellPrice, buy_price_max: 1000 },
  ])))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useLiveItemPrices', () => {
  it('merges a price_changes frame instantly and refetches the batch', async () => {
    render(<Probe />)

    await act(() => vi.advanceTimersByTimeAsync(600))
    expect(screen.getByTestId('sell').textContent).toBe('1234')
    expect(FakeWS.instances).toHaveLength(1)
    expect(FakeWS.instances[0].url).toContain('/game/albion/ws/prices')
    const fetchesBefore = fetchSpy.mock.calls.length

    sellPrice = 999
    const ws = FakeWS.instances[0]
    await act(async () => {
      ws.onmessage?.({
        data: JSON.stringify({
          type: 'price_changes',
          changes: [{
            item_id: 'T4_BAG', city: 'Caerleon', quality: 1,
            old_price: 1234, new_price: 999, change: -235, change_pct: -19,
          }],
        }),
      })
    })

    expect(screen.getByTestId('sell').textContent).toBe('999')
    await act(() => vi.advanceTimersByTimeAsync(10))
    expect(fetchSpy.mock.calls.length).toBeGreaterThan(fetchesBefore)
    expect(screen.getByTestId('sell').textContent).toBe('999')
  })

  it('ignores hello and unknown frames', async () => {
    render(<Probe />)
    await act(() => vi.advanceTimersByTimeAsync(600))
    const fetchesBefore = fetchSpy.mock.calls.length

    const ws = FakeWS.instances[0]
    await act(async () => {
      ws.onmessage?.({ data: JSON.stringify({ type: 'hello', next_poll_at: null }) })
      ws.onmessage?.({ data: 'not-json' })
    })

    expect(fetchSpy.mock.calls.length).toBe(fetchesBefore)
    expect(screen.getByTestId('sell').textContent).toBe('1234')
  })
})
