import { useEffect, useState } from 'react'
import { fetchItemHistory } from '../ItemIndex/albionItemsApi'
import type { RawHistorySeries } from '../ItemIndex/types'

// History only moves when the poller's hourly/daily sweeps land - 5-min polling matches gold.
const POLL_MS = 300_000

interface UseItemHistoryResult {
  series: RawHistorySeries[]
  loading: boolean
  error: string | null
}

// Price history for one item at one city across every quality (one series per quality).
export function useItemHistory(itemId: string, city: string, timeScale: number): UseItemHistoryResult {
  const [series, setSeries] = useState<RawHistorySeries[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      const result = await fetchItemHistory(itemId, city, timeScale)
      if (cancelled) return
      if (result.status === 'ok') {
        setSeries(result.payload)
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
  }, [itemId, city, timeScale])

  return { series, loading, error }
}
