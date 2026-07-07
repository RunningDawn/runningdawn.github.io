import { useEffect, useRef } from 'react'
import { API_URLS } from '../../../config/apiUrls'

export interface PriceChange {
  item_id: string
  city: string
  quality: number
  old_price: number
  new_price: number
  change: number
  change_pct: number
}

function wsUrl(): string {
  const proto = API_URLS.forgeAPI.startsWith('https://') ? 'wss://' : 'ws://'
  return API_URLS.forgeAPI.replace(/^https?:\/\//, proto) + '/game/albion/ws/prices'
}

// Live price feed: forge-api pushes a `price_changes` frame after every poller cycle (the
// connect frame is a lightweight `hello`). Same reconnect/backoff shape as useTickerWS. The
// callback rides a ref so a re-render never re-opens the socket.
export function usePricesWS(onChanges: (changes: PriceChange[]) => void): void {
  const handlerRef = useRef(onChanges)
  useEffect(() => {
    handlerRef.current = onChanges
  }, [onChanges])

  useEffect(() => {
    let cancelled = false
    let attempts = 0
    let ws: WebSocket | null = null
    let reconnect: ReturnType<typeof setTimeout> | null = null

    function connect() {
      if (cancelled) return
      ws = new WebSocket(wsUrl())

      ws.onopen = () => {
        if (cancelled) { ws?.close(); return }
        attempts = 0
      }

      ws.onmessage = (event) => {
        if (cancelled) return
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'price_changes' && Array.isArray(msg.changes)) {
            handlerRef.current(msg.changes)
          }
        } catch { /* silent */ }
      }

      ws.onclose = () => {
        if (cancelled) return
        const delay = Math.min(2000 * Math.pow(2, attempts), 30_000)
        attempts++
        reconnect = setTimeout(connect, delay)
      }

      ws.onerror = () => { /* onclose fires next */ }
    }

    const initTimer = setTimeout(connect, 500)

    return () => {
      cancelled = true
      clearTimeout(initTimer)
      if (ws) { ws.onclose = null; ws.close() }
      if (reconnect) clearTimeout(reconnect)
    }
  }, [])
}
