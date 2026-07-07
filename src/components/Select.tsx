import ReactSelect from 'react-select'
import type { Props } from 'react-select'

export type SelectOption = { value: string; label: string }

const sharedClassNames: Props<SelectOption, false>['classNames'] = {
  container: () => 'min-w-max',
  control: ({ isFocused }) =>
    `flex items-center bg-[#0f1117] border ${isFocused ? 'border-[#c4af64]' : 'border-[#2a2d3a]'} rounded px-2 py-[3px] cursor-pointer min-h-0`,
  valueContainer: () => 'flex items-center flex-1',
  indicatorsContainer: () => 'flex items-center shrink-0',
  menu: () =>
    'bg-[#1a1d27] border border-[#2a2d3a] rounded-lg mt-1 shadow-xl overflow-hidden min-w-max',
  menuList: () => 'py-1',
  option: ({ isFocused, isSelected }) =>
    `px-3 py-2 text-sm cursor-pointer ${
      isSelected
        ? 'bg-[#c4af64]/15 text-[#c4af64]'
        : isFocused
        ? 'bg-[#2a2d3a] text-[#e2e4ed]'
        : 'text-[#9ca3af]'
    }`,
  singleValue: () => 'text-[#e2e4ed] text-sm whitespace-nowrap',
  input: () => 'text-[#e2e4ed] text-sm',
  placeholder: () => 'text-[#6b7280] text-sm',
  indicatorSeparator: () => 'hidden',
  dropdownIndicator: () => 'text-[#6b7280] hover:text-[#e2e4ed] pl-1',
  noOptionsMessage: () => 'text-[#6b7280] text-sm px-3 py-2',
}

export function Select(props: Props<SelectOption, false>) {
  return (
    <ReactSelect<SelectOption, false>
      unstyled
      isSearchable={false}
      maxMenuHeight={480}
      styles={{
        menu: base => ({ ...base, zIndex: 9999 }),
        menuList: () => ({ maxHeight: 480, overflowY: 'auto' }),
      }}
      classNames={sharedClassNames}
      {...props}
    />
  )
}
