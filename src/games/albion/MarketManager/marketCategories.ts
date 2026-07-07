// Single source of truth for the item-backed Market Manager category pages. Drives the
// dynamic CategoryPage, the generated routes in AlbionLayout, and the collapsible sidebar
// sections - so adding a category is a one-line edit here, not a new file + route + link.
//
// Slugs are relative to /albion/market-manager/. Market Fixing is intentionally NOT
// here: those are analysis tools, not item lists, and stay as their own pages.
export interface MarketCategory {
  slug: string // e.g. "refining/ore"
  label: string
}

export interface MarketCategorySection {
  title: string
  items: MarketCategory[]
}

export const MARKET_CATEGORY_SECTIONS: MarketCategorySection[] = [
  {
    title: 'Refining',
    items: [
      { slug: 'refining/fiber', label: 'Fiber' },
      { slug: 'refining/hide', label: 'Hide' },
      { slug: 'refining/ore', label: 'Ore' },
      { slug: 'refining/wood', label: 'Wood' },
      { slug: 'refining/stone', label: 'Stone' },
    ],
  },
  {
    title: 'Toolmaker',
    items: [
      { slug: 'toolmaker/siege-equipment', label: 'Siege Equipment' },
      { slug: 'toolmaker/bags', label: 'Bags' },
      { slug: 'toolmaker/capes', label: 'Capes' },
      { slug: 'toolmaker/fisherman', label: 'Fisherman' },
      { slug: 'toolmaker/lumberjack', label: 'Lumberjack' },
      { slug: 'toolmaker/quarrier', label: 'Quarrier' },
      { slug: 'toolmaker/miner', label: 'Miner' },
      { slug: 'toolmaker/skinner', label: 'Skinner' },
      { slug: 'toolmaker/harvester', label: 'Harvester' },
      { slug: 'toolmaker/tracking', label: 'Tracking' },
    ],
  },
  {
    title: 'Consumables',
    items: [
      { slug: 'consumables/food', label: 'Food' },
      { slug: 'consumables/potions', label: 'Potions' },
    ],
  },
  {
    title: 'Armour',
    items: [
      { slug: 'armor/helm-cloth', label: 'Helm Cloth' },
      { slug: 'armor/helm-leather', label: 'Helm Leather' },
      { slug: 'armor/helm-plate', label: 'Helm Plate' },
      { slug: 'armor/chest-cloth', label: 'Chest Cloth' },
      { slug: 'armor/chest-leather', label: 'Chest Leather' },
      { slug: 'armor/chest-plate', label: 'Chest Plate' },
      { slug: 'armor/boot-cloth', label: 'Boot Cloth' },
      { slug: 'armor/boot-leather', label: 'Boot Leather' },
      { slug: 'armor/boot-plate', label: 'Boot Plate' },
    ],
  },
  {
    title: 'Mage Weapons',
    items: [
      { slug: 'mage-weapons/fire-staff', label: 'Fire Staff' },
      { slug: 'mage-weapons/holy-staff', label: 'Holy Staff' },
      { slug: 'mage-weapons/arcane-staff', label: 'Arcane Staff' },
      { slug: 'mage-weapons/frost-staff', label: 'Frost Staff' },
      { slug: 'mage-weapons/cursed-staff', label: 'Cursed Staff' },
      { slug: 'mage-weapons/tome-of-spells', label: 'Tome of Spells' },
    ],
  },
  {
    title: 'Hunter Weapons',
    items: [
      { slug: 'hunter-weapons/bow', label: 'Bow' },
      { slug: 'hunter-weapons/dagger', label: 'Dagger' },
      { slug: 'hunter-weapons/spear', label: 'Spear' },
      { slug: 'hunter-weapons/quarterstaff', label: 'Quarterstaff' },
      { slug: 'hunter-weapons/shapeshifter-staff', label: 'Shapeshifter Staff' },
      { slug: 'hunter-weapons/nature-staff', label: 'Nature Staff' },
      { slug: 'hunter-weapons/torch', label: 'Torch' },
    ],
  },
  {
    title: 'Warrior Weapons',
    items: [
      { slug: 'warrior-weapons/axe', label: 'Axe' },
      { slug: 'warrior-weapons/sword', label: 'Sword' },
      { slug: 'warrior-weapons/mace', label: 'Mace' },
      { slug: 'warrior-weapons/hammer', label: 'Hammer' },
      { slug: 'warrior-weapons/war-gloves', label: 'War Gloves' },
      { slug: 'warrior-weapons/crossbow', label: 'Crossbow' },
      { slug: 'warrior-weapons/shield', label: 'Shield' },
    ],
  },
  {
    title: 'Other',
    items: [
      { slug: 'other/journals', label: 'Journals' },
      { slug: 'other/scrolls', label: 'Scrolls' },
      { slug: 'other/artifacts', label: 'Artifacts' },
      { slug: 'other/animals', label: 'Animals' },
      { slug: 'other/vanity', label: 'Vanity' },
      { slug: 'uncategorized', label: 'Uncategorized' },
    ],
  },
]

// Flattened, for route generation + label lookup. Prototype/Unreleased is a flat
// top-level sidebar link (not a collapsible section) but still routes via
// CategoryPage.
export const MARKET_CATEGORIES: MarketCategory[] = [
  ...MARKET_CATEGORY_SECTIONS.flatMap(s => s.items),
  { slug: 'prototype/unreleased', label: 'Unreleased' },
]
