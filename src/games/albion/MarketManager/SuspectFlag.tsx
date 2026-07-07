import { fmt } from './marketFormat'

// The ADP lowest ask is a lone placeholder ("troll") listing far above the recent traded
// average, so the displayed value falls back to that average. Shared by the item detail,
// index tables, and Best Value so the marker reads the same everywhere.
export function SuspectFlag({ rawAsk }: { rawAsk: number | null | undefined }) {
  return (
    <span
      className="text-[#facc15]"
      title={`Lowest ask ${fmt(rawAsk)} looks like a lone troll listing — showing the recent traded average instead`}
    >
      {' '}*
    </span>
  )
}
