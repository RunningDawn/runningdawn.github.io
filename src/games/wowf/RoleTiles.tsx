import { ROLE_TILES, type RoleTally } from './roster'

// 2 x 2 role counts (Tanks, Healers, DPS, No role); zeros dimmed.
export function RoleTiles({ counts }: { counts: RoleTally }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {ROLE_TILES.map(t => (
        <div key={t.key} className={`flex items-baseline justify-between rounded bg-[#0f1117] px-2 py-1 ${counts[t.key] ? '' : 'opacity-40'}`}>
          <span className={`text-xs ${t.text}`}>{t.label}</span>
          <span className="text-sm font-semibold text-[#e2e4ed]">{counts[t.key]}</span>
        </div>
      ))}
    </div>
  )
}
