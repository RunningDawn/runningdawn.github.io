import { useState, useEffect } from 'react'
import { albionFetch } from '../../api'

export interface GoldStats {
  current: number
  history: { price: number; timestamp: string }[]
  summary: {
    change_24h: number
    change_pct_24h: number
    high_24h: number
    low_24h: number
    slope_24h: number
  }
  indicators: {
    sma_7: number
    sma_25: number
    rsi_14: number
    signal: 'bullish' | 'bearish' | 'neutral'
    recommendation: string
  }
}

interface UseGoldPriceResult {
  stats: GoldStats | null
  loading: boolean
  error: string | null
}

export function useGoldPrice(): UseGoldPriceResult {
  const [stats, setStats] = useState<GoldStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      try {
        const result = await albionFetch<GoldStats>('/game/albion/gold/stats')
        if (cancelled) return
        if (result.status === 'ok') {
          setStats(result.payload)
          setError(null)
        } else {
          setError(result.message)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load gold stats')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchStats()

    const interval = setInterval(fetchStats, 300_000)

    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  return { stats, loading, error }
}
