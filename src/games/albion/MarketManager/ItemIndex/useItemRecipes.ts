import { useEffect, useState } from 'react'
import { fetchRecipes } from './albionItemsApi'
import type { RecipeNode } from './types'

// Recipes are static - cache resolved trees at module scope, keyed by item id, so repeat
// lookups across pages/searches never refetch.
const cache = new Map<string, RecipeNode>()

export function useItemRecipes(itemIds: string[]): { recipes: Map<string, RecipeNode>; loading: boolean } {
  const [recipes, setRecipes] = useState<Map<string, RecipeNode>>(() => new Map())
  const [loading, setLoading] = useState(false)

  const idsKey = [...itemIds].sort().join(',')

  useEffect(() => {
    let cancelled = false

    function pick(): Map<string, RecipeNode> {
      const m = new Map<string, RecipeNode>()
      for (const id of itemIds) {
        const c = cache.get(id)
        if (c) m.set(id, c)
      }
      return m
    }

    async function run() {
      setRecipes(pick()) // seed from cache for an instant paint
      const missing = itemIds.filter(id => !cache.has(id))
      if (missing.length === 0) {
        setLoading(false)
        return
      }
      setLoading(true)
      const result = await fetchRecipes(missing)
      if (cancelled) return
      if (result.status === 'ok') {
        for (const node of result.payload) cache.set(node.item_id, node)
      }
      setRecipes(pick())
      setLoading(false)
    }

    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  return { recipes, loading }
}
