import ReactSelect from 'react-select'
import type { Props } from 'react-select'

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

// Type to filter on desktop; touch screens tap to pick so the keyboard doesn't pop up.
const TOUCH = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches

export function Select<IsMulti extends boolean = false>({ classNames, ...props }: Props<SelectOption, IsMulti>) {
  return (
    <ReactSelect<SelectOption, IsMulti>
      unstyled
      isSearchable={!TOUCH}
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
