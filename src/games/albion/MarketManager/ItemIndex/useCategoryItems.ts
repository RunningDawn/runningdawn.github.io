import { useEffect, useState } from 'react'
import { fetchCategoryItems } from './albionItemsApi'
import type { AlbionItem } from './types'

// Category membership is static (ao-bin-dumps data, backend caches it for a day) - cache each
// slug's list at module scope so tab-hopping between categories never refetches.
const cache = new Map<string, AlbionItem[]>()

interface UseCategoryItemsResult {
  items: AlbionItem[]
  loading: boolean
  error: string | null
}

export function useCategoryItems(slug: string): UseCategoryItemsResult {
  const [fetched, setFetched] = useState<{ slug: string; error: string | null } | null>(null)

  useEffect(() => {
    if (cache.has(slug)) return
    let cancelled = false
    fetchCategoryItems(slug).then(result => {
      if (cancelled) return
      if (result.status === 'ok') {
        cache.set(slug, result.payload)
        setFetched({ slug, error: null })
      } else {
        setFetched({ slug, error: result.message })
      }
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  const items = cache.get(slug) ?? []
  const error = fetched?.slug === slug ? fetched.error : null
  return { items, loading: !cache.has(slug) && !error, error }
}
