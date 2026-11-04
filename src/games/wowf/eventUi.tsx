import type { ReactNode } from 'react'
import { bossNames, bossOrder, imageSrc, type ApiAttendance, type ApiBoss, type ApiDrop, type ApiItem, type ApiReserve, type ItemOption } from './api'
import { BUCKETS, BUCKET_LABELS, CLASS_COLORS, roleCounts, specIcon, type ApiCharacter, type Composition } from './roster'

export function KindBadge({ kind }: { kind: string }) {
  const tone = kind === 'raid' ? 'text-[#c4af64] bg-[#c4af64]/10' : kind === 'pvp' ? 'text-red-300 bg-red-900/30' : 'text-[#9ca3af] bg-[#2a2d3a]'
  return <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded ${tone}`}>{kind}</span>
}

export function StyleBadge({ style }: { style: string | null }) {
  if (!style) return null
  return <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded text-sky-300 bg-sky-900/30">{style}</span>
}

// Wanted composition, with signed-up counts by main role when attendance is given.
export function CompositionLine({ wanted, attendance }: { wanted: Composition | null; attendance?: ApiAttendance[] }) {
  if (!wanted) return null
  const have = attendance && roleCounts(attendance.filter(a => a.status !== 'withdrawn' && a.status !== 'denied').map(a => a.character.role))
  return (
    <span className="flex items-center gap-3 text-xs" title="Wanted composition">
      {BUCKETS.map(b => {
        const n = have?.[b]
        const tone = n === undefined ? 'text-[#9ca3af]' : n >= wanted[b] ? 'text-green-400' : 'text-amber-400'
        return <span key={b} className={tone}>{BUCKET_LABELS[b]} {n === undefined ? wanted[b] : `${n}/${wanted[b]}`}</span>
      })}
    </span>
  )
}

export function CancelledBadge() {
  return <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded text-red-300 bg-red-900/30">Cancelled</span>
}

export function HardReserveBadge({ note }: { note?: string | null }) {
  return <span title={note ?? undefined} className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded text-amber-300 bg-amber-900/30">Guild hard reserve</span>
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-[#c4af64] border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading" />
    </div>
  )
}

export function OutcomeTag({ outcome }: { outcome: string }) {
  const tone = outcome === 'won' ? 'text-green-400' : outcome === 'lost' ? 'text-[#9ca3af]' : outcome === 'absent' ? 'text-red-400' : 'text-[#6b7280]'
  return <span className={`text-xs ${tone}`}>{outcome}</span>
}

// Recommended-class dots in class colours; `highlight` marks the viewer's class.
export function ClassBadges({ classes, highlight }: { classes: string[]; highlight?: string }) {
  if (classes.length === 0) return null
  return (
    <span className="flex items-center gap-1" title={classes.join(', ')}>
      {classes.map(c => (
        <span key={c} className={`text-[10px] px-1 rounded ${highlight === c ? 'ring-1 ring-[#c4af64]' : ''}`} style={{ color: CLASS_COLORS[c] ?? '#e2e4ed', background: `${CLASS_COLORS[c] ?? '#2a2d3a'}22` }}>
          {c.slice(0, 3)}
        </span>
      ))}
    </span>
  )
}

// Spec icon (Wowhead art) with the spec name as tooltip.
export function SpecIcon({ cls, spec, size = 20, className = '' }: { cls: string; spec: string; size?: number; className?: string }) {
  const src = specIcon(cls, spec)
  if (!src) return null
  return <img src={src} alt={spec} title={`${spec} ${cls}`} width={size} height={size} loading="lazy" className={`rounded border border-[#2a2d3a] shrink-0 ${className}`} style={{ width: size, height: size }} />
}

const ROLE_TONE: Record<string, string> = {
  Tank: 'text-sky-300 bg-sky-900/30', Healer: 'text-green-300 bg-green-900/30',
  'Melee DPS': 'text-red-300 bg-red-900/30', 'Ranged DPS': 'text-violet-300 bg-violet-900/30',
}

export function RoleBadge({ role }: { role: string }) {
  if (!role) return null
  return <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded ${ROLE_TONE[role] ?? 'text-[#9ca3af] bg-[#2a2d3a]'}`}>{role}</span>
}

// Character pick in a Select: coloured name, spec icon, class/spec, main pill.
export function CharacterOptionLabel({ c }: { c: ApiCharacter }) {
  return (
    <span className="flex items-center gap-2 min-w-0">
      {c.main_spec && <SpecIcon cls={c.class} spec={c.main_spec} size={18} />}
      <span className="font-medium truncate" style={{ color: CLASS_COLORS[c.class] }}>{c.name}</span>
      <span className="text-xs text-[#9ca3af] truncate">{c.main_spec ? `${c.main_spec} ${c.class}` : c.class}</span>
      {c.is_main && <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded text-[#c4af64] bg-[#c4af64]/10 ml-auto">main</span>}
    </span>
  )
}

export function ItemThumb({ item }: { item: Pick<ApiItem, 'image_url' | 'name'> }) {
  const src = imageSrc(item as ApiItem)
  return src
    ? <img src={src} alt="" className="w-8 h-8 rounded object-cover border border-[#2a2d3a] shrink-0" />
    : <span className="w-8 h-8 rounded bg-[#1a1d27] border border-[#2a2d3a] shrink-0" />
}



// The whole loot list by boss: who reserved each item and their +X, or a free roll.
export function LootTable({ bosses, reserves, renderActions }: {
  bosses: ApiBoss[]
  reserves: ApiReserve[]
  renderActions?: (r: ApiReserve) => ReactNode
}) {
  const byItem = reserves.reduce<Record<string, ApiReserve[]>>((acc, r) => {
    (acc[r.item.id] ??= []).push(r)
    return acc
  }, {})
  const ordered = bossOrder(bosses).filter(b => b.items.length > 0)
  if (ordered.length === 0) return <p className="text-sm text-[#6b7280]">No loot entered for this raid yet.</p>
  return (
    <>
      {ordered.map(b => (
        <div key={b.id} className="forge-card py-3 space-y-2">
          <h4 className="text-sm font-semibold text-[#c4af64]">{b.name}</h4>
          {b.items.map(i => {
            const rs = byItem[i.id] ?? []
            return (
              <div key={i.id} className="flex items-start gap-2">
                <ItemThumb item={i} />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="flex items-center gap-2 text-sm text-[#e2e4ed]">{i.name}<ClassBadges classes={i.recommended_classes} />{i.hard_reserved && <HardReserveBadge note={i.hard_reserve_note} />}</p>
                  {i.hard_reserved
                    ? null
                    : rs.length === 0
                    ? <p className="text-xs text-[#4b5563]">Free roll</p>
                    : (
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {rs.map(r => (
                          <span key={r.id} className="flex items-center gap-1.5 text-sm">
                            <span style={{ color: CLASS_COLORS[r.character.class] ?? '#e2e4ed' }}>{r.character.name}</span>
                            <span className="text-xs text-[#c4af64]">+{r.plus}</span>
                            {r.outcome !== 'reserved' && <OutcomeTag outcome={r.outcome} />}
                            {renderActions?.(r)}
                          </span>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </>
  )
}

// Reserves grouped by item; `renderActions` adds per-row controls (outcome select, remove).
export function ReserveGroups({ reserves, renderActions }: {
  reserves: ApiReserve[]
  renderActions?: (r: ApiReserve) => ReactNode
}) {
  const groups = Object.values(reserves.reduce<Record<string, ApiReserve[]>>((acc, r) => {
    (acc[r.item.id] ??= []).push(r)
    return acc
  }, {}))
  if (groups.length === 0) return <p className="text-sm text-[#6b7280]">No reserves yet.</p>
  return (
    <>
      {groups.map(group => {
        const item = group[0].item
        return (
          <div key={item.id} className="forge-card py-3 space-y-1">
            <div className="flex items-center gap-2">
              <ItemThumb item={item} />
              <p className="text-sm text-[#e2e4ed] font-medium">
                {item.name}{item.bosses.length > 0 && <span className="text-xs text-[#6b7280]"> · {bossNames(item)}</span>}
              </p>
              <ClassBadges classes={item.recommended_classes} />
              {item.hard_reserved && <HardReserveBadge />}
            </div>
            {group.map(r => (
              <div key={r.id} className="flex items-center gap-3 text-sm pl-10">
                <span style={{ color: CLASS_COLORS[r.character.class] ?? '#e2e4ed' }}>{r.character.name}</span>
                <span className="text-xs text-[#c4af64]">+{r.plus}</span>
                {renderActions ? renderActions(r) : <OutcomeTag outcome={r.outcome} />}
              </div>
            ))}
          </div>
        )
      })}
    </>
  )
}

// How a drop was awarded: SR win with the winner's +X, free roll, or nobody.
export function DropKind({ drop }: { drop: ApiDrop }) {
  if (!drop.character) return <span className="text-xs text-[#6b7280]">Disenchanted</span>
  if (drop.sr) return <span className="text-xs text-green-400">SR +{drop.plus}</span>
  if (drop.item.hard_reserved) return <span className="text-xs text-[#c4af64]">Guild hard reserve</span>
  return <span className="text-xs text-[#9ca3af]">Free roll</span>
}

// One recorded drop: item, who got it, how.
export function DropRow({ drop, children }: { drop: ApiDrop; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <ItemThumb item={drop.item} />
      <span className="text-[#e2e4ed]">{drop.item.name}{drop.boss && <span className="text-xs text-[#6b7280]"> · {drop.boss.name}</span>}</span>
      <span className="text-[#4b5563]">→</span>
      {drop.character
        ? <span style={{ color: CLASS_COLORS[drop.character.class] ?? '#e2e4ed' }}>{drop.character.name}</span>
        : <span className="text-[#6b7280]">nobody</span>}
      <DropKind drop={drop} />
      {children}
    </div>
  )
}

// Option row for an item picker: thumb, name, recommended classes (viewer's class outlined).
export function ItemOptionLabel({ option, myClass }: { option: ItemOption; myClass?: string }) {
  return (
    <span className="flex items-center gap-2">
      <ItemThumb item={{ image_url: option.image_url, name: option.label }} />
      <span>{option.label}</span>
      {option.bossNames?.length > 0 && <span className="text-xs text-[#6b7280]">{option.bossNames.join(', ')}</span>}
      <ClassBadges classes={option.classes ?? []} highlight={myClass} />
      {option.hardReserved && <HardReserveBadge />}
    </span>
  )
}
