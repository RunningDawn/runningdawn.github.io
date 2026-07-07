import { useEffect, useState } from 'react'
import { searchItems } from '../ItemIndex/albionItemsApi'

// Localized names are static - cache at module scope. Enchanted variants share the base name,
// so one search per base id covers the whole family.
const cache = new Map<string, string>()

export function useItemName(itemId: string): string | null {
  const base = itemId.split('@')[0]
  const [, setResolved] = useState('')

  useEffect(() => {
    if (cache.has(base)) return
    let cancelled = false
    searchItems(base).then(result => {
      if (cancelled || result.status !== 'ok') return
      const hit = result.payload.find(i => i.id === base) ?? result.payload[0]
      if (hit) {
        cache.set(base, hit.name)
        setResolved(hit.name)
      }
    })
    return () => {
      cancelled = true
    }
  }, [base])

  return cache.get(base) ?? null
}
