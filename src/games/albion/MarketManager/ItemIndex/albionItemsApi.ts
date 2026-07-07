import { albionFetch } from '../../api'
import type {
  AlbionItem, BestValuePayload, CraftSettings, CraftSettingsPayload,
  RawHistorySeries, RawItemPrice, RecipeNode, VolumeRow,
} from './types'

// Single data-access layer for the Item Index. Every hook calls only these three functions.
type Envelope<T> = { status: 'ok'; payload: T } | { status: 'error'; message: string }

// GET /game/albion/items?query=  (no query → first 100; query → up to 50 matches)
export async function searchItems(query: string): Promise<Envelope<AlbionItem[]>> {
  const q = query.trim() ? `?query=${encodeURIComponent(query.trim())}` : ''
  return albionFetch<AlbionItem[]>(`/game/albion/items${q}`)
}

// GET /game/albion/items/by-category/{slug}  (slug from marketCategories.ts, e.g. "refining/ore")
export async function fetchCategoryItems(slug: string): Promise<Envelope<AlbionItem[]>> {
  const path = slug.split('/').map(encodeURIComponent).join('/')
  return albionFetch<AlbionItem[]>(`/game/albion/items/by-category/${path}`)
}

// GET /game/albion/prices/{ids}?locations=&qualities=
export async function fetchItemPrices(
  itemIds: string[],
  locations: string[],
  qualities: number[],
): Promise<Envelope<RawItemPrice[]>> {
  const ids = itemIds.map(encodeURIComponent).join(',')
  const loc = encodeURIComponent(locations.join(','))
  const qual = encodeURIComponent(qualities.join(','))
  return albionFetch<RawItemPrice[]>(`/game/albion/prices/${ids}?locations=${loc}&qualities=${qual}`)
}

// GET /game/albion/prices/volumes/{ids} - 24h throughput, chunked like recipes (server
// caps at 100 ids). Per-chunk failures are tolerated (those markets just show no volume).
export async function fetchVolumes(
  itemIds: string[],
  locations: string[],
  qualities: number[],
): Promise<Envelope<VolumeRow[]>> {
  if (itemIds.length === 0) return { status: 'ok', payload: [] }
  const loc = encodeURIComponent(locations.join(','))
  const qual = encodeURIComponent(qualities.join(','))
  const chunks: string[][] = []
  for (let i = 0; i < itemIds.length; i += RECIPE_CHUNK) {
    chunks.push(itemIds.slice(i, i + RECIPE_CHUNK))
  }
  const results = await Promise.all(chunks.map(chunk =>
    albionFetch<VolumeRow[]>(
      `/game/albion/prices/volumes/${chunk.map(encodeURIComponent).join(',')}?locations=${loc}&qualities=${qual}`,
    ),
  ))
  const rows: VolumeRow[] = []
  for (const res of results) {
    if (res.status === 'ok') rows.push(...res.payload)
  }
  return { status: 'ok', payload: rows }
}

// GET /game/albion/prices/history/{id}?locations=&qualities=&time-scale=
// Always requests every quality - the detail chart draws one line per quality level.
export async function fetchItemHistory(
  itemId: string,
  location: string,
  timeScale: number,
): Promise<Envelope<RawHistorySeries[]>> {
  const id = encodeURIComponent(itemId)
  const loc = encodeURIComponent(location)
  return albionFetch<RawHistorySeries[]>(
    `/game/albion/prices/history/${id}?locations=${loc}&qualities=1,2,3,4,5&time-scale=${timeScale}`,
  )
}

// GET /game/albion/best-value - server-side sweep across every city, cached 120s. Rows are
// (item, city) pairs ranked overall. `premium` drives the sales tax (4% vs 8%), `focus` the
// focus return rates, `mats`/`strategy` mirror the trading-strategy toggles, `scope`
// all|craftable (craftable = made at a real station, drops stationless outliers).
export async function fetchBestValue(
  premium: boolean,
  focus: boolean,
  mats: string,
  strategy: string,
  scope: string,
): Promise<Envelope<BestValuePayload>> {
  return albionFetch<BestValuePayload>(
    `/game/albion/best-value?premium=${premium}&focus=${focus}&mats=${mats}&strategy=${strategy}&scope=${scope}`,
  )
}

// GET/PUT /game/albion/craft-settings - community-shared (everyone sees the same values).
export async function fetchCraftSettings(): Promise<Envelope<CraftSettingsPayload>> {
  return albionFetch<CraftSettingsPayload>('/game/albion/craft-settings')
}

export async function putCraftSettings(settings: CraftSettings): Promise<Envelope<null>> {
  return albionFetch<null>('/game/albion/craft-settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  })
}

// GET/PUT/DELETE /game/albion/price-overrides - community-shared MANUAL price overrides.
// A guild member types the real in-game ask when the crowdsourced ADP price is stale/wrong;
// it replaces the ADP price everywhere (item tables + Best Value). Keyed 'item|city|quality'.
export interface PriceOverrideEntry {
  sell_price_min: number
  by?: string | null
  at?: string | null
}

export interface PriceOverridesPayload {
  overrides: Record<string, PriceOverrideEntry>
  updated_at: string | null
}

export async function fetchPriceOverrides(): Promise<Envelope<PriceOverridesPayload>> {
  return albionFetch<PriceOverridesPayload>('/game/albion/price-overrides')
}

export async function savePriceOverride(
  itemId: string, city: string, quality: number, sellPriceMin: number,
): Promise<Envelope<PriceOverrideEntry>> {
  return albionFetch<PriceOverrideEntry>('/game/albion/price-overrides', {
    method: 'PUT',
    body: JSON.stringify(
      { item_id: itemId, city, quality, sell_price_min: sellPriceMin }),
  })
}

export async function clearPriceOverride(
  itemId: string, city: string, quality: number,
): Promise<Envelope<null>> {
  const path = [itemId, city, String(quality)].map(encodeURIComponent).join('/')
  return albionFetch<null>(`/game/albion/price-overrides/${path}`, { method: 'DELETE' })
}

// Batch GET /game/albion/recipes/{ids} - chunked at 50 ids per request (URL-length safe,
// server caps at 100). Per-chunk failures are tolerated (those items just get no recipe).
// useItemRecipes caches results by id, so each is fetched at most once per session.
const RECIPE_CHUNK = 50

export async function fetchRecipes(itemIds: string[]): Promise<Envelope<RecipeNode[]>> {
  if (itemIds.length === 0) return { status: 'ok', payload: [] }
  const chunks: string[][] = []
  for (let i = 0; i < itemIds.length; i += RECIPE_CHUNK) {
    chunks.push(itemIds.slice(i, i + RECIPE_CHUNK))
  }
  const results = await Promise.all(chunks.map(chunk =>
    albionFetch<RecipeNode[]>(
      `/game/albion/recipes/${chunk.map(encodeURIComponent).join(',')}`,
    ),
  ))
  const nodes: RecipeNode[] = []
  for (const res of results) {
    if (res.status === 'ok') nodes.push(...res.payload)
  }
  return { status: 'ok', payload: nodes }
}
