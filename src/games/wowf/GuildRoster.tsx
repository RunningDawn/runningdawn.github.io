import { useCallback, useEffect, useMemo, useState } from 'react'
import { ConfirmDialogButton } from '../../components/ConfirmDialog'
import { DataTable, type Column } from '../../components/DataTable'
import { Modal } from '../../components/Modal'
import { Select, type SelectOption } from '../../components/Select'
import {
  assignCharacter, createPickup, getGuildRoster, guildCreateCharacter, guildDeleteCharacter, guildRestorePickup,
  guildUpdateCharacter, type GuildRosterEntry,
} from './api'
import { useWowfAccess } from './access'
import { WowfGate } from './WowfGate'
import { CharacterForm } from './CharacterForm'
import { ProfessionSelect } from './ProfessionSelect'
import { RoleBadge, SpecIcon } from './eventUi'
import {
  CLASSES, CLASS_COLORS, FACTIONS, ROLES, RULESETS, fromApi, newCharacter, timeAgo, toApi,
  type WowfCharacter,
} from './roster'

// ownerId null = pickup player (no account yet).
interface Row extends WowfCharacter {
  owner: string
  ownerId: string | null
  discord: string
  nickname: string | null
  hasRole: boolean
  isMember: boolean
}

const ALL = ''

function Filter({ label, all, value, options, onChange }: {
  label: string; all: string; value: string; options: readonly string[]; onChange: (v: string) => void
}) {
  const opts: SelectOption[] = [
    { value: ALL, label: all },
    ...options.map(o => ({ value: o, label: o })),
  ]
  return (
    <div className="w-40">
      <Select aria-label={label} options={opts} value={opts.find(o => o.value === value) ?? opts[0]} onChange={o => onChange(o?.value ?? ALL)} />
    </div>
  )
}

function memberLabel(e: GuildRosterEntry) {
  return e.nickname ? `${e.nickname} (${e.username})` : e.username
}

function flatten(entries: GuildRosterEntry[]): Row[] {
  return entries.flatMap(entry =>
    entry.characters.map(c => ({
      ...fromApi(c),
      owner: entry.username,
      ownerId: entry.user_id,
      discord: entry.discord_username ?? '',
      nickname: entry.nickname,
      hasRole: entry.has_role,
      isMember: entry.is_member,
    })))
}

const dim = <span className="text-[#3a3d4a]">-</span>

