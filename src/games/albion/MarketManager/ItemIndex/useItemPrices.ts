import { useCallback, useEffect, useState } from 'react'
import { fetchItemPrices } from './albionItemsApi'
import { usePricesWS, type PriceChange } from '../usePricesWS'
import { useOverridesVersion } from '../premium'
import { utcDate } from '../../../../utils/date'
import type { RawItemPrice } from './types'

// Backend caches prices for 120s, so polling faster gains nothing.
const POLL_MS = 120_000

export function priceKey(itemId: string, city: string, quality: number): string {
  return `${itemId}|${city}|${quality}`
}

interface UseItemPricesResult {
  prices: Map<string, RawItemPrice> // keyed by priceKey(item_id, city, quality)
  fetchedAt: Date | null
  dataAt: Date | null // newest ADP observation in the batch (data age, not fetch age)
  loading: boolean
  error: string | null
  refresh: () => void // re-run the batch fetch now (live-update trigger)
  applyChanges: (changes: PriceChange[]) => void // optimistic sell-price merge from a WS frame
}

// Live prices for a batch of item ids at one location across one or more qualities, polled
// every 120s (mirrors useGoldPrice). Re-fetches whenever the id batch, location, or qualities
// change. Multiple qualities let us price materials at quality 1 while the finished item uses
// the selected quality.
export function useItemPrices(
  itemIds: string[],
  location: string,
  qualities: number[],
): UseItemPricesResult {
  const [prices, setPrices] = useState<Map<string, RawItemPrice>>(new Map())
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null)
  const [dataAt, setDataAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  const applyChanges = useCallback((changes: PriceChange[]) => {
    setPrices(prev => {
      let touched = false
      const next = new Map(prev)
      for (const c of changes) {
        // WS frames carry the lake's city spelling ('Fort Sterling'); keys use the token.
        const k = priceKey(c.item_id, c.city.replace(' ', ''), c.quality)
        const row = next.get(k)
        if (row) {
          next.set(k, { ...row, sell_price_min: c.new_price })
          touched = true
        }
      }
      return touched ? next : prev
    })
  }, [])

  // Stable, order-independent keys for the deps.
  const idsKey = [...itemIds].sort().join(',')
  const qualKey = [...qualities].sort().join(',')
  // A saved/cleared manual override changes the server-side prices; refetch on it.
  const overridesVersion = useOverridesVersion()

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (itemIds.length === 0) {
        setPrices(new Map())
        setFetchedAt(null)
        setDataAt(null)
        setError(null)
        setLoading(false)
        return
      }
      setLoading(true)
      const result = await fetchItemPrices(itemIds, [location], qualities)
      if (cancelled) return
      if (result.status === 'ok') {
        const map = new Map<string, RawItemPrice>()
        let newest = ''
        for (const p of result.payload) {
          map.set(priceKey(p.item_id, p.city, p.quality), p)
          if (p.timestamp && p.timestamp > newest) newest = p.timestamp
        }
        setPrices(map)
        setFetchedAt(new Date())
        setDataAt(newest ? utcDate(newest) : null)
        setError(null)
      } else {
        setError(result.message)
      }
      setLoading(false)
    }

    run()
    const interval = setInterval(run, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, location, qualKey, tick, overridesVersion])

  return { prices, fetchedAt, dataAt, loading, error, refresh, applyChanges }
}

// useItemPrices + the /ws/prices feed: every poller cycle merges the changed sell prices for
// an instant paint and re-runs the batch fetch so buy prices and new rows catch up.
export function useLiveItemPrices(
  itemIds: string[],
  location: string,
  qualities: number[],
): UseItemPricesResult {
  const base = useItemPrices(itemIds, location, qualities)
  const { applyChanges, refresh } = base
  usePricesWS(useCallback(changes => {
    applyChanges(changes)
    refresh()
  }, [applyChanges, refresh]))
  return base
}
