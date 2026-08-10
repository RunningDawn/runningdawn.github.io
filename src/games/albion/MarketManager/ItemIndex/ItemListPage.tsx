import { useMemo, useState } from 'react'
import { useItemFavourites } from '../../../../hooks/useItemFavourites'
import { DEFAULT_QUALITY } from '../../constants'
import { loadCraftStrategy, loadDefaultCity, loadMatSource, usePref } from '../premium'
import { useMarketManagerChrome } from '../useMarketManagerChrome'
import { useEnrichedRows, type BaseItem } from './useEnrichedRows'
import { parseTier, parseEnchant } from './itemMeta'
import { buildItemColumns } from './itemColumns'
import { DataFreshness } from '../DataFreshness'
import { ItemTable } from './ItemTable'
import { ItemFilters } from './ItemFilters'
import { ItemTableHelp } from './ItemTableHelp'
import { StrategyToggles } from './StrategyToggles'
import type { AlbionItem } from './types'

interface ItemListPageProps {
  title: string
  placeholder: string
  query: string
  onQuery: (v: string) => void
  items: AlbionItem[]
  loading: boolean
  error: string | null
  // Category pages filter the already-loaded list by name/id; the Item Index searches
  // server-side, so its query never re-filters the results client-side.
  filterClientSide?: boolean
  showQuality?: boolean
  emptyFiltered: string
  empty: string
}

// Shared table pipeline for the Item Index and every item-backed category page: one text
// input + filters + strategy toggles over useEnrichedRows. Only the item source, labels,
// and quality visibility vary per page.
export function ItemListPage({
  title,
  placeholder,
  query,
  onQuery,
  items,
  loading,
  error,
  filterClientSide = false,
  showQuality = true,
  emptyFiltered,
  empty,
}: ItemListPageProps) {
  useMarketManagerChrome()
  const { isFavourite, toggle } = useItemFavourites()

  const [tier, setTier] = useState('')
  const [enchant, setEnchant] = useState('')
  const [quality, setQuality] = useState(DEFAULT_QUALITY)
  const [location, setLocation] = useState(loadDefaultCity)
  // Live prefs: the Craft Settings modal (or another page's toggles) updates these too.
  const matSource = usePref(loadMatSource)
  const strategy = usePref(loadCraftStrategy)

  const baseItems = useMemo<BaseItem[]>(() => {
    const q = filterClientSide ? query.trim().toLowerCase() : ''
    const t = tier ? Number(tier) : null
    const e = enchant ? Number(enchant) : null
    return items
      .map(i => ({ id: i.id, name: i.name, tier: parseTier(i.id), enchant: parseEnchant(i.id) }))
      .filter(r =>
        (t === null || r.tier === t)
        && (e === null || r.enchant === e)
        && (!q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)),
      )
  }, [items, filterClientSide, query, tier, enchant])

  // Tier dropdown lists only tiers present in the full item list (not baseItems, which is
  // already tier-filtered).
  const availableTiers = useMemo(
    () => [...new Set(items.map(i => parseTier(i.id)))].filter(t => t > 0).sort((a, b) => a - b),
    [items],
  )

  const { rows, fetchedAt, dataAt, priceError, taxRate } = useEnrichedRows(baseItems, location, quality, matSource)

  const columns = useMemo(
    () => buildItemColumns({
      isFavourite,
      onToggleFav: row => toggle({ id: row.id, name: row.name, tier: row.tier, enchant: row.enchant }),
      quality,
      taxRate,
      strategy,
      fetchedAt,
      location,
      linkTo: row => `/albion/market-manager/item/${encodeURIComponent(row.id)}?quality=${quality}&city=${encodeURIComponent(location)}`,
    }),
    [isFavourite, toggle, quality, taxRate, strategy, location, fetchedAt],
  )

  return (
    <div className="p-6 max-w-[1600px] mx-auto w-full h-full flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold text-[#e2e4ed] tracking-wide">
          Albion Online <span className="text-[#c4af64]">{title}</span>
        </h1>
        <ItemTableHelp />
      </div>

      <input
        type="text"
        value={query}
        onChange={e => onQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full max-w-md bg-[#0f1117] border border-[#2a2d3a] rounded px-3 py-2 text-sm text-[#e2e4ed] placeholder-[#6b7280] focus:outline-none focus:border-[#c4af64]"
      />

      <div className="flex flex-wrap items-end gap-3">
        <ItemFilters
          tier={tier}
          onTier={setTier}
          enchant={enchant}
          onEnchant={setEnchant}
          quality={quality}
          onQuality={setQuality}
          location={location}
          onLocation={setLocation}
          showQuality={showQuality}
          availableTiers={availableTiers}
        />
        <StrategyToggles matSource={matSource} strategy={strategy} />
        <span className="text-xs text-[#6b7280] pb-1.5">
          tax {Math.round(taxRate * 100)}% · bonus-aware returns · fees from Craft Settings
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-[#6b7280]">
        <span>{rows.length} item{rows.length === 1 ? '' : 's'}</span>
        {fetchedAt && <span>· prices updated {fetchedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>}
        <DataFreshness dataAt={dataAt} fetchedAt={fetchedAt} />
        {priceError && <span className="text-red-400">· prices unavailable</span>}
      </div>

      <div className="flex-1 min-h-0">
        {error ? (
          <p className="text-sm text-red-400 text-center py-10">Failed to load items: {error}</p>
        ) : loading && items.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#c4af64] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ItemTable
            rows={rows}
            columns={columns}
            empty={query.trim() ? emptyFiltered : empty}
            footer={`${rows.length} item${rows.length === 1 ? '' : 's'}`}
          />
        )}
      </div>
    </div>
  )
}
