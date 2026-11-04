import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AuthContext, type AuthContextType } from '../../auth/authContext'
import type { ApiAvailability, ApiEvent, ApiEventDetail, ApiHeatmap } from './api'
import { Availability } from './Availability'
import { AvailabilityViewer } from './AvailabilityViewer'
import { Register } from './Register'
import { WowfSettings } from './WowfSettings'
import type { ApiCharacter } from './roster'

function ctx(leadership: boolean): AuthContextType {
  return {
    user: {
      id: 'u1', discord_id: 'd1', username: 'Jakob', avatar: null,
      guilds: { running_dawn: { is_member: true, roles: { wowf_member: true, wowf_leadership: leadership } } },
    },
    loading: false, isAuthenticated: true, login: vi.fn(), logout: vi.fn(),
  }
}

const fetchSpy = vi.fn()
globalThis.fetch = fetchSpy
const ok = (p: unknown) => new Response(JSON.stringify({ status: 'ok', message: '', payload: p }), { status: 200 })
const calls: { method: string; url: string; body?: Record<string, unknown> }[] = []

// Toronto (UTC-5 in November): Mon 20:00 local = UTC Monday + 25h.
// Only the week of Nov 2 is saved; every other requested week falls back to the default pattern.
function mine(url: string): ApiAvailability {
  const q = new URL(url).searchParams
  const start = Date.parse(`${q.get('start')}T00:00:00Z`)
  const weeks = Array.from({ length: Number(q.get('weeks')) }, (_, i) => {
    const week_start = new Date(start + i * 7 * 86400_000).toISOString().slice(0, 10)
    return week_start === '2026-11-02' ? { week_start, hours: [25], from_default: false } : { week_start, hours: [20], from_default: true }
  })
  return { tz: 'America/Toronto', default_hours: [20], weeks }
}
const heat: ApiHeatmap = {
  start: '2026-11-02', weeks: 6,
  users: [
    { user_id: 'u1', username: 'Jakob', nickname: 'Jak', role: 'Tank' },
    { user_id: 'u2', username: 'Pat', nickname: null, role: 'Healer' },
    { user_id: 'u3', username: 'Quiet', nickname: null, role: null },
  ],
  slots: { '2026-11-03T01:00:00Z': ['u1', 'u2'], '2026-11-04T02:00:00Z': ['u1'] },
}
const thrall: ApiCharacter = {
  id: 'c1', user_id: 'u1', name: 'Thrall', faction: 'Horde', race: 'Orc', class: 'Shaman', ruleset: 'PvP',
  level: 60, main_spec: null, off_spec: null, role: null, professions: [], is_main: true, position: 0, data: {}, updated_at: null,
}
const raid: ApiEvent = {
  id: 'e1', kind: 'raid', name: 'MC night', raid_id: 'r1', raid: { id: 'r1', name: 'Molten Core', short_name: 'MC' }, starts_at: '2026-11-07T20:00:00Z',
  duration_minutes: 180, ends_at: '2026-11-07T23:00:00Z', ruleset: 'PvP', cancelled: false, cancelled_at: null,
  reserve_limit: 2, locked: false, locked_at: null, notes: null, created_by: 'u9', data: {}, updated_at: null,
}
const pvp: ApiEvent = { ...raid, id: 'e2', kind: 'pvp', name: 'WSG premade', raid_id: null, raid: null, reserve_limit: 0, starts_at: '2026-11-06T01:00:00Z', ends_at: '2026-11-06T04:00:00Z' }
const old: ApiEvent = { ...pvp, id: 'e0', name: 'Old night', starts_at: '2026-10-01T01:00:00Z', ends_at: '2026-10-01T04:00:00Z' }
let details: Record<string, ApiEventDetail>

