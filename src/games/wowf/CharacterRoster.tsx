import { useCallback, useEffect, useState } from 'react'
import { STORAGE_KEYS } from '../../config/storageKeys'
import { createCharacter, deleteCharacter, listCharacters, putOrder, restoreCharacter, updateCharacter } from './api'
import { useWowfAccess } from './access'
import { WowfGate } from './WowfGate'
import { CharacterCard } from './CharacterCard'
import { CharacterForm } from './CharacterForm'
import { CLASS_COLORS, fromApi, newCharacter, reorder, sanitize, toApi, type WowfCharacter } from './roster'

const SK = STORAGE_KEYS.wowfRoster

// Last-synced copy, so a reload or a flaky connection still shows the roster.
function readMirror(): WowfCharacter[] {
  try {
    return sanitize(JSON.parse(localStorage.getItem(SK) ?? 'null')).characters
  } catch {
    return []
  }
}

export function CharacterRoster() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#e2e4ed]">Character Roster</h1>
        <p className="text-sm text-[#6b7280]">Your WoW: Forever characters, as the guild sees them.<br />Drag cards to reorder; your main leads the raid roster and is set by leadership.</p>
      </div>
      <WowfGate>
        <RosterEditor />
      </WowfGate>
    </div>
  )
}

function RosterEditor() {
  const { ok } = useWowfAccess()
  const [chars, setChars] = useState<WowfCharacter[]>(readMirror)
  const [error, setError] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [editing, setEditing] = useState<WowfCharacter | null>(null)

  const show = useCallback((list: WowfCharacter[]) => {
    setChars(list)
    localStorage.setItem(SK, JSON.stringify({ characters: list }))
  }, [])

  // Server is the source of truth; every mutation reloads the list so main
  // promotion and positions always match what forge-api decided.
  const reload = useCallback(async () => {
    const res = await listCharacters()
    if (res.status === 'ok') show(res.payload.map(fromApi))
    else setError(res.message)
  }, [show])

  useEffect(() => {
    if (!ok) return
    let cancelled = false
    listCharacters()
      .then(res => { if (!cancelled && res.status === 'ok') show(res.payload.map(fromApi)) })
      .catch(() => { /* offline - keep the mirror */ })
    return () => { cancelled = true }
  }, [ok, show])

  // Returns the API's message for errors the open form should show (e.g. a name clash).
  async function run(action: () => Promise<{ status: string; message?: string }>, what: string, inForm = false): Promise<string | null> {
    setError(null)
    let formError: string | null = null
    try {
      const res = await action()
      if (res.status !== 'ok') {
        if (inForm && res.message !== 'conflict') formError = res.message ?? 'Failed'
        else setError(res.message === 'conflict'
          ? `${what} was dropped: this character changed elsewhere. Showing the latest.`
          : `${what} failed: ${res.message}`)
      }
    } catch {
      setError(`${what} failed: you appear to be offline.`)
      return null
    }
    await reload()
    return formError
  }

  const active = chars.filter(c => !c.archived)
  const archived = chars.filter(c => c.archived)
  const isNew = editing !== null && !chars.some(c => c.id === editing.id)

  async function commit(char: WowfCharacter) {
    const base = chars.find(c => c.id === char.id)?.updatedAt ?? null
    const failed = isNew
      ? await run(() => createCharacter(toApi(char)), 'Adding the character', true)
      : await run(() => updateCharacter(char.id, toApi(char, base)), 'The edit', true)
    if (!failed) setEditing(null)
    return failed
  }

  function remove(id: string) {
    run(() => deleteCharacter(id), 'The archive')
  }

  function handleDrop(index: number) {
    if (dragIndex !== null && dragIndex !== index) {
      const next = reorder(active, dragIndex, index)
      show([...next, ...archived])
      putOrder(next.map(c => c.id)).then(res => { if (res.status !== 'ok') reload() }, () => reload())
    }
    setDragIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-400">{error}</p>}
      {active.length === 0 && (
        <p className="text-sm text-[#6b7280]">No characters yet. Add your main to get started.</p>
      )}
      {active.map((c, index) => (
        <CharacterCard
          key={c.id}
          char={c}
          dragging={dragIndex === index}
          dragOver={dragOverIndex === index && dragIndex !== index}
          onEdit={() => setEditing(c)}
          onRemove={() => remove(c.id)}
          onDragStart={() => setDragIndex(index)}
          onDragOver={e => { e.preventDefault(); setDragOverIndex(index) }}
          onDrop={() => handleDrop(index)}
          onDragEnd={() => { setDragIndex(null); setDragOverIndex(null) }}
        />
      ))}
      <button type="button" onClick={() => setEditing(newCharacter(active.length === 0))} className="forge-btn-active cursor-pointer">
        + Add character
      </button>
      {editing && (
        <CharacterForm key={editing.id} initial={editing} isNew={isNew} onSave={commit} onClose={() => setEditing(null)} />
      )}
      {archived.length > 0 && (
        <details className="border border-[#2a2d3a] rounded-lg px-4 py-2">
          <summary className="text-sm text-[#9ca3af] cursor-pointer">Archived ({archived.length})</summary>
          <div className="pt-2 space-y-2">
            {archived.map(c => (
              <div key={c.id} className="flex items-center gap-3 text-sm">
                <span className="font-medium" style={{ color: CLASS_COLORS[c.class] ?? '#e2e4ed' }}>{c.name}</span>
                <span className="text-xs text-[#6b7280]">{c.level} {c.race} {c.class}</span>
                <button type="button" onClick={() => run(() => restoreCharacter(c.id), 'The restore')} aria-label={`Restore ${c.name}`} className="ml-auto text-xs text-[#c4af64] hover:text-[#e2e4ed] cursor-pointer">Restore</button>
              </div>
            ))}
          </div>
        </details>
      )}
      <p className="text-xs text-[#6b7280]">Saved to your account and synced across devices.</p>
    </div>
  )
}
