import { useRef, type KeyboardEvent } from 'react'
import ReactSelect from 'react-select'
import type { GroupBase, OptionsOrGroups, Props } from 'react-select'

export type SelectOption = { value: string; label: string }

// Styled react-select (ported from forge-web). Single or multi via isMulti.
const sharedClassNames: Props<SelectOption, boolean>['classNames'] = {
  container: () => 'min-w-0',
  control: ({ isFocused }) =>
    `flex items-center bg-[#0f1117] border ${isFocused ? 'border-[#c4af64]' : 'border-[#2a2d3a]'} rounded px-2 py-[3px] cursor-pointer min-h-0`,
  valueContainer: () => 'flex items-center flex-wrap gap-1 flex-1',
  indicatorsContainer: () => 'flex items-center shrink-0',
  menu: () =>
    'bg-[#1a1d27] border border-[#2a2d3a] rounded-lg mt-1 shadow-xl overflow-hidden min-w-max',
  menuList: () => 'py-1',
  option: ({ isFocused, isSelected, isDisabled }) =>
    `px-3 py-2 text-sm cursor-pointer ${
      isDisabled
        ? 'text-[#3a3d4a] cursor-not-allowed'
        : isSelected
        ? 'bg-[#c4af64]/15 text-[#c4af64]'
        : isFocused
        ? 'bg-[#2a2d3a] text-[#e2e4ed]'
        : 'text-[#9ca3af]'
    }`,
  singleValue: () => 'text-[#e2e4ed] text-sm whitespace-nowrap',
  multiValue: () => 'flex items-center bg-[#c4af64]/15 text-[#c4af64] rounded px-1.5 text-xs',
  multiValueLabel: () => 'py-0.5',
  multiValueRemove: () => 'pl-1 hover:text-[#e2e4ed] cursor-pointer',
  input: () => 'text-[#e2e4ed] text-sm',
  placeholder: () => 'text-[#6b7280] text-sm',
  indicatorSeparator: () => 'hidden',
  clearIndicator: () => 'text-[#6b7280] hover:text-[#e2e4ed] pr-1 cursor-pointer',
  dropdownIndicator: () => 'text-[#6b7280] hover:text-[#e2e4ed] pl-1',
  noOptionsMessage: () => 'text-[#6b7280] text-sm px-3 py-2',
}

const TYPE_AHEAD_MS = 700

const flatten = (options: OptionsOrGroups<SelectOption, GroupBase<SelectOption>> = []): SelectOption[] =>
  options.flatMap(o => ('options' in o ? [...o.options] : [o]))

// Native-select style type-ahead for single selects: typing picks the first
// option starting with the typed text; repeating one letter cycles its matches.
function nextTyped(options: SelectOption[], current: string | null | undefined, typed: string) {
  const cycle = [...typed].every(c => c === typed[0])
  const prefix = cycle ? typed[0] : typed
  const matches = options.filter(o => o.label.toLowerCase().startsWith(prefix))
  if (!cycle) return matches[0] ?? null
  return matches[(matches.findIndex(o => o.value === current) + 1) % matches.length] ?? null
}

export function Select<IsMulti extends boolean = false>({ classNames, onKeyDown, ...props }: Props<SelectOption, IsMulti>) {
  const typed = useRef({ text: '', at: 0 })

  function typeAhead(e: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(e)
    if (e.defaultPrevented || props.isMulti || props.isSearchable || props.isDisabled) return
    if (e.key.length !== 1 || e.key === ' ' || e.ctrlKey || e.metaKey || e.altKey) return
    const now = Date.now()
    const t = typed.current
    t.text = (now - t.at < TYPE_AHEAD_MS ? t.text : '') + e.key.toLowerCase()
    t.at = now
    const value = props.value as SelectOption | null | undefined
    const usable = flatten(props.options).filter(o => !props.isOptionDisabled?.(o, value ? [value] : []))
    const next = nextTyped(usable, value?.value, t.text)
    if (!next) return
    e.preventDefault()
    props.onChange?.(next as never, { action: 'select-option', option: next, name: props.name })
  }

  return (
    <ReactSelect<SelectOption, IsMulti>
      unstyled
      onKeyDown={typeAhead}
      isSearchable={false}
      maxMenuHeight={480}
      menuPortalTarget={typeof document === 'undefined' ? undefined : document.body}
      styles={{
        menuPortal: base => ({ ...base, zIndex: 9999 }),
        menu: base => ({ ...base, zIndex: 9999 }),
        menuList: () => ({ maxHeight: 480, overflowY: 'auto' }),
      }}
      classNames={{ ...sharedClassNames, ...classNames } as Props<SelectOption, IsMulti>['classNames']}
      {...props}
    />
  )
}
