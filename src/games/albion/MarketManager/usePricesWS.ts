import { useForgeWS } from './useForgeWS'

export interface PriceChange {
  item_id: string
  city: string
  quality: number
  old_price: number
  new_price: number
  change: number
  change_pct: number
}

interface PricesFrame {
  type: string
  changes?: PriceChange[]
}

// Live price feed: forge-api pushes a `price_changes` frame after every poller cycle (the
// connect frame is a lightweight `hello`).
export function usePricesWS(onChanges: (changes: PriceChange[]) => void): void {
  useForgeWS<PricesFrame>('/game/albion/ws/prices', msg => {
    if (msg.type === 'price_changes' && Array.isArray(msg.changes)) {
      onChanges(msg.changes)
    }
  })
}
