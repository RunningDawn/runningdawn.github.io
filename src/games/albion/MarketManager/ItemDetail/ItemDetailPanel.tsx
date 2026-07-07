import { useMemo, useState, type ReactNode } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { ItemIcon } from '../../ItemIcon'
import { QUALITIES } from '../../constants'
import { chartTicks, tickLabel } from '../chartTicks'
import { utcDate } from '../../../../utils/date'
import { useLiveItemPrices, priceKey } from '../ItemIndex/useItemPrices'
import { useItemRecipes } from '../ItemIndex/useItemRecipes'
import { parseTier, parseEnchant, withTier, withEnchant, isResource } from '../ItemIndex/itemMeta'
import { analyzeCraft, collectRecipeIds, profit, strategyCost, type CraftStrategy3, type PriceOf, type ReturnRateOf } from '../ItemIndex/craftCost'
import { returnRateFor, salesTaxRate, stationFeeFor, useCraftSettings } from '../craftEconomics'
import {
  loadFocus, loadMatSource, loadPremium,
  saveCraftStrategy, saveMatSource, usePref, usePrefsVersion, type MatSource,
} from '../premium'
import { DataFreshness, ScanIndicator } from '../DataFreshness'
import { freshnessClass } from '../freshness'
import { ToggleGroup } from '../ItemIndex/StrategyToggles'
import { InfoTip } from '../../../../components/InfoTip'
import { useItemHistory } from './useItemHistory'
import { useVolumes } from '../ItemIndex/useVolumes'
import { PriceOverrideEditor } from '../ItemIndex/PriceOverrideEditor'
import { useItemName } from './useItemName'
import { useAvailableTiers } from './useAvailableTiers'
import { RecipeTreeCard } from './RecipeTreeCard'
import { fmt } from '../marketFormat'
import { SuspectFlag } from '../SuspectFlag'

const QUALITY_COLORS: Record<number, string> = {
  1: '#9ca3af',
  2: '#4ade80',
  3: '#60a5fa',
  4: '#a78bfa',
  5: '#c4af64',
}

// The three craft strategies shown as selectable cards; the active one drives the tree +
// shopping list. 'full' has no Best Value counterpart (client-only planning view).
const STRATEGIES: { key: CraftStrategy3; label: string; note: string; tip: string }[] = [
  {
    key: 'base',
    label: 'Base mats',
    note: 'buy every material at market',
    tip: 'Buy every top-level recipe material at market and craft the item once. Simplest path - no sub-refining or transmuting.',
  },
  {
    key: 'optimized',
    label: 'Optimized',
    note: 'cheapest buy / craft / upgrade mix',
    tip: 'For each material, take the cheapest of buy / craft-from-parts / transmute-up across the whole recipe tree. Usually the lowest total cost, and what the Best Value page uses.',
  },
  {
    key: 'full',
    label: 'Full craft',
    note: 'refine everything from raw',
    tip: 'Refine every craftable material down from raw resources. Most hands-on; best when raw mats are cheap. Planning view only - no Best Value counterpart.',
  },
]

const PERIODS = [
  { hours: 24, label: '24H', timeScale: 1 },
  { hours: 168, label: '7D', timeScale: 1 },
  { hours: 720, label: '30D', timeScale: 24 },
]

const TIERS = [1, 2, 3, 4, 5, 6, 7, 8]
const ENCHANTS = [0, 1, 2, 3, 4]
const ALL_QUALITIES = [1, 2, 3, 4, 5]

interface ChartPoint {
  time: number
  [key: `q${number}`]: number | undefined
}

function HistoryTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: number }) {
  if (!active || !payload?.length || label == null) return null
  const d = new Date(label)
  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded px-3 py-2 text-xs space-y-1 shadow-lg">
      <p className="text-[#6b7280]">
        {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
        {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
      </p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {fmt(entry.value)}
        </p>
      ))}
    </div>
  )
}

function VariantButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
        active
          ? 'bg-[#c4af64] text-white'
          : 'bg-[#1a1d27] text-[#9ca3af] border border-[#2a2d3a] hover:text-[#e2e4ed] hover:bg-[#2a2d3a]'
      }`}
    >
      {children}
    </button>
  )
}

// Self-contained item dashboard: variant switchers, per-quality market prices + history chart,
// craft economics, and a quantity-scaled shopping list. Rendered one-up on the detail route and
// two-up on the compare route, so everything it needs rides on props.
export function ItemDetailPanel({
  itemId,
  quality,
  city,
  onItemId,
  onQuality,
  actions,
}: {
  itemId: string
  quality: number
  city: string
  onItemId: (id: string) => void
  onQuality: (q: number) => void
  actions?: ReactNode
}) {
  const [period, setPeriod] = useState(PERIODS[1])
  // Live prefs: the Craft Settings modal (or another page's toggles) updates these too.
  const matSource = usePref(loadMatSource)
  const prefsVersion = usePrefsVersion()
  const [strategy, setStrategy] = useState<CraftStrategy3>('optimized')
  const [qty, setQty] = useState(1)
  // 'full' is a detail-only planning view; only the 2-value base/optimized pref is shared.
  const selectStrategy = (s: CraftStrategy3) => {
    setStrategy(s)
    if (s !== 'full') saveCraftStrategy(s)
  }
  const settings = useCraftSettings()
  const taxRate = salesTaxRate(loadPremium())

  const fetchedName = useItemName(itemId)
  const tier = parseTier(itemId)
  const enchant = parseEnchant(itemId)
  const { recipes } = useItemRecipes([itemId])
  const recipe = recipes.get(itemId)
  // Only equippable gear has quality tiers; resources, crests, artefacts, consumables, etc. pin to
  // Normal and drop the quality UI. has_quality comes from the recipe payload; fall back to the
  // resource check until it loads (no flicker).
  const hasQuality = recipe?.has_quality ?? !isResource(itemId)
  const effQuality = hasQuality ? quality : 1

  // Only offer tiers this item family actually has (falls back to all while the catalog loads,
  // and always keeps the tier being viewed). Enchantment only exists at T4+.
  const availableTiers = useAvailableTiers(itemId)
  const tierOptions = useMemo(() => {
    const base = availableTiers.length ? availableTiers : TIERS
    return base.includes(tier) ? base : [...base, tier].sort((a, b) => a - b)
  }, [availableTiers, tier])

  // The recipe payload carries the server-annotated localized name - prefer it, fall back to
  // the search lookup, then the raw id while both load.
  const name = recipe?.name || fetchedName

  const allIds = useMemo(() => {
    const set = new Set<string>([itemId])
    if (recipe) collectRecipeIds(recipe, set)
    return [...set]
  }, [itemId, recipe])

  const { prices, fetchedAt, dataAt } = useLiveItemPrices(allIds, city, ALL_QUALITIES)
  const volumeIds = useMemo(() => [itemId], [itemId])
  const itemVolumes = useVolumes(volumeIds, city, effQuality)
  const { series, loading: historyLoading, error: historyError } = useItemHistory(itemId, city, period.timeScale)

  // Materials price at quality 1; matSource picks instant-buy vs buy-order prices.
  // A 0 from the price API means "no data", not free.
  const priceOf: PriceOf = useMemo(
    () => id => {
      const row = prices.get(priceKey(id, city, 1))
      return (matSource === 'buy' ? row?.buy_price_max : row?.sell_price_min) || null
    },
    [prices, city, matSource],
  )

  // Craft Settings applied: bonus-aware return rates per craft line (+focus), station fee.
  // prefsVersion re-derives when the focus toggle (or another page) changes the pref.
  const rrOf: ReturnRateOf = useMemo(() => {
    const focus = loadFocus()
    return id => returnRateFor(id, city, focus)
    // prefsVersion is read indirectly via loadFocus(); bump re-derives the memo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, prefsVersion])

  const analysis = useMemo(
    () => analyzeCraft(recipe, priceOf, rrOf, stationFeeFor(itemId, city, settings, recipe?.item_value)),
    [recipe, priceOf, rrOf, itemId, city, settings],
  )

  const chartData = useMemo<ChartPoint[]>(() => {
    // Window is anchored to the newest data point (not the wall clock), so a stale market
    // still draws a full chart.
    let latest = 0
    for (const s of series) {
      for (const p of s.data) {
        latest = Math.max(latest, utcDate(p.timestamp).getTime())
      }
    }
    const cutoff = latest - period.hours * 3_600_000
    const byTime = new Map<number, ChartPoint>()
    for (const s of series) {
      for (const p of s.data) {
        const time = utcDate(p.timestamp).getTime()
        if (time < cutoff) continue
        const point = byTime.get(time) ?? { time }
        point[`q${s.quality}`] = p.avg_price
        byTime.set(time, point)
      }
    }
    return [...byTime.values()].sort((a, b) => a.time - b.time)
  }, [series, period])

  const ticks = useMemo(() => chartTicks(chartData.map(p => p.time), period.hours), [chartData, period])
  const chartedQualities = useMemo(() => {
    const withData = ALL_QUALITIES.filter(q => series.some(s => s.quality === q && s.data.length > 0))
    // Resource "qualities" are duplicates of the same data - chart a single line.
    if (!hasQuality) return withData.length ? [withData.includes(1) ? 1 : withData[0]] : []
    return withData
  }, [series, hasQuality])

  const selectedRow = prices.get(priceKey(itemId, city, effQuality))
  const rawSell = selectedRow?.sell_price_min || null
  const sell = (selectedRow?.effective_sell ?? selectedRow?.sell_price_min) || null
  const sellSuspect = !!selectedRow?.sell_suspect
  const buy = selectedRow?.buy_price_max || null
  const scannedAt = selectedRow?.timestamp ? utcDate(selectedRow.timestamp) : null
  const cost = analysis ? strategyCost(analysis, strategy) : null

  return (
    <div className="space-y-4 min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ItemIcon uniqueName={itemId} size={56} quality={hasQuality ? quality : undefined} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-lg font-semibold text-[#e2e4ed] truncate">{name || itemId}</h2>
            <a
              href={`https://wiki.albiononline.com/wiki/Special:Search?search=${encodeURIComponent(name || itemId)}&go=Go`}
              target="_blank"
              rel="noopener noreferrer"
              title="Open official wiki page"
              className="shrink-0 text-[#6b7280] hover:text-[#c4af64] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Wiki">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
          <p className="text-xs text-[#6b7280]">
            T{tier}{enchant > 0 ? `.${enchant}` : ''}{hasQuality ? ` · ${QUALITIES.find(q => q.value === quality)?.label}` : ''} · {city}
          </p>
        </div>
        {actions}
      </div>

      {/* Variant switchers, with the manual-price override on the right of the box */}
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-[#6b7280] uppercase tracking-widest w-14">Tier</span>
            {tierOptions.map(t => (
              <VariantButton
                key={t}
                active={t === tier}
                onClick={() => onItemId(t >= 4 ? withTier(itemId, t) : withEnchant(withTier(itemId, t), 0))}
              >
                T{t}
              </VariantButton>
            ))}
          </div>
          {/* Enchantment only exists at T4+ */}
          {tier >= 4 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-[#6b7280] uppercase tracking-widest w-14">Enchant</span>
              {ENCHANTS.map(e => (
                <VariantButton key={e} active={e === enchant} onClick={() => onItemId(withEnchant(itemId, e))}>
                  .{e}
                </VariantButton>
              ))}
            </div>
          )}
        </div>
        <div className="shrink-0">
          <PriceOverrideEditor
            itemId={itemId}
            city={city}
            quality={effQuality}
            current={rawSell}
            isOverride={selectedRow?.source === 'user'}
            label="Set Manual Price Override"
          />
        </div>
      </div>

      {/* Per-quality market prices; click selects the quality the stats below use.
          Resources have no quality tiers - the strip is hidden for them. */}
      {hasQuality && (
      <div className="grid grid-cols-5 gap-2">
        {QUALITIES.map(q => {
          const qRow = prices.get(priceKey(itemId, city, q.value))
          const p = (qRow?.effective_sell ?? qRow?.sell_price_min) || null
          const qSuspect = !!qRow?.sell_suspect
          const active = q.value === quality
          return (
            <button
              key={q.value}
              onClick={() => onQuality(q.value)}
              className={`rounded-lg border p-2 text-center cursor-pointer transition-colors select-text ${
                active ? 'border-[#c4af64] bg-[#c4af64]/10' : 'border-[#2a2d3a] bg-[#1a1d27] hover:border-[#3a3d4a]'
              }`}
            >
              <p className="text-[10px] uppercase tracking-wider truncate" style={{ color: QUALITY_COLORS[q.value] }}>
                {q.label}
              </p>
              <p className={`text-sm font-semibold ${p != null ? 'text-[#e2e4ed]' : 'text-[#6b7280]'}`}>{fmt(p)}{qSuspect && <SuspectFlag rawAsk={qRow?.sell_price_min} />}</p>
            </button>
          )
        })}
      </div>
      )}

      {/* History chart - one line per quality (single line for resources) */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-medium text-[#9ca3af] tracking-wide uppercase">Price History</h3>
          <div className="flex items-center gap-1.5">
            {PERIODS.map(p => (
              <VariantButton key={p.label} active={p.label === period.label} onClick={() => setPeriod(p)}>
                {p.label}
              </VariantButton>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 mb-3 text-xs text-[#6b7280] flex-wrap">
          {chartedQualities.map(q => (
            <span key={q} className="flex items-center gap-1">
              <span className="w-3 h-0.5 rounded" style={{ background: QUALITY_COLORS[q] }} />
              {hasQuality ? QUALITIES.find(x => x.value === q)?.label : 'Price'}
            </span>
          ))}
        </div>
        {historyError ? (
          <p className="text-sm text-red-400 text-center py-10">Failed to load history: {historyError}</p>
        ) : chartData.length === 0 ? (
          <p className="text-sm text-[#6b7280] text-center py-10 max-w-md mx-auto">
            {historyLoading
              ? 'Loading history…'
              : 'No completed sales recorded for this market and window. An item can have a listed price with no trade history - the chart only plots buckets where something actually sold.'}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
              <XAxis
                dataKey="time"
                scale="time" type="number"
                domain={['dataMin', 'dataMax']}
                ticks={ticks}
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickFormatter={(t: number) => tickLabel(t, period.hours)}
                axisLine={{ stroke: '#2a2d3a' }}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickFormatter={(v: number) => fmt(v)}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip content={<HistoryTooltip />} />
              {chartedQualities.map(q => (
                <Line
                  key={q}
                  type="monotone"
                  dataKey={`q${q}`}
                  stroke={hasQuality ? QUALITY_COLORS[q] : '#c4af64'}
                  strokeWidth={q === effQuality ? 2 : 1.25}
                  dot={chartData.length <= 2 ? { r: 2 } : false}
                  name={hasQuality ? QUALITIES.find(x => x.value === q)?.label : 'Price'}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Economics - all values from Craft Settings (premium tax, focus, station fees) */}
      <div className="flex flex-wrap items-center gap-4">
        <ToggleGroup<MatSource>
          label="Mats"
          value={matSource}
          options={[['sell', 'Instant buy'], ['buy', 'Buy orders']]}
          onChange={saveMatSource}
        />
        <span className="text-xs text-[#6b7280]">
          tax {Math.round(taxRate * 100)}% · mats at {matSource === 'buy' ? 'buy-order' : 'instant-buy'} prices · bonus-aware returns · fees from Craft Settings
        </span>
        {fetchedAt && (
          <span className="flex items-center gap-1.5 text-xs text-[#6b7280]">
            prices updated {fetchedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            <DataFreshness dataAt={dataAt} fetchedAt={fetchedAt} />
            <span className="text-[#3a3d4a]">·</span>
            this item
            <ScanIndicator dataAt={scannedAt} fetchedAt={fetchedAt} source={selectedRow?.source} by={selectedRow?.entered_by} />
          </span>
        )}
      </div>
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-[#6b7280]">Market price</span>
          <InfoTip text="Sell (min) is the lowest sell order: what you pay to buy instantly, or the ask you undercut when you place your own sell order and wait for a buyer. Buy (max) is the highest buy order: sell into it for instant (lower) silver, or place your own buy order and wait for a cheaper fill." />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            label="Sell (min)"
            value={fmt(sell)}
            gold={selectedRow?.source === 'user'}
            suspect={sellSuspect}
            rawAsk={rawSell}
            title={selectedRow?.source === 'user'
              ? 'Manual override (not scanned)'
              : sellSuspect
                ? `Lowest ask ${fmt(rawSell)} looks like a lone troll listing — showing the recent traded average`
                : undefined}
          />
          <StatCard label="Buy (max)" value={fmt(buy)} />
        </div>
      </div>

      {(scannedAt || itemVolumes.get(itemId)) && (
        <p className="text-xs text-[#6b7280]">
          {scannedAt && fetchedAt && (
            <span className={freshnessClass(Math.max(0, fetchedAt.getTime() - scannedAt.getTime()))}>
              {selectedRow?.source === 'user'
                ? `custom price${selectedRow.entered_by ? ` by ${selectedRow.entered_by}` : ''}, entered ${scannedAt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}`
                : `this market (town + quality) last scanned in game ${scannedAt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}`}
            </span>
          )}
          {itemVolumes.get(itemId) && (
            <span>
              {scannedAt ? ' · ' : ''}
              sold {itemVolumes.get(itemId)!.sold_24h.toLocaleString('en-US')} in 24h
              {' / '}{itemVolumes.get(itemId)!.sold_1h.toLocaleString('en-US')} last hour
              {itemVolumes.get(itemId)!.avg_daily_sold != null && (
                <> · ~{itemVolumes.get(itemId)!.avg_daily_sold!.toLocaleString('en-US')}/day avg (30d)</>
              )}
              {' · avg '}{fmt(itemVolumes.get(itemId)!.avg_price_24h)}
            </span>
          )}
        </p>
      )}

      {/* Craft strategy: pick one; the tree + shopping list below both follow it */}
      {analysis && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {STRATEGIES.map(s => {
            const c = strategyCost(analysis, s.key)
            return (
              <StrategyCard
                key={s.key}
                label={s.label}
                note={s.note}
                tip={s.tip}
                cost={c}
                profit={profit(sell, c, taxRate)}
                selected={s.key === strategy}
                onSelect={() => selectStrategy(s.key)}
              />
            )
          })}
        </div>
      )}

      {/* Crafting tree flowchart with the aggregated shopping list beside it */}
      {recipe && recipe.craftable && recipe.recipe.length > 0 && (
        <RecipeTreeCard
          recipe={recipe}
          priceOf={priceOf}
          rrOf={rrOf}
          strategy={strategy}
          qty={qty}
          onQty={setQty}
          stationFee={analysis?.stationFee ?? 0}
          cost={cost}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, title, gold, tone, bold, suspect, rawAsk }: { label: string; value: string; title?: string; gold?: boolean; tone?: 'green' | 'red'; bold?: boolean; suspect?: boolean; rawAsk?: number | null }) {
  const color = tone === 'green' ? 'text-green-400' : tone === 'red' ? 'text-red-400' : gold ? 'text-[#c4af64]' : 'text-[#e2e4ed]'
  return (
    <div className={`bg-[#1a1d27] border rounded-lg p-3 text-center ${bold ? 'border-[#c4af64]/50' : 'border-[#2a2d3a]'}`} title={title}>
      <p className={`text-[10px] uppercase tracking-widest mb-1 ${bold ? 'text-[#c4af64] font-semibold' : 'text-[#6b7280]'}`}>{label}</p>
      <p className={`text-base ${bold ? 'font-bold' : 'font-semibold'} ${color}`}>{value}{suspect && <SuspectFlag rawAsk={rawAsk} />}</p>
    </div>
  )
}

// One selectable craft strategy: its all-in per-unit cost (silver + station fee folded in,
// return rate applied) and the profit + return% it yields at the current sell. Selecting it
// drives the crafting tree + shopping list below. Profit uses the same cost, so the numbers
// reconcile end to end and match the Best Value page (for base / optimized).
function StrategyCard({ label, note, tip, cost, profit: p, selected, onSelect }: {
  label: string
  note: string
  tip: string
  cost: number | null
  profit: number | null
  selected: boolean
  onSelect: () => void
}) {
  const returnPct = cost && cost > 0 && p != null ? (p / cost) * 100 : null
  const tone = p == null ? 'text-[#6b7280]' : p > 0 ? 'text-green-400' : 'text-red-400'
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }}
      aria-pressed={selected}
      className={`relative rounded-lg border p-3 text-center transition-colors cursor-pointer select-text focus:outline-none focus:border-[#c4af64] ${
        selected ? 'border-[#c4af64] bg-[#c4af64]/10' : 'border-[#2a2d3a] bg-[#1a1d27] hover:border-[#3a3d4a]'
      }`}
    >
      <span className="absolute right-1.5 top-1.5" onClick={e => e.stopPropagation()}>
        <InfoTip text={tip} />
      </span>
      <span className={`block text-[11px] font-semibold uppercase tracking-wider ${selected ? 'text-[#c4af64]' : 'text-[#9ca3af]'}`}>{label}</span>
      <p className="mt-1 text-lg font-bold text-[#e2e4ed]">{fmt(cost)}</p>
      <div className="mt-0.5 flex items-center justify-center gap-2">
        <span className={`text-sm font-semibold ${tone}`}>
          {p == null ? '-' : `${p > 0 ? '+' : ''}${fmt(p)}`}
        </span>
        {returnPct != null && (
          <span className={`text-xs ${returnPct > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {returnPct > 0 ? '+' : ''}{returnPct.toFixed(1)}%
          </span>
        )}
      </div>
      <p className="mt-1 text-[10px] text-[#6b7280]">{selected ? `● selected · ${note}` : note}</p>
    </div>
  )
}
