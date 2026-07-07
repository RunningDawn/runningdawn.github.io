import { useState, useEffect, useRef } from 'react'
import { API_URLS } from '../../../config/apiUrls'

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

export interface GoldTicker {
  change_24h: number
  change_pct_24h: number
  high_24h: number
  low_24h: number
  slope_24h: number
}

interface UseTickerWSResult {
  items: TickerItem[]
  gold: GoldTicker | null
  connected: boolean
}

function wsUrl(): string {
  const proto = API_URLS.forgeAPI.startsWith('https://') ? 'wss://' : 'ws://'
  return API_URLS.forgeAPI.replace(/^https?:\/\//, proto) + '/game/albion/ws/ticker'
}

type ItemMap = Record<string, TickerItem>

function key(i: TickerItem): string {
  return `${i.item_id}_${i.city}_${i.quality}`
}

export function useTickerWS(): UseTickerWSResult {
  const [items, setItems] = useState<TickerItem[]>([])
  const [gold, setGold] = useState<GoldTicker | null>(null)
  const [connected, setConnected] = useState(false)
  const mapRef = useRef<ItemMap>({})
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    let attempts = 0
    let ws: WebSocket | null = null

    function connect() {
      if (cancelledRef.current) return
      ws = new WebSocket(wsUrl())

      ws.onopen = () => {
        if (cancelledRef.current) { ws?.close(); return }
        setConnected(true)
        attempts = 0
      }

      ws.onmessage = (event) => {
        if (cancelledRef.current) return
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'ticker_snapshot') {
            const m: ItemMap = {}
            for (const item of msg.payload) {
              m[key(item)] = item
            }
            mapRef.current = m
            setItems(msg.payload)
            if (msg.gold && typeof msg.gold.change_24h === 'number') setGold(msg.gold)
          } else if (msg.type === 'ticker_update') {
            const m = { ...mapRef.current }
            for (const item of msg.payload) {
              m[key(item)] = item
            }
            mapRef.current = m
            setItems(Object.values(m))
            if (msg.gold && typeof msg.gold.change_24h === 'number') setGold(msg.gold)
          }
        } catch { /* silent */ }
      }

      ws.onclose = () => {
        if (cancelledRef.current) return
        setConnected(false)
        const delay = Math.min(2000 * Math.pow(2, attempts), 30_000)
        attempts++
        reconnectRef.current = setTimeout(connect, delay)
      }

      ws.onerror = () => { /* onclose fires next */ }
    }

    const initTimer = setTimeout(connect, 500)

    return () => {
      cancelledRef.current = true
      clearTimeout(initTimer)
      if (ws) { ws.onclose = null; ws.close() }
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
    }
  }, [])

  return { items, gold, connected }
}
