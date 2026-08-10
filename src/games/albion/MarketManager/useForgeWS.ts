import { useEffect, useRef, useState } from 'react'
import { API_URLS } from '../../../config/apiUrls'

function wsUrl(path: string): string {
  const proto = API_URLS.forgeAPI.startsWith('https://') ? 'wss://' : 'ws://'
  return API_URLS.forgeAPI.replace(/^https?:\/\//, proto) + path
}

// Shared socket lifecycle for the forge-api WS feeds: short initial delay, exponential
// backoff reconnect, silent JSON parse. Returns the live connection state. The handler
// rides a ref so a re-render never re-opens the socket.
export function useForgeWS<T>(path: string, onMessage: (msg: T) => void): boolean {
  const [connected, setConnected] = useState(false)
  const handlerRef = useRef(onMessage)
  useEffect(() => {
    handlerRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    let cancelled = false
    let attempts = 0
    let ws: WebSocket | null = null
    let reconnect: ReturnType<typeof setTimeout> | null = null

    function connect() {
      if (cancelled) return
      ws = new WebSocket(wsUrl(path))

      ws.onopen = () => {
        if (cancelled) { ws?.close(); return }
        setConnected(true)
        attempts = 0
      }

      ws.onmessage = (event) => {
        if (cancelled) return
        try {
          handlerRef.current(JSON.parse(event.data) as T)
        } catch { /* silent */ }
      }

      ws.onclose = () => {
        if (cancelled) return
        setConnected(false)
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
  }, [path])

  return connected
}