function Table() {
  const [entries, setEntries] = useState<GuildRosterEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [faction, setFaction] = useState(ALL)
  const [cls, setCls] = useState(ALL)
  const [ruleset, setRuleset] = useState(ALL)
  const [role, setRole] = useState(ALL)
  const [mainsOnly, setMainsOnly] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [professions, setProfessions] = useState<string[]>([])
  // Editing an existing row, or adding a new character for `addFor`.
  const [editing, setEditing] = useState<Row | null>(null)
  const [addFor, setAddFor] = useState<GuildRosterEntry | null>(null)
  const [addPickup, setAddPickup] = useState(false)
  // Handing a pickup character to a member.
  const [assigning, setAssigning] = useState<Row | null>(null)
  const [assignTo, setAssignTo] = useState<string | null>(null)

  const rows = useMemo(() => flatten(entries), [entries])

  const reload = useCallback(async () => {
    const res = await getGuildRoster()
    if (res.status === 'ok') setEntries(res.payload)
    else setError(res.message || 'Failed to load')
  }, [])

  useEffect(() => {
    let cancelled = false
    getGuildRoster()
      .then(res => {
        if (cancelled) return
        if (res.status !== 'ok') { setError(res.message || 'Failed to load'); return }
        setEntries(res.payload)
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r =>
      (!q || r.name.toLowerCase().includes(q) || r.owner.toLowerCase().includes(q)
        || r.discord.toLowerCase().includes(q) || (r.nickname ?? '').toLowerCase().includes(q))
      && (!faction || r.faction === faction)
      && (!cls || r.class === cls)
      && (!ruleset || r.ruleset === ruleset)
      && (!role || r.role === role)
      && (!mainsOnly || r.main)
      && (showArchived || !r.archived)
      && (professions.length === 0 || professions.some(p => r.professions.includes(p))))
  }, [rows, search, faction, cls, ruleset, role, mainsOnly, showArchived, professions])

  const members = entries.filter(e => e.user_id !== null)
  const activeChars = (e: GuildRosterEntry) => e.characters.filter(c => !c.archived)
  const noRole = members.filter(e => !e.has_role && activeChars(e).length > 0)
  const unregistered = members.filter(e => e.has_role && activeChars(e).length === 0)
  const addable = members.filter(e => e.has_role)
  const addOpts: SelectOption[] = addable.map(e => ({ value: e.user_id!, label: memberLabel(e) }))

  // Every mutation goes to forge-api and the roster reloads, so what you see is what it holds.
  // Returns the API's message for errors the open form should show (e.g. a name clash).
  async function run(action: () => Promise<{ status: string; message?: string }>, what: string, inForm = false): Promise<string | null> {
    setSaveError(null)
    const res = await action()
    let formError: string | null = null
    if (res.status !== 'ok') {
      if (inForm && res.message !== 'conflict') formError = res.message ?? 'Failed'
      else setSaveError(res.message === 'conflict'
        ? `${what} was dropped: that character changed since you loaded it. Showing the latest.`
        : `${what} failed: ${res.message}`)
    }
    await reload()
    return formError
  }

  async function saveEdit(char: WowfCharacter) {
    const failed = await run(() => guildUpdateCharacter(char.id, toApi(char, editing!.updatedAt)), 'The edit', true)
    if (!failed) setEditing(null)
    return failed
  }

  async function saveNew(char: WowfCharacter) {
    const failed = await run(() => guildCreateCharacter(addFor!.user_id!, toApi(char)), 'The new character', true)
    if (!failed) setAddFor(null)
    return failed
  }

  async function savePickup(char: WowfCharacter) {
    const failed = await run(() => createPickup(toApi(char)), 'The pickup character', true)
    if (!failed) setAddPickup(false)
    return failed
  }

  function assign() {
    const row = assigning!
    const target = assignTo!
    setAssigning(null)
    setAssignTo(null)
    run(() => assignCharacter(row.id, target), 'The assignment')
  }

  function remove(row: Row, hard: boolean) {
    run(() => guildDeleteCharacter(row.id, hard), hard ? 'The deletion' : 'The archive')
  }

  if (loading) return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-[#c4af64] border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading" /></div>
  if (error) return <p className="text-sm text-red-400 text-center py-8">Failed to load guild roster: {error}</p>

  const columns: Column<Row>[] = [
    { key: 'owner', label: 'Member', sortKey: r => r.owner.toLowerCase(), render: r => r.ownerId === null ? <span className="text-[#c4af64]">Pickup</span> : (
      <span className="flex flex-col leading-tight">
        <span className={r.hasRole ? 'text-[#e2e4ed]' : 'text-red-400'} title={r.hasRole ? undefined : (r.isMember ? 'No WoW guild role' : 'Not in the Discord server')}>
          {r.owner}{!r.hasRole && ' !'}
        </span>
        <span className="text-xs text-[#6b7280]">{r.discord}{r.nickname && ` · ${r.nickname}`}</span>
      </span>
    ) },
    { key: 'name', label: 'Character', sortKey: r => r.name.toLowerCase(), render: r => (
      <span className="font-medium" style={{ color: CLASS_COLORS[r.class] ?? '#e2e4ed' }}>
        {r.name}{r.main && <span className="ml-1.5 text-[10px] uppercase tracking-widest text-[#c4af64]">main</span>}{r.archived && <span className="ml-1.5 text-[10px] uppercase tracking-widest text-[#6b7280]">archived</span>}
      </span>
    ) },
    { key: 'level', label: 'Lvl', sortKey: r => r.level, render: r => <>{r.level}</>, className: 'text-right' },
    { key: 'class', label: 'Class', sortKey: r => r.class, render: r => <>{r.class}</> },
    { key: 'role', label: 'Role', sortKey: r => r.role, render: r => r.role ? <RoleBadge role={r.role} /> : dim },
    { key: 'mainSpec', label: 'Main Spec', sortKey: r => r.mainSpec, render: r => r.mainSpec ? <span className="flex items-center gap-1.5"><SpecIcon cls={r.class} spec={r.mainSpec} size={18} />{r.mainSpec}</span> : dim },
    { key: 'offSpec', label: 'Off Spec', sortKey: r => r.secondSpec, render: r => r.secondSpec ? <span className="flex items-center gap-1.5 text-[#9ca3af]"><SpecIcon cls={r.class} spec={r.secondSpec} size={18} />{r.secondSpec}</span> : dim },
    { key: 'race', label: 'Race', sortKey: r => r.race, render: r => <>{r.race}</> },
    { key: 'faction', label: 'Faction', sortKey: r => `${r.faction} ${r.ruleset}`, render: r => <span className="text-[#9ca3af]">{r.faction} <span className="text-[#4b5563]">·</span> {r.ruleset}</span> },
    { key: 'professions', label: 'Professions', sortKey: r => r.professions.join(' '), render: r => <span className="text-[#9ca3af]">{r.professions.join(' · ') || dim}</span> },
    { key: 'updated', label: 'Updated', sortKey: r => r.updatedAt ?? '', render: r => <span className="text-[#6b7280]" title={r.updatedAt ?? undefined}>{r.updatedAt ? timeAgo(r.updatedAt) : dim}</span> },
    { key: 'actions', label: '', render: r => (
      <span className="flex items-center gap-2 justify-end">
        {r.ownerId === null && !r.archived && <button type="button" onClick={() => { setAssigning(r); setAssignTo(null) }} aria-label={`Assign ${r.name}`} className="text-xs text-[#c4af64] hover:text-[#e2e4ed] cursor-pointer">Assign</button>}
        {!r.archived && <button type="button" onClick={() => setEditing(r)} aria-label={`Edit ${r.name}`} className="text-xs text-[#4b5563] hover:text-[#c4af64] cursor-pointer">Edit</button>}
        {r.archived && r.ownerId === null && <button type="button" onClick={() => run(() => guildRestorePickup(r.id), 'The restore')} aria-label={`Restore ${r.name}`} className="text-xs text-[#c4af64] hover:text-[#e2e4ed] cursor-pointer">Restore</button>}
        {r.archived
          ? (
            <ConfirmDialogButton
              label="Delete permanently"
              ariaLabel={`Delete ${r.name} permanently`}
              title="Delete permanently"
              message={<>Permanently delete <b className="text-[#e2e4ed]">{r.name}</b>? Its reserves and attendance are removed; loot it received stays in the history under its name. This can't be undone.</>}
              onConfirm={() => remove(r, true)}
            />
          )
          : (
            <ConfirmDialogButton
              label="Archive"
              ariaLabel={`Archive ${r.name}`}
              title="Archive character"
              message={<>Archive <b className="text-[#e2e4ed]">{r.name}</b> from {r.ownerId === null ? 'the pickups' : `${r.owner}'s roster`}? It leaves the roster and can't sign up or reserve, but keeps its loot history. {r.ownerId === null ? 'You can restore it from Show archived.' : 'Its owner can restore it.'}</>}
              onConfirm={() => remove(r, false)}
            />
          )}
      </span>
    ), className: 'w-44' },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-[#e2e4ed]">Guild Roster</h1>
          <p className="text-sm text-[#6b7280]">Every registered character across the guild. Leadership only for now.</p>
        </div>
        <div className="w-64">
          <Select
            aria-label="Add character for"
            placeholder="Add character for…"
            options={addOpts}
            value={null}
            isSearchable
            onChange={o => { if (o) setAddFor(addable.find(e => e.user_id === o.value) ?? null) }}
          />
        </div>
        <button type="button" onClick={() => setAddPickup(true)} className="forge-btn cursor-pointer">+ Pickup</button>
      </div>
      {noRole.length > 0 && (
        <p className="text-sm text-red-400">
          No WoW guild role but still on the roster: {noRole.map(memberLabel).join(', ')}. Their characters can be archived below.
        </p>
      )}
      {unregistered.length > 0 && (
        <p className="text-xs text-[#6b7280]">
          Registered without characters: {unregistered.map(memberLabel).join(', ')}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search character or member…"
          aria-label="Search"
          className="bg-[#1a1d27] border border-[#2a2d3a] text-[#e2e4ed] rounded px-3 py-1.5 text-xs w-56 focus:outline-none focus:border-[#c4af64] placeholder-[#6b7280]"
        />
        <Filter label="Faction" all="All factions" value={faction} options={FACTIONS} onChange={setFaction} />
        <Filter label="Class" all="All classes" value={cls} options={CLASSES} onChange={setCls} />
        <Filter label="Ruleset" all="All rulesets" value={ruleset} options={RULESETS} onChange={setRuleset} />
        <Filter label="Role" all="All roles" value={role} options={ROLES} onChange={setRole} />
        <div className="w-44">
          <ProfessionSelect compact label="Filter by profession" placeholder="Any profession" value={professions} onChange={setProfessions} />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-[#9ca3af] cursor-pointer">
          <input type="checkbox" checked={mainsOnly} onChange={e => setMainsOnly(e.target.checked)} />
          Mains only
        </label>
        <label className="flex items-center gap-1.5 text-xs text-[#9ca3af] cursor-pointer">
          <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />
          Show archived
        </label>
      </div>
      {saveError && <p className="text-sm text-red-400">{saveError}</p>}
      {rows.length === 0
        ? <p className="text-sm text-[#6b7280] text-center py-8">No characters registered yet.</p>
        : filtered.length === 0
          ? <p className="text-sm text-[#6b7280] py-6 text-center">No characters match.</p>
          : (
            <DataTable
              columns={columns}
              data={filtered}
              rowKey={r => r.id}
              rowClass={(r, i) => (r.hasRole || r.ownerId === null ? (i % 2 === 0 ? '#0f1117' : '#111420') : '#2a1416')}
              defaultSort="owner"
              defaultSortDir="asc"
              footer={`${filtered.length} of ${showArchived ? rows.length : rows.filter(r => !r.archived).length} characters · ${members.length} members`}
            />
          )}
      {editing && (
        <CharacterForm
          key={editing.id}
          initial={editing}
          isNew={false}
          confirmSave={`Save changes to ${editing.owner}'s ${editing.name}?`}
          canSetMain={editing.ownerId !== null}
          onSave={saveEdit}
          onClose={() => setEditing(null)}
        />
      )}
      {addFor && (
        <CharacterForm
          key={`new:${addFor.user_id}`}
          initial={newCharacter(activeChars(addFor).length === 0)}
          isNew
          confirmSave={`Add this character to ${memberLabel(addFor)}'s roster?`}
          canSetMain
          onSave={saveNew}
          onClose={() => setAddFor(null)}
        />
      )}
      {addPickup && (
        <CharacterForm
          key="pickup"
          initial={newCharacter(false)}
          isNew
          confirmSave="Add this pickup character? It has no owner until you assign it."
          onSave={savePickup}
          onClose={() => setAddPickup(false)}
        />
      )}
      {assigning && (
        <Modal open onClose={() => setAssigning(null)} title={`Assign ${assigning.name}`}>
          <div className="px-5 py-4 space-y-4">
            <p className="text-sm text-[#9ca3af]">Hand this pickup character to a member with the WoW guild role. It goes to the end of their roster.</p>
            <Select aria-label="Assign to" placeholder="Member" options={addOpts} isSearchable value={addOpts.find(o => o.value === assignTo) ?? null} onChange={o => setAssignTo(o?.value ?? null)} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAssigning(null)} className="forge-btn cursor-pointer">Cancel</button>
              <button type="button" onClick={assign} disabled={!assignTo} className="forge-btn-active cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">Assign</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export function GuildRoster() {
  const { leadership } = useWowfAccess()
  return (
    <div className="space-y-6">
      {!leadership && <h1 className="text-xl font-semibold text-[#e2e4ed]">Guild Roster</h1>}
      <WowfGate>
        {leadership
          ? <Table />
          : <p className="text-sm text-red-400">This page is for WoW guild leadership.</p>}
      </WowfGate>
    </div>
  )
}
