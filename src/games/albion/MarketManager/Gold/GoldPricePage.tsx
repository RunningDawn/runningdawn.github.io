import { useEffect, useMemo, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, CartesianGrid,
} from 'recharts'
import { useAuth } from '../../../../auth/authContext'
import { useLayoutOverride } from '../../../../components/LayoutOverride'
import { Modal } from '../../../../components/Modal'
import { MarketManagerSidebar } from '../MarketManagerSidebar'
import { MarketManagerBottomBar } from '../MarketManagerBottomBar'
import { useGoldPrice } from './useGoldPrice'
import { sma, rsi } from './indicators'
import { recStyle } from './recommendation'
import { utcDate } from '../../../../utils/date'
import { DataTable, type Column } from '../../../../components/DataTable'
import { chartTicks } from '../chartTicks'

type Period = 24 | 168
type Signal = 'bullish' | 'bearish' | 'neutral'

interface ChartPoint {
  time: number
  price: number
  sma7: number | null
  sma25: number | null
}

interface RsiPoint {
  time: number
  rsi: number | null
}

function fmtPrice(n: number): string {
  return n.toLocaleString('en-US')
}

function signalIcon(s: Signal): string {
  if (s === 'bullish') return '▲'
  if (s === 'bearish') return '▼'
  return '●'
}

function signalColor(s: Signal): string {
  if (s === 'bullish') return 'text-green-400'
  if (s === 'bearish') return 'text-red-400'
  return 'text-[#6b7280]'
}

function signalBg(s: Signal): string {
  if (s === 'bullish') return 'bg-green-900/40 border-green-700/50'
  if (s === 'bearish') return 'bg-red-900/40 border-red-700/50'
  return 'bg-[#1a1d27] border-[#2a2d3a]'
}

function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Market Terms Glossary" maxWidth="max-w-xl">
      <div className="px-5 py-4 space-y-4 text-sm max-h-[70vh] overflow-y-auto">
        <div>
          <p className="font-semibold text-[#e2e4ed] mb-1">Bullish <span className="text-green-400 font-normal">▲</span> / Bearish <span className="text-red-400 font-normal">▼</span></p>
          <p className="text-[#9ca3af] text-xs leading-relaxed">
            <strong className="text-green-400">Bullish</strong> means the market is expected to go up - like a bull thrusting its horns upward.
            <strong className="text-red-400"> Bearish</strong> means the market is expected to go down - like a bear swiping its paw downward.
            These are the most basic terms in trading: <strong className="text-green-400">bulls</strong> want higher prices, <strong className="text-red-400">bears</strong> want lower prices.
          </p>
        </div>
        <div>
          <p className="font-semibold text-[#e2e4ed] mb-1">SMA - Simple Moving Average</p>
          <p className="text-[#9ca3af] text-xs leading-relaxed">
            The average price over a set number of hours. Smooths out short-term noise so you can see the real trend.
            <strong className="text-blue-400"> SMA(7)</strong> = average over the last <strong className="text-blue-400">7 hours</strong> (short-term trend).
            <strong className="text-purple-400"> SMA(25)</strong> = average over the last <strong className="text-purple-400">25 hours</strong> (medium-term trend).
            When price is <em>above</em> its SMA, the trend is up (bullish). When <em>below</em>, the trend is down (bearish).
          </p>
        </div>
        <div>
          <p className="font-semibold text-[#e2e4ed] mb-1">Golden Cross / Death Cross</p>
          <p className="text-[#9ca3af] text-xs leading-relaxed">
            When <span className="text-blue-400">SMA(7)</span> crosses <em>above</em> <span className="text-purple-400">SMA(25)</span>, that's a <strong className="text-green-400">Golden Cross</strong> - a strong bullish signal that the short-term trend is overtaking the medium-term trend to the upside.
            When <span className="text-blue-400">SMA(7)</span> crosses <em>below</em> <span className="text-purple-400">SMA(25)</span>, that's a <strong className="text-red-400">Death Cross</strong> - a bearish signal that short-term momentum is breaking down.
          </p>
        </div>
        <div>
          <p className="font-semibold text-[#e2e4ed] mb-1">RSI(14) - Relative Strength Index</p>
          <p className="text-[#9ca3af] text-xs leading-relaxed">
            Measures how fast prices are rising vs falling on a 0–100 scale, smoothed over a
            14-hour period (recent hours count the most). Think of it like a <em>speedometer</em> for
            price changes. The Buy / Hold / Sell recommendation comes from this same value.
          </p>
          <ul className="text-xs text-[#9ca3af] mt-1 space-y-0.5 list-disc list-inside">
            <li>The <span className="text-red-400">red dashed line at 70</span> = Overbought - price has risen too fast and may drop.</li>
            <li>The <span className="text-green-400">green dashed line at 30</span> = Oversold - price has dropped too fast and may bounce.</li>
            <li>The <span className="text-[#6b7280]">gray dashed line at 50</span> = neutral - balanced momentum.</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-[#e2e4ed] mb-1">Composite Signal (Bullish / Bearish / Neutral)</p>
          <p className="text-[#9ca3af] text-xs leading-relaxed">
            Combines 3 independent checks into one summary:
          </p>
          <ol className="text-xs text-[#9ca3af] mt-1 space-y-0.5 list-decimal list-inside">
            <li>Is price <em>above</em> <span className="text-purple-400">SMA(25)</span>? (↑ bullish)</li>
            <li>Is <span className="text-blue-400">SMA(7)</span> <em>above</em> <span className="text-purple-400">SMA(25)</span>? (golden cross = bullish)</li>
            <li>Is <span className="text-[#22d3ee]">RSI</span> <em>above</em> 50? (momentum = bullish)</li>
          </ol>
          <p className="text-xs text-[#9ca3af] mt-1">
            If 2+ checks are bullish<span className="text-green-400"> ▲</span> → <strong className="text-green-400">Bullish</strong>.
            If 2+ are bearish<span className="text-red-400"> ▼</span> → <strong className="text-red-400">Bearish</strong>.
            Otherwise → <strong className="text-[#6b7280]">Neutral</strong>.
          </p>
        </div>
        <div>
          <p className="font-semibold text-[#e2e4ed] mb-1">Slope ↗↘</p>
          <p className="text-[#9ca3af] text-xs leading-relaxed">
            A mathematical measure of how steeply prices are trending over the last 24 hours.
            Positive ↗ = prices climbing, negative ↘ = prices falling. The bigger the number, the steeper the trend.
          </p>
        </div>
      </div>
    </Modal>
  )
}

