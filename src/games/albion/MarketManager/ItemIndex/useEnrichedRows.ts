import { useMemo } from 'react'
import { useItemRecipes } from './useItemRecipes'
import { useLiveItemPrices, priceKey } from './useItemPrices'
import { useVolumes } from './useVolumes'
import { analyzeCraft, collectRecipeIds, type PriceOf } from './craftCost'
import { returnRateFor, salesTaxRate, stationFeeFor, useCraftSettings } from '../craftEconomics'
import { loadFocus, loadPremium, usePrefsVersion, type MatSource } from '../premium'
import type { ItemRow } from './types'

export interface BaseItem {
  id: string
  name: string
  tier: number
  enchant: number
}

interface EnrichedResult {
  rows: ItemRow[]
  fetchedAt: Date | null
  dataAt: Date | null
  priceError: string | null
  taxRate: number // premium-driven sales tax, for the profit columns
}

// Turns a list of base items into fully-priced ItemRows with craft analysis. Shared by the
// Item Index, category pages, and Favourites. Fetches recipes for the items, prices every
// node across the recipe trees (materials at quality 1, finished items at the selected
// quality), then runs the buy-vs-craft-vs-upgrade analysis with Craft Settings applied:
// bonus-aware return rates per craft line (+focus), flat station fees per city, premium tax.
export function useEnrichedRows(
  items: BaseItem[],
  location: string,
  quality: number,
  matSource: MatSource = 'sell',
): EnrichedResult {
  const ids = useMemo(() => items.map(i => i.id), [items])
  const { recipes } = useItemRecipes(ids)
  const settings = useCraftSettings()
  // Re-run the analysis when the Craft Settings modal flips focus/premium.
  const prefsVersion = usePrefsVersion()

  const allIds = useMemo(() => {
    const set = new Set<string>(ids)
    for (const node of recipes.values()) collectRecipeIds(node, set)
    return [...set]
  }, [ids, recipes])

  const qualities = useMemo(() => Array.from(new Set([quality, 1])), [quality])
  const { prices, fetchedAt, dataAt, error } = useLiveItemPrices(allIds, location, qualities)
  const volumes = useVolumes(ids, location, quality)

  const rows = useMemo<ItemRow[]>(() => {
    // Materials always priced at quality 1; the finished item at the selected quality.
    // matSource picks the acquisition side: lowest sell order (instant) or highest buy
    // order (place orders + wait). A 0 from the price API means "no data", not free.
    const priceOf: PriceOf = id => {
      const row = prices.get(priceKey(id, location, 1))
      return (matSource === 'buy' ? row?.buy_price_max : row?.sell_price_min) || null
    }
    const focus = loadFocus()
    const rrOf = (id: string) => returnRateFor(id, location, focus)
    return items.map(b => ({
      ...b,
      price: prices.get(priceKey(b.id, location, quality)) ?? null,
      volume: volumes.get(b.id) ?? null,
      craft: analyzeCraft(
        recipes.get(b.id), priceOf, rrOf,
        stationFeeFor(b.id, location, settings, recipes.get(b.id)?.item_value),
      ),
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps -- prefsVersion re-reads loadFocus()
  }, [items, recipes, prices, volumes, location, quality, settings, matSource, prefsVersion])

  return { rows, fetchedAt, dataAt, priceError: error, taxRate: salesTaxRate(loadPremium()) }
}
