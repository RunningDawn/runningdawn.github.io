import { useRef, useLayoutEffect, useState, useEffect } from 'react'
import { Link } from 'react-router'
import { useTickerWS, type TickerItem } from './useTickerWS'

function fmtPrice(n: number): string {
  return n.toLocaleString('en-US')
}

function shortName(name: string): string {
  const idx = name.indexOf("'s ")
  return idx !== -1 ? name.slice(idx + 3) : name
}

function TickerEntry({ item }: { item: TickerItem }) {
  const price = item.price ?? 0
  const chg = item.change ?? 0
  const chgPct = item.change_pct ?? 0
  const cls = chg >= 0 ? 'text-green-400' : 'text-red-400'
  const arrow = chg >= 0 ? '▲' : '▼'
  // Compact city token (no spaces) matches the price-endpoint keys; quality 0 (resources) → 1.
  const city = (item.city || '').replace(/\s+/g, '')
  const to = `/albion/market-manager/item/${encodeURIComponent(item.item_id)}?quality=${item.quality || 1}&city=${encodeURIComponent(city)}`
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 mr-6 whitespace-nowrap text-xs transition-colors hover:bg-[#2a2d3a] rounded px-1"
    >
      <span className="text-[#e2e4ed] font-medium">{shortName(item.name || item.item_id)}</span>
      <span className="text-[#e2e4ed]">({item.tier || '?'})</span>
      {item.quality > 0 && <span className="text-[#8b8fa3]">Q{item.quality}</span>}
      <span className="text-[#6b7280]">{item.city}</span>
      <span className="text-[#9ca3af]">{fmtPrice(price)}</span>
      <span className={cls}>{arrow} {chg >= 0 ? '+' : ''}{fmtPrice(chg)}</span>
      <span className={cls}>({chg >= 0 ? '+' : ''}{chgPct.toFixed(1)}%)</span>
    </Link>
  )
}

export function TickerTape() {
  const { items } = useTickerWS()
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (ref.current) {
      const w = ref.current.scrollWidth
      ref.current.style.animationDuration = `${w / 2 / 100}s`
    }
  }, [items])

  const itemsArr = [...items.values()]

  if (itemsArr.length === 0) {
    return <WaitingDots />
  }

  return (
    <div className="overflow-hidden flex-1 min-w-0">
      <div ref={ref} className="inline-flex animate-marquee hover:[animation-play-state:paused]">
        {itemsArr.map(item => (
          <TickerEntry key={`${item.item_id}_${item.city}_${item.quality}`} item={item} />
        ))}
        {itemsArr.map(item => (
          <TickerEntry key={`dup_${item.item_id}_${item.city}_${item.quality}`} item={item} />
        ))}
      </div>
    </div>
  )
}

function WaitingDots() {
  const [dots, setDots] = useState('')
  useEffect(() => {
    const id = setInterval(() => {
      setDots(p => p.length >= 7 ? '..' : p + '.')
    }, 400)
    return () => clearInterval(id)
  }, [])
  return <span className="text-[#6b7280] text-xs">Waiting for ticker data{dots}</span>
}
