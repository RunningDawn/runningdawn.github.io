import { useEffect, useState } from 'react'
import { Modal } from '../../components/Modal'
import { Select, type SelectOption } from '../../components/Select'
import { getAvailabilityWindow, listRaids, type EventBody } from './api'
import { BUCKETS, BUCKET_LABELS, EVENT_KINDS, EVENT_STYLES, MAX_RESERVE_LIMIT, RULESETS, eventComposition, eventStyle, roleCounts, roleSummary, type Composition } from './roster'

const opts = (list: readonly string[]): SelectOption[] => list.map(v => ({ value: v, label: v }))
const KIND_OPTS = opts(EVENT_KINDS)
const STYLE_OPTS = opts(EVENT_STYLES)
const REALM_OPTS = opts(RULESETS)
const HOUR_OPTS: SelectOption[] = Array.from({ length: 13 }, (_, h) => ({ value: String(h), label: `${h} h` }))
const MIN_OPTS: SelectOption[] = [0, 15, 30, 45].map(m => ({ value: String(m), label: `${m} min` }))
const MAX_MINUTES = 720
const NONE: Composition = { tank: 0, healer: 0, dps: 0 }

// <input type="datetime-local"> wants local wall time without a zone.
function toLocalInput(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date(Date.now() + 3600_000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="forge-label">{label}</span>
      {children}
    </label>
  )
}

interface Props {
  initial: EventBody | null
  onSave: (body: EventBody) => Promise<string | null>
  onClose: () => void
}

