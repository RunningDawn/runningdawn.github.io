import type { CraftAnalysis, CraftMaterial, RecipeNode } from './types'

// Market acquisition cost of an item (what you pay to BUY one): the lowest sell-order price.
// Returns null when no price is known (can't buy / can't craft through it).
export type PriceOf = (id: string) => number | null

// Resource return rate (fraction) for CRAFTING a given item - resolved per node so bonus
// cities apply to exactly their specialty lines (see craftEconomics.returnRateFor).
export type ReturnRateOf = (id: string) => number

// Effective quantity after the crafting resource-return rate (you get some materials back).
function adj(count: number, returnRate: number): number {
  return count * (1 - returnRate)
}

export type AcquireMode = 'buy' | 'craft' | 'upgrade'

// Cheapest of buy-at-market / craft-from-children / transmute-from-the-level-below, with the
// winning mode. Cost is null when no route has known prices. Exported for the recipe-tree
// card, which expands or collapses nodes based on the winning mode.
export function bestMode(node: RecipeNode, priceOf: PriceOf, rrOf: ReturnRateOf): { mode: AcquireMode; cost: number | null } {
  let mode: AcquireMode = 'buy'
  let cost = priceOf(node.item_id)
  const craft = craftOptimal(node, priceOf, rrOf)
  if (craft != null && (cost == null || craft < cost)) {
    mode = 'craft'
    cost = craft
  }
  const up = upgradeOptimal(node, priceOf, rrOf)
  if (up != null && (cost == null || up < cost)) {
    mode = 'upgrade'
    cost = up
  }
  return { mode, cost }
}

function acquireOptimal(node: RecipeNode, priceOf: PriceOf, rrOf: ReturnRateOf): number | null {
  return bestMode(node, priceOf, rrOf).cost
}

// Craft one unit from optimally-acquired materials: flat silver fee + children, divided by the
// batch size for recipes that produce several units per craft.
function craftOptimal(node: RecipeNode, priceOf: PriceOf, rrOf: ReturnRateOf): number | null {
  if (!node.craftable || node.recipe.length === 0) return null
  const rr = rrOf(node.item_id)
  let sum = node.silver ?? 0
  for (const child of node.recipe) {
    const c = acquireOptimal(child, priceOf, rrOf)
    if (c == null) return null
    sum += c * adj(child.count ?? 1, rr)
  }
  return sum / (node.amount ?? 1)
}

// Produce one unit by transmuting the enchant level below: acquire it, then pay the upgrade
// materials at market. No crafting station involved, so no return rate on the materials.
function upgradeOptimal(node: RecipeNode, priceOf: PriceOf, rrOf: ReturnRateOf): number | null {
  const up = node.upgrade
  if (!up) return null
  let sum = acquireOptimal(up.from, priceOf, rrOf)
  if (sum == null) return null
  for (const mat of up.materials) {
    const p = priceOf(mat.item_id)
    if (p == null) return null
    sum += p * mat.count
  }
  return sum
}

// Craft the node buying ALL direct children at market (no sub-crafting).
function craftFullBuy(node: RecipeNode, priceOf: PriceOf, rrOf: ReturnRateOf): number | null {
  if (!node.craftable || node.recipe.length === 0) return null
  const rr = rrOf(node.item_id)
  let sum = node.silver ?? 0
  for (const child of node.recipe) {
    const c = priceOf(child.item_id)
    if (c == null) return null
    sum += c * adj(child.count ?? 1, rr)
  }
  return sum / (node.amount ?? 1)
}

// Acquire a node by refining everything craftable from raw (never buy an intermediate).
function acquireFullCraft(node: RecipeNode, priceOf: PriceOf, rrOf: ReturnRateOf): number | null {
  if (!node.craftable || node.recipe.length === 0) return priceOf(node.item_id)
  const rr = rrOf(node.item_id)
  let sum = node.silver ?? 0
  for (const child of node.recipe) {
    const c = acquireFullCraft(child, priceOf, rrOf)
    if (c == null) return null
    sum += c * adj(child.count ?? 1, rr)
  }
  return sum / (node.amount ?? 1)
}

function craftMaterials(node: RecipeNode, priceOf: PriceOf, rrOf: ReturnRateOf): CraftMaterial[] {
  const rr = rrOf(node.item_id)
  return node.recipe.map(child => {
    const { mode, cost } = bestMode(child, priceOf, rrOf)
    return {
      id: child.item_id,
      name: child.name || child.item_id,
      count: child.count ?? 1,
      mode,
      unitCost: cost,
      subtotal: cost == null ? null : cost * adj(child.count ?? 1, rr),
    }
  })
}

