import { useMemo } from 'react'
import { Select, type SelectOption } from '../../components/Select'
import { offsetMinutes, tzOffset, tzOptions } from './weekTime'

// Searchable IANA timezone picker, ordered by UTC offset.
export function TimezoneSelect({ value, onChange }: { value: string; onChange: (tz: string) => void }) {
  const opts = useMemo<SelectOption[]>(() => tzOptions()
    .map(z => { const off = tzOffset(z); return { value: z, label: `${z.replace(/_/g, ' ')} (${off})`, minutes: offsetMinutes(off) } })
    .sort((a, b) => a.minutes - b.minutes || a.value.localeCompare(b.value))
    .map(({ value, label }) => ({ value, label })), [])
  return (
    <Select aria-label="Timezone" options={opts} isSearchable
      value={opts.find(o => o.value === value) ?? { value, label: `${value} (${tzOffset(value)})` }}
      onChange={o => o && onChange(o.value)} />
  )
}
