import { useEffect, useState } from 'react'
import { getMyAvailability, putAvailabilitySettings } from './api'
import { useWowfAccess } from './access'
import { TimezoneSelect } from './TimezoneSelect'
import { announceTz, browserTz, isoDate, utcMonday } from './weekTime'

export function WowfSettings() {
  const { ok } = useWowfAccess()
  const [tz, setTz] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ok) return
    getMyAvailability(isoDate(utcMonday(new Date())), 1).then(res => {
      if (res.status !== 'ok') { setError(res.message); return }
      setTz(res.payload.tz ?? browserTz())
    })
  }, [ok])

  async function change(next: string) {
    setNotice(null)
    setError(null)
    // Re-read the default week first so a stale copy never overwrites it.
    const current = await getMyAvailability(isoDate(utcMonday(new Date())), 1)
    if (current.status !== 'ok') { setError(`Saving failed: ${current.message}`); return }
    const res = await putAvailabilitySettings(next, current.payload.default_hours ?? null)
    if (res.status !== 'ok') { setError(`Saving failed: ${res.message}`); return }
    setTz(next)
    announceTz(next)
    setNotice('Timezone saved.')
  }

  if (!ok) return <p className="px-5 py-4 text-sm text-[#6b7280]">Sign in as a guild member to change settings.</p>
  return (
    <div className="px-5 py-4 space-y-2">
      <label className="flex flex-col gap-1"><span className="forge-label">Timezone</span>
        {tz ? <TimezoneSelect value={tz} onChange={change} /> : <span className="text-sm text-[#6b7280]">{error ?? 'Loading…'}</span>}
      </label>
      <p className="text-xs text-[#6b7280]">Used for your Availability grid and the Availability Viewer. Saved times stay put; only how they're shown changes.</p>
      {notice && <p className="text-xs text-[#c4af64]">{notice}</p>}
      {tz && error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
