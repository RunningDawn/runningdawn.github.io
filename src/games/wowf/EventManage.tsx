import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ConfirmButton } from '../../components/ConfirmButton'
import { ConfirmDialogButton } from '../../components/ConfirmDialog'
import { Select, type SelectOption } from '../../components/Select'
import {
  bossOrder, createAdjustment, deleteAdjustment, deleteDrop, deleteEvent, deleteReserve, getEvent, getGuildRoster, listRaids, putAttendance,
  recordDrop, removeAttendance, setReserveOutcome, updateEvent,
  type ApiEventDetail, type ApiRaid, type EventBody, type ItemOption, type ReserveCharacter,
} from './api'
import { useWowfAccess } from './access'
import { EventForm } from './EventForm'
import { formatWhen } from './eventTime'
import { CancelledBadge, CompositionLine, DropRow, ItemOptionLabel, KindBadge, OutcomeTag, ReserveGroups, Spinner, StyleBadge } from './eventUi'
import { ATTENDANCE_STATUSES, CLASS_COLORS, RESERVE_OUTCOMES, eventComposition, eventStyle } from './roster'

const opt = (v: string): SelectOption => ({ value: v, label: v })
const fmtDuration = (m: number) => `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}`
const OUTCOME_OPTS = RESERVE_OUTCOMES.map(opt)
const STATUS_OPTS = ATTENDANCE_STATUSES.map(opt)

function bodyOf(e: ApiEventDetail): EventBody {
  return {
    kind: e.kind, name: e.name, starts_at: e.starts_at, duration_minutes: e.duration_minutes, ruleset: e.ruleset, raid_id: e.raid_id,
    reserve_limit: e.reserve_limit, notes: e.notes, locked: e.locked, cancelled: e.cancelled, data: e.data,
  }
}

