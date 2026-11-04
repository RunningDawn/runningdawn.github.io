import { ConfirmDialogButton } from '../../components/ConfirmDialog'
import { GripIcon } from '../../components/Icons'
import { CLASS_COLORS, timeAgo, type WowfCharacter } from './roster'
import { HistoryButton } from './HistoryModal'
import { RoleBadge, SpecIcon } from './eventUi'

interface Props {
  char: WowfCharacter
  dragging: boolean
  dragOver: boolean
  onEdit: () => void
  onRemove: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
}

const sep = <span className="text-[#3a3d4a]">·</span>

// Read-only summary card: identity, specs, professions. Editing goes through the modal.
export function CharacterCard({
  char, dragging, dragOver, onEdit, onRemove,
  onDragStart, onDragOver, onDrop, onDragEnd,
}: Props) {
  const color = CLASS_COLORS[char.class] ?? '#2a2d3a'
  const profs = char.professions.join(' · ')

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{ borderLeftColor: color, background: `linear-gradient(90deg, ${color}1f, #1a1d27 45%)` }}
      className={`border border-[#2a2d3a] border-l-4 rounded-lg px-4 py-3 transition-opacity ${dragging ? 'opacity-30' : ''} ${
        dragOver ? 'border-t-2 border-t-[#c4af64]/60' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="shrink-0 cursor-grab active:cursor-grabbing mt-2" aria-label="Drag to reorder">
          <GripIcon />
        </span>
        {char.mainSpec
          ? <SpecIcon cls={char.class} spec={char.mainSpec} size={40} />
          : <span className="w-10 h-10 rounded border border-[#2a2d3a] bg-[#0f1117] shrink-0" />}
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-semibold truncate" style={{ color }}>{char.name}</span>
            <RoleBadge role={char.role} />
            <span className="text-xs text-[#6b7280]">{char.faction} {sep} {char.ruleset}</span>
          </div>
          <p className="text-sm text-[#9ca3af] flex items-center gap-1.5 flex-wrap leading-5">
            <span>{char.level} {char.race || '?'} {char.class || '?'}</span>
            {char.mainSpec && <>{sep}<span className="text-base font-medium text-[#e2e4ed]">{char.mainSpec}</span></>}
            {char.secondSpec && <>{sep}<span className="inline-flex items-center gap-1 text-[#6b7280] align-middle"><SpecIcon cls={char.class} spec={char.secondSpec} size={16} className="inline-block align-middle" />{char.secondSpec}</span></>}
          </p>
          {(profs || char.updatedAt) && (
            <p className="text-xs text-[#6b7280] flex items-center gap-1.5 flex-wrap">
              {profs && <span>{profs}</span>}
              {profs && char.updatedAt && sep}
              {char.updatedAt && <span className="text-[#4b5563]" title={char.updatedAt}>{timeAgo(char.updatedAt)}</span>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 text-xs mt-1">
          {char.main && (
            <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#c4af64]/15 text-[#c4af64]" title="Set by leadership">Main</span>
          )}
          <HistoryButton char={char} />
          <button type="button" onClick={onEdit} className="text-[#9ca3af] hover:text-[#c4af64] cursor-pointer">Edit</button>
          <ConfirmDialogButton
            label="Archive"
            title="Archive character"
            message={<>Archive <b className="text-[#e2e4ed]">{char.name}</b>? It leaves your roster but keeps its loot history. You can restore it later.</>}
            onConfirm={onRemove}
          />
        </div>
      </div>
    </div>
  )
}