beforeEach(() => {
  vi.setSystemTime(new Date('2026-11-05T15:00:00Z'))
  calls.length = 0
  details = {
    e1: { ...raid, reserves: [], attendance: [], drops: [] },
    e2: { ...pvp, reserves: [], attendance: [], drops: [] },
    e0: { ...old, reserves: [], attendance: [], drops: [] },
  }
  fetchSpy.mockReset()
  fetchSpy.mockImplementation((url: string | URL, init?: RequestInit) => {
    const u = String(url)
    const path = u.split('?')[0]
    const method = init?.method ?? 'GET'
    const body = init?.body && typeof init.body === 'string' ? JSON.parse(init.body) : undefined
    calls.push({ method, url: u, body })
    if (path.endsWith('/availability/me')) return Promise.resolve(ok(mine(u)))
    if (path.endsWith('/availability/me/weeks')) return Promise.resolve(ok(body.weeks))
    if (path.endsWith('/availability/me/settings')) return Promise.resolve(ok({ tz: body.tz, default_hours: body.default_hours }))
    if (path.endsWith('/availability')) return Promise.resolve(ok(heat))
    if (path.endsWith('/characters')) return Promise.resolve(ok([thrall]))
    if (path.endsWith('/events')) return Promise.resolve(ok([raid, pvp, old]))
    if (path.endsWith('/signup')) {
      const d = details[path.split('/').slice(-2)[0]]
      d.attendance.push({ character: { id: 'c1', name: 'Thrall', class: 'Shaman', user_id: 'u1' }, status: 'signed', note: body.note })
      return Promise.resolve(ok({ ...d, added: 0 }))
    }
    if (path.endsWith('/withdraw')) {
      const d = details[path.split('/').slice(-2)[0]]
      d.attendance[0].status = 'withdrawn'
      return Promise.resolve(ok(d))
    }
    const d = details[path.split('/').pop()!]
    return Promise.resolve(ok(d ?? null))
  })
})
afterEach(() => vi.useRealTimers())

function renderIn(el: React.ReactElement, leadership = false) {
  return render(<AuthContext.Provider value={ctx(leadership)}><MemoryRouter>{el}</MemoryRouter></AuthContext.Provider>)
}
const cell = (name: string) => screen.getByRole('button', { name })

describe('Availability (member)', () => {
  it('shows saved hours in the saved timezone and saves painted cells as UTC offsets', async () => {
    const user = userEvent.setup()
    renderIn(<Availability />)
    await waitFor(() => expect(cell('Mon 20:00')).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.getByText(/Times shown in America\/Toronto/)).toBeInTheDocument()
    expect(cell('Save week')).toBeDisabled()

    await user.click(cell('Wed 21:00'))
    await user.click(cell('Save week'))
    expect(await screen.findByText('Week saved.')).toBeInTheDocument()
    expect(calls.find(c => c.url.endsWith('/availability/me/weeks'))!.body).toEqual({
      // Toronto's Sunday evening spills into the next UTC week, which is saved too (its default hour frozen in).
      weeks: [{ week_start: '2026-11-02', hours: [25, 74] }, { week_start: '2026-11-09', hours: [20] }],
    })
  })

  it('copies last week into a default-backed week and edits the default pattern', async () => {
    const user = userEvent.setup()
    renderIn(<Availability />)
    await waitFor(() => expect(cell('Mon 20:00')).toHaveAttribute('aria-pressed', 'true'))

    await user.click(cell('Week of Nov 9'))
    expect(screen.getByText(/Showing your default week/)).toBeInTheDocument()
    expect(cell('Mon 20:00')).toHaveAttribute('aria-pressed', 'false')
    await user.click(cell('Copy last week'))
    expect(cell('Mon 20:00')).toHaveAttribute('aria-pressed', 'true')
    await user.click(cell('Save week'))
    expect(await screen.findByText('Week saved.')).toBeInTheDocument()
    expect((calls.find(c => c.url.endsWith('/availability/me/weeks'))!.body as { weeks: unknown[] }).weeks).toContainEqual({ week_start: '2026-11-09', hours: [25] })
    expect(screen.queryByText(/Showing your default week/)).not.toBeInTheDocument()

    await user.click(cell('Default week'))
    expect(cell('Mon 20:00')).toHaveAttribute('aria-pressed', 'true')
    await user.click(cell('Mon 21:00'))
    await user.click(cell('Save default'))
    expect(await screen.findByText(/Default week saved/)).toBeInTheDocument()
    expect(calls.find(c => c.url.endsWith('/availability/me/settings'))!.body).toEqual({ tz: 'America/Toronto', default_hours: [20, 21] })
  })
})

