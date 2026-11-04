import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ConfirmButton } from '../../components/ConfirmButton'
import { Select, type SelectOption } from '../../components/Select'
import {
  createReserve, deleteReserve, getEvent, itemGroups, listCharacters, listRaids,
  type ApiEventDetail, type ApiRaid, type ApiReserve, type ItemOption, type ReserveCharacter,
} from './api'
import { useWowfAccess } from './access'
import { WowfGate } from './WowfGate'
import { formatWhen } from './eventTime'
import { CancelledBadge, DropRow, ItemOptionLabel, KindBadge, LootTable, ReserveGroups, Spinner, StyleBadge } from './eventUi'
import { CLASS_COLORS, eventStyle } from './roster'
import { SignupCard } from './SignupCard'

// Member view of one raid: sign up, own reserves in, everyone's reserves and attendance read-only.
function Detail({ eventId }: { eventId: string }) {
  const { userId } = useWowfAccess()
  const [event, setEvent] = useState<ApiEventDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [allChars, setAllChars] = useState<(ReserveCharacter & { ruleset: string; isMain: boolean })[]>([])
  const [raid, setRaid] = useState<ApiRaid | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [itemId, setItemId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const res = await getEvent(eventId)
    if (res.status === 'ok') setEvent(res.payload)
    else setError(res.message)
  }, [eventId])

  useEffect(() => { reload() }, [reload])
  useEffect(() => {
    listCharacters().then(res => {
      if (res.status !== 'ok') return
      setAllChars(res.payload.filter(c => !c.archived).map(c => ({ id: c.id, name: c.name, class: c.class, user_id: c.user_id, ruleset: c.ruleset, isMain: c.is_main })))
    })
  }, [])
  // The loot list for this event's raid, bosses in kill order.
  useEffect(() => {
    if (!event?.raid_id) return
    listRaids().then(res => {
      if (res.status === 'ok') setRaid(res.payload.find(r => r.id === event.raid_id) ?? null)
    })
  }, [event?.raid_id])

  async function run(action: () => Promise<{ status: string; message?: string }>, what: string) {
    setError(null)
    setNotice(null)
    const res = await action()
    if (res.status !== 'ok') setError(`${what} failed: ${res.message}`)
    await reload()
  }

  // Only characters on the event's realm can take part; default to the main there.
  const characters = useMemo(() => allChars.filter(c => c.ruleset === event?.ruleset), [allChars, event?.ruleset])
  const charId = characters.some(c => c.id === picked) ? picked : (characters.find(c => c.isMain) ?? characters[0])?.id ?? null
  const myClass = characters.find(c => c.id === charId)?.class
  const groups = useMemo(() => itemGroups(raid?.bosses ?? []), [raid])
  const allOptions = useMemo(() => groups.flatMap(g => g.options), [groups])
  const charOpts = useMemo<SelectOption[]>(() => characters.map(c => ({ value: c.id, label: c.name })), [characters])

  if (error && !event) return <p className="text-sm text-red-400">{error}</p>
  if (!event) return <Spinner />

  const started = Date.parse(event.starts_at) <= Date.now()
  const open = !event.locked && !started && event.reserve_limit > 0
  const myIds = new Set(characters.map(c => c.id))
  const mine = event.attendance.find(a => a.character.id === charId)
  const signed = !!mine && mine.status !== 'withdrawn'
  // Mirrors the server: once leadership marks attendance, reserves are theirs to change.
  const statusOf = (cid: string) => event.attendance.find(a => a.character.id === cid)?.status
  const recorded = signed && mine!.status !== 'signed'
  const used = (cid: string) => event.reserves.filter(r => r.character.id === cid).length
  const removeAction = (r: ApiReserve) => (
    myIds.has(r.character.id) && r.character.user_id === userId && open && statusOf(r.character.id) === 'signed' && r.outcome === 'reserved'
      ? <ConfirmButton label="Remove" ariaLabel={`Remove reserve ${r.character.name} ${r.item.name}`} confirmPrompt="Remove?" onConfirm={() => run(() => deleteReserve(r.id), 'Removing the reserve')} className="text-xs text-[#4b5563] hover:text-red-400" />
      : null
  )

  return (
    <div className="space-y-6">
      <Link to="/wow-forever/loot" className="text-xs text-[#6b7280] hover:text-[#c4af64]">&larr; All raids</Link>
      <div className="forge-card space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <KindBadge kind={event.kind} />
          <StyleBadge style={eventStyle(event.data)} />
          <h2 className="text-lg font-semibold text-[#e2e4ed]">{event.name}</h2>
          {event.locked && <span className="text-[10px] uppercase tracking-widest text-red-400">locked</span>}
          {event.cancelled && <CancelledBadge />}
        </div>
        <p className="text-sm text-[#9ca3af]">
          {formatWhen(event.starts_at)} &middot; {event.ruleset}{event.raid && <> &middot; {event.raid.name}</>} &middot; {event.reserve_limit} reserve{event.reserve_limit === 1 ? '' : 's'} per character
        </p>
        {event.notes && <p className="text-sm text-[#6b7280] whitespace-pre-wrap">{event.notes}</p>}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {notice && <p className="text-sm text-[#c4af64]">{notice}</p>}

      <section className="space-y-3">
        <h3 className="forge-label">Sign up</h3>
        {characters.length === 0 && <p className="text-sm text-[#6b7280]">{allChars.length ? `None of your characters are on ${event.ruleset}.` : 'Add a character on the Character Roster first.'}</p>}
        {characters.length > 0 && (
          <div className="forge-card space-y-3">
            <label className="flex flex-col gap-1 md:w-64"><span className="forge-label">Character</span>
              <Select aria-label="Character" options={charOpts} placeholder="Character" value={charOpts.find(o => o.value === charId) ?? null} onChange={o => setPicked(o?.value ?? null)} />
            </label>
            <SignupCard key={charId ?? ''} event={event} charId={charId} onChanged={reload} />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="forge-label">Your reserves</h3>
        {(!open || recorded) && characters.length > 0 && <p className="text-sm text-[#6b7280]">{event.locked ? 'Reserves are locked for this raid.' : started ? 'This raid has started; ask leadership to change reserves.' : recorded ? 'Leadership recorded your attendance; ask them to change reserves.' : 'No reserves for this raid.'}</p>}
        {open && !recorded && characters.length > 0 && !signed && <p className="text-sm text-[#6b7280]">Sign up above to place reserves.</p>}
        {open && !recorded && characters.length > 0 && signed && !event.raid_id && <p className="text-sm text-[#6b7280]">This event has no raid attached, so there is no loot list.</p>}
        {open && !recorded && characters.length > 0 && signed && event.raid_id && (
          <div className="forge-card space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[1.4fr_auto] gap-3 items-end">
              <label className="flex flex-col gap-1"><span className="forge-label">Item</span>
                <Select<false>
                  aria-label="Item"
                  options={groups as unknown as SelectOption[]}
                  placeholder={allOptions.length ? 'Item' : 'No loot entered for this raid yet'}
                  isSearchable
                  isOptionDisabled={o => (o as ItemOption).hardReserved || event.reserves.some(r => r.character.id === charId && r.item.id === o.value)}
                  value={allOptions.find(o => o.value === itemId) ?? null}
                  onChange={o => setItemId(o?.value ?? null)}
                  formatOptionLabel={o => <ItemOptionLabel option={o as ItemOption} myClass={myClass} />}
                />
              </label>
              <button type="button" disabled={!charId || !itemId || used(charId) >= event.reserve_limit} title={charId && used(charId) >= event.reserve_limit ? 'Reserve limit reached' : undefined}
                className="forge-btn-active cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={() => { run(() => createReserve(event.id, charId!, itemId!), 'Reserving'); setItemId(null) }}>
                Reserve
              </button>
            </div>
            {charId && used(charId) >= event.reserve_limit && <p className="text-xs text-[#9ca3af]">All {event.reserve_limit} reserves used; remove one to pick something else.</p>}
            <p className="text-[10px] text-[#4b5563]">Signing up copies your preset reserves; adjust them here for this raid only.{myClass && ' Items recommended for your class are outlined in gold.'}</p>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="forge-label">{raid ? 'Loot' : 'All reserves'}</h3>
        {raid && <p className="text-xs text-[#4b5563]">+X is the SR+ bonus: +10 per attended run of this raid with the same reserve kept. Items nobody reserved are a free roll.</p>}
        {raid
          ? <LootTable bosses={raid.bosses} reserves={event.reserves} renderActions={removeAction} />
          : <ReserveGroups reserves={event.reserves} renderActions={removeAction} />}
      </section>

      {event.drops.length > 0 && (
        <section className="space-y-3">
          <h3 className="forge-label">Drops</h3>
          <div className="forge-card py-3 space-y-2">
            {event.drops.map(d => <DropRow key={d.id} drop={d} />)}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="forge-label">Attendance</h3>
        <div className="forge-card py-3 space-y-1">
          {event.attendance.length === 0 && <p className="text-sm text-[#6b7280]">Nobody signed up yet.</p>}
          {event.attendance.map(a => (
            <div key={a.character.id} className={`flex items-center gap-3 text-sm ${a.status === 'withdrawn' ? 'opacity-60' : ''}`}>
              <span style={{ color: CLASS_COLORS[a.character.class] ?? '#e2e4ed' }}>{a.character.name}</span>
              <span className={`text-xs ${a.status === 'withdrawn' ? 'text-red-400' : 'text-[#6b7280]'}`}>{a.status}</span>
              {a.note && <span className="text-xs text-[#4b5563] truncate" title={a.note}>{a.note}</span>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export function LootEvent() {
  const { eventId = '' } = useParams()
  return (
    <div className="max-w-3xl space-y-6">
      <WowfGate>
        <Detail eventId={eventId} />
      </WowfGate>
    </div>
  )
}
