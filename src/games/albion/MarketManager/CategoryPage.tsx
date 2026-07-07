import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../auth/authContext'
import { useLayoutOverride } from '../../../components/LayoutOverride'
import { useItemFavourites } from '../../../hooks/useItemFavourites'
import { DEFAULT_QUALITY } from '../constants'
import {
  loadCraftStrategy, loadDefaultCity, loadMatSource,
  saveCraftStrategy, saveMatSource, usePref,
} from './premium'
import { MarketManagerSidebar } from './MarketManagerSidebar'
import { MarketManagerBottomBar } from './MarketManagerBottomBar'
import { MARKET_CATEGORIES } from './marketCategories'
import { useCategoryItems } from './ItemIndex/useCategoryItems'
import { useEnrichedRows, type BaseItem } from './ItemIndex/useEnrichedRows'
import { parseTier, parseEnchant } from './ItemIndex/itemMeta'
import { buildItemColumns } from './ItemIndex/itemColumns'
import { DataFreshness } from './DataFreshness'
import { ItemTable } from './ItemIndex/ItemTable'
import { ItemFilters } from './ItemIndex/ItemFilters'
import { ItemTableHelp } from './ItemIndex/ItemTableHelp'
import { StrategyToggles } from './ItemIndex/StrategyToggles'

// One dynamic page for every item-backed category (Ore, Fire Staff, Helm Cloth, …). Routes and
// sidebar links are generated from MARKET_CATEGORIES in AlbionLayout. Same table pipeline as
// the Item Index, but the item list comes from the by-category endpoint and the name filter is
// client-side over that already-loaded list.
export function CategoryPage({ slug }: { slug: string }) {
  const label = MARKET_CATEGORIES.find(c => c.slug === slug)?.label ?? slug
  // Resources have no quality tiers - refining pages hide the quality filter.
  const isRefining = slug.startsWith('refining/')
  const { isAuthenticated } = useAuth()
  const { setSidebar, setBottomBar } = useLayoutOverride()
  const { isFavourite, toggle } = useItemFavourites()

  const [filter, setFilter] = useState('')
  const [tier, setTier] = useState('')
  const [enchant, setEnchant] = useState('')
  const [quality, setQuality] = useState(DEFAULT_QUALITY)
  const [location, setLocation] = useState(loadDefaultCity)
  // Live prefs: the Craft Settings modal (or another page's toggles) updates these too.
  const matSource = usePref(loadMatSource)
  const strategy = usePref(loadCraftStrategy)

  useEffect(() => {
    if (isAuthenticated) {
      setSidebar(MarketManagerSidebar)
      setBottomBar(MarketManagerBottomBar)
    } else {
      setSidebar(null)
      setBottomBar(null)
    }
    return () => { setSidebar(null); setBottomBar(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const { items, loading, error } = useCategoryItems(slug)

  const baseItems = useMemo<BaseItem[]>(() => {
    const q = filter.trim().toLowerCase()
    const t = tier ? Number(tier) : null
    const e = enchant ? Number(enchant) : null
    return items
      .map(i => ({ id: i.id, name: i.name, tier: parseTier(i.id), enchant: parseEnchant(i.id) }))
      .filter(r =>
        (t === null || r.tier === t)
        && (e === null || r.enchant === e)
        && (!q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)),
      )
  }, [items, filter, tier, enchant])

  // Tier dropdown lists only tiers present in the full category list (not baseItems, which is
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
      showCraft: true,
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
          Albion Online <span className="text-[#c4af64]">{label}</span>
        </h1>
        <ItemTableHelp />
      </div>

      <input
        type="text"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder={`Filter ${label} items…`}
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
          showQuality={!isRefining}
          availableTiers={availableTiers}
        />
        <StrategyToggles
          matSource={matSource}
          onMatSource={saveMatSource}
          strategy={strategy}
          onStrategy={saveCraftStrategy}
        />
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
            empty={filter.trim() ? 'No items match your filter.' : 'No items in this category.'}
            footer={`${rows.length} item${rows.length === 1 ? '' : 's'}`}
          />
        )}
      </div>
    </div>
  )
}
