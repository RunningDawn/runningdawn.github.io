import { NativeSelect } from '../../../../components/NativeSelect'
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

const ALL_TIERS = [1, 2, 3, 4, 5, 6, 7, 8]

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
  const tiers = availableTiers && availableTiers.length
    ? ALL_TIERS.filter(t => availableTiers.includes(t) || String(t) === tier)
    : ALL_TIERS
  return (
    <div className="flex flex-wrap items-end gap-3">
      {showCatalogFilters && (
        <>
          <Field label="Tier">
            <NativeSelect value={tier} onChange={e => onTier(e.target.value)}>
              <option value="">All</option>
              {tiers.map(t => <option key={t} value={String(t)}>T{t}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Enchant">
            <NativeSelect value={enchant} onChange={e => onEnchant(e.target.value)}>
              <option value="">All</option>
              {[0, 1, 2, 3, 4].map(n => <option key={n} value={String(n)}>.{n}</option>)}
            </NativeSelect>
          </Field>
        </>
      )}
      {showQuality && (
        <Field label="Quality">
          <NativeSelect value={String(quality)} onChange={e => onQuality(Number(e.target.value))}>
            {QUALITIES.map(q => <option key={q.value} value={String(q.value)}>{q.label}</option>)}
          </NativeSelect>
        </Field>
      )}
      <Field label="Location">
        <NativeSelect value={location} onChange={e => onLocation(e.target.value)}>
          {CITIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </NativeSelect>
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
