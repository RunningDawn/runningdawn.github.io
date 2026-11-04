import { useState } from 'react'
import { signUp, withdraw, type ApiEventDetail } from './api'

const AREA = 'bg-[#1a1d27] border border-[#2a2d3a] text-[#e2e4ed] rounded px-3 py-1.5 text-sm w-full focus:outline-none focus:border-[#c4af64] placeholder-[#6b7280]'

interface Props {
  event: ApiEventDetail
  charId: string | null
  onChanged: () => void | Promise<void>
}

// Sign-up status and actions for one character on one event. Mount with key={charId} so drafts reset.
export function SignupCard({ event, charId, onChanged }: Props) {
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const word = event.kind === 'raid' ? 'raid' : 'event'
  const mine = event.attendance.find(a => a.character.id === charId)
  const signed = !!mine && mine.status !== 'withdrawn'
  // Mirrors the server: members can't change anything once it starts or leadership marks attendance.
  const started = Date.parse(event.starts_at) <= Date.now()
  const recorded = !!mine && mine.status !== 'signed' && mine.status !== 'withdrawn'
  const closed = event.locked || started || recorded

  async function doSignUp() {
    setError(null)
    const res = await signUp(event.id, charId!, note.trim() || null)
    if (res.status !== 'ok') { setError(`Signing up failed: ${res.message}`); return }
    const n = res.payload.added
    setNotice(n > 0 ? `Signed up. ${n} preset reserve${n === 1 ? '' : 's'} copied in.` : 'Signed up.')
    setNote('')
    await onChanged()
  }

  async function doLeave() {
    setError(null)
    setNotice(null)
    const res = await withdraw(event.id, charId!, reason.trim())
    if (res.status !== 'ok') { setError(`Leaving failed: ${res.message}`); return }
    setLeaving(false)
    setReason('')
    await onChanged()
  }

  return (
    <div className="space-y-3">
      {mine
        ? (
          <p className="text-sm text-[#9ca3af]">
            {signed ? 'Signed up' : `Left this ${word}`} <span className="text-xs text-[#6b7280]">({mine.status})</span>
            {mine.note && <span className="block text-xs text-[#6b7280] whitespace-pre-wrap">{mine.note}</span>}
          </p>
        )
        : <p className="text-sm text-[#6b7280]">Not signed up.</p>}
      {closed && (
        <p className="text-sm text-[#6b7280]">
          {event.locked ? `Sign-ups are locked for this ${word}.` : recorded ? `Leadership marked you ${mine!.status}.` : `This ${word} has started.`}
          {' '}Ask leadership if something needs changing.
        </p>
      )}
      {!closed && !signed && (
        <div className="flex gap-3 items-end flex-wrap">
          <label className="flex flex-col gap-1 flex-1 min-w-48"><span className="forge-label">Note (optional)</span>
            <textarea aria-label="Sign-up note" value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={500} placeholder="Late by 10 min, bringing consumables..." className={AREA} />
          </label>
          <button type="button" disabled={!charId} onClick={doSignUp} className="forge-btn-active cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">Sign up</button>
        </div>
      )}
      {!closed && signed && !leaving && (
        <button type="button" onClick={() => setLeaving(true)} className="text-xs text-[#6b7280] hover:text-red-400 cursor-pointer">Leave this {word}</button>
      )}
      {!closed && signed && leaving && (
        <div className="flex gap-3 items-end flex-wrap">
          <label className="flex flex-col gap-1 flex-1 min-w-48"><span className="forge-label">Reason (required)</span>
            <textarea aria-label="Leave reason" value={reason} onChange={e => setReason(e.target.value)} rows={2} maxLength={500} placeholder="Why you cannot make it" className={AREA} />
          </label>
          <button type="button" onClick={() => { setLeaving(false); setReason('') }} className="forge-btn cursor-pointer">Back</button>
          <button type="button" disabled={!reason.trim()} onClick={doLeave} className="px-3 py-1.5 rounded text-sm font-medium text-white bg-red-600/80 hover:bg-red-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">Confirm leave</button>
        </div>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {notice && <p className="text-sm text-[#c4af64]">{notice}</p>}
    </div>
  )
}
