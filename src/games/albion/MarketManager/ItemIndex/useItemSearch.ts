import { useEffect, useState } from 'react'
import { searchItems } from './albionItemsApi'
import type { AlbionItem } from './types'

// Debounced search against /game/albion/items. Empty query returns the default first 100.
export function useItemSearch(query: string, debounceMs = 250) {
  const [items, setItems] = useState<AlbionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const timer = setTimeout(async () => {
      setLoading(true)
      const result = await searchItems(query)
      if (cancelled) return
      if (result.status === 'ok') {
        setItems(result.payload)
        setError(null)
      } else {
        setError(result.message)
      }
      setLoading(false)
    }, debounceMs)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, debounceMs])

  return { items, loading, error }
}
