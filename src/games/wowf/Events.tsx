import { useCallback, useEffect, useState } from 'react'
import { createEvent, listEvents, type ApiEvent, type EventBody } from './api'
import { useWowfAccess } from './access'
import { WowfGate } from './WowfGate'
import { EventForm } from './EventForm'
import { EventList } from './EventList'
import { Spinner } from './eventUi'

// Leadership: every event (raids, PvP, other) with the creation modal.
function Manager() {
  const [events, setEvents] = useState<ApiEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const reload = useCallback(async () => {
    const res = await listEvents()
    if (res.status === 'ok') setEvents(res.payload)
    else setError(res.message)
  }, [])

  useEffect(() => { reload() }, [reload])

  async function create(body: EventBody) {
    const res = await createEvent(body)
    if (res.status !== 'ok') return res.message
    setCreating(false)
    await reload()
    return null
  }

  if (error && !events) return <p className="text-sm text-red-400">{error}</p>
  if (!events) return <Spinner />

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="button" onClick={() => setCreating(true)} className="forge-btn-active cursor-pointer">+ New event</button>
      <EventList events={events} linkBase="/wow-forever/events" emptyText="Nothing scheduled." />
      {creating && <EventForm initial={null} onSave={create} onClose={() => setCreating(false)} />}
    </div>
  )
}

export function Events() {
  const { leadership } = useWowfAccess()
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#e2e4ed]">Events</h1>
        <p className="text-sm text-[#6b7280]">Raid nights, PvP sessions and anything else the guild runs. Leadership only.</p>
      </div>
      <WowfGate>
        {leadership ? <Manager /> : <p className="text-sm text-red-400">This page is for WoW guild leadership.</p>}
      </WowfGate>
    </div>
  )
}