function CollapsibleSection({ title, count, children, defaultOpen }: { title: string; count: number; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-lg">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer text-sm font-medium text-[#9ca3af] tracking-wide uppercase hover:text-[#e2e4ed] transition-colors"
      >
        <span>{title} <span className="text-[#6b7280] font-normal">({count})</span></span>
        <span className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: number }) {
  if (!active || !payload?.length || label == null) return null
  const d = new Date(label)
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded px-3 py-2 text-xs space-y-1 shadow-lg">
      <p className="text-[#6b7280]">{dateStr} {timeStr}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {fmtPrice(entry.value)}
        </p>
      ))}
    </div>
  )
}

function RsiTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: number }) {
  if (!active || !payload?.length || label == null) return null
  const d = new Date(label)
  const val = payload[0].value
  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded px-3 py-2 text-xs shadow-lg">
      <p className="text-[#6b7280]">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</p>
      <p className="text-[#22d3ee] font-medium">RSI: {val?.toFixed(1) ?? '-'}</p>
    </div>
  )
}

function PriceChartCard({ chartData, signal, period }: { chartData: ChartPoint[]; signal: Signal; period: number }) {
  const times = useMemo(() => chartData.map(p => p.time), [chartData])
  const priceTicks = useMemo(() => chartTicks(times, period), [times, period])

  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[#9ca3af] tracking-wide uppercase">Price Chart</h3>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border ${signalBg(signal)}`}>
          <span className={signalColor(signal)}>{signalIcon(signal)}</span>
          <span className={signalColor(signal)}>{signal.charAt(0).toUpperCase() + signal.slice(1)}</span>
        </div>
      </div>
      <div className="flex items-center gap-4 mb-3 text-xs text-[#6b7280]">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 rounded bg-[#c4af64]" />Price
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 rounded bg-[#60a5fa]" />SMA(7)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 rounded bg-[#a78bfa]" />SMA(25)
        </span>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c4af64" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#c4af64" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
          <XAxis
            dataKey="time"
            scale="time" type="number"
            domain={['dataMin', 'dataMax']}
            ticks={priceTicks}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickFormatter={(t: number) => {
              const d = new Date(t)
              if (period === 24) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }}
            axisLine={{ stroke: '#2a2d3a' }}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            domain={['dataMin - 50', 'dataMax + 50']}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickFormatter={(v: number) => fmtPrice(v)}
            axisLine={false}
            tickLine={false}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="price" stroke="#c4af64" strokeWidth={2} fill="url(#priceGrad)" dot={false} name="Price" />
          <Line type="monotone" dataKey="sma7" stroke="#60a5fa" strokeWidth={1.5} dot={false} name="SMA(7)" connectNulls />
          <Line type="monotone" dataKey="sma25" stroke="#a78bfa" strokeWidth={1.5} dot={false} name="SMA(25)" connectNulls />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function RsiChartCard({ rsiData, latestRsi, period }: { rsiData: RsiPoint[]; latestRsi: number | null; period: number }) {
  const times = useMemo(() => rsiData.map(p => p.time), [rsiData])
  const rsiTicks = useMemo(() => chartTicks(times, period), [times, period])

  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[#9ca3af] tracking-wide uppercase">RSI (14)</h3>
        <span className={`text-xs font-semibold ${latestRsi !== null && latestRsi > 70 ? 'text-red-400' : latestRsi !== null && latestRsi < 30 ? 'text-green-400' : 'text-[#22d3ee]'}`}>
          {latestRsi !== null ? latestRsi.toFixed(1) : '-'}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={rsiData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
          <XAxis
            dataKey="time"
            scale="time" type="number"
            domain={['dataMin', 'dataMax']}
            ticks={rsiTicks}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickFormatter={(t: number) => {
              const d = new Date(t)
              if (period === 24) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }}
            axisLine={{ stroke: '#2a2d3a' }}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
          <Tooltip content={<RsiTooltip />} />
          <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
          <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.5} />
          <ReferenceLine y={50} stroke="#6b7280" strokeDasharray="2 2" strokeOpacity={0.3} />
          <Line type="monotone" dataKey="rsi" stroke="#22d3ee" strokeWidth={1.5} dot={false} name="RSI" connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 24, label: '24H' },
  { key: 168, label: '7D' },
]

export function GoldPricePage() {
  const { isAuthenticated } = useAuth()
  const { setSidebar, setBottomBar } = useLayoutOverride()
  const { stats, loading, error } = useGoldPrice()
  const [period, setPeriod] = useState<Period>(168)
  const [helpOpen, setHelpOpen] = useState(false)

  const showMMSidebar = isAuthenticated

  useEffect(() => {
    if (showMMSidebar) {
      setSidebar(MarketManagerSidebar)
      setBottomBar(MarketManagerBottomBar)
    } else {
      setSidebar(null)
      setBottomBar(null)
    }
    return () => { setSidebar(null); setBottomBar(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMMSidebar])

  const history = useMemo(() => stats?.history ?? [], [stats?.history])
  const currentPrice = stats?.current ?? null
  const {
    change_24h: change24h = null,
    change_pct_24h: changePct24h = null,
    high_24h: high24h = null,
    low_24h: low24h = null,
    slope_24h: slope24 = 0,
  } = stats?.summary ?? {}
  const {
    rsi_14: rsi14Val = null,
    signal: signalVal = 'neutral' as Signal,
    recommendation: recKey = 'hold',
  } = stats?.indicators ?? {}

  // Chronological (oldest -> newest): SMA/RSI warm-up nulls must fall on the OLDEST points.
  const visible = useMemo(() => history.slice(-period), [history, period])

  const chartData: ChartPoint[] = useMemo(() => {
    const pricesOnly = visible.map(p => p.price)
    const sma7Vals = sma(pricesOnly, 7)
    const sma25Vals = sma(pricesOnly, 25)
    return visible.map((p, i) => ({
      time: utcDate(p.timestamp).getTime(),
      price: p.price,
      sma7: sma7Vals[i],
      sma25: sma25Vals[i],
    }))
  }, [visible])

  const rsiData: RsiPoint[] = useMemo(() => {
    const rsiVals = rsi(history.map(p => p.price), 14)
    return history.map((p, i) => ({
      time: utcDate(p.timestamp).getTime(),
      rsi: rsiVals[i],
    }))
  }, [history])

  const tableData: ({ price: number; timestamp: string; delta: number | null })[] = useMemo(() => {
    return history.slice(-168).map((p, i, arr) => ({
      ...p,
      delta: i < arr.length - 1 ? p.price - arr[i + 1].price : null,
    }))
  }, [history])

  const rec = recStyle(recKey)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[80vh] text-center select-none">
        <div className="w-8 h-8 border-2 border-[#c4af64] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center select-none">
        <p className="text-sm text-red-400">Failed to load gold prices: {error}</p>
      </div>
    )
  }

  const columns: Column<{ price: number; timestamp: string; delta: number | null }>[] = [
    {
      key: 'timestamp', label: 'Time', sortKey: p => utcDate(p.timestamp).getTime(),
      render: p => {
        const d = utcDate(p.timestamp)
        return <span className="text-[#e2e4ed]">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</span>
      },
    },
    {
      key: 'price', label: 'Price', sortKey: p => p.price,
      render: p => <span className="text-[#c4af64] font-medium">{fmtPrice(p.price)}</span>,
    },
    {
      key: 'change', label: '1h Δ', sortKey: p => p.delta ?? 0,
      render: p => {
        if (p.delta === null) return <span className="text-[#6b7280]">-</span>
        const cls = p.delta > 0 ? 'text-green-400' : p.delta < 0 ? 'text-red-400' : 'text-[#6b7280]'
        return <span className={cls}>{p.delta > 0 ? '+' : ''}{fmtPrice(p.delta)}</span>
      },
    },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto w-full space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-xl font-semibold text-[#e2e4ed] tracking-wide">
          Albion Online <span className="text-[#c4af64]">Gold Price</span>
        </h1>
        <button
          onClick={() => setHelpOpen(true)}
          className="w-5 h-5 rounded-full bg-[#2a2d3a] border border-[#3a3d4a] text-[#9ca3af] hover:text-[#e2e4ed] hover:border-[#c4af64] text-xs flex items-center justify-center transition-colors cursor-pointer"
        >
          ?
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-lg p-4">
          <p className="text-xs text-[#6b7280] uppercase tracking-widest mb-1">Current</p>
          <p className="text-2xl font-bold text-[#c4af64]">{currentPrice !== null ? fmtPrice(currentPrice) : '-'}</p>
        </div>
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-lg p-4">
          <p className="text-xs text-[#6b7280] uppercase tracking-widest mb-1">24h Change</p>
          {change24h !== null ? (
            <p className={`text-lg font-semibold ${change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {change24h >= 0 ? '+' : ''}{fmtPrice(change24h)}
              {changePct24h !== null && (
                <span className="text-xs ml-1 opacity-80">({changePct24h >= 0 ? '+' : ''}{changePct24h.toFixed(2)}%)</span>
              )}
            </p>
          ) : (
            <p className="text-lg text-[#6b7280]">-</p>
          )}
        </div>
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-lg p-4">
          <p className="text-xs text-[#6b7280] uppercase tracking-widest mb-1">24h Range</p>
          <p className="text-sm">
            <span className="text-green-400 font-semibold">{high24h !== null ? fmtPrice(high24h) : '-'}</span>
            <span className="text-[#6b7280] mx-1">/</span>
            <span className="text-red-400 font-semibold">{low24h !== null ? fmtPrice(low24h) : '-'}</span>
          </p>
          {high24h !== null && low24h !== null && high24h > low24h && currentPrice !== null && (
            <div className="mt-1.5 h-1.5 bg-[#2a2d3a] rounded-full relative overflow-hidden">
              <div
                className="absolute h-full bg-[#c4af64] rounded-full"
                style={{ width: `${((currentPrice - low24h) / (high24h - low24h)) * 100}%` }}
              />
            </div>
          )}
        </div>
        <div className={`rounded-lg p-4 border ${rec.bg} ${rec.border}`}>
          <p className={`text-xs uppercase tracking-widest mb-1 ${rec.color}`}>Recommendation</p>
          <p className={`text-lg font-bold ${rec.color}`}>{rec.label}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {PERIODS.map(per => (
          <button
            key={per.key}
            onClick={() => setPeriod(per.key)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
              period === per.key
                ? 'bg-[#c4af64] text-white'
                : 'bg-[#1a1d27] text-[#9ca3af] border border-[#2a2d3a] hover:text-[#e2e4ed] hover:bg-[#2a2d3a]'
            }`}
          >
            {per.label}
          </button>
        ))}
        {slope24 !== 0 && (
          <span className={`text-xs ml-2 ${slope24 > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {slope24 > 0 ? '↗' : '↘'} Slope: {slope24.toFixed(2)}
          </span>
        )}
      </div>

      <PriceChartCard chartData={chartData} signal={signalVal} period={period} />

      <RsiChartCard rsiData={rsiData} latestRsi={rsi14Val} period={period} />

      <CollapsibleSection title="Recent Prices" count={tableData.length}>
        <DataTable
          columns={columns}
          data={tableData}
          rowKey={p => p.timestamp}
          defaultSort="timestamp"
          defaultSortDir="desc"
          footer={`${tableData.length} data points`}
        />
      </CollapsibleSection>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
