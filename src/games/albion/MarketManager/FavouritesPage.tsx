import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../auth/authContext'
import { useLayoutOverride } from '../../../components/LayoutOverride'
import { useItemFavourites } from '../../../hooks/useItemFavourites'
import { DEFAULT_QUALITY } from '../constants'
import {
  loadCraftStrategy, loadDefaultCity, loadMatSource, usePref,
  saveCraftStrategy, saveMatSource,
} from './premium'
import { MarketManagerSidebar } from './MarketManagerSidebar'
import { MarketManagerBottomBar } from './MarketManagerBottomBar'
import { useEnrichedRows, type BaseItem } from './ItemIndex/useEnrichedRows'
import { buildItemColumns } from './ItemIndex/itemColumns'
import { DataFreshness } from './DataFreshness'
import { ItemTable } from './ItemIndex/ItemTable'
import { ItemFilters } from './ItemIndex/ItemFilters'
import { ItemTableHelp } from './ItemIndex/ItemTableHelp'
import { StrategyToggles } from './ItemIndex/StrategyToggles'

export function FavouritesPage() {
  const { isAuthenticated } = useAuth()
  const { setSidebar, setBottomBar } = useLayoutOverride()
  const { items: favourites, isFavourite, toggle } = useItemFavourites()

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

  const baseItems = useMemo<BaseItem[]>(
    () => favourites.map(f => ({ id: f.id, name: f.name, tier: f.tier, enchant: f.enchant })),
    [favourites],
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
          Albion Online <span className="text-[#c4af64]">Favourites</span>
        </h1>
        <ItemTableHelp />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <ItemFilters
          showCatalogFilters={false}
          tier=""
          onTier={() => {}}
          enchant=""
          onEnchant={() => {}}
          quality={quality}
          onQuality={setQuality}
          location={location}
          onLocation={setLocation}
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

      {fetchedAt && (
        <p className="text-xs text-[#6b7280]">
          prices updated {fetchedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
          <DataFreshness dataAt={dataAt} fetchedAt={fetchedAt} />
          {priceError && <span className="text-red-400"> · prices unavailable</span>}
        </p>
      )}

      <div className="flex-1 min-h-0">
        <ItemTable
          rows={rows}
          columns={columns}
          empty="No favourites yet - star items in the Item Index."
          footer={`${rows.length} favourite${rows.length === 1 ? '' : 's'}`}
        />
      </div>
    </div>
  )
}
