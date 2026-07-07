import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Column } from '../../../../components/DataTable'
import { utcDate } from '../../../../utils/date'
import { fmt } from '../marketFormat'
import { SuspectFlag } from '../SuspectFlag'
import { ScanIndicator } from '../DataFreshness'
import { ItemIcon } from '../../ItemIcon'
import { profit } from './craftCost'
import { CraftCell } from './CraftBreakdownCell'
import { ProfitMaterialsCell } from './ProfitMaterialsCell'
import { PriceOverrideEditor } from './PriceOverrideEditor'
import type { CraftStrategy } from '../premium'
import type { ItemRow } from './types'

interface ColumnOpts {
  isFavourite: (id: string) => boolean
  onToggleFav: (row: ItemRow) => void
  quality: number
  showCraft?: boolean
  taxRate?: number // premium-driven sales tax (salesTaxRate)
  strategy?: CraftStrategy // which craft cost the profit columns use
  linkTo?: (row: ItemRow) => string // item name becomes a link (detail page)
  fetchedAt?: Date | null // anchor for the per-row scan-age dots (no Date.now in render)
  location?: string // the table's single town - enables the manual price-override pencil
}

// Shared column defs for the Item Index + Favourites tables. Craft/profit columns are appended
// only when showCraft is set (and a recipe-derived analysis is present on the row).
export function buildItemColumns(opts: ColumnOpts): Column<ItemRow>[] {
  const taxRate = opts.taxRate ?? 0
  const strategy = opts.strategy ?? 'optimized'
  const costOf = (r: ItemRow) => (strategy === 'base' ? r.craft?.fullBuy : r.craft?.optimal)

  const cols: Column<ItemRow>[] = [
    {
      key: 'fav',
      label: '',
      className: 'w-8 text-center',
      render: row => (
        <button
          onClick={() => opts.onToggleFav(row)}
          className={`text-sm cursor-pointer transition-colors ${
            opts.isFavourite(row.id) ? 'text-[#c4af64]' : 'text-[#3a3d4a] hover:text-[#6b7280]'
          }`}
          aria-label={opts.isFavourite(row.id) ? 'Remove from favourites' : 'Add to favourites'}
        >
          ★
        </button>
      ),
    },
    {
      key: 'name',
      label: 'Item',
      sortKey: r => r.name,
      render: row => (
        <span className="flex items-center gap-2">
          {/* No quality param: keeps one cached icon URL per item across quality flips. */}
          <ItemIcon uniqueName={row.id} size={32} />
          {opts.linkTo ? (
            <Link to={opts.linkTo(row)} className="text-[#e2e4ed] hover:text-[#c4af64] transition-colors">
              {row.name}
            </Link>
          ) : (
            <span className="text-[#e2e4ed]">{row.name}</span>
          )}
        </span>
      ),
    },
    {
      key: 'tier',
      label: 'Tier',
      sortKey: r => r.tier * 10 + r.enchant,
      render: row => (
        <span className="text-[#9ca3af]">
          T{row.tier}
          {row.enchant > 0 ? `.${row.enchant}` : ''}
        </span>
      ),
    },
    {
      key: 'sell',
      label: 'Sell (min)',
      title: 'Lowest current ask, or a shared manual override. A lone troll ask far above the recent traded average is replaced by that average and flagged with *. Use the pencil to set a manual price when the scanned data is stale.',
      sortKey: r => (r.price?.effective_sell ?? r.price?.sell_price_min) ?? -1,
      render: row => (
        <span className="flex items-center gap-1.5">
          {priceCell(
            row.price?.effective_sell ?? row.price?.sell_price_min,
            row.price?.source === 'user',
            row.price?.sell_suspect ? row.price?.sell_price_min : undefined,
          )}
          {opts.location && (
            <PriceOverrideEditor
              itemId={row.id}
              city={opts.location}
              quality={opts.quality}
              current={row.price?.sell_price_min ?? null}
              isOverride={row.price?.source === 'user'}
            />
          )}
        </span>
      ),
    },
    {
      key: 'scanned',
      label: 'Scanned',
      title: 'When this market was last scanned in game (per item + town), colored by age. A person icon marks a shared manual override; sort to pull the stalest to the top.',
      sortKey: r => {
        const ts = r.price?.timestamp
        if (!ts) return Number.POSITIVE_INFINITY
        const anchor = opts.fetchedAt?.getTime() ?? utcDate(ts).getTime()
        return anchor - utcDate(ts).getTime()
      },
      render: row => (
        <ScanIndicator
          dataAt={row.price?.timestamp ? utcDate(row.price.timestamp) : null}
          fetchedAt={opts.fetchedAt ?? null}
          source={row.price?.source}
          by={row.price?.entered_by}
        />
      ),
    },
    {
      key: 'sold',
      label: 'Sold/day',
      title: 'Units traded in this town over the last 24h (from ADP hourly candles). 0 or blank = nothing traded - distrust the prices.',
      sortKey: r => r.volume?.sold_24h ?? -1,
      render: row => row.volume
        ? <span className="text-[#9ca3af]">{row.volume.sold_24h.toLocaleString('en-US')}</span>
        : <span className="text-[#4a4d5a]">-</span>,
    },
    {
      key: 'buy',
      label: 'Buy (max)',
      sortKey: r => r.price?.buy_price_max ?? -1,
      render: row => priceCell(row.price?.buy_price_max),
    },
  ]

  if (opts.showCraft) {
    cols.push(
      {
        key: 'craft_base',
        label: 'Craft (base)',
        title: 'Top-level recipe materials bought at current market prices - no sub-crafting',
        sortKey: r => r.craft?.fullBuy ?? Number.POSITIVE_INFINITY,
        render: row => costCell(row.craft?.fullBuy),
      },
      {
        key: 'craft',
        label: 'Craft (optimized)',
        title: 'Cheapest mix of buy / craft / upgrade across the whole recipe tree',
        sortKey: r => r.craft?.optimal ?? Number.POSITIVE_INFINITY,
        render: row => <CraftCell analysis={row.craft} />,
      },
      {
        key: 'profit_sell',
        label: 'Profit (sell)',
        title: 'Craft it, list just under the cheapest sell order, pay sales tax. Click a value for the materials to buy. A lone troll ask is valued at the traded average instead.',
        className: 'font-bold text-[#e2e4ed]',
        sortKey: r => profit(r.price?.effective_sell ?? r.price?.sell_price_min, costOf(r), taxRate) ?? Number.NEGATIVE_INFINITY,
        render: row => (
          <ProfitMaterialsCell
            analysis={row.craft}
            revenue={row.price?.effective_sell ?? row.price?.sell_price_min}
            taxRate={taxRate}
            strategy={strategy}
          />
        ),
      },
      {
        key: 'profit_buy',
        label: 'Profit (buy)',
        title: 'Craft it and dump it instantly into the best buy order - the pessimistic floor.',
        sortKey: r => profit(r.price?.buy_price_max, costOf(r), taxRate) ?? Number.NEGATIVE_INFINITY,
        render: row => profitCell(profit(row.price?.buy_price_max, costOf(row), taxRate)),
      },
    )
  }

  return cols
}

function priceCell(v: number | undefined, custom = false, suspectRawAsk?: number): ReactNode {
  if (v == null || v === 0) return <span className="text-[#6b7280]">-</span>
  const cls = custom
    ? 'text-[#c4af64] font-medium underline decoration-dotted decoration-[#c4af64]/50'
    : 'text-[#c4af64] font-medium'
  return (
    <span className={cls} title={custom ? 'Manual override (not scanned)' : undefined}>
      {v.toLocaleString('en-US')}
      {suspectRawAsk != null && <SuspectFlag rawAsk={suspectRawAsk} />}
    </span>
  )
}

function costCell(v: number | null | undefined): ReactNode {
  if (v == null) return <span className="text-[#6b7280]">-</span>
  return <span className="text-[#9ca3af]">{fmt(v)}</span>
}

function profitCell(v: number | null): ReactNode {
  if (v == null) return <span className="text-[#6b7280]">-</span>
  const cls = v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : 'text-[#6b7280]'
  return <span className={cls}>{v > 0 ? '+' : ''}{fmt(v)}</span>
}
