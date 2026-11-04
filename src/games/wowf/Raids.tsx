import { useCallback, useEffect, useRef, useState } from 'react'
import { ConfirmDialogButton } from '../../components/ConfirmDialog'
import { GripIcon } from '../../components/Icons'
import { Modal } from '../../components/Modal'
import { Select, type SelectOption } from '../../components/Select'
import {
  attachItem, bossNames, bossOrder, createBoss, createItem, createRaid, deleteBoss, deleteItem, deleteItemImage, deleteRaid, detachItem,
  imageSrc, listItems, listRaids, putBossOrder, putRaidOrder, updateBoss, updateItem, updateRaid,
  uploadItemImage, type ApiBoss, type ApiItem, type ApiRaid, type ItemBody, type RaidBody,
} from './api'
import { useWowfAccess } from './access'
import { WowfGate } from './WowfGate'
import { ClassBadges, HardReserveBadge, Spinner } from './eventUi'
import { CLASSES, SLOTS, reorder } from './roster'

const opt = (v: string): SelectOption => ({ value: v, label: v })
const SLOT_OPTS = SLOTS.map(opt)
const CLASS_OPTS = CLASSES.map(opt)

type Run = (action: () => Promise<{ status: string; message?: string }>, what: string) => Promise<boolean>

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="forge-label">{label}</span>
      {children}
    </label>
  )
}

// Native HTML5 drag + arrow fallback, shared by the raid chips and the boss blocks.
function useDragOrder<T extends { id: string }>(items: T[], onReorder: (next: T[]) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const move = (from: number, to: number) => { if (to >= 0 && to < items.length && from !== to) onReorder(reorder(items, from, to)) }
  const props = (index: number) => ({
    draggable: true,
    onDragStart: () => setDragIndex(index),
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setOverIndex(index) },
    onDrop: () => { if (dragIndex !== null) move(dragIndex, index); setDragIndex(null); setOverIndex(null) },
    onDragEnd: () => { setDragIndex(null); setOverIndex(null) },
  })
  return { props, move, dragIndex, overIndex }
}

function RaidForm({ initial, onSave, onClose }: { initial: RaidBody | null; onSave: (b: RaidBody) => Promise<string | null>; onClose: () => void }) {
  const [draft, setDraft] = useState<RaidBody>(initial ?? { name: '', short_name: '', position: 0, active: true })
  const [saveError, setSaveError] = useState<string | null>(null)
  return (
    <Modal open onClose={onClose} title={initial ? 'Edit raid' : 'New raid'}>
      <div className="px-5 py-4 space-y-3">
        <Field label="Name"><input type="text" aria-label="Raid name" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} className="forge-input" autoFocus /></Field>
        <Field label="Short name"><input type="text" aria-label="Raid short name" value={draft.short_name} onChange={e => setDraft({ ...draft, short_name: e.target.value })} className="forge-input w-40" /></Field>
        <label className="flex items-center gap-2 text-sm text-[#9ca3af] cursor-pointer">
          <input type="checkbox" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })} /> Active (shown when scheduling and reserving)
        </label>
        {saveError && <p className="text-sm text-red-400">{saveError}</p>}
        <div className="flex justify-end gap-2 pt-2 border-t border-[#2a2d3a]">
          <button type="button" onClick={onClose} className="forge-btn cursor-pointer">Cancel</button>
          <button type="button" onClick={async () => setSaveError(await onSave({ ...draft, name: draft.name.trim(), short_name: draft.short_name.trim() }))} disabled={!draft.name.trim() || !draft.short_name.trim()} className="forge-btn-active cursor-pointer disabled:opacity-40">{initial ? 'Save' : 'Create'}</button>
        </div>
      </div>
    </Modal>
  )
}

