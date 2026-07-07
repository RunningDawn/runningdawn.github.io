import { useEffect, useSyncExternalStore } from 'react'
import { fetchCraftSettings } from './ItemIndex/albionItemsApi'
import { emitPrefsChanged, subscribePrefs } from './premium'
import { isResource } from './ItemIndex/itemMeta'
import type { CraftSettings } from './ItemIndex/types'

// Mirrors forge-api craft_settings.py: resource return rates derived from production
// bonuses via return = 1 - 1/(1 + bonus); focus adds +59% bonus.
export const RETURN_RATES = {
  base: 15.2,
  refining: 36.7,
  crafting: 24.8,
  focusBase: 43.5,
  focusRefining: 53.9,
  focusCrafting: 47.9,
} as const

export const PREMIUM_SALES_TAX = 0.04
export const NO_PREMIUM_SALES_TAX = 0.08

export function salesTaxRate(premium: boolean): number {
  return premium ? PREMIUM_SALES_TAX : NO_PREMIUM_SALES_TAX
}

// Refining specialty city per resource root.
const REFINING_CITY: Record<string, string> = {
  HIDE: 'Martlock', LEATHER: 'Martlock',
  ORE: 'Thetford', METALBAR: 'Thetford',
  WOOD: 'FortSterling', PLANKS: 'FortSterling',
  FIBER: 'Lymhurst', CLOTH: 'Lymhurst',
  ROCK: 'Bridgewatch', STONEBLOCK: 'Bridgewatch',
}

// Item-id classifier: crafting station + specialty (bonus) city per archetype. Ids encode
// the archetype (T5_MAIN_FIRESTAFF, T4_2H_CLAYMORE, T6_ARMOR_PLATE_SET2, ...). Order
// matters (CROSSBOW before BOW). Unmatched items fall back to base returns and no fee -
// conservative, never flattering.
const WEAPON_RULES: [RegExp, string, string][] = [
  [/FIRESTAFF|INFERNOSTAFF|WILDFIRE|BRIMSTONE|BLAZING|DAWNSONG/, 'mages_tower', 'Thetford'],
  [/HOLYSTAFF|DIVINESTAFF|LIFETOUCH|FALLENSTAFF|REDEMPTION|HALLOWFALL/, 'mages_tower', 'FortSterling'],
  [/ARCANESTAFF|ENIGMATICSTAFF|WITCHWORKSTAFF|OCCULTSTAFF|MALEVOLENT|EVENSONG/, 'mages_tower', 'Lymhurst'],
  [/FROSTSTAFF|GLACIALSTAFF|HOARFROST|ICICLE|PERMAFROST|CHILLHOWL/, 'mages_tower', 'Martlock'],
  [/CURSEDSTAFF|DEMONICSTAFF|LIFECURSE|SKULLORB|DAMNATION|SHADOWCALLER/, 'mages_tower', 'Bridgewatch'],
  [/NATURESTAFF|DRUIDICSTAFF|WILDSTAFF|RAMPANTSTAFF|IRONROOT|FORCEOFNATURE/, 'hunters_lodge', 'Thetford'],
  [/SHAPESHIFTER/, 'hunters_lodge', 'Caerleon'],
  [/CROSSBOW|REPEATINGCROSSBOW|SIEGEBOW|BOLTCASTERS|ENERGYSHAPER/, 'forge', 'Bridgewatch'],
  [/BOW|LONGBOW|WARBOW|WHISPERINGBOW|BADON/, 'hunters_lodge', 'Lymhurst'],
  [/QUARTERSTAFF|IRONCLADEDSTAFF|DOUBLEBLADEDSTAFF|COMBATSTAFF|TWINSCYTHE|ROCKSTAFF|STAFFOFBALANCE/, 'hunters_lodge', 'Martlock'],
  [/DAGGER|CLAWPAIR|BLOODLETTER|DEMONFANG|DEATHGIVERS|BRIDLEDFURY/, 'hunters_lodge', 'Bridgewatch'],
  [/SPEAR|PIKE|GLAIVE|HERONSPEAR|SPIRITHUNTER|TRINITYSPEAR|DAYBREAKER/, 'hunters_lodge', 'FortSterling'],
  [/SWORD|CLAYMORE|CLARENTBLADE|CARVING|GALATINEPAIR|KINGMAKER/, 'forge', 'Lymhurst'],
  [/AXE|HALBERD|SCYTHE|BEARPAWS|REALMBREAKER|CRESCENT/, 'forge', 'Martlock'],
  [/MACE|FLAIL|HEAVYMACE|MORNINGSTAR|BEDROCK|INCUBUS|CAMLANN|OATHKEEPERS/, 'forge', 'Thetford'],
  [/HAMMER|POLEHAMMER|GREATHAMMER|TOMBHAMMER|FORGEHAMMERS|GROVEKEEPER/, 'forge', 'FortSterling'],
  [/KNUCKLES|GAUNTLETS|BATTLEBRACERS|SPIKEDGAUNTLETS|RAVENSTRIKE|FISTS/, 'forge', 'Caerleon'],
]

