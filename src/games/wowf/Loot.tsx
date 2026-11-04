import { useEffect, useMemo, useState } from 'react'
import { Select, type SelectOption } from '../../components/Select'
import { getPresets, itemGroups, listCharacters, listEvents, listRaids, putPresets, type ApiEvent, type ApiRaid, type ItemOption } from './api'
import { EventList } from './EventList'
import { ItemOptionLabel, Spinner } from './eventUi'
import { MAX_RESERVE_LIMIT, type ApiCharacter } from './roster'

const same = (a: string[], b: string[]) => a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i])

// Standing reserves per character: picked once here, copied into each raid on sign-up.
function Presets() {
  const [characters, setCharacters] = useState<ApiCharacter[]>([])
  const [raids, setRaids] = useState<ApiRaid[] | null>(null)
  const [charId, setCharId] = useState<string | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const [saved, setSaved] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    listCharacters().then(res => {
      if (res.status !== 'ok') { setError(res.message); return }
      const active = res.payload.filter(c => !c.archived)
      setCharacters(active)
      setCharId(active.find(c => c.is_main)?.id ?? active[0]?.id ?? null)
    })
    listRaids(true).then(res => setRaids(res.status === 'ok' ? res.payload : []))
  }, [])
  useEffect(() => {
    if (!charId) return
    setNotice(null)
    setPicked([])
    setSaved([])
    let live = true
    getPresets(charId).then(res => {
      if (!live) return
      if (res.status !== 'ok') { setError(res.message); return }
      const ids = res.payload.map(i => i.id)
      setPicked(ids)
      setSaved(ids)
    })
    return () => { live = false }
  }, [charId])

  const charOpts = useMemo<SelectOption[]>(() => characters.map(c => ({ value: c.id, label: c.name })), [characters])
  const myClass = characters.find(c => c.id === charId)?.class
  const withLoot = useMemo(() => (raids ?? []).map(r => ({ raid: r, groups: itemGroups(r.bosses) })).filter(x => x.groups.length > 0), [raids])

  async function save() {
    setError(null)
    const res = await putPresets(charId!, picked)
    if (res.status !== 'ok') { setError(`Saving failed: ${res.message}`); return }
    const ids = res.payload.map(i => i.id)
    setPicked(ids)
    setSaved(ids)
    setNotice('Reserves saved.')
  }

  if (characters.length === 0) return <p className="text-sm text-[#6b7280]">Add a character on the Character Roster first.</p>
  if (!raids) return <Spinner />
  return (
    <div className="forge-card space-y-3">
      <div className="flex items-end gap-3 flex-wrap">
        <label className="flex flex-col gap-1 w-56"><span className="forge-label">Character</span>
          <Select aria-label="Character" options={charOpts} value={charOpts.find(o => o.value === charId) ?? null} onChange={o => setCharId(o?.value ?? null)} />
        </label>
        <p className="text-xs text-[#6b7280] pb-2">Up to {MAX_RESERVE_LIMIT} per raid. Signing up for a raid copies these in; you can still change them on the raid itself.</p>
      </div>
      {withLoot.length === 0 && <p className="text-sm text-[#6b7280]">No loot entered yet.</p>}
      {withLoot.map(({ raid, groups }) => {
        const all = groups.flatMap(g => g.options)
        const mine = all.filter(o => picked.includes(o.value))
        const full = mine.length >= MAX_RESERVE_LIMIT
        return (
          <label key={raid.id} className="flex flex-col gap-1"><span className="forge-label">{raid.name}</span>
            <Select<true>
              isMulti
              aria-label={`Reserves ${raid.short_name}`}
              placeholder="Pick items"
              isSearchable
              options={groups as unknown as SelectOption[]}
              value={mine}
              isOptionDisabled={o => (o as ItemOption).hardReserved || (full && !picked.includes(o.value))}
              formatOptionLabel={(o, meta) => (meta.context === 'value' ? o.label : <ItemOptionLabel option={o as ItemOption} myClass={myClass} />)}
              onChange={next => setPicked([...picked.filter(id => !all.some(o => o.value === id)), ...next.map(o => o.value)])}
            />
          </label>
        )
      })}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {notice && <p className="text-sm text-[#c4af64]">{notice}</p>}
      {withLoot.length > 0 && (
        <button type="button" onClick={save} disabled={!charId || same(picked, saved)} className="forge-btn-active cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">Save reserves</button>
      )}
    </div>
  )
}

// Member view: raids only, open one to sign up and place reserves.
function RaidList() {
  const [events, setEvents] = useState<ApiEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listEvents().then(res => {
      if (res.status === 'ok') setEvents(res.payload.filter(e => e.kind === 'raid'))
      else setError(res.message)
    })
  }, [])

  if (error) return <p className="text-sm text-red-400">{error}</p>
  if (!events) return <Spinner />
  return <EventList events={events} linkBase="/wow-forever/loot" emptyText="No raids scheduled." />
}

export function Loot() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#e2e4ed]">SR+ (Loot)</h1>
        <p className="text-sm text-[#6b7280]">Set the reserves each character wants, then open a raid. Register on Event Registration (or on the raid itself) before placing reserves.</p>
      </div>
        <section className="space-y-3">
          <h3 className="forge-label">My reserves</h3>
          <Presets />
        </section>
        <section className="space-y-3">
          <h3 className="forge-label">Raids</h3>
          <RaidList />
        </section>
    </div>
  )
}
