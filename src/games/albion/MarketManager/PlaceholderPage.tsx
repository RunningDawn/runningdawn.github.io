import { useMarketManagerChrome } from './useMarketManagerChrome'

export function PlaceholderPage({ title }: { title: string }) {
  useMarketManagerChrome()

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center select-none">
      <p className="text-lg font-medium text-[#6b7280]">{title}</p>
      <p className="text-xs text-[#4a4d5a] mt-2">coming soon</p>
    </div>
  )
}
