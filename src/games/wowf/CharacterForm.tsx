import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { Select, type SelectOption } from '../../components/Select'
import { ProfessionSelect } from './ProfessionSelect'
import {
  CLASS_SPECS, FACTIONS, FACTION_RACES, MAX_LEVEL, MAX_PROFESSIONS, RULESETS,
  clampLevel, classesFor, roleFor, validName, type WowfCharacter,
} from './roster'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="forge-label">{label}</span>
      {children}
    </label>
  )
}

const opts = (list: readonly string[]): SelectOption[] => [...list].sort().map(v => ({ value: v, label: v }))
const find = (list: SelectOption[], v: string) => list.find(o => o.value === v) ?? null

const FACTION_OPTS = opts(FACTIONS)
const RULESET_OPTS = opts(RULESETS)

interface Props {
  initial: WowfCharacter
  isNew: boolean
  // Resolves to an error message to keep the modal open, or null/void when done.
  onSave: (char: WowfCharacter) => Promise<string | null | void>
  onClose: () => void
  // When set, Save first asks this question (used for editing someone else's character).
  confirmSave?: string
  // Leadership only: members can't move their own main.
  canSetMain?: boolean
}

// Add / edit modal. Edits a draft; nothing reaches the roster until Save.
export function CharacterForm({ initial, isNew, onSave, onClose, confirmSave, canSetMain }: Props) {
  const [draft, setDraft] = useState<WowfCharacter>(initial)
  const [confirming, setConfirming] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const set = (patch: Partial<WowfCharacter>) => setDraft(d => ({ ...d, ...patch }))

  const raceOpts = opts(FACTION_RACES[draft.faction])
  const classOpts = opts(classesFor(draft.faction, draft.race))
  const specOpts = opts(CLASS_SPECS[draft.class] ?? [])

  function setRace(race: string) {
    const keep = classesFor(draft.faction, race).includes(draft.class)
    set(keep ? { race } : { race, class: '', mainSpec: '', secondSpec: '' })
  }

  // Rows 1 and 2 are required; specs and professions are optional.
  const canSave = validName(draft.name) && !!draft.race && !!draft.class
  async function submit() {
    setSaveError(null)
    const failed = await onSave({ ...draft, name: draft.name.trim() })
    if (failed) { setSaveError(failed); setConfirming(false) }
  }
  const nameHint = draft.name.trim() !== '' && !validName(draft.name)

  return (
    <Modal open onClose={onClose} title={isNew ? 'Add character' : 'Edit character'} maxWidth="max-w-2xl">
      <div className="px-5 py-4 space-y-4">
        <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
          <div className="col-span-2 sm:col-span-1">
          <Field label="Character name">
            <input
              type="text"
              aria-label="Character name"
              placeholder="Firstname Lastname"
              value={draft.name}
              onChange={e => set({ name: e.target.value })}
              className="forge-input"
              autoFocus
            />
            {nameHint && <span className="text-xs text-red-400">Use Firstname Lastname: two names, letters only.</span>}
          </Field>
          </div>
          <Field label={`Level (1-${MAX_LEVEL})`}>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_LEVEL}
              aria-label="Level"
              value={draft.level}
              onChange={e => set({ level: clampLevel(Number(e.target.value)) })}
              className="forge-input w-24"
            />
          </Field>
          {canSetMain && (
            <label className="flex items-center gap-1.5 text-xs text-[#9ca3af] pb-2 cursor-pointer" title={initial.main ? 'Pick another character to move the main' : 'Make this the main character'}>
              <input
                type="checkbox"
                checked={draft.main}
                disabled={initial.main}
                onChange={e => set({ main: e.target.checked })}
              />
              Main
            </label>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Faction">
            <Select aria-label="Faction" options={FACTION_OPTS} value={find(FACTION_OPTS, draft.faction)} onChange={o => o && set({ faction: o.value as WowfCharacter['faction'], race: '' })} />
          </Field>
          <Field label="Ruleset">
            <Select aria-label="Ruleset" options={RULESET_OPTS} value={find(RULESET_OPTS, draft.ruleset)} onChange={o => o && set({ ruleset: o.value as WowfCharacter['ruleset'] })} />
          </Field>
          <Field label="Race">
            <Select aria-label="Race" options={raceOpts} placeholder="Race" value={find(raceOpts, draft.race)} onChange={o => o && setRace(o.value)} />
          </Field>
          <Field label="Class">
            <Select aria-label="Class" options={classOpts} placeholder={draft.race ? 'Class' : 'Pick a race first'} isDisabled={!draft.race} value={find(classOpts, draft.class)} onChange={o => o && set({ class: o.value, mainSpec: '', secondSpec: '', role: '' })} />
          </Field>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Main spec">
            <Select aria-label="Main spec" options={specOpts} placeholder="Spec" isDisabled={!draft.class} isClearable value={find(specOpts, draft.mainSpec)} onChange={o => set({ mainSpec: o?.value ?? '', role: roleFor(draft.class, o?.value ?? '') })} />
          </Field>
          <Field label="Second spec">
            <Select aria-label="Second spec" options={specOpts} placeholder="Spec" isDisabled={!draft.class} isClearable value={find(specOpts, draft.secondSpec)} onChange={o => set({ secondSpec: o?.value ?? '' })} />
          </Field>
          <div className="col-span-2 flex flex-col gap-1 min-w-0">
            <span className="forge-label">Professions (up to {MAX_PROFESSIONS})</span>
            <ProfessionSelect label="Professions" value={draft.professions} max={MAX_PROFESSIONS} onChange={professions => set({ professions })} />
          </div>
        </div>

        {saveError && <p className="text-sm text-red-400">{saveError}</p>}
        <div className="flex justify-end items-center gap-2 pt-2 border-t border-[#2a2d3a]">
          {confirming ? (
            <>
              <span className="text-xs text-[#e2e4ed] mr-auto">{confirmSave}</span>
              <button type="button" onClick={() => setConfirming(false)} className="forge-btn cursor-pointer">Back</button>
              <button
                type="button"
                onClick={submit}
                className="forge-btn-active cursor-pointer"
              >
                Confirm
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={onClose} className="forge-btn cursor-pointer">Cancel</button>
              <button
                type="button"
                onClick={() => (confirmSave ? setConfirming(true) : submit())}
                disabled={!canSave}
                className="forge-btn-active cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isNew ? 'Add' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
