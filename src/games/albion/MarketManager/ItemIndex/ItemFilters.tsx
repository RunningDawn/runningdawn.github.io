import { Select, type SelectOption } from '../../../../components/Select'
import { CITIES, QUALITIES } from '../../constants'

// Controlled filter bar. tier/enchant are pure client-side row filters (derived from the id);
// quality and location are parameters to the prices fetch. Pass showCatalogFilters={false}
// (Favourites) to render only the price controls, showQuality={false} where quality doesn't
// apply (refining pages - resources have no quality tiers).
export interface ItemFiltersProps {
  tier: string
  onTier: (v: string) => void
  enchant: string
  onEnchant: (v: string) => void
  quality: number
  onQuality: (v: number) => void
  location: string
  onLocation: (v: string) => void
  showCatalogFilters?: boolean
  showQuality?: boolean
  availableTiers?: number[] // when set, the Tier dropdown lists only these (tiers with items)
}

const ALL: SelectOption = { value: '', label: 'All' }

const ALL_TIERS = [1, 2, 3, 4, 5, 6, 7, 8]
const TIER_OPTIONS: SelectOption[] = [ALL, ...ALL_TIERS.map(t => ({ value: String(t), label: `T${t}` }))]
const ENCHANT_OPTIONS: SelectOption[] = [ALL, ...[0, 1, 2, 3, 4].map(e => ({ value: String(e), label: `.${e}` }))]
const QUALITY_OPTIONS: SelectOption[] = QUALITIES.map(q => ({ value: String(q.value), label: q.label }))
const LOCATION_OPTIONS: SelectOption[] = CITIES.map(c => ({ value: c.value, label: c.label }))

function find(options: SelectOption[], value: string): SelectOption | null {
  return options.find(o => o.value === value) ?? null
}

export function ItemFilters({
  tier,
  onTier,
  enchant,
  onEnchant,
  quality,
  onQuality,
  location,
  onLocation,
  showCatalogFilters = true,
  showQuality = true,
  availableTiers,
}: ItemFiltersProps) {
  // Gate the Tier dropdown to tiers that actually have items (fall back to full 1-8 while the
  // list is empty/loading), mirroring the item-detail tier switcher. Keep the selected tier so
  // an active filter never vanishes from its own list.
  const tierOptions = availableTiers && availableTiers.length
    ? [ALL, ...ALL_TIERS.filter(t => availableTiers.includes(t) || String(t) === tier)
        .map(t => ({ value: String(t), label: `T${t}` }))]
    : TIER_OPTIONS
  return (
    <div className="flex flex-wrap items-end gap-3">
      {showCatalogFilters && (
        <>
          <Field label="Tier">
            <Select options={tierOptions} value={find(tierOptions, tier)} onChange={o => onTier(o?.value ?? '')} />
          </Field>
          <Field label="Enchant">
            <Select options={ENCHANT_OPTIONS} value={find(ENCHANT_OPTIONS, enchant)} onChange={o => onEnchant(o?.value ?? '')} />
          </Field>
        </>
      )}
      {showQuality && (
        <Field label="Quality">
          <Select options={QUALITY_OPTIONS} value={find(QUALITY_OPTIONS, String(quality))} onChange={o => onQuality(Number(o?.value ?? 1))} />
        </Field>
      )}
      <Field label="Location">
        <Select options={LOCATION_OPTIONS} value={find(LOCATION_OPTIONS, location)} onChange={o => onLocation(o?.value ?? location)} />
      </Field>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-[#6b7280] uppercase tracking-widest">{label}</span>
      {children}
    </label>
  )
}