// Manual corrections to a character's SR+ bonus on one of this event's reserves.
function Adjustments({ event, reload }: { event: ApiEventDetail; reload: () => Promise<void> }) {
  const [reserveId, setReserveId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const opts = useMemo<SelectOption[]>(() => event.reserves.map(r => ({ value: r.id, label: `${r.character.name} - ${r.item.name}` })), [event.reserves])
  const amt = Math.trunc(Number(amount))
  const valid = !!reserveId && Number.isFinite(amt) && amt !== 0 && Math.abs(amt) <= 100 && reason.trim().length > 0

  async function add() {
    const r = event.reserves.find(x => x.id === reserveId)
    if (!r) return
    setError(null)
    const res = await createAdjustment(event.id, { character_id: r.character.id, item_id: r.item.id, amount: amt, reason: reason.trim() })
    if (res.status !== 'ok') { setError(res.message); return }
    setReserveId(null); setAmount(''); setReason('')
    await reload()
  }

  async function remove(id: string) {
    setError(null)
    const res = await deleteAdjustment(id)
    if (res.status !== 'ok') setError(res.message)
    await reload()
  }

  return (
    <section className="space-y-3">
      <h3 className="forge-label">Bonus corrections</h3>
      <div className="forge-card space-y-3">
        <p className="text-xs text-[#6b7280]">Add or subtract SR+ bonus for a character's reserve. It carries into later raids while the reserve streak holds.</p>
        <div className="grid grid-cols-1 md:grid-cols-[2fr_6rem_2fr_auto] gap-3 items-end">
          <label className="flex flex-col gap-1"><span className="forge-label">Reserve</span>
            <Select aria-label="Corrected reserve" options={opts} placeholder={opts.length ? 'Reserve' : 'No reserves'} isSearchable value={opts.find(o => o.value === reserveId) ?? null} onChange={o => setReserveId(o?.value ?? null)} />
          </label>
          <label className="flex flex-col gap-1"><span className="forge-label">Amount</span>
            <input type="number" aria-label="Correction amount" placeholder="+10" value={amount} onChange={e => setAmount(e.target.value)} className="forge-input" />
          </label>
          <label className="flex flex-col gap-1"><span className="forge-label">Reason</span>
            <input type="text" aria-label="Correction reason" maxLength={500} value={reason} onChange={e => setReason(e.target.value)} className="forge-input" />
          </label>
          <button type="button" onClick={add} disabled={!valid} className="forge-btn-active cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">Add correction</button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {(event.adjustments ?? []).map(a => (
          <div key={a.id} className="flex items-center gap-3 text-sm border-t border-[#2a2d3a] pt-2">
            <span style={{ color: CLASS_COLORS[a.character.class] ?? '#e2e4ed' }}>{a.character.name}</span>
            <span className="text-[#9ca3af]">{a.item.name}</span>
            <span className={`text-xs ${a.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>{a.amount > 0 ? '+' : ''}{a.amount}</span>
            <span className="text-xs text-[#6b7280] truncate">{a.reason}</span>
            <ConfirmButton label="Remove" ariaLabel={`Remove correction ${a.character.name} ${a.item.name}`} confirmPrompt="Remove?" onConfirm={() => remove(a.id)} className="ml-auto text-xs text-[#4b5563] hover:text-red-400" />
          </div>
        ))}
      </div>
    </section>
  )
}

// Leadership view of one event: edit, add people, lock reserves, run attendance.
function Manage({ eventId }: { eventId: string }) {
  const navigate = useNavigate()
  const [event, setEvent] = useState<ApiEventDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [guild, setGuild] = useState<(ReserveCharacter & { ruleset: string })[]>([])
  const [marks, setMarks] = useState<Record<string, string>>({})
  const [raid, setRaid] = useState<ApiRaid | null>(null)
  const [bossId, setBossId] = useState<string | null>(null)
  const [itemId, setItemId] = useState<string | null>(null)
  const [winnerId, setWinnerId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const res = await getEvent(eventId)
    if (res.status !== 'ok') { setError(res.message); return }
    setEvent(res.payload)
    // marks = unsaved edits only; keep those that still differ from the server.
    setMarks(prev => Object.fromEntries(res.payload.attendance
      .filter(a => prev[a.character.id] !== undefined && prev[a.character.id] !== a.status)
      .map(a => [a.character.id, prev[a.character.id]])))
  }, [eventId])

  useEffect(() => { reload() }, [reload])
  useEffect(() => {
    if (!event?.raid_id) return
    listRaids().then(res => {
      if (res.status === 'ok') setRaid(res.payload.find(r => r.id === event.raid_id) ?? null)
    })
  }, [event?.raid_id])
  useEffect(() => {
    getGuildRoster().then(res => {
      if (res.status !== 'ok') return
      setGuild(res.payload.flatMap(m => m.characters.filter(c => !c.archived).map(c => ({
        id: c.id, name: `${c.name} (${m.nickname ?? m.username})`, class: c.class, user_id: c.user_id, ruleset: c.ruleset,
      }))))
    })
  }, [])

  async function run(action: () => Promise<{ status: string; message?: string }>, what: string) {
    setError(null)
    setNotice(null)
    const res = await action()
    if (res.status !== 'ok') setError(`${what} failed: ${res.message}`)
    await reload()
  }

  // One character per member, on the event's realm (the server enforces both).
  const addOpts = useMemo<SelectOption[]>(() => {
    const here = event?.attendance ?? []
    const chars = new Set(here.map(a => a.character.id))
    const members = new Set(here.filter(a => a.status !== 'withdrawn').map(a => a.character.user_id))
    return guild.filter(c => !chars.has(c.id) && !(c.user_id && members.has(c.user_id)) && c.ruleset === event?.ruleset).map(c => ({ value: c.id, label: c.name }))
  }, [guild, event])
  const bosses = useMemo(() => bossOrder(raid?.bosses ?? []).filter(b => b.items.length > 0), [raid])
  const bossOpts = useMemo<SelectOption[]>(() => bosses.map(b => ({ value: b.id, label: b.name })), [bosses])
  const itemOpts = useMemo<ItemOption[]>(() => (bosses.find(b => b.id === bossId)?.items ?? []).map(i => ({ value: i.id, label: i.name, classes: i.recommended_classes, image_url: i.image_url, bossNames: [], hardReserved: i.hard_reserved })), [bosses, bossId])
  const winnerOpts = useMemo<SelectOption[]>(() => (event?.attendance ?? []).filter(a => a.status !== 'withdrawn').map(a => ({ value: a.character.id, label: a.character.name })), [event])

  if (error && !event) return <p className="text-sm text-red-400">{error}</p>
  if (!event) return <Spinner />

  const dirty = event.attendance.some(a => (marks[a.character.id] ?? a.status) !== a.status)

  function addPerson(characterId: string) {
    run(() => putAttendance(event!.id, [{ character_id: characterId, status: 'signed' }]), 'Adding the person')
  }

  function award(characterId: string | null) {
    run(() => recordDrop(event!.id, itemId!, characterId, bossId ?? undefined), 'Recording the drop')
    setItemId(null)
    setWinnerId(null)
  }

  function saveAttendance() {
    const entries = event!.attendance
      .filter(a => (marks[a.character.id] ?? a.status) !== a.status)
      .map(a => ({ character_id: a.character.id, status: marks[a.character.id] }))
    run(async () => {
      const res = await putAttendance(event!.id, entries)
      if (res.status === 'ok') {
        setMarks({})
        setNotice(`Attendance saved for ${res.payload.applied} characters.`)
      }
      return res
    }, 'Saving attendance')
  }

  return (
    <div className="space-y-6">
      <Link to="/wow-forever/events" className="text-xs text-[#6b7280] hover:text-[#c4af64]">← All events</Link>
      <div className="forge-card space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <KindBadge kind={event.kind} />
          <StyleBadge style={eventStyle(event.data)} />
          <h2 className="text-lg font-semibold text-[#e2e4ed]">{event.name}</h2>
          {event.locked && <span className="text-[10px] uppercase tracking-widest text-red-400">locked</span>}
          {event.cancelled && <CancelledBadge />}
          <CompositionLine wanted={eventComposition(event.data)} attendance={event.attendance} />
          <span className="ml-auto flex items-center gap-3 text-xs">
            {event.kind === 'raid' && (
              <button type="button" onClick={() => run(() => updateEvent(event.id, { ...bodyOf(event), locked: !event.locked }), event.locked ? 'Unlocking' : 'Locking')} className="text-[#9ca3af] hover:text-[#c4af64] cursor-pointer">
                {event.locked ? 'Unlock reserves' : 'Lock reserves'}
              </button>
            )}
            <button type="button" onClick={() => run(() => updateEvent(event.id, { ...bodyOf(event), cancelled: !event.cancelled }), event.cancelled ? 'Uncancelling' : 'Cancelling')} className="text-[#9ca3af] hover:text-[#c4af64] cursor-pointer">
              {event.cancelled ? 'Uncancel' : 'Cancel event'}
            </button>
            <button type="button" onClick={() => setEditing(true)} className="text-[#9ca3af] hover:text-[#c4af64] cursor-pointer">Edit</button>
            {event.drops.length === 0 && (
              <ConfirmDialogButton label="Delete" title="Delete event" message={<>Delete <b className="text-[#e2e4ed]">{event.name}</b> with its reserves and attendance? This can't be undone.</>} className="text-xs text-[#6b7280] hover:text-red-400 cursor-pointer"
                onConfirm={async () => {
                  const res = await deleteEvent(event.id)
                  if (res.status === 'ok') navigate('/wow-forever/events')
                  else setError(`Deleting failed: ${res.message}`)
                }} />
            )}
          </span>
        </div>
        <p className="text-sm text-[#9ca3af]">
          {formatWhen(event.starts_at)} ({fmtDuration(event.duration_minutes)}) · {event.ruleset}{event.raid && <> · {event.raid.name}</>}{event.kind === 'raid' && <> · {event.reserve_limit} reserve{event.reserve_limit === 1 ? '' : 's'} per character</>}
        </p>
        {event.notes && <p className="text-sm text-[#6b7280] whitespace-pre-wrap">{event.notes}</p>}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {notice && <p className="text-sm text-[#c4af64]">{notice}</p>}

      <section className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="forge-label">People</h3>
          <div className="w-64 ml-auto">
            <Select aria-label="Add person" placeholder="Add person…" options={addOpts} value={null} isSearchable onChange={o => { if (o) addPerson(o.value) }} />
          </div>
        </div>
        <div className="forge-card space-y-2">
          {event.attendance.length === 0 && <p className="text-sm text-[#6b7280]">Nobody added yet. Add people, then mark attendance after the event.</p>}
          {event.attendance.map(a => (
            <div key={a.character.id} className={`flex items-center gap-3 text-sm ${a.status === 'withdrawn' ? 'opacity-60' : ''}`}>
              <span className="flex-1 truncate" style={{ color: CLASS_COLORS[a.character.class] ?? '#e2e4ed' }}>
                {a.character.name}
                {a.note && <span className="ml-2 text-xs text-[#6b7280]" title={a.note}>{a.note}</span>}
              </span>
              <div className="w-32">
                <Select aria-label={`Attendance ${a.character.name}`} options={STATUS_OPTS} value={opt(marks[a.character.id] ?? a.status)} onChange={o => o && setMarks(m => ({ ...m, [a.character.id]: o.value }))} />
              </div>
              <ConfirmButton label="Remove" ariaLabel={`Remove ${a.character.name} from event`} confirmPrompt="Remove?" onConfirm={() => run(() => removeAttendance(event.id, a.character.id), 'Removing the person')} className="text-xs text-[#4b5563] hover:text-red-400" />
            </div>
          ))}
          {event.attendance.length > 0 && (
            <button type="button" onClick={saveAttendance} disabled={!dirty} className="forge-btn-active cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">Save attendance</button>
          )}
        </div>
      </section>

      {event.kind === 'raid' && (
        <section className="space-y-3">
          <h3 className="forge-label">Loot drops</h3>
          <div className="forge-card space-y-3">
            {bosses.length === 0 && <p className="text-sm text-[#6b7280]">No loot entered for this raid yet.</p>}
            {bosses.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-3">
                <label className="flex flex-col gap-1"><span className="forge-label">Boss</span>
                  <Select aria-label="Boss" options={bossOpts} placeholder="Boss" value={bossOpts.find(o => o.value === bossId) ?? null} onChange={o => { setBossId(o?.value ?? null); setItemId(null) }} />
                </label>
                <label className="flex flex-col gap-1"><span className="forge-label">Dropped</span>
                  <Select<false> aria-label="Dropped item" options={itemOpts as unknown as SelectOption[]} placeholder={bossId ? 'Item' : 'Pick a boss first'} isSearchable isDisabled={!bossId}
                    value={itemOpts.find(o => o.value === itemId) ?? null} onChange={o => { setItemId(o?.value ?? null); setWinnerId(null) }}
                    formatOptionLabel={o => <ItemOptionLabel option={o as ItemOption} />} />
                </label>
              </div>
            )}
            {itemId && (() => {
              const reservers = event.reserves.filter(r => r.item.id === itemId).sort((a, b) => b.plus - a.plus)
              return (
                <div className="space-y-2 border-t border-[#2a2d3a] pt-3">
                  {reservers.length > 0
                    ? reservers.map(r => (
                      <div key={r.id} className="flex items-center gap-3 text-sm">
                        <span style={{ color: CLASS_COLORS[r.character.class] ?? '#e2e4ed' }}>{r.character.name}</span>
                        <span className="text-xs text-[#c4af64]">+{r.plus}</span>
                        {r.outcome !== 'reserved' && <OutcomeTag outcome={r.outcome} />}
                        <button type="button" onClick={() => award(r.character.id)} aria-label={`Won ${r.character.name}`} className="ml-auto forge-btn-active cursor-pointer text-xs">Won</button>
                      </div>
                    ))
                    : (
                      <div className="flex items-end gap-3 flex-wrap">
                        <p className="text-xs text-[#6b7280] pb-2">{itemOpts.find(o => o.value === itemId)?.hardReserved ? 'Guild hard reserve: give it to a character.' : 'Free roll: nobody reserved this.'}</p>
                        <div className="w-56"><Select aria-label="Winner" options={winnerOpts} placeholder="Winner" isSearchable value={winnerOpts.find(o => o.value === winnerId) ?? null} onChange={o => setWinnerId(o?.value ?? null)} /></div>
                        <button type="button" disabled={!winnerId} onClick={() => award(winnerId)} className="forge-btn-active cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">Record</button>
                      </div>
                    )}
                  <button type="button" onClick={() => award(null)} className="text-xs text-[#6b7280] hover:text-[#e2e4ed] cursor-pointer">Nobody / disenchanted</button>
                </div>
              )
            })()}
            {event.drops.length > 0 && (
              <div className="space-y-2 border-t border-[#2a2d3a] pt-3">
                {event.drops.map(d => (
                  <DropRow key={d.id} drop={d}>
                    <ConfirmButton label="Remove" ariaLabel={`Remove drop ${d.item.name}`} confirmPrompt="Remove?" onConfirm={() => run(() => deleteDrop(d.id), 'Removing the drop')} className="ml-auto text-xs text-[#4b5563] hover:text-red-400" />
                  </DropRow>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {event.kind === 'raid' && (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="forge-label">Reserves</h3>
            <Link to={`/wow-forever/loot/${event.id}`} className="ml-auto text-xs text-[#6b7280] hover:text-[#c4af64]">Loot by boss →</Link>
            <Link to={`/wow-forever/sr-admin?event=${event.id}`} className="text-xs text-[#6b7280] hover:text-[#c4af64]">Open in SR+ Admin →</Link>
          </div>
          <ReserveGroups reserves={event.reserves} renderActions={r => (
            <>
              <div className="w-32"><Select aria-label={`Outcome for ${r.character.name}`} options={OUTCOME_OPTS} value={opt(r.outcome)} onChange={o => o && run(() => setReserveOutcome(r.id, o.value), 'Setting the outcome')} /></div>
              <ConfirmButton label="Remove" ariaLabel={`Remove reserve ${r.character.name} ${r.item.name}`} confirmPrompt="Remove?" onConfirm={() => run(() => deleteReserve(r.id), 'Removing the reserve')} className="ml-auto text-xs text-[#4b5563] hover:text-red-400" />
            </>
          )} />
        </section>
      )}

      {event.kind === 'raid' && <Adjustments event={event} reload={reload} />}

      {editing && (
        <EventForm initial={bodyOf(event)} onClose={() => setEditing(false)}
          onSave={async body => {
            const res = await updateEvent(event.id, body)
            if (res.status !== 'ok') return res.message
            setEditing(false)
            await reload()
            return null
          }} />
      )}
    </div>
  )
}

export function EventManage() {
  const { eventId = '' } = useParams()
  const { leadership } = useWowfAccess()
  return (
    <div className="max-w-3xl space-y-6">
        {leadership ? <Manage eventId={eventId} /> : <p className="text-sm text-red-400">This page is for WoW guild leadership.</p>}
    </div>
  )
}
