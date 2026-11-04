import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Modal } from '../../components/Modal'
import { characterHistory, type ApiHistoryEntry } from './api'
import type { WowfCharacter } from './roster'

// Reserve history for one character, loaded when opened.
export function HistoryButton({ char }: { char: WowfCharacter }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-[#4b5563] hover:text-[#c4af64] cursor-pointer">History</button>
      {open && <HistoryModal char={char} onClose={() => setOpen(false)} />}
    </>
  )
}

function HistoryModal({ char, onClose }: { char: WowfCharacter; onClose: () => void }) {
  const [rows, setRows] = useState<ApiHistoryEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    characterHistory(char.id).then(res => {
      if (cancelled) return
      if (res.status === 'ok') setRows(res.payload)
      else setError(res.message)
    })
    return () => { cancelled = true }
  }, [char.id])

  const won = rows?.filter(r => r.outcome === 'won').length ?? 0

  return (
    <Modal open onClose={onClose} title={`${char.name} reserve history`} maxWidth="max-w-xl">
      <div className="px-5 py-4 space-y-2">
        {error && <p className="text-sm text-red-400">{error}</p>}
        {rows === null && !error && <p className="text-sm text-[#6b7280]">Loading…</p>}
        {rows && rows.length === 0 && <p className="text-sm text-[#6b7280]">No reserves yet.</p>}
        {rows && rows.length > 0 && (
          <>
            <p className="text-xs text-[#6b7280]">{rows.length} reserves, {won} won.</p>
            {rows.map(r => (
              <div key={r.id} className="flex items-center gap-3 text-sm border-t border-[#2a2d3a] pt-2">
                <Link to={`/wow-forever/loot/${r.event.id}`} onClick={onClose} className="w-40 shrink-0 text-xs text-[#9ca3af] hover:text-[#c4af64] truncate">
                  {r.event.starts_at ? new Date(r.event.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} {r.event.name}
                </Link>
                <span className="flex-1 text-[#e2e4ed] truncate">{r.item.name}</span>
                <span className="text-xs text-[#c4af64]">+{r.plus}</span>
                <span className={`text-xs ${r.outcome === 'won' ? 'text-green-400' : 'text-[#6b7280]'}`}>{r.outcome}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </Modal>
  )
}
