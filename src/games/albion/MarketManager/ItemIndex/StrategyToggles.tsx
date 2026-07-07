import type { CraftStrategy, MatSource } from '../premium'

export function ToggleGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: [T, string][]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-[#6b7280] uppercase tracking-widest">{label}</span>
      {options.map(([v, text]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
            value === v
              ? 'bg-[#c4af64] text-white'
              : 'bg-[#0f1117] text-[#9ca3af] border border-[#2a2d3a] hover:text-[#e2e4ed] hover:bg-[#2a2d3a]'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

// The two trading-strategy toggles the cost side of every table runs on. Persisted via
// premium.ts (localStorage) by the owning page so Item Index / categories / Favourites /
// detail all agree.
export function StrategyToggles({
  matSource,
  onMatSource,
  strategy,
  onStrategy,
}: {
  matSource: MatSource
  onMatSource: (v: MatSource) => void
  strategy: CraftStrategy
  onStrategy: (v: CraftStrategy) => void
}) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <ToggleGroup<MatSource>
        label="Mats"
        value={matSource}
        options={[['sell', 'Instant buy'], ['buy', 'Buy orders']]}
        onChange={onMatSource}
      />
      <ToggleGroup<CraftStrategy>
        label="Craft"
        value={strategy}
        options={[['optimized', 'Optimized'], ['base', 'Base mats']]}
        onChange={onStrategy}
      />
    </div>
  )
}
