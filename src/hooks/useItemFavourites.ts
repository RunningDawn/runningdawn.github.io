import { useState } from 'react'
import { STORAGE_KEYS } from '../config/storageKeys'

// Snapshot of the display fields at star-time so the Favourites page can render labels
// without a lookup. Prices are always re-fetched live by id. Shape mirrors useCityFavourites.
export interface ItemFavourite {
  id: string // Albion UniqueName
  name: string
  tier: number
  enchant: number
}

const KEY = STORAGE_KEYS.albionItemFavourites

function load(): ItemFavourite[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function useItemFavourites() {
  const [items, setItems] = useState<ItemFavourite[]>(load)

  function toggle(item: ItemFavourite) {
    setItems(prev => {
      const next = prev.some(i => i.id === item.id)
        ? prev.filter(i => i.id !== item.id)
        : [...prev, item]
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }

  function isFavourite(id: string) {
    return items.some(i => i.id === id)
  }

  return { items, toggle, isFavourite }
}