function baseMaterials(node: RecipeNode, priceOf: PriceOf, rrOf: ReturnRateOf): CraftMaterial[] {
  const rr = rrOf(node.item_id)
  return node.recipe.map(child => {
    const p = priceOf(child.item_id)
    return {
      id: child.item_id,
      name: child.name || child.item_id,
      count: child.count ?? 1,
      mode: 'buy' as const,
      unitCost: p,
      subtotal: p == null ? null : p * adj(child.count ?? 1, rr),
    }
  })
}

function upgradeMaterials(node: RecipeNode, priceOf: PriceOf, rrOf: ReturnRateOf): CraftMaterial[] {
  const up = node.upgrade!
  const from = bestMode(up.from, priceOf, rrOf)
  const lines: CraftMaterial[] = [{
    id: up.from.item_id,
    name: up.from.name || up.from.item_id,
    count: 1,
    mode: from.mode,
    unitCost: from.cost,
    subtotal: from.cost,
  }]
  for (const mat of up.materials) {
    const p = priceOf(mat.item_id)
    lines.push({
      id: mat.item_id,
      name: mat.name || mat.item_id,
      count: mat.count,
      mode: 'buy',
      unitCost: p,
      subtotal: p == null ? null : p * mat.count,
    })
  }
  return lines
}

// Full production-cost analysis for an item we intend to MAKE (craft or transmute up - never
// plain buy; only its materials are buy-vs-craft-vs-upgrade). `stationFee` is the flat silver
// the station owner charges, added to every strategy. Returns null if the item has neither a
// recipe nor an upgrade path.
export function analyzeCraft(
  node: RecipeNode | undefined,
  priceOf: PriceOf,
  rrOf: ReturnRateOf,
  stationFee = 0,
): CraftAnalysis | null {
  if (!node) return null
  const hasRecipe = node.craftable && node.recipe.length > 0
  if (!hasRecipe && !node.upgrade) return null

  const craft = craftOptimal(node, priceOf, rrOf)
  const upgrade = upgradeOptimal(node, priceOf, rrOf)
  const viaUpgrade = upgrade != null && (craft == null || upgrade < craft)
  const optimal = viaUpgrade ? upgrade : craft
  const fullBuy = craftFullBuy(node, priceOf, rrOf)
  const fullCraft = acquireFullCraft(node, priceOf, rrOf)
  const shopping = shoppingList(node, priceOf, rrOf)

  return {
    optimal: optimal == null ? null : optimal + stationFee,
    fullBuy: fullBuy == null ? null : fullBuy + stationFee,
    fullCraft: fullCraft == null ? null : fullCraft + stationFee,
    materials: viaUpgrade
      ? upgradeMaterials(node, priceOf, rrOf)
      : craftMaterials(node, priceOf, rrOf),
    baseMaterials: baseMaterials(node, priceOf, rrOf),
    shopping: shopping.lines,
    shoppingSilver: shopping.silver,
    silver: node.silver ?? 0,
    amount: node.amount ?? 1,
    stationFee,
  }
}

// Profit = post-tax revenue − craft cost. null when either side is unknown.
export function profit(revenue: number | null | undefined, craftCost: number | null | undefined, taxRate: number): number | null {
  if (revenue == null || craftCost == null) return null
  return revenue * (1 - taxRate) - craftCost
}

// Every item id in a recipe tree (upgrade paths included) - used to batch the price request.
export function collectRecipeIds(node: RecipeNode, into: Set<string>): void {
  into.add(node.item_id)
  for (const child of node.recipe) collectRecipeIds(child, into)
  if (node.upgrade) {
    collectRecipeIds(node.upgrade.from, into)
    for (const mat of node.upgrade.materials) into.add(mat.item_id)
  }
}

export interface ShoppingLine {
  id: string
  name: string
  count: number // expected units to buy for ONE finished item (return rate applied)
  unitCost: number | null
}

