import { useState, useRef } from 'react'
import { useForgeWS } from './useForgeWS'

export interface TickerItem {
  item_id: string
  name: string
  tier: string
  city: string
  quality: number
  price: number
  change: number
  change_pct: number
}

interface UseTickerWSResult {
  items: TickerItem[]
  connected: boolean
}

interface TickerFrame {
  type: string
  payload: TickerItem[]
}

type ItemMap = Record<string, TickerItem>

function key(i: TickerItem): string {
  return `${i.item_id}_${i.city}_${i.quality}`
}

export function useTickerWS(): UseTickerWSResult {
  const [items, setItems] = useState<TickerItem[]>([])
  const mapRef = useRef<ItemMap>({})

  const connected = useForgeWS<TickerFrame>('/game/albion/ws/ticker', msg => {
    if (msg.type === 'ticker_snapshot') {
      const m: ItemMap = {}
      for (const item of msg.payload) {
        m[key(item)] = item
      }
      mapRef.current = m
      setItems(msg.payload)
    } else if (msg.type === 'ticker_update') {
      const m = { ...mapRef.current }
      for (const item of msg.payload) {
        m[key(item)] = item
      }
      mapRef.current = m
      setItems(Object.values(m))
    }
  })

  return { items, connected }
}
