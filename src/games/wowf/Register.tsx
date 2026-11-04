import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Select, type SelectOption } from '../../components/Select'
import { getEvent, listCharacters, listEvents, type ApiEventDetail } from './api'
import { formatWhen } from './eventTime'
import { CancelledBadge, CharacterOptionLabel, CompositionLine, KindBadge, Spinner, StyleBadge } from './eventUi'
import { SignupCard } from './SignupCard'
import { WowfGate } from './WowfGate'
import { eventComposition, eventStyle, type ApiCharacter } from './roster'

function Upcoming() {
  const [characters, setCharacters] = useState<ApiCharacter[] | null>(null)
  const [charId, setCharId] = useState<string | null>(null)
  const [events, setEvents] = useState<ApiEventDetail[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listCharacters().then(res => {
      if (res.status !== 'ok') { setError(res.message); return }
      const active = res.payload.filter(c => !c.archived)
      setCharacters(active)
      setCharId(active.find(c => c.is_main)?.id ?? active[0]?.id ?? null)
    })
  }, [])
  useEffect(() => {
    listEvents().then(async res => {
      if (res.status !== 'ok') { setError(res.message); return }
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const soon = res.payload.filter(e => Date.parse(e.starts_at) >= today.getTime()).reverse()
      const details = await Promise.all(soon.map(e => getEvent(e.id)))
      setEvents(details.flatMap(d => (d.status === 'ok' ? [d.payload] : [])))
    })
  }, [])

  const refresh = useCallback(async (id: string) => {
    const res = await getEvent(id)
    if (res.status === 'ok') setEvents(prev => prev && prev.map(e => (e.id === id ? res.payload : e)))
  }, [])

  const charOpts = useMemo<SelectOption[]>(() => (characters ?? []).map(c => ({ value: c.id, label: [c.name, c.main_spec, c.class, c.is_main && 'main'].filter(Boolean).join(' ') })), [characters])

  const chosen = characters?.find(c => c.id === charId)
  if (error) return <p className="text-sm text-red-400">{error}</p>
  if (!characters || !events) return <Spinner />
  if (characters.length === 0) return <p className="text-sm text-[#6b7280]">Add a character on the Character Roster first.</p>
  return (
    <div className="space-y-4">
      <label className="flex flex-col gap-1 w-full md:w-96"><span className="forge-label">Character</span>
        <Select
          aria-label="Character" options={charOpts} isSearchable
          value={charOpts.find(o => o.value === charId) ?? null} onChange={o => setCharId(o?.value ?? null)}
          formatOptionLabel={o => { const c = characters.find(x => x.id === o.value); return c ? <CharacterOptionLabel c={c} /> : o.label }}
        />
      </label>
      {events.length === 0 && <p className="text-sm text-[#6b7280]">No upcoming events.</p>}
      {events.map(e => (
        <div key={e.id} className="forge-card space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <KindBadge kind={e.kind} />
            <StyleBadge style={eventStyle(e.data)} />
            <h2 className="text-base font-semibold text-[#e2e4ed]">{e.name}</h2>
            {e.locked && <span className="text-[10px] uppercase tracking-widest text-red-400">locked</span>}
            {e.cancelled && <CancelledBadge />}
            <span className="text-xs text-[#9ca3af] ml-auto">{formatWhen(e.starts_at)} &middot; {e.ruleset}{e.raid && <> &middot; {e.raid.name}</>}</span>
          </div>
          {e.notes && <p className="text-sm text-[#6b7280] whitespace-pre-wrap">{e.notes}</p>}
          {chosen && chosen.ruleset !== e.ruleset && !e.attendance.some(a => a.character.id === charId)
            ? <p className="text-sm text-[#6b7280]">{chosen.name} is on {chosen.ruleset}; this event is on {e.ruleset}.</p>
            : <SignupCard key={charId ?? ''} event={e} charId={charId} onChanged={() => refresh(e.id)} />}
          <div className="flex items-center gap-3 flex-wrap text-xs text-[#6b7280]">
            <span>{e.attendance.filter(a => ['signed', 'present', 'late'].includes(a.status)).length} signed up.</span>
            <CompositionLine wanted={eventComposition(e.data)} attendance={e.attendance} />
            {e.kind === 'raid' && <Link to={`/wow-forever/loot/${e.id}`} className="text-[#c4af64] hover:underline">Reserves &rarr;</Link>}
          </div>
        </div>
      ))}
    </div>
  )
}

export function Register() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#e2e4ed]">Event Registration</h1>
        <p className="text-sm text-[#6b7280]">Sign a character up for upcoming raids, PvP nights and other events. Raids need a sign-up before SR+ reserves.</p>
      </div>
      <WowfGate><Upcoming /></WowfGate>
    </div>
  )
}