// What to actually buy at market to produce one unit of the item along the optimal
// buy-vs-craft-vs-upgrade path, plus the total flat silver in crafting fees. Multiply the
// counts by the desired quantity and round up.
export function shoppingList(
  node: RecipeNode,
  priceOf: PriceOf,
  rrOf: ReturnRateOf,
): { lines: ShoppingLine[]; silver: number } {
  const acc = new Map<string, ShoppingLine>()
  let silver = 0

  function buyLine(id: string, name: string, count: number, unitCost: number | null) {
    const line = acc.get(id)
    if (line) line.count += count
    else acc.set(id, { id, name, count, unitCost })
  }

  function produce(n: RecipeNode, units: number) {
    const craft = craftOptimal(n, priceOf, rrOf)
    const up = upgradeOptimal(n, priceOf, rrOf)
    if (up != null && (craft == null || up < craft)) {
      visit(n.upgrade!.from, units)
      for (const mat of n.upgrade!.materials) {
        buyLine(mat.item_id, mat.name || mat.item_id, mat.count * units, priceOf(mat.item_id))
      }
      return
    }
    const rr = rrOf(n.item_id)
    const crafts = units / (n.amount ?? 1)
    silver += (n.silver ?? 0) * crafts
    for (const child of n.recipe) {
      visit(child, adj(child.count ?? 1, rr) * crafts)
    }
  }

  function visit(n: RecipeNode, units: number) {
    const { mode } = bestMode(n, priceOf, rrOf)
    if (mode === 'buy') buyLine(n.item_id, n.name || n.item_id, units, priceOf(n.item_id))
    else produce(n, units)
  }

  produce(node, 1)
  return { lines: [...acc.values()], silver }
}

// Same shape as shoppingList, but along the BASE path: buy every direct material at market
// and craft once - no sub-crafting, no upgrades. For crafters who skip the extra margin.
export function shoppingListBase(
  node: RecipeNode,
  priceOf: PriceOf,
  rrOf: ReturnRateOf,
): { lines: ShoppingLine[]; silver: number } {
  const rr = rrOf(node.item_id)
  const crafts = 1 / (node.amount ?? 1)
  const lines = node.recipe.map(child => ({
    id: child.item_id,
    name: child.name || child.item_id,
    count: adj(child.count ?? 1, rr) * crafts,
    unitCost: priceOf(child.item_id),
  }))
  return { lines, silver: (node.silver ?? 0) * crafts }
}

// The three craft strategies surfaced on the item detail page. Superset of premium.ts's
// 2-value CraftStrategy ('base' | 'optimized'); 'full' (refine everything from raw) is a
// detail-only planning view with no Best Value counterpart.
export type CraftStrategy3 = 'base' | 'optimized' | 'full'

// The single per-unit cost (silver + station fee already folded in, amortized counts) for a
// strategy. Cards, tree, and shopping list all read cost through here - one mapping, no
// re-derivation. Matches the server Best Value math for 'base'/'optimized'.
export function strategyCost(a: CraftAnalysis, s: CraftStrategy3): number | null {
  return s === 'base' ? a.fullBuy : s === 'full' ? a.fullCraft : a.optimal
}

// The buy list matching a strategy's cost. Each generator's fractional material spend plus
// its silver equals strategyCost - stationFee, so a station-fee line reconciles the total.
export function shoppingListFor(
  s: CraftStrategy3,
  node: RecipeNode,
  priceOf: PriceOf,
  rrOf: ReturnRateOf,
): { lines: ShoppingLine[]; silver: number } {
  return s === 'base'
    ? shoppingListBase(node, priceOf, rrOf)
    : s === 'full'
      ? shoppingListFullCraft(node, priceOf, rrOf)
      : shoppingList(node, priceOf, rrOf)
}

// Same shape as shoppingList, but along the FULL-CRAFT path: every refinable node is refined
// from raw, so the buys are the raw leaves only (plus accumulated silver fees). Transmute
// recipes (flat silver fee on the recipe - raw/refined resource tier-ups) stay buys: the
// full tree is the refining chain, not the transmutator.
export function shoppingListFullCraft(
  node: RecipeNode,
  priceOf: PriceOf,
  rrOf: ReturnRateOf,
): { lines: ShoppingLine[]; silver: number } {
  const acc = new Map<string, ShoppingLine>()
  let silver = 0

  function walk(n: RecipeNode, units: number) {
    if (!n.craftable || n.recipe.length === 0 || (n.silver ?? 0) > 0) {
      const line = acc.get(n.item_id)
      if (line) line.count += units
      else acc.set(n.item_id, { id: n.item_id, name: n.name || n.item_id, count: units, unitCost: priceOf(n.item_id) })
      return
    }
    const rr = rrOf(n.item_id)
    const crafts = units / (n.amount ?? 1)
    silver += (n.silver ?? 0) * crafts
    for (const child of n.recipe) {
      walk(child, adj(child.count ?? 1, rr) * crafts)
    }
  }

  const rr = rrOf(node.item_id)
  const crafts = 1 / (node.amount ?? 1)
  silver += (node.silver ?? 0) * crafts
  for (const child of node.recipe) {
    walk(child, adj(child.count ?? 1, rr) * crafts)
  }
  return { lines: [...acc.values()], silver }
}
