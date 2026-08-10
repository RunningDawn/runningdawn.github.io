import type { SelectHTMLAttributes } from 'react'

// The app's one dropdown style (filter bars, detail pages, craft settings).
export function NativeSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="bg-[#0f1117] border border-[#2a2d3a] rounded px-2 py-1.5 text-xs text-[#e2e4ed] focus:outline-none focus:border-[#c4af64] cursor-pointer"
    />
  )
}