function ItemForm({ item, bosses, bossId, run, onClose }: {
  item: ApiItem | null; bosses: ApiBoss[]; bossId: string; run: Run; onClose: () => void
}) {
  const raidBossIds = new Set(bosses.map(b => b.id))
  // Bosses in other raids are kept as they are; the picker only edits this raid's.
  const otherBossIds = (item?.bosses ?? []).filter(b => !raidBossIds.has(b.id)).map(b => b.id)
  const [bossIds, setBossIds] = useState<string[]>(item ? item.bosses.filter(b => raidBossIds.has(b.id)).map(b => b.id) : [bossId])
  const [draft, setDraft] = useState<ItemBody>({
    name: item?.name ?? '', slot: item?.slot ?? null, recommended_classes: item?.recommended_classes ?? [],
    notes: item?.notes ?? '', hard_reserved: item?.hard_reserved ?? false, hard_reserve_note: item?.hard_reserve_note ?? '',
  })
  const [saved, setSaved] = useState<ApiItem | null>(item)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  // A screenshot picked before the item exists; uploaded right after create.
  const [pending, setPending] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const bossOpts = bossOrder(bosses).map(b => ({ value: b.id, label: b.name }))

  async function save() {
    setSaveError(null)
    const body: ItemBody = {
      ...draft, name: draft.name.trim(), notes: draft.notes?.trim() || null,
      hard_reserve_note: draft.hard_reserved ? draft.hard_reserve_note?.trim() || null : null,
    }
    const allBosses = [...bossIds, ...otherBossIds]
    const res = saved
      ? await updateItem(saved.id, { ...body, boss_ids: allBosses })
      : await createItem(bossIds[0], { ...body, boss_ids: allBosses })
    if (res.status !== 'ok') { setSaveError(res.message); return }
    setSaved(res.payload)
    if (saved) { onClose(); return }
    if (pending) {
      setPending(null)
      if (fileRef.current) fileRef.current.value = ''
      const up = await uploadItemImage(res.payload.id, pending)
      if (up.status === 'ok') setSaved(up.payload)
      else setImageError(`Item added, but the screenshot failed: ${up.message}`)
    }
  }

  async function pickImage(file: File | undefined) {
    if (!saved) { setPending(file ?? null); return }
    if (!file) return
    setImageError(null)
    const res = await uploadItemImage(saved.id, file)
    if (res.status === 'ok') setSaved(res.payload)
    else setImageError(res.message)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function removeImage() {
    if (!saved) return
    await run(() => deleteItemImage(saved.id), 'Removing the screenshot')
    setSaved({ ...saved, image_url: null })
  }

  const src = saved ? imageSrc(saved) : null

  return (
    <Modal open onClose={onClose} title={saved ? `Edit ${saved.name}` : 'New item'} maxWidth="max-w-2xl">
      <div className="px-5 py-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <Field label="Item name"><input type="text" aria-label="Item name" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} className="forge-input" autoFocus /></Field>
          <Field label="Slot"><div className="w-40"><Select aria-label="Slot" options={SLOT_OPTS} isClearable placeholder="Slot" value={SLOT_OPTS.find(o => o.value === draft.slot) ?? null} onChange={o => setDraft({ ...draft, slot: o?.value ?? null })} /></div></Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Drops from"><Select<true> isMulti aria-label="Drops from" options={bossOpts} placeholder="Pick bosses" value={bossOpts.filter(o => bossIds.includes(o.value))} onChange={next => setBossIds(next.map(o => o.value))} /></Field>
          <Field label="Recommended classes">
            <Select<true> isMulti aria-label="Recommended classes" options={CLASS_OPTS} placeholder="Any class" value={CLASS_OPTS.filter(o => draft.recommended_classes.includes(o.value))} onChange={next => setDraft({ ...draft, recommended_classes: next.map(o => o.value) })} />
          </Field>
        </div>
        <Field label="Notes"><textarea aria-label="Item notes" rows={2} value={draft.notes ?? ''} onChange={e => setDraft({ ...draft, notes: e.target.value })} className="forge-input" /></Field>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-[#9ca3af] cursor-pointer">
            <input type="checkbox" aria-label="Hard reserve" checked={draft.hard_reserved} onChange={e => setDraft({ ...draft, hard_reserved: e.target.checked })} /> Guild hard reserve (nobody can SR it; leadership gives it out)
          </label>
          {draft.hard_reserved && <input type="text" aria-label="Hard reserve note" placeholder="Note, e.g. goes to the main tank" value={draft.hard_reserve_note ?? ''} onChange={e => setDraft({ ...draft, hard_reserve_note: e.target.value })} className="forge-input" />}
          {draft.hard_reserved && saved && !saved.hard_reserved && <p className="text-xs text-amber-300">Saving clears everyone's standing reserves for this item.</p>}
        </div>

        <div className="space-y-2 pt-2 border-t border-[#2a2d3a]">
          <span className="forge-label">Screenshot</span>
          <div className="flex items-start gap-3">
            {saved && (src ? <img src={src} alt={saved.name} className="max-h-48 rounded border border-[#2a2d3a]" /> : <p className="text-xs text-[#6b7280] py-2">No screenshot yet.</p>)}
            <div className="flex flex-col gap-2">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Screenshot file" onChange={e => pickImage(e.target.files?.[0])} className="text-xs text-[#9ca3af] file:mr-2 file:px-2 file:py-1 file:rounded file:border file:border-[#2a2d3a] file:bg-[#0f1117] file:text-[#9ca3af] file:text-xs" />
              {src && <button type="button" onClick={removeImage} className="text-xs text-[#6b7280] hover:text-red-400 cursor-pointer text-left">Remove screenshot</button>}
              <p className="text-[10px] text-[#4b5563]">PNG, JPEG or WebP, 2 MB max.{!saved && ' Uploads when you add the item.'}</p>
            </div>
          </div>
          {imageError && <p className="text-xs text-red-400">{imageError}</p>}
        </div>

        {saveError && <p className="text-sm text-red-400">{saveError}</p>}
        <div className="flex justify-end gap-2 pt-2 border-t border-[#2a2d3a]">
          <button type="button" onClick={onClose} className="forge-btn cursor-pointer">{saved && !item ? 'Done' : 'Cancel'}</button>
          <button type="button" onClick={save} disabled={!draft.name.trim() || bossIds.length === 0} className="forge-btn-active cursor-pointer disabled:opacity-40">{saved ? 'Save' : 'Add item'}</button>
        </div>
      </div>
    </Modal>
  )
}

// Searchable picker over the whole catalog to drop an existing item from this boss too.
function AttachModal({ boss, onAttach, onClose }: { boss: ApiBoss; onAttach: (itemId: string) => Promise<string | null>; onClose: () => void }) {
  const [items, setItems] = useState<ApiItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    listItems().then(res => { if (res.status === 'ok') setItems(res.payload); else setError(res.message) })
  }, [])
  const here = new Set(boss.items.map(i => i.id))
  const opts: SelectOption[] = (items ?? []).filter(i => !here.has(i.id)).map(i => ({ value: i.id, label: `${i.name}${i.bosses.length ? ` (${bossNames(i)})` : ''}` }))
  return (
    <Modal open onClose={onClose} title={`Add existing item to ${boss.name}`}>
      <div className="px-5 py-4 space-y-3">
        <Select aria-label="Existing item" placeholder={items ? 'Search items' : 'Loading'} isSearchable options={opts} value={null} onChange={async o => { if (o) setError(await onAttach(o.value)) }} />
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </Modal>
  )
}

function BossBlock({ boss, run, onEditItem, onAddItem, onAttachItem, dragProps, onMove, dragging, over }: {
  boss: ApiBoss; run: Run; onEditItem: (i: ApiItem) => void; onAddItem: () => void; onAttachItem: () => void
  dragProps: Record<string, unknown>; onMove: (delta: number) => void; dragging: boolean; over: boolean
}) {
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(boss.name)

  async function rename() {
    if (await run(() => updateBoss(boss.id, { name: name.trim(), position: boss.position }), 'Saving the boss')) setRenaming(false)
  }

  return (
    <div {...(boss.is_trash ? {} : dragProps)} className={`border border-[#2a2d3a] rounded-lg transition-opacity ${dragging ? 'opacity-30' : ''} ${over ? 'border-t-2 border-t-[#c4af64]/60' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-2 bg-[#1a1d27] rounded-t-lg">
        {!boss.is_trash && (
          <span className="flex items-center gap-1 shrink-0">
            <span className="cursor-grab active:cursor-grabbing" aria-label="Drag to reorder"><GripIcon /></span>
            <button type="button" onClick={() => onMove(-1)} aria-label={`Move ${boss.name} up`} className="text-[10px] text-[#4b5563] hover:text-[#e2e4ed] cursor-pointer">▲</button>
            <button type="button" onClick={() => onMove(1)} aria-label={`Move ${boss.name} down`} className="text-[10px] text-[#4b5563] hover:text-[#e2e4ed] cursor-pointer">▼</button>
          </span>
        )}
        {renaming ? (
          <>
            <input type="text" aria-label={`Boss name ${boss.name}`} value={name} onChange={e => setName(e.target.value)} className="forge-input w-48" />
            <button type="button" onClick={rename} className="forge-btn-active text-xs cursor-pointer">Save</button>
            <button type="button" onClick={() => setRenaming(false)} className="forge-btn text-xs cursor-pointer">Cancel</button>
          </>
        ) : (
          <>
            <span className="text-sm text-[#e2e4ed] font-medium">{boss.name}</span>
            {boss.is_trash && <span className="text-[10px] uppercase tracking-widest text-[#6b7280]">trash drops</span>}
            <span className="text-xs text-[#4b5563]">{boss.items.length} item{boss.items.length === 1 ? '' : 's'}</span>
            <span className="ml-auto flex items-center gap-3 text-xs">
              <button type="button" onClick={onAddItem} className="text-[#9ca3af] hover:text-[#c4af64] cursor-pointer">+ Item</button>
              <button type="button" onClick={onAttachItem} aria-label={`Add existing item to ${boss.name}`} className="text-[#9ca3af] hover:text-[#c4af64] cursor-pointer">+ Existing item</button>
              {!boss.is_trash && <button type="button" onClick={() => setRenaming(true)} aria-label={`Rename ${boss.name}`} className="text-[#6b7280] hover:text-[#c4af64] cursor-pointer">Rename</button>}
              {!boss.is_trash && <ConfirmDialogButton label="Delete" ariaLabel={`Delete boss ${boss.name}`} title="Delete boss" message={<>Delete <b className="text-[#e2e4ed]">{boss.name}</b>? Items that drop only from this boss are deleted too. Refused if any of those have reserves.</>} onConfirm={() => run(() => deleteBoss(boss.id), 'Deleting the boss')} className="text-xs text-[#6b7280] hover:text-red-400 cursor-pointer" />}
            </span>
          </>
        )}
      </div>
      {boss.items.length > 0 && (
        <div className="divide-y divide-[#1e2130]">
          {boss.items.map(item => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-2 text-sm">
              {imageSrc(item) ? <img src={imageSrc(item)!} alt="" className="w-8 h-8 rounded object-cover border border-[#2a2d3a]" /> : <span className="w-8 h-8 rounded bg-[#1a1d27] border border-[#2a2d3a]" />}
              <span className="text-[#e2e4ed]">{item.name}</span>
              {item.hard_reserved && <HardReserveBadge note={item.hard_reserve_note} />}
              {item.bosses.length > 1 && <span className="text-xs text-[#6b7280]" title="Drops from">also: {bossNames({ bosses: item.bosses.filter(b => b.id !== boss.id) })}</span>}
              {item.slot && <span className="text-xs text-[#6b7280]">{item.slot}</span>}
              <ClassBadges classes={item.recommended_classes} />
              <span className="ml-auto flex items-center gap-3 text-xs">
                <button type="button" onClick={() => onEditItem(item)} aria-label={`Edit ${item.name}`} className="text-[#6b7280] hover:text-[#c4af64] cursor-pointer">Edit</button>
                {item.bosses.length > 1 && <ConfirmDialogButton label="Detach" ariaLabel={`Detach ${item.name} from ${boss.name}`} title="Detach item" message={<>Stop <b className="text-[#e2e4ed]">{item.name}</b> dropping from {boss.name}? It stays in the catalog under its other bosses.</>} onConfirm={() => run(() => detachItem(boss.id, item.id), 'Detaching the item')} className="text-xs text-[#6b7280] hover:text-red-400 cursor-pointer" />}
                <ConfirmDialogButton label="Delete" ariaLabel={`Delete ${item.name}`} title="Delete item" message={<>Delete <b className="text-[#e2e4ed]">{item.name}</b>? Refused if it has reserves.</>} onConfirm={() => run(() => deleteItem(item.id), 'Deleting the item')} className="text-xs text-[#6b7280] hover:text-red-400 cursor-pointer" />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Manager() {
  const [raids, setRaids] = useState<ApiRaid[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [raidForm, setRaidForm] = useState<{ raid: ApiRaid | null } | null>(null)
  const [itemForm, setItemForm] = useState<{ raid: ApiRaid; bossId: string; item: ApiItem | null } | null>(null)
  const [attachTo, setAttachTo] = useState<ApiBoss | null>(null)
  const [newBoss, setNewBoss] = useState('')

  const reload = useCallback(async () => {
    const res = await listRaids()
    if (res.status === 'ok') setRaids(res.payload)
    else setError(res.message)
  }, [])

  useEffect(() => { reload() }, [reload])

  const run: Run = async (action, what) => {
    setError(null)
    const res = await action()
    if (res.status !== 'ok') { setError(`${what} failed: ${res.message}`); return false }
    await reload()
    return true
  }

  // Reorders apply optimistically, then persist; a failed save reloads the server order.
  const raidDrag = useDragOrder(raids ?? [], next => {
    setRaids(next)
    putRaidOrder(next.map(r => r.id)).then(res => { if (res.status !== 'ok') reload() })
  })
  const current = raids?.find(r => r.id === open) ?? null
  const bosses = current ? current.bosses.filter(b => !b.is_trash).slice().sort((a, b) => a.position - b.position) : []
  const trash = current?.bosses.find(b => b.is_trash) ?? null
  const bossDrag = useDragOrder(bosses, next => {
    if (!current) return
    setRaids(prev => prev!.map(r => (r.id === current.id ? { ...r, bosses: next.map((b, i) => ({ ...b, position: i })).concat(trash ? [trash] : []) } : r)))
    putBossOrder(current.id, next.map(b => b.id)).then(res => { if (res.status !== 'ok') reload() })
  })

  if (error && !raids) return <p className="text-sm text-red-400">{error}</p>
  if (!raids) return <Spinner />

  async function saveRaid(body: RaidBody) {
    const editing = raidForm?.raid
    const position = editing ? editing.position : raids!.length
    const res = await (editing ? updateRaid(editing.id, { ...body, position }) : createRaid({ ...body, position }))
    if (res.status !== 'ok') return res.message
    setRaidForm(null)
    await reload()
    return null
  }

  async function addBoss() {
    if (!current || !newBoss.trim()) return
    if (await run(() => createBoss(current.id, { name: newBoss.trim(), position: bosses.length }), 'Adding the boss')) setNewBoss('')
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {raids.map((r, index) => (
          <span key={r.id} {...raidDrag.props(index)} className={`flex items-center transition-opacity ${raidDrag.dragIndex === index ? 'opacity-30' : ''} ${raidDrag.overIndex === index && raidDrag.dragIndex !== index ? 'border-l-2 border-l-[#c4af64] pl-1' : ''}`}>
            <button type="button" onClick={() => setOpen(r.id === open ? null : r.id)}
              className={`px-3 py-1.5 rounded text-sm border transition-colors cursor-pointer ${open === r.id ? 'bg-[#c4af64]/15 text-[#c4af64] border-[#c4af64]/60' : r.active ? 'text-[#9ca3af] border-[#2a2d3a] hover:text-[#e2e4ed]' : 'text-[#4b5563] border-[#1e2130] line-through'}`}>
              {r.short_name}
            </button>
          </span>
        ))}
        <button type="button" onClick={() => setRaidForm({ raid: null })} className="forge-btn text-sm cursor-pointer">+ Raid</button>
      </div>
      <p className="text-[10px] text-[#4b5563]">Drag raids to set the order they show in.</p>

      {!current && <p className="text-sm text-[#6b7280]">Pick a raid to manage its bosses and loot.</p>}
      {current && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-[#e2e4ed]">{current.name}</h2>
            {!current.active && <span className="text-[10px] uppercase tracking-widest text-[#6b7280]">retired</span>}
            <span className="ml-auto flex items-center gap-3 text-xs">
              <button type="button" onClick={() => raidDrag.move(raids.indexOf(current), raids.indexOf(current) - 1)} aria-label="Move raid earlier" className="text-[#6b7280] hover:text-[#e2e4ed] cursor-pointer">▲</button>
              <button type="button" onClick={() => raidDrag.move(raids.indexOf(current), raids.indexOf(current) + 1)} aria-label="Move raid later" className="text-[#6b7280] hover:text-[#e2e4ed] cursor-pointer">▼</button>
              <button type="button" onClick={() => setRaidForm({ raid: current })} className="text-[#9ca3af] hover:text-[#c4af64] cursor-pointer">Edit raid</button>
              <ConfirmDialogButton label="Delete raid" title="Delete raid" message={<>Delete <b className="text-[#e2e4ed]">{current.name}</b> with all its bosses and items? Refused while events or reserves reference it; retire it instead if so.</>} onConfirm={async () => { if (await run(() => deleteRaid(current.id), 'Deleting the raid')) setOpen(null) }} className="text-xs text-[#6b7280] hover:text-red-400 cursor-pointer" />
            </span>
          </div>
          {bosses.map((boss, index) => (
            <BossBlock key={boss.id} boss={boss} run={run}
              dragProps={bossDrag.props(index)} onMove={delta => bossDrag.move(index, index + delta)}
              dragging={bossDrag.dragIndex === index} over={bossDrag.overIndex === index && bossDrag.dragIndex !== index}
              onAddItem={() => setItemForm({ raid: current, bossId: boss.id, item: null })}
              onAttachItem={() => setAttachTo(boss)}
              onEditItem={item => setItemForm({ raid: current, bossId: boss.id, item })} />
          ))}
          {trash && (
            <BossBlock boss={trash} run={run} dragProps={{}} onMove={() => {}} dragging={false} over={false}
              onAddItem={() => setItemForm({ raid: current, bossId: trash.id, item: null })}
              onAttachItem={() => setAttachTo(trash)}
              onEditItem={item => setItemForm({ raid: current, bossId: trash.id, item })} />
          )}
          <div className="flex items-center gap-2">
            <input type="text" aria-label="New boss name" placeholder="New boss" value={newBoss} onChange={e => setNewBoss(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addBoss() }} className="forge-input w-56" />
            <button type="button" onClick={addBoss} disabled={!newBoss.trim()} className="forge-btn cursor-pointer disabled:opacity-40">Add boss</button>
          </div>
          <p className="text-[10px] text-[#4b5563]">Drag bosses into kill order; Trash stays last.</p>
        </div>
      )}

      {raidForm && <RaidForm initial={raidForm.raid ? { name: raidForm.raid.name, short_name: raidForm.raid.short_name, position: raidForm.raid.position, active: raidForm.raid.active } : null} onSave={saveRaid} onClose={() => setRaidForm(null)} />}
      {attachTo && (
        <AttachModal boss={attachTo} onClose={() => setAttachTo(null)}
          onAttach={async itemId => {
            const res = await attachItem(attachTo.id, itemId)
            if (res.status !== 'ok') return res.message
            setAttachTo(null)
            await reload()
            return null
          }} />
      )}
      {itemForm && <ItemForm key={itemForm.item?.id ?? 'new'} item={itemForm.item} bosses={itemForm.raid.bosses} bossId={itemForm.bossId} run={run} onClose={() => { setItemForm(null); reload() }} />}
    </div>
  )
}

export function Raids() {
  const { leadership } = useWowfAccess()
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#e2e4ed]">Raids</h1>
        <p className="text-sm text-[#6b7280]">The loot catalog: each raid, its bosses in kill order, and the items people can reserve.</p>
      </div>
      <WowfGate>
        {leadership ? <Manager /> : <p className="text-sm text-red-400">This page is for WoW guild leadership.</p>}
      </WowfGate>
    </div>
  )
}
