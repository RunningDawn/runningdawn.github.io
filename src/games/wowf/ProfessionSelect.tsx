import { Select, type SelectOption } from '../../components/Select'
import { PROFESSIONS } from './roster'

const OPTIONS: SelectOption[] = [...PROFESSIONS].sort().map(p => ({ value: p, label: p }))

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  label: string
  placeholder?: string
  // Cap on selections; omit for an unbounded filter.
  max?: number
  // Filter mode: no chips, the control reads "N selected" and the menu stays open while picking.
  compact?: boolean
}

// Multi-select dropdown for professions. Selection stays sorted.
export function ProfessionSelect({ value, onChange, label, placeholder = 'Professions', max, compact }: Props) {
  const full = max !== undefined && value.length >= max
  const summary = value.length === 0 ? placeholder : `${value.length} selected`
  return (
    <Select<true>
      isMulti
      aria-label={label}
      placeholder={compact ? summary : placeholder}
      controlShouldRenderValue={!compact}
      hideSelectedOptions={!compact}
      closeMenuOnSelect={!compact}
      isClearable={compact && value.length > 0}
      options={OPTIONS}
      value={OPTIONS.filter(o => value.includes(o.value))}
      isOptionDisabled={o => full && !value.includes(o.value)}
      onChange={next => onChange(next.map(o => o.value).sort())}
    />
  )
}
