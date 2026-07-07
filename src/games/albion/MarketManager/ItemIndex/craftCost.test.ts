import { describe, it, expect } from 'vitest'
import {
  analyzeCraft, profit, collectRecipeIds, shoppingList, shoppingListBase,
  shoppingListFullCraft, shoppingListFor, strategyCost, type PriceOf,
} from './craftCost'
import type { RecipeNode } from './types'

// X ← 2× M ; M ← 3× R (raw). Lets buy-vs-craft of M diverge.
const raw = (id: string, count?: number): RecipeNode => ({ item_id: id, craftable: false, recipe: [], count })
const M = (count: number): RecipeNode => ({ item_id: 'M', craftable: true, count, recipe: [raw('R', 3)] })
const X: RecipeNode = { item_id: 'X', craftable: true, recipe: [M(2)] }

// U@1 ← 2× M1 (enchanted mats), or transmute: U (← 2× M) + 4× RUNE.
const U: RecipeNode = { item_id: 'U', craftable: true, recipe: [M(2)] }
const U1: RecipeNode = {
  item_id: 'U@1',
  craftable: true,
  recipe: [{ item_id: 'M1', craftable: false, recipe: [], count: 2 }],
  upgrade: { from: U, materials: [{ item_id: 'RUNE', count: 4 }] },
}

const priceOfWith = (map: Record<string, number>): PriceOf => id => (id in map ? map[id] : null)

// Flat return-rate resolvers (the app passes bonus-aware ones from craftEconomics).
const rr0 = () => 0
const rr02 = () => 0.2

describe('analyzeCraft', () => {
  it('crafts the intermediate when that is cheaper (optimal === full-craft)', () => {
    const a = analyzeCraft(X, priceOfWith({ M: 100, R: 20 }), rr0)!
    expect(a.fullBuy).toBe(200) // buy 2× M @100
    expect(a.fullCraft).toBe(120) // craft M from 3× R@20 → 60, ×2
    expect(a.optimal).toBe(120) // min(buy 100, craft 60) ×2
    expect(a.materials[0]).toMatchObject({ id: 'M', count: 2, mode: 'craft', subtotal: 120 })
  })

  it('buys the intermediate when that is cheaper (optimal === full-buy)', () => {
    const a = analyzeCraft(X, priceOfWith({ M: 50, R: 20 }), rr0)!
    expect(a.fullBuy).toBe(100)
    expect(a.fullCraft).toBe(120)
    expect(a.optimal).toBe(100)
    expect(a.materials[0]).toMatchObject({ mode: 'buy', unitCost: 50 })
  })

  it('applies the return rate to material quantities', () => {
    const a = analyzeCraft(X, priceOfWith({ M: 50, R: 20 }), rr02)!
    expect(a.fullBuy).toBeCloseTo(50 * 2 * 0.8) // 80
  })

  it('returns null when a material price is missing', () => {
    const a = analyzeCraft(X, priceOfWith({ M: 50 }), rr0)! // R unknown
    expect(a.optimal).toBe(100) // can still buy M
    expect(a.fullCraft).toBeNull() // can't refine without R price
  })

  it('returns null for a non-craftable or unknown item', () => {
    expect(analyzeCraft(raw('Z'), priceOfWith({}), rr0)).toBeNull()
    expect(analyzeCraft(undefined, priceOfWith({}), rr0)).toBeNull()
  })

  it('takes the upgrade path when transmuting the level below is cheaper', () => {
    // craft U@1: 2× M1 @1000 = 2000; upgrade: U (craft 2× min(M 50, R-craft 60) = 100) + 4× RUNE @25 = 200
    const a = analyzeCraft(U1, priceOfWith({ M1: 1000, M: 50, R: 20, RUNE: 25 }), rr0)!
    expect(a.optimal).toBe(200)
    expect(a.materials[0]).toMatchObject({ id: 'U', count: 1, mode: 'craft', subtotal: 100 })
    expect(a.materials[1]).toMatchObject({ id: 'RUNE', count: 4, mode: 'buy', subtotal: 100 })
  })

  it('keeps the craft path when it beats the upgrade', () => {
    const a = analyzeCraft(U1, priceOfWith({ M1: 10, M: 50, R: 20, RUNE: 25 }), rr0)!
    expect(a.optimal).toBe(20)
    expect(a.materials[0]).toMatchObject({ id: 'M1', mode: 'buy' })
  })

  it('marks a material acquired by transmute as upgrade mode', () => {
    // Parent crafts from U@1; buying U@1 unknown, crafting it costs 2000, upgrading costs 200.
    const parent: RecipeNode = { item_id: 'P', craftable: true, recipe: [{ ...U1, count: 1 }] }
    const a = analyzeCraft(parent, priceOfWith({ M1: 1000, M: 50, R: 20, RUNE: 25 }), rr0)!
    expect(a.materials[0]).toMatchObject({ id: 'U@1', mode: 'upgrade', unitCost: 200 })
  })

  it('carries the aggregated shopping list for the optimal path', () => {
    const a = analyzeCraft(X, priceOfWith({ M: 100, R: 20 }), rr0)!
    const direct = shoppingList(X, priceOfWith({ M: 100, R: 20 }), rr0)
    expect(a.shopping).toEqual(direct.lines)
    expect(a.shoppingSilver).toBe(direct.silver)
    expect(a.shopping[0]).toMatchObject({ id: 'R', count: 6 })
  })

  it('adds the flat silver fee and divides by the batch amount', () => {
    const potion: RecipeNode = {
      item_id: 'POT', craftable: true, silver: 100, amount: 5, recipe: [raw('HERB', 10)],
    }
    const a = analyzeCraft(potion, priceOfWith({ HERB: 50 }), rr0)!
    expect(a.optimal).toBe((100 + 10 * 50) / 5)
    expect(a.fullBuy).toBe(120)
    expect(a.silver).toBe(100)
    expect(a.amount).toBe(5)
  })
})