describe('Availability Viewer (leadership)', () => {
  it('refuses members', async () => {
    renderIn(<AvailabilityViewer />, false)
    expect(await screen.findByText('Leadership only.')).toBeInTheDocument()
  })

  it('shows counts on hover and overlays picked people', async () => {
    const user = userEvent.setup()
    renderIn(<AvailabilityViewer />, true)
    await waitFor(() => expect(cell('Mon 20:00')).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.getByText(/Nothing entered yet: Quiet/)).toBeInTheDocument()

    await user.hover(cell('Mon 20:00'))
    const panel = screen.getByRole('complementary')
    expect(within(panel).getByText(/Mon 20:00 · 2 available/)).toBeInTheDocument()
    expect(within(panel).getByText('Jak')).toBeInTheDocument()
    expect(within(panel).getByText('Pat')).toBeInTheDocument()
    const tile = (label: string) => within(panel).getByText(label).parentElement!
    expect(tile('Tanks')).toHaveTextContent('Tanks1')
    expect(tile('Healers')).toHaveTextContent('Healers1')
    expect(tile('DPS')).toHaveTextContent('DPS0')
    expect(tile('No role')).toHaveTextContent('No role0')

    // Events show by default; the checkbox hides them.
    expect(cell('Sat 15:00')).toHaveAttribute('title', 'MC night')
    await user.click(screen.getByRole('checkbox', { name: 'Show events' }))
    expect(cell('Sat 15:00')).not.toHaveAttribute('title')
    await user.click(screen.getByRole('checkbox', { name: 'Show events' }))
    expect(cell('Sat 15:00')).toHaveAttribute('title', 'MC night')
    expect(cell('Sat 17:00')).toHaveAttribute('title', 'MC night')
    expect(cell('Sat 18:00')).not.toHaveAttribute('title')
    await user.hover(cell('Sat 15:00'))
    expect(within(panel).getByText('Event: MC night')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Pat' }))
    expect(cell('Mon 20:00')).toHaveStyle({ background: '#22c55e' })
    expect(cell('Tue 21:00')).toHaveAttribute('aria-pressed', 'false')
    await user.click(screen.getByRole('button', { name: 'Jak' }))
    expect(cell('Tue 21:00')).toHaveStyle({ background: '#d97706' })
  })
})

describe('Settings timezone', () => {
  it('saves the timezone, keeps the default week and updates the open viewer', async () => {
    const user = userEvent.setup()
    renderIn(<><WowfSettings /><AvailabilityViewer /></>, true)
    expect(await screen.findByText(/shown in America\/Toronto/)).toBeInTheDocument()
    const [settingsTz] = await screen.findAllByRole('combobox', { name: 'Timezone' })
    await user.click(settingsTz)
    await user.keyboard('London{Enter}')
    expect(await screen.findByText('Timezone saved.')).toBeInTheDocument()
    expect(calls.find(c => c.url.endsWith('/availability/me/settings'))!.body).toEqual({ tz: 'Europe/London', default_hours: [20] })
    expect(await screen.findByText(/shown in Europe\/London/)).toBeInTheDocument()
  })
})

describe('Event Registration (member)', () => {
  it('hands marked attendance back to leadership', async () => {
    details.e2.attendance.push({ character: { id: 'c1', name: 'Thrall', class: 'Shaman', user_id: 'u1' }, status: 'present', note: null })
    renderIn(<Register />)
    const card = (await screen.findByText('WSG premade')).closest('.forge-card') as HTMLElement
    expect(within(card).getByText(/Leadership marked you present\. Ask leadership/)).toBeInTheDocument()
    expect(within(card).queryByRole('button', { name: 'Leave this event' })).not.toBeInTheDocument()
    expect(within(card).queryByRole('button', { name: 'Sign up' })).not.toBeInTheDocument()
  })

  it('lists upcoming events only, signs up and leaves with a reason', async () => {
    const user = userEvent.setup()
    renderIn(<Register />)
    expect(await screen.findByText('WSG premade')).toBeInTheDocument()
    expect(screen.getByText('MC night')).toBeInTheDocument()
    expect(screen.queryByText('Old night')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Reserves/ })).toHaveAttribute('href', '/wow-forever/loot/e1')

    const card = screen.getByText('WSG premade').closest('.forge-card') as HTMLElement
    await user.click(within(card).getByRole('button', { name: 'Sign up' }))
    expect(await within(card).findByText('Signed up')).toBeInTheDocument()
    expect(calls.find(c => c.url.endsWith('/events/e2/signup'))!.body).toEqual({ character_id: 'c1', note: null })
    expect(within(card).getByText('1 signed up.')).toBeInTheDocument()

    await user.click(within(card).getByRole('button', { name: 'Leave this event' }))
    expect(within(card).getByRole('button', { name: 'Confirm leave' })).toBeDisabled()
    await user.type(within(card).getByLabelText('Leave reason'), 'work')
    await user.click(within(card).getByRole('button', { name: 'Confirm leave' }))
    expect(await within(card).findByText('Left this event')).toBeInTheDocument()
    expect(calls.find(c => c.url.endsWith('/events/e2/withdraw'))!.body).toEqual({ character_id: 'c1', reason: 'work' })
  })
})
