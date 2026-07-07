import { Routes, Route } from 'react-router'
import { ForgeLayout } from '../../components/ForgeLayout'
import { LayoutOverrideProvider } from '../../components/LayoutOverride'
import { NotFound } from '../../components/NotFound'
import { AlbionSplash } from './AlbionSplash'
import { AlbionSidebar } from './AlbionSidebar'
import { AlbionBottomBar } from './AlbionBottomBar'
import { MarketManager } from './MarketManager'
import { GoldPricePage } from './MarketManager/Gold/GoldPricePage'
import { ItemIndexPage } from './MarketManager/ItemIndex/ItemIndexPage'
import { GuildDataPage } from './MarketManager/GuildData/GuildDataPage'
import { FavouritesPage } from './MarketManager/FavouritesPage'
import { BestValuePage } from './MarketManager/BestValuePage'
import { CraftSettingsPage } from './MarketManager/CraftSettingsPage'
import { XCityArbitragePage } from './MarketManager/MarketFixing/XCityArbitragePage'
import { VelocityFlipPage } from './MarketManager/MarketFixing/VelocityFlipPage'
import { RouteRiskRewardPage } from './MarketManager/MarketFixing/RouteRiskRewardPage'
import { BMVolumePredictPage } from './MarketManager/MarketFixing/BMVolumePredictPage'
import { CategoryPage } from './MarketManager/CategoryPage'
import { ItemDetailPage } from './MarketManager/ItemDetail/ItemDetailPage'
import { ComparePage } from './MarketManager/ItemDetail/ComparePage'
import { MARKET_CATEGORIES } from './MarketManager/marketCategories'

// Placeholder settings modal body for the ForgeLayout gear (the Market Manager's
// own Craft Settings live in a separate modal opened from its sidebar).
function AlbionSettings() {
  return <p className="px-5 py-4 text-sm text-[#6b7280]">No settings yet.</p>
}

// Albion section layout. Mounted at /albion/* — the splash sits at the index and
// the Market Manager under /albion/market-manager/*, all inside the app chrome.
export default function AlbionLayout() {
  return (
    <LayoutOverrideProvider>
      <Routes>
        <Route element={
          <ForgeLayout
            homePath="/albion"
            sidebar={AlbionSidebar}
            settings={AlbionSettings}
            bottomBar={AlbionBottomBar}
          />
        }>
          <Route index element={<AlbionSplash />} />
          <Route path="market-manager" element={<MarketManager />} />
          <Route path="market-manager/gold" element={<GoldPricePage />} />
          <Route path="market-manager/item-index" element={<ItemIndexPage />} />
          <Route path="market-manager/guild-data" element={<GuildDataPage />} />
          <Route path="market-manager/favourites" element={<FavouritesPage />} />
          <Route path="market-manager/best-value" element={<BestValuePage />} />
          <Route path="market-manager/craft-settings" element={<CraftSettingsPage />} />
          <Route path="market-manager/market-fixing/x-city-arbitrage" element={<XCityArbitragePage />} />
          <Route path="market-manager/market-fixing/velocity-flip" element={<VelocityFlipPage />} />
          <Route path="market-manager/market-fixing/route-risk-reward" element={<RouteRiskRewardPage />} />
          <Route path="market-manager/market-fixing/bm-volume-predict" element={<BMVolumePredictPage />} />
          <Route path="market-manager/item/:itemId" element={<ItemDetailPage />} />
          <Route path="market-manager/compare" element={<ComparePage />} />
          {MARKET_CATEGORIES.map(c => (
            <Route key={c.slug} path={`market-manager/${c.slug}`} element={<CategoryPage slug={c.slug} />} />
          ))}
          <Route path="*" element={<NotFound backTo="/albion" backLabel="Back to Albion" />} />
        </Route>
      </Routes>
    </LayoutOverrideProvider>
  )
}