describe('shoppingList', () => {
  it('accumulates the raw buys along the optimal path with return-rate compounding', () => {
    // M craft (48) beats buy (50) → buy only R: 3 per M × 0.8, 2 M per X × 0.8.
    const { lines, silver } = shoppingList(X, priceOfWith({ M: 50, R: 20 }), rr02)
    expect(lines).toHaveLength(1)
    expect(lines[0].id).toBe('R')
    expect(lines[0].count).toBeCloseTo(3 * 0.8 * 2 * 0.8)
    expect(lines[0].unitCost).toBe(20)
    expect(silver).toBe(0)
  })

  it('buys the intermediate when that is cheaper', () => {
    const { lines } = shoppingList(X, priceOfWith({ M: 40, R: 20 }), rr0)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ id: 'M', count: 2, unitCost: 40 })
  })

  it('follows the upgrade path and lists the transmute materials', () => {
    const { lines } = shoppingList(U1, priceOfWith({ M1: 1000, M: 50, R: 60, RUNE: 25 }), rr0)
    // U crafted from 2× M (M buy 50 beats craft 180); + 4 runes.
    const byId = Object.fromEntries(lines.map(l => [l.id, l]))
    expect(byId.M).toMatchObject({ count: 2, unitCost: 50 })
    expect(byId.RUNE).toMatchObject({ count: 4, unitCost: 25 })
  })

  it('accumulates silver fees per craft', () => {
    const ore: RecipeNode = { item_id: 'O5', craftable: true, silver: 781, recipe: [raw('O4', 1)] }
    const { lines, silver } = shoppingList(ore, priceOfWith({ O4: 100, O5: 100_000 }), rr0)
    expect(silver).toBe(781)
    expect(lines[0]).toMatchObject({ id: 'O4', count: 1 })
  })
})

describe('shoppingListFullCraft', () => {
  it('refines everything craftable down to raw and merges duplicate leaves', () => {
    // X ← 2× M (← 3× R) + 1× R directly: R appears in two branches, list sums to 7.
    const tree: RecipeNode = { item_id: 'X', craftable: true, recipe: [M(2), raw('R', 1)] }
    const { lines } = shoppingListFullCraft(tree, priceOfWith({ M: 10, R: 20 }), rr0)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ id: 'R', count: 7, unitCost: 20 })
  })

  it('treats transmute recipes (silver fee) as buys, not refining steps', () => {
    const ore: RecipeNode = {
      item_id: 'O5', craftable: true, silver: 781, count: 3,
      recipe: [raw('O4', 1)],
    }
    const tree: RecipeNode = { item_id: 'PLANK', craftable: true, recipe: [ore] }
    const { lines, silver } = shoppingListFullCraft(tree, priceOfWith({ O5: 100, O4: 10 }), rr0)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ id: 'O5', count: 3 })
    expect(silver).toBe(0)
  })
})

describe('profit', () => {
  it('is post-tax revenue minus craft cost', () => {
    expect(profit(1000, 120, 0.065)).toBeCloseTo(1000 * 0.935 - 120)
  })
  it('is null when either side is unknown', () => {
    expect(profit(null, 120, 0)).toBeNull()
    expect(profit(1000, null, 0)).toBeNull()
  })
})

describe('collectRecipeIds', () => {
  it('gathers every node id in the tree', () => {
    const set = new Set<string>()
    collectRecipeIds(X, set)
    expect([...set].sort()).toEqual(['M', 'R', 'X'])
  })

  it('includes upgrade-path ids', () => {
    const set = new Set<string>()
    collectRecipeIds(U1, set)
    expect([...set].sort()).toEqual(['M', 'M1', 'R', 'RUNE', 'U', 'U@1'])
  })
})

describe('strategyCost', () => {
  it('maps each strategy to its cost figure', () => {
    // {M:50} → buy M (100) beats fullCraft (120); base === optimized, full is dearer.
    const a = analyzeCraft(X, priceOfWith({ M: 50, R: 20 }), rr0)!
    expect(strategyCost(a, 'base')).toBe(a.fullBuy)
    expect(strategyCost(a, 'optimized')).toBe(a.optimal)
    expect(strategyCost(a, 'full')).toBe(a.fullCraft)
    expect(strategyCost(a, 'full')).toBe(120)
  })
})

describe('shoppingListFor', () => {
  it('dispatches to the generator matching each strategy', () => {
    const p = priceOfWith({ M: 100, R: 20 })
    expect(shoppingListFor('base', X, p, rr0)).toEqual(shoppingListBase(X, p, rr0))
    expect(shoppingListFor('optimized', X, p, rr0)).toEqual(shoppingList(X, p, rr0))
    expect(shoppingListFor('full', X, p, rr0)).toEqual(shoppingListFullCraft(X, p, rr0))
  })
})
