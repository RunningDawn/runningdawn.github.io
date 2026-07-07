// Albion uniqueNames are structured (e.g. "T4_MAIN_SWORD@2"), so tier and enchant are
// derived directly from the id - no extra API fields or lookup tables needed.
export function parseTier(id: string): number {
  return Number(id.match(/^T(\d)/)?.[1] ?? 0)
}

export function parseEnchant(id: string): number {
  return Number(id.match(/@(\d)/)?.[1] ?? 0)
}

// Variant builders for the item-detail switchers. Enchanted resources use the
// "_LEVELn@n" form (T5_ORE_LEVEL2@2) while gear uses a plain "@n" suffix.
const RESOURCE_RE = /^T\d_(?:FIBER|CLOTH|HIDE|LEATHER|ORE|METALBAR|WOOD|PLANKS|ROCK|STONEBLOCK)(?:_LEVEL\d)?(?:@\d)?$/

// Raw + refined resources have no quality tiers - only crafted gear does.
export function isResource(id: string): boolean {
  return RESOURCE_RE.test(id)
}

export function withTier(id: string, tier: number): string {
  return id.replace(/^T\d/, `T${tier}`)
}

export function withEnchant(id: string, enchant: number): string {
  const base = id.split('@')[0].replace(/_LEVEL\d/, '')
  if (enchant === 0) return base
  return RESOURCE_RE.test(id) ? `${base}_LEVEL${enchant}@${enchant}` : `${base}@${enchant}`
}

// Compact "T5.3" label for material lines; empty for untiered ids.
export function tierLabel(id: string): string {
  const tier = parseTier(id)
  if (!tier) return ''
  const enchant = parseEnchant(id)
  return `T${tier}${enchant > 0 ? `.${enchant}` : ''}`
}
