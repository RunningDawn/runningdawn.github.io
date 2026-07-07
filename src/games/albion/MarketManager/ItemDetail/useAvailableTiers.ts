import { useEffect, useState } from 'react'
import { searchItems } from '../ItemIndex/albionItemsApi'

// Which tiers actually exist for an item family. Most craftables skip T1-T2, artifact/Avalon
// gear is T4-T8 only, etc. - so the generic T1-T8 switcher would offer nonexistent items.
// Derived from the item catalog by searching the family stem (the id minus its tier prefix,
// enchant, and resource _LEVEL); the /items search matches id substrings, and the catalog holds
// base ids only, so one search covers the whole family. Cached at module scope (the catalog is
// static). Returns [] until resolved; callers fall back to the full tier list meanwhile.
const cache = new Map<string, number[]>()

function stemOf(itemId: string): string {
  return itemId
    .replace(/^T\d+_/, '')
    .replace(/_LEVEL\d+/, '')
    .replace(/@\d+$/, '')
}

export function useAvailableTiers(itemId: string): number[] {
  const stem = stemOf(itemId)
  const [, bump] = useState(0)

  useEffect(() => {
    if (!stem || cache.has(stem)) return
    let cancelled = false
    searchItems(stem).then(res => {
      if (cancelled || res.status !== 'ok') return
      const re = new RegExp(`^T(\\d+)_${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)
      const tiers = new Set<number>()
      for (const it of res.payload) {
        const m = re.exec(it.id.split('@')[0])
        if (m) tiers.add(Number(m[1]))
      }
      cache.set(stem, [...tiers].sort((a, b) => a - b))
      bump(n => n + 1)
    })
    return () => { cancelled = true }
  }, [stem])

  return cache.get(stem) ?? []
}
