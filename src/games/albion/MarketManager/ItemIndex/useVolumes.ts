import { useEffect, useState } from 'react'
import { fetchVolumes } from './albionItemsApi'
import type { VolumeRow } from './types'

// 24h market throughput for a batch of items at one location + quality, keyed by item id.
// Candles only change hourly, so one fetch per (ids, location, quality) is enough - no
// polling. Markets with no trades simply have no entry.
const EMPTY_VOLUMES = new Map<string, VolumeRow>()

export function useVolumes(
  itemIds: string[],
  location: string,
  quality: number,
): Map<string, VolumeRow> {
  const [volumes, setVolumes] = useState<Map<string, VolumeRow>>(EMPTY_VOLUMES)
  const idsKey = [...itemIds].sort().join(',')

  useEffect(() => {
    if (itemIds.length === 0) return
    let cancelled = false
    fetchVolumes(itemIds, [location], [quality]).then(result => {
      if (cancelled || result.status !== 'ok') return
      const map = new Map<string, VolumeRow>()
      for (const row of result.payload) map.set(row.item_id, row)
      setVolumes(map)
    })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- idsKey stands in for itemIds
  }, [idsKey, location, quality])

  return itemIds.length === 0 ? EMPTY_VOLUMES : volumes
}