export function EventForm({ initial, onSave, onClose }: Props) {
  const [kind, setKind] = useState(initial?.kind ?? 'raid')
  const [realm, setRealm] = useState(initial?.ruleset ?? 'PvP')
  const [name, setName] = useState(initial?.name ?? '')
  const [raidId, setRaidId] = useState<string | null>(initial?.raid_id ?? null)
  const [raidOpts, setRaidOpts] = useState<SelectOption[]>([])
  const [when, setWhen] = useState(toLocalInput(initial?.starts_at ?? null))
  const [limit, setLimit] = useState(initial?.reserve_limit ?? 2)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [style, setStyle] = useState(eventStyle(initial?.data ?? {}))
  const [comp, setComp] = useState(eventComposition(initial?.data ?? {}) ?? NONE)
  // No default duration: leadership has to choose one.
  const [hours, setHours] = useState<number | null>(initial ? Math.floor(initial.duration_minutes / 60) : null)
  const [mins, setMins] = useState<number | null>(initial ? initial.duration_minutes % 60 : null)
  const [cancelled, setCancelled] = useState(initial?.cancelled ?? false)
  const [free, setFree] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const duration = (hours ?? 0) * 60 + (mins ?? 0)
  const durationOk = duration >= 15 && duration <= MAX_MINUTES

  // Who on the event's realm is free for the whole event and at its start.
  useEffect(() => {
    const t = Date.parse(when)
    if (Number.isNaN(t) || !durationOk) { setFree(null); return }
    let live = true
    getAvailabilityWindow(new Date(t).toISOString(), duration, realm).then(res => {
      if (!live) return
      if (res.status !== 'ok' || !res.payload?.hours) { setFree(null); return }
      const roles = new Map(res.payload.users.map(u => [u.user_id, u.role]))
      const atStart = res.payload.hours[0]?.user_ids.length ?? 0
      setFree(`${res.payload.free_all.length} free for the whole event, ${atStart} at the start: ${roleSummary(roleCounts(res.payload.free_all.map(id => roles.get(id))), res.payload.free_all.length)}.`)
    })
    return () => { live = false }
  }, [when, duration, durationOk, realm])

  useEffect(() => {
    listRaids(true).then(res => {
      if (res.status === 'ok') setRaidOpts(res.payload.map(r => ({ value: r.id, label: `${r.name} (${r.short_name})` })))
    })
  }, [])

  const canSave = name.trim().length > 0 && !Number.isNaN(Date.parse(when)) && durationOk

  async function save() {
    setSaveError(null)
    const failed = await onSave({
      kind,
      name: name.trim(),
      raid_id: kind === 'raid' ? raidId : null,
      starts_at: new Date(when).toISOString(),
      duration_minutes: duration,
      ruleset: realm,
      reserve_limit: kind === 'raid' ? limit : 0,
      notes: notes.trim() || null,
      locked: initial?.locked ?? false,
      cancelled,
      data: {
        ...initial?.data,
        style: style ?? undefined,
        composition: comp.tank + comp.healer + comp.dps > 0 ? comp : undefined,
      },
    })
    if (failed) setSaveError(failed)
  }

  return (
    <Modal open onClose={onClose} title={initial ? 'Edit event' : 'New event'} maxWidth="max-w-xl">
      <div className="px-5 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kind">
            <Select aria-label="Kind" options={KIND_OPTS} value={KIND_OPTS.find(o => o.value === kind) ?? null} onChange={o => o && setKind(o.value)} />
          </Field>
          <Field label="Starts">
            <input type="datetime-local" aria-label="Starts" value={when} onChange={e => setWhen(e.target.value)} className="forge-input" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Duration (hours)">
            <Select aria-label="Duration hours" options={HOUR_OPTS} placeholder="Hours" value={HOUR_OPTS.find(o => o.value === String(hours)) ?? null}
              onChange={o => { if (!o) return; setHours(Number(o.value)); if (Number(o.value) === 12) setMins(0) }} />
          </Field>
          <Field label="Duration (minutes)">
            <Select aria-label="Duration minutes" options={MIN_OPTS} placeholder="Minutes" value={MIN_OPTS.find(o => o.value === String(mins)) ?? null}
              isOptionDisabled={o => hours === 12 && o.value !== '0'} onChange={o => o && setMins(Number(o.value))} />
          </Field>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label="Name">
            <input type="text" aria-label="Event name" placeholder="MC full clear" value={name} onChange={e => setName(e.target.value)} className="forge-input" autoFocus />
          </Field>
          <Field label="Realm">
            <Select aria-label="Realm" options={REALM_OPTS} value={REALM_OPTS.find(o => o.value === realm) ?? null} onChange={o => o && setRealm(o.value)} />
          </Field>
        </div>
        {kind === 'raid' && (
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <Field label="Raid">
              <Select aria-label="Raid" options={raidOpts} placeholder="Raid" isClearable value={raidOpts.find(o => o.value === raidId) ?? null} onChange={o => setRaidId(o?.value ?? null)} />
            </Field>
            <Field label={`Reserves per character (0-${MAX_RESERVE_LIMIT})`}>
              <input type="number" inputMode="numeric" min={0} max={MAX_RESERVE_LIMIT} aria-label="Reserve limit" value={limit}
                onChange={e => setLimit(Math.min(MAX_RESERVE_LIMIT, Math.max(0, Math.floor(Number(e.target.value)) || 0)))} className="forge-input w-28" />
            </Field>
          </div>
        )}
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label="Style">
            <Select aria-label="Style" options={STYLE_OPTS} placeholder="Unspecified" isClearable value={STYLE_OPTS.find(o => o.value === style) ?? null} onChange={o => setStyle(o?.value ?? null)} />
          </Field>
          <div className="flex flex-col gap-1">
            <span className="forge-label">Composition wanted</span>
            <div className="flex gap-2">
              {BUCKETS.map(b => (
                <input key={b} type="number" inputMode="numeric" min={0} max={40} aria-label={`${BUCKET_LABELS[b]} wanted`} placeholder={BUCKET_LABELS[b]} title={BUCKET_LABELS[b]}
                  value={comp[b] || ''} onChange={e => setComp(c => ({ ...c, [b]: Math.min(40, Math.max(0, Math.floor(Number(e.target.value)) || 0)) }))} className="forge-input w-20" />
              ))}
            </div>
          </div>
        </div>
        {free && <p className="text-xs text-[#6b7280]">{free}</p>}
        <Field label="Notes">
          <textarea aria-label="Notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="forge-input" />
        </Field>
        {initial && (
          <label className="flex items-center gap-2 text-sm text-[#9ca3af] cursor-pointer">
            <input type="checkbox" aria-label="Cancelled" checked={cancelled} onChange={e => setCancelled(e.target.checked)} /> Cancelled (hidden from members, kept for history)
          </label>
        )}
        {saveError && <p className="text-sm text-red-400">{saveError}</p>}
        <div className="flex justify-end gap-2 pt-2 border-t border-[#2a2d3a]">
          <button type="button" onClick={onClose} className="forge-btn cursor-pointer">Cancel</button>
          <button type="button" onClick={save} disabled={!canSave} className="forge-btn-active cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            {initial ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
