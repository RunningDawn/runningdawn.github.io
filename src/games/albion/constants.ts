// Albion market locations. Values are the exact tokens the forge-api prices endpoint expects
// (no spaces); labels are for display. No Black Market - the price API covers royal cities + Brecilien.
export const CITIES: { value: string; label: string }[] = [
  { value: 'Bridgewatch', label: 'Bridgewatch' },
  { value: 'Martlock', label: 'Martlock' },
  { value: 'Thetford', label: 'Thetford' },
  { value: 'FortSterling', label: 'Fort Sterling' },
  { value: 'Lymhurst', label: 'Lymhurst' },
  { value: 'Caerleon', label: 'Caerleon' },
  { value: 'Brecilien', label: 'Brecilien' },
]

// Fallback only - pages read the per-user default via premium.ts loadDefaultCity().
export const DEFAULT_CITY = 'Bridgewatch'

// Item quality tiers. Drives the prices request + display.
export const QUALITIES: { value: number; label: string }[] = [
  { value: 1, label: 'Normal' },
  { value: 2, label: 'Good' },
  { value: 3, label: 'Outstanding' },
  { value: 4, label: 'Excellent' },
  { value: 5, label: 'Masterpiece' },
]

export const DEFAULT_QUALITY = 1

// Crafting station types the shared Craft Settings track (matches forge-api STATION_TYPES).
export const STATION_TYPES: { value: string; label: string }[] = [
  { value: 'forge', label: "Warrior's Forge" },
  { value: 'hunters_lodge', label: "Hunter's Lodge" },
  { value: 'mages_tower', label: "Mage's Tower" },
  { value: 'toolmaker', label: 'Toolmaker' },
  { value: 'alchemists_lab', label: "Alchemist's Lab" },
  { value: 'cook', label: 'Cook' },
  { value: 'refining', label: 'Refining' },
]

// Static local-production bonuses per royal city (display only). Refining specialty gives
// +40% return in its city; crafting specialties +15%. Source: Albion wiki / Albion Codex.
export const CITY_BONUSES: Record<string, { refining: string | null; crafting: string }> = {
  Caerleon: { refining: null, crafting: 'Food, gathering gear, tools, war gloves, shapeshifter staffs' },
  Bridgewatch: { refining: 'Stone', crafting: 'Crossbows, daggers, cursed staffs, plate chest, cloth shoes' },
  Martlock: { refining: 'Hide', crafting: 'Axes, quarterstaffs, frost staffs, plate boots, all off-hands' },
  Thetford: { refining: 'Ore', crafting: 'Maces, fire staffs, nature staffs, leather chest, cloth helmet' },
  FortSterling: { refining: 'Wood', crafting: 'Hammers, spears, holy staffs, plate helmet, cloth chest' },
  Lymhurst: { refining: 'Fiber', crafting: 'Swords, bows, arcane staffs, leather helmet, leather shoes' },
  Brecilien: { refining: null, crafting: 'Capes, bags, potions' },
}