// plate boots Martlock / plate helmet Fort Sterling / plate chest Bridgewatch, etc.
const ARMOR_BONUS: Record<string, Record<string, string>> = {
  CLOTH: { HEAD: 'Thetford', ARMOR: 'FortSterling', SHOES: 'Bridgewatch' },
  LEATHER: { HEAD: 'Lymhurst', ARMOR: 'Thetford', SHOES: 'Lymhurst' },
  PLATE: { HEAD: 'FortSterling', ARMOR: 'Bridgewatch', SHOES: 'Martlock' },
}
const ARMOR_STATION: Record<string, string> = {
  CLOTH: 'mages_tower', LEATHER: 'hunters_lodge', PLATE: 'forge',
}

export interface ItemEcon {
  station: string
  bonusCity: string | null
  refining: boolean
}

export function itemEcon(id: string): ItemEcon | null {
  const base = id.split('@')[0]
  if (isResource(base)) {
    const root = Object.keys(REFINING_CITY).find(r => base.includes(r))
    return { station: 'refining', bonusCity: root ? REFINING_CITY[root] : null, refining: true }
  }
  const armor = base.match(/(HEAD|ARMOR|SHOES)_(CLOTH|LEATHER|PLATE)/)
  if (armor) {
    return {
      station: ARMOR_STATION[armor[2]],
      bonusCity: ARMOR_BONUS[armor[2]][armor[1]],
      refining: false,
    }
  }
  if (/GATHERER|_TOOL_/.test(base)) return { station: 'toolmaker', bonusCity: 'Caerleon', refining: false }
  if (/BAG|CAPE/.test(base)) return { station: 'toolmaker', bonusCity: 'Brecilien', refining: false }
  if (/MEAL|_FOOD_/.test(base)) return { station: 'cook', bonusCity: 'Caerleon', refining: false }
  if (/POTION/.test(base)) return { station: 'alchemists_lab', bonusCity: 'Brecilien', refining: false }
  if (/(^|_)OFF_/.test(base)) {
    const station = /SHIELD/.test(base) ? 'forge'
      : /TORCH|HORN|LAMP|CENSER/.test(base) ? 'hunters_lodge' : 'mages_tower'
    return { station, bonusCity: 'Martlock', refining: false }
  }
  for (const [pattern, station, bonusCity] of WEAPON_RULES) {
    if (pattern.test(base)) return { station, bonusCity, refining: false }
  }
  return null
}

// Return rate (as a fraction) for crafting/refining `id` in `city`, mirroring the server's
// bonus-aware return_rate_pct.
export function returnRateFor(id: string, city: string, focus: boolean): number {
  const econ = itemEcon(id)
  const inBonusCity = econ?.bonusCity === city
  const pct = econ?.refining
    ? (inBonusCity
      ? (focus ? RETURN_RATES.focusRefining : RETURN_RATES.refining)
      : (focus ? RETURN_RATES.focusBase : RETURN_RATES.base))
    : (inBonusCity
      ? (focus ? RETURN_RATES.focusCrafting : RETURN_RATES.crafting)
      : (focus ? RETURN_RATES.focusBase : RETURN_RATES.base))
  return pct / 100
}

// Station usage fees are set by owners as silver PER 100 NUTRITION (the number on the
// station sign); one craft consumes ItemValue x 0.1125 nutrition. T1/T2 crafts are
// fee-exempt in game, and without a known item value we charge nothing. Mirrors the
// server's station_fee_silver in craft_settings.py.
export const NUTRITION_PER_ITEM_VALUE = 0.1125

export function stationFeeFor(
  id: string,
  city: string,
  settings: CraftSettings | null,
  itemValue?: number | null,
): number {
  if (!settings || !itemValue) return 0
  const econ = itemEcon(id)
  if (!econ) return 0
  const tier = parseInt(id.match(/^T(\d)/)?.[1] ?? '0', 10)
  if (tier <= 2) return 0
  const setting = settings.cities[city]?.station_fees?.[econ.station] ?? 0
  return setting * itemValue * NUTRITION_PER_ITEM_VALUE / 100
}

// Shared craft settings, fetched once per session (module cache) - station fees change
// rarely and the backend caches for 10s anyway. Saving from the Craft Settings modal calls
// updateCachedSettings so every open table repriced immediately.
let cachedSettings: CraftSettings | null = null

export function updateCachedSettings(settings: CraftSettings): void {
  cachedSettings = settings
  emitPrefsChanged()
}

export function useCraftSettings(): CraftSettings | null {
  const settings = useSyncExternalStore(subscribePrefs, () => cachedSettings)

  useEffect(() => {
    if (cachedSettings) return
    let cancelled = false
    fetchCraftSettings().then(result => {
      if (cancelled || result.status !== 'ok') return
      updateCachedSettings(result.payload.settings)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return settings
}
