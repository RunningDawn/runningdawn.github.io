import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AuthContext, type AuthContextType } from '../../auth/authContext'
import type { ApiAudit, ApiDrop, ApiEvent, ApiEventDetail, ApiItem, ApiRaid, ApiReserveWithEvent, GuildRosterEntry } from './api'
import { AuditLog } from './AuditLog'
import { EventManage } from './EventManage'
import { Events } from './Events'
import { Loot } from './Loot'
import { LootEvent } from './LootEvent'
import { LootHistory } from './LootHistory'
import { Raids } from './Raids'
import { SrAdmin } from './SrAdmin'
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

const mc = { id: 'r1', name: 'Molten Core', short_name: 'MC' }
const raid: ApiEvent = {
  id: 'e1', kind: 'raid', name: 'MC night', raid_id: 'r1', raid: mc, starts_at: '2099-11-07T20:00:00Z',
  duration_minutes: 180, ends_at: '2099-11-07T23:00:00Z', ruleset: 'PvP', cancelled: false, cancelled_at: null,
  reserve_limit: 2, locked: false, locked_at: null, notes: null, created_by: 'u9', data: {}, updated_at: null,
}
const pvp: ApiEvent = { ...raid, id: 'e2', kind: 'pvp', name: 'WSG premade', raid_id: null, raid: null, reserve_limit: 0 }
const item: ApiItem = {
  id: 'i1', name: 'Sulfuras', slot: 'Two-Hand', recommended_classes: ['Warrior'], image_url: null,
  notes: null, updated_at: null, hard_reserved: false, hard_reserve_note: null,
  bosses: [{ id: 'b1', name: 'Ragnaros', is_trash: false, position: 0, raid: mc }],
}
const mine: ApiCharacter = {
  id: 'c1', user_id: 'u1', name: 'Thrall', faction: 'Horde', race: 'Orc', class: 'Shaman', ruleset: 'PvP',
  level: 60, main_spec: null, off_spec: null, role: null, professions: [], is_main: true, position: 0, data: {}, updated_at: null,
}
const guild: GuildRosterEntry[] = [
  { user_id: 'u1', username: 'Jakob', discord_username: 'jakob', nickname: 'Jak', avatar: null, is_member: true, has_role: true, characters: [mine] },
  { user_id: 'u2', username: 'Pat', discord_username: 'pat', nickname: null, avatar: null, is_member: true, has_role: true,
    characters: [{ ...mine, id: 'c2', user_id: 'u2', name: 'Jaina', class: 'Mage' }] },
]

let detail: ApiEventDetail
let raids: ApiRaid[]
let all: ApiReserveWithEvent[]
let presets: ApiItem[]
let audit: ApiAudit[]
const calls: { method: string; url: string; body?: Record<string, unknown> }[] = []

beforeEach(() => {
  calls.length = 0
  detail = { ...raid, reserves: [], attendance: [], drops: [] }
  raids = [{
    ...mc, position: 1, active: true, bosses: [
      { id: 'b1', raid_id: 'r1', name: 'Ragnaros', position: 0, is_trash: false, items: [item] },
      { id: 'b0', raid_id: 'r1', name: 'Trash', position: 999, is_trash: true, items: [] },
    ],
  }]
  all = []
  presets = []
  audit = []
  fetchSpy.mockReset()
  fetchSpy.mockImplementation((url: string | URL, init?: RequestInit) => {
    const u = String(url)
    const path = u.split('?')[0]
    const method = init?.method ?? 'GET'
    const body = init?.body && typeof init.body === 'string' ? JSON.parse(init.body) : undefined
    calls.push({ method, url: u, body })
    if (path.endsWith('/events') && method === 'GET') return Promise.resolve(ok([raid, pvp]))
    if (path.endsWith('/events') && method === 'POST') return Promise.resolve(ok({ ...raid, id: 'e3', ...body }))
    if (path.endsWith('/availability/window')) return Promise.resolve(ok({ users: [{ user_id: 'u1', username: 'Jakob', nickname: null, role: 'Tank' }], hours: [{ at: '2099-11-07T20:00:00Z', user_ids: ['u1'] }], free_all: ['u1'] }))
    if (path.endsWith('/events/e1/adjustments') && method === 'POST') {
      const r = detail.reserves.find(x => x.character.id === body.character_id && x.item.id === body.item_id)!
      const a = { id: 'a1', event_id: 'e1', character: r.character, item: { id: r.item.id, name: r.item.name }, amount: body.amount, reason: body.reason, created_at: null }
      detail.adjustments = [...(detail.adjustments ?? []), a]
      r.plus += body.amount
      return Promise.resolve(ok(a))
    }
    if (path.endsWith('/adjustments/a1') && method === 'DELETE') {
      detail.adjustments = []
      return Promise.resolve(ok(null))
    }
    if (path.endsWith('/audit/facets')) {
      return Promise.resolve(ok({ actions: ['item.create', 'item.update'], target_types: ['item', 'raid'], actors: [{ id: 'u1', username: 'Jakob' }] }))
    }
    if (path.endsWith('/audit')) {
      const q = new URL(u, 'http://x').searchParams
      const has = (k: string, v: string) => !q.get(k) || q.get(k) === v
      const rows = audit.filter(a => (!q.get('before') || a.created_at < q.get('before')!) && has('target_type', a.target_type)
        && has('action', a.action) && has('target_id', a.target_id ?? '') && (!q.get('q') || JSON.stringify(a).toLowerCase().includes(q.get('q')!.toLowerCase())))
      return Promise.resolve(ok(rows.slice(0, Number(q.get('limit') ?? 100))))
    }
    if (path.endsWith('/events/e1/reserves')) {
      const r = { id: 'r1', event_id: 'e1', character: { id: 'c1', name: 'Thrall', class: 'Shaman', user_id: 'u1' }, item, plus: 1, outcome: 'reserved', created_by: 'u1', created_at: null }
      detail.reserves.push(r)
      all.push({ ...r, event: { id: 'e1', name: 'MC night', kind: 'raid', starts_at: raid.starts_at, locked: false } })
      return Promise.resolve(ok(r))
    }
    if (path.endsWith('/events/e1/attendance') && method === 'PUT') {
      for (const e of body.entries) {
        const c = guild.flatMap(g => g.characters).find(c => c.id === e.character_id)!
        const existing = detail.attendance.find(a => a.character.id === c.id)
        if (existing) existing.status = e.status
        else detail.attendance.push({ character: { id: c.id, name: c.name, class: c.class, user_id: c.user_id }, status: e.status, note: null })
      }
      return Promise.resolve(ok({ applied: body.entries.length, attendance: detail.attendance }))
    }
    if (path.endsWith('/events/e1/signup')) {
      detail.attendance.push({ character: { id: 'c1', name: 'Thrall', class: 'Shaman', user_id: 'u1' }, status: 'signed', note: body.note })
      return Promise.resolve(ok({ ...detail, added: presets.length }))
    }
    if (path.endsWith('/events/e1/withdraw')) {
      const a = detail.attendance.find(a => a.character.id === body.character_id)!
      a.status = 'withdrawn'
      a.note = body.reason
      return Promise.resolve(ok(detail))
    }
    if (path.endsWith('/characters/c1/reserves')) {
      if (method === 'PUT') presets = [item].filter(i => body.item_ids.includes(i.id))
      return Promise.resolve(ok(presets))
    }
    if (path.endsWith('/events/e1/drops')) {
      const winner = detail.reserves.find(r => r.item.id === body.item_id && r.character.id === body.character_id)
      for (const r of detail.reserves) if (r.item.id === body.item_id && body.character_id) r.outcome = r.character.id === body.character_id ? 'won' : 'lost'
      const who = body.character_id ? detail.attendance.find(a => a.character.id === body.character_id)?.character ?? winner?.character ?? null : null
      const d: ApiDrop = { id: `d${detail.drops.length + 1}`, event: { id: 'e1', name: raid.name, starts_at: raid.starts_at }, item, boss: body.boss_id ? { id: body.boss_id, name: 'Ragnaros' } : null, character: who, sr: !!winner, plus: winner?.plus ?? 0, created_at: null }
      detail.drops.push(d)
      return Promise.resolve(ok(d))
    }
    if (path.includes('/drops/') && method === 'DELETE') {
      detail.drops = detail.drops.filter(d => d.id !== path.split('/').pop())
      return Promise.resolve(ok({ deleted: true }))
    }
    if (path.endsWith('/drops')) return Promise.resolve(ok(detail.drops))
    if (path.endsWith('/events/e1')) return Promise.resolve(ok(detail))
    if (path.endsWith('/guild/roster')) return Promise.resolve(ok(guild))
    if (path.endsWith('/characters')) return Promise.resolve(ok([mine]))
    if (path.endsWith('/raids')) return Promise.resolve(ok(raids))
    if (path.endsWith('/raids/r1/bosses') && method === 'POST') {
      raids[0].bosses.push({ id: 'b2', raid_id: 'r1', name: body.name, position: body.position, is_trash: false, items: [] })
      return Promise.resolve(ok(raids[0].bosses[2]))
    }
    if (path.endsWith('/bosses/b1/items') && method === 'POST') {
      const created: ApiItem = { ...item, id: 'i2', name: body.name, slot: body.slot, recommended_classes: body.recommended_classes, notes: body.notes }
      raids[0].bosses[0].items.push(created)
      return Promise.resolve(ok(created))
    }
    if (path.includes('/bosses/b0/items/') && method === 'POST') return Promise.resolve(ok(item))
    if (path.includes('/bosses/') && path.includes('/items/') && method === 'DELETE') return Promise.resolve(ok(null))
    if (path.includes('/items/') && method === 'PUT') return Promise.resolve(ok({ ...item, ...body }))
    if (path.includes('/items/') && method === 'DELETE') {
      raids[0].bosses[0].items = raids[0].bosses[0].items.filter(i => i.id !== path.split('/').pop())
      return Promise.resolve(ok(null))
    }
    if (path.endsWith('/items')) return Promise.resolve(ok(raids[0].bosses[0].items))
    if (path.endsWith('/reserves') && method === 'GET') return Promise.resolve(ok(all))
    if (path.includes('/reserves/') && method === 'PUT') {
      const r = all.find(x => x.id === path.split('/').pop())!
      r.outcome = body.outcome
      return Promise.resolve(ok(r))
    }
    return Promise.resolve(ok(null))
  })
})

function renderAt(path: string, leadership: boolean) {
  return render(
    <AuthContext.Provider value={ctx(leadership)}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/wow-forever/loot" element={<Loot />} />
          <Route path="/wow-forever/loot/:eventId" element={<LootEvent />} />
          <Route path="/wow-forever/loot-history" element={<LootHistory />} />
          <Route path="/wow-forever/events" element={<Events />} />
          <Route path="/wow-forever/events/:eventId" element={<EventManage />} />
          <Route path="/wow-forever/sr-admin" element={<SrAdmin />} />
          <Route path="/wow-forever/raids" element={<Raids />} />
          <Route path="/wow-forever/audit" element={<AuditLog />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('Loot (members)', () => {
  it('saves preset reserves per character and lists raids only', async () => {
    const user = userEvent.setup()
    renderAt('/wow-forever/loot', false)
    expect(await screen.findByText('MC night')).toBeInTheDocument()
    expect(screen.queryByText('WSG premade')).not.toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Save reserves' })).toBeDisabled()
    await user.click(screen.getByRole('combobox', { name: 'Reserves MC' }))
    await user.click(await screen.findByRole('option', { name: /Sulfuras/ }))
    await user.click(screen.getByRole('button', { name: 'Save reserves' }))
    expect(await screen.findByText('Reserves saved.')).toBeInTheDocument()
    expect(calls.find(c => c.url.endsWith('/characters/c1/reserves') && c.method === 'PUT')!.body).toEqual({ item_ids: ['i1'] })
  })

  it('only offers characters on the event realm', async () => {
    detail.ruleset = 'PvE'
    renderAt('/wow-forever/loot/e1', false)
    expect(await screen.findByText('None of your characters are on PvE.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign up' })).not.toBeInTheDocument()
  })

  it('signs up with a note, copies presets, reserves manually, and leaves with a reason', async () => {
    const user = userEvent.setup()
    presets = [item]
    renderAt('/wow-forever/loot/e1', false)
    expect(await screen.findByText('Not signed up.')).toBeInTheDocument()
    expect(screen.getByText('Sign up above to place reserves.')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Sign-up note'), 'late 10')
    await user.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(await screen.findByText('Signed up. 1 preset reserve copied in.')).toBeInTheDocument()
    expect(calls.find(c => c.url.endsWith('/events/e1/signup'))!.body).toEqual({ character_id: 'c1', note: 'late 10' })
    expect(screen.getByText('Signed up')).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Item' }))
    expect(await screen.findByText('Free roll')).toBeInTheDocument()
    expect(await screen.findAllByText('Ragnaros')).toHaveLength(3)
    await user.click(screen.getByRole('option', { name: /Sulfuras/ }))
    await user.click(screen.getByRole('button', { name: 'Reserve' }))
    expect(await screen.findByText('+1')).toBeInTheDocument()
    expect(calls.find(c => c.url.endsWith('/events/e1/reserves'))!.body).toEqual({ character_id: 'c1', item_id: 'i1' })

    await user.click(screen.getByRole('button', { name: 'Leave this raid' }))
    expect(screen.getByRole('button', { name: 'Confirm leave' })).toBeDisabled()
    await user.type(screen.getByLabelText('Leave reason'), 'sick')
    await user.click(screen.getByRole('button', { name: 'Confirm leave' }))
    expect(await screen.findByText('Left this raid')).toBeInTheDocument()
    expect(calls.find(c => c.url.endsWith('/events/e1/withdraw'))!.body).toEqual({ character_id: 'c1', reason: 'sick' })
    expect(screen.getByText('withdrawn')).toBeInTheDocument()
  })
})

describe('Events (leadership)', () => {
  it('refuses members', async () => {
    renderAt('/wow-forever/events', false)
    expect(await screen.findByText(/for WoW guild leadership/)).toBeInTheDocument()
  })

  it('lists all kinds and creates through the modal with a raid', async () => {
    const user = userEvent.setup()
    renderAt('/wow-forever/events', true)
    expect(await screen.findByText('MC night')).toBeInTheDocument()
    expect(screen.getByText('WSG premade')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '+ New event' }))
    await user.type(screen.getByLabelText('Event name'), 'MC clear')
    await user.click(screen.getByRole('combobox', { name: 'Raid' }))
    await user.click(await screen.findByRole('option', { name: 'Molten Core (MC)' }))
    await user.click(screen.getByRole('combobox', { name: 'Style' }))
    await user.click(await screen.findByRole('option', { name: 'relaxed' }))
    await user.type(screen.getByLabelText('Tanks wanted'), '2')
    await user.type(screen.getByLabelText('Healers wanted'), '5')
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled()
    await user.click(screen.getByRole('combobox', { name: 'Duration hours' }))
    await user.click(await screen.findByRole('option', { name: '3 h' }))
    await user.click(screen.getByRole('combobox', { name: 'Duration minutes' }))
    await user.click(await screen.findByRole('option', { name: '30 min' }))
    expect(await screen.findByText('1 free for the whole event, 1 at the start: 1 Tank, 0 Healers, 0 DPS.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(calls.some(c => c.method === 'POST')).toBe(true))
    expect(calls.find(c => c.method === 'POST')!.body).toMatchObject({
      kind: 'raid', name: 'MC clear', raid_id: 'r1', reserve_limit: 2, duration_minutes: 210, cancelled: false,
      data: { style: 'relaxed', composition: { tank: 2, healer: 5, dps: 0 } },
    })
  })

  it('adds people, saves attendance, locks reserves', async () => {
    const user = userEvent.setup()
    renderAt('/wow-forever/events/e1', true)
    expect(await screen.findByText('Nobody added yet', { exact: false })).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Add person' }))
    await user.click(screen.getByRole('option', { name: 'Jaina (Pat)' }))
    expect(await screen.findByRole('combobox', { name: 'Attendance Jaina' })).toBeInTheDocument()
    expect(calls.find(c => c.url.endsWith('/attendance') && c.method === 'PUT')!.body).toEqual({ entries: [{ character_id: 'c2', status: 'signed' }] })

    await user.click(screen.getByRole('combobox', { name: 'Attendance Jaina' }))
    await user.click(screen.getByRole('option', { name: 'present' }))
    await user.click(screen.getByRole('button', { name: 'Save attendance' }))
    expect(await screen.findByText(/Attendance saved for 1/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Lock reserves' }))
    await waitFor(() => expect(calls.some(c => c.method === 'PUT' && c.url.endsWith('/events/e1') && c.body?.locked === true)).toBe(true))
  })
})

describe('Loot drops', () => {
  const reserve = (id: string, c: { id: string; name: string; class: string; user_id: string }, plus: number) =>
    ({ id, event_id: 'e1', character: c, item, plus, outcome: 'reserved', created_by: null, created_at: null })
  const thrall = { id: 'c1', name: 'Thrall', class: 'Shaman', user_id: 'u1' }
  const jaina = { id: 'c2', name: 'Jaina', class: 'Mage', user_id: 'u2' }

  async function pickSulfuras(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole('combobox', { name: 'Boss' }))
    await user.click(screen.getByRole('option', { name: 'Ragnaros' }))
    await user.click(screen.getByRole('combobox', { name: 'Dropped item' }))
    await user.click(screen.getByRole('option', { name: /Sulfuras/ }))
  }

  it('records an SR win for the top reserver and removes it again', async () => {
    const user = userEvent.setup()
    detail.reserves = [reserve('r1', thrall, 10), reserve('r2', jaina, 20)]
    detail.attendance = [{ character: thrall, status: 'present', note: null }, { character: jaina, status: 'present', note: null }]
    renderAt('/wow-forever/events/e1', true)
    await pickSulfuras(user)
    const buttons = screen.getAllByRole('button', { name: /^Won / })
    expect(buttons.map(b => b.getAttribute('aria-label'))).toEqual(['Won Jaina', 'Won Thrall'])
    await user.click(buttons[0])
    const post = await waitFor(() => calls.find(c => c.method === 'POST' && c.url.endsWith('/events/e1/drops'))!)
    expect(post.body).toEqual({ item_id: 'i1', character_id: 'c2', boss_id: 'b1' })
    expect(await screen.findByText('SR +20')).toBeInTheDocument()
    expect(screen.getAllByText('lost').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Remove drop Sulfuras' }))
    await user.click(screen.getByRole('button', { name: 'Yes' }))
    await waitFor(() => expect(calls.some(c => c.method === 'DELETE' && c.url.endsWith('/drops/d1'))).toBe(true))
    await waitFor(() => expect(screen.queryByText('SR +20')).not.toBeInTheDocument())
  })

  it('records a free roll from attendance, and a disenchant', async () => {
    const user = userEvent.setup()
    detail.attendance = [{ character: jaina, status: 'present', note: null }]
    renderAt('/wow-forever/events/e1', true)
    await pickSulfuras(user)
    expect(screen.getByText(/Free roll: nobody reserved/)).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Winner' }))
    await user.click(screen.getByRole('option', { name: 'Jaina' }))
    await user.click(screen.getByRole('button', { name: 'Record' }))
    const post = await waitFor(() => calls.find(c => c.method === 'POST' && c.url.endsWith('/events/e1/drops'))!)
    expect(post.body).toEqual({ item_id: 'i1', character_id: 'c2', boss_id: 'b1' })
    expect(await screen.findByText('Free roll')).toBeInTheDocument()

    await pickSulfuras(user)
    await user.click(screen.getByRole('button', { name: 'Nobody / disenchanted' }))
    await waitFor(() => expect(calls.filter(c => c.method === 'POST' && c.url.endsWith('/events/e1/drops')).length).toBe(2))
    const posts = calls.filter(c => c.method === 'POST'); expect(posts[posts.length - 1].body).toEqual({ item_id: 'i1', character_id: null, boss_id: 'b1' })
    expect(await screen.findByText('Disenchanted')).toBeInTheDocument()
  })

  it('shows drops to members on the event and in the history page', async () => {
    const user = userEvent.setup()
    detail.drops = [{ id: 'd1', event: { id: 'e1', name: 'MC night', starts_at: raid.starts_at }, item, boss: { id: 'b1', name: 'Ragnaros' }, character: jaina, sr: true, plus: 20, created_at: null },
      { id: 'd2', event: { id: 'e1', name: 'MC night', starts_at: raid.starts_at }, item: { ...item, hard_reserved: true }, boss: null, character: thrall, sr: false, plus: 0, created_at: null }]
    renderAt('/wow-forever/loot/e1', false)
    expect(await screen.findByText('SR +20')).toBeInTheDocument()
    expect(screen.getByText('Guild hard reserve')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Boss' })).not.toBeInTheDocument()

    renderAt('/wow-forever/loot-history', false)
    expect(await screen.findByText('2 drops')).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Event filter' }))
    await user.click(screen.getByRole('option', { name: /MC night/ }))
    await waitFor(() => expect(calls.some(c => c.url.endsWith('/drops?event_id=e1'))).toBe(true))
  })
})

describe('SR+ Admin and Raids (leadership)', () => {
  it('shows reserves with an event filter and sets outcomes', async () => {
    const user = userEvent.setup()
    all = [{ id: 'r1', event_id: 'e1', character: { id: 'c1', name: 'Thrall', class: 'Shaman', user_id: 'u1' }, item, plus: 0, outcome: 'reserved', created_by: 'u1', created_at: null,
      event: { id: 'e1', name: 'MC night', kind: 'raid', starts_at: raid.starts_at, locked: false } }]
    renderAt('/wow-forever/sr-admin?event=e1', true)
    expect(await screen.findByText('Thrall')).toBeInTheDocument()
    expect(calls[0].url).toContain('/reserves?event_id=e1')
    await user.click(screen.getByRole('combobox', { name: 'Outcome Thrall Sulfuras' }))
    await user.click(screen.getByRole('option', { name: 'won' }))
    await waitFor(() => expect(calls.some(c => c.method === 'PUT' && c.url.endsWith('/reserves/r1'))).toBe(true))
    expect(calls.find(c => c.method === 'PUT')!.body).toEqual({ outcome: 'won' })
  })

  it('manages bosses and items under a raid', async () => {
    const user = userEvent.setup()
    renderAt('/wow-forever/raids', true)
    await user.click(await screen.findByRole('button', { name: 'MC' }))
    expect(await screen.findByText('Ragnaros')).toBeInTheDocument()
    expect(screen.getByText('Sulfuras')).toBeInTheDocument()

    await user.type(screen.getByLabelText('New boss name'), 'Garr')
    await user.click(screen.getByRole('button', { name: 'Add boss' }))
    expect(await screen.findByText('Garr')).toBeInTheDocument()
    expect(calls.find(c => c.url.endsWith('/raids/r1/bosses'))!.body).toEqual({ name: 'Garr', position: 1 })

    await user.click(screen.getAllByRole('button', { name: '+ Item' })[0])
    await user.type(screen.getByLabelText('Item name'), 'Bindings of the Windseeker')
    await user.click(screen.getByRole('combobox', { name: 'Slot' }))
    await user.click(screen.getByRole('option', { name: 'Trinket' }))
    await user.click(screen.getByRole('combobox', { name: 'Recommended classes' }))
    await user.click(screen.getByRole('option', { name: 'Warrior' }))
    await user.click(screen.getByRole('button', { name: 'Add item' }))
    await waitFor(() => expect(calls.some(c => c.url.endsWith('/bosses/b1/items') && c.method === 'POST')).toBe(true))
    expect(calls.find(c => c.url.endsWith('/bosses/b1/items'))!.body).toMatchObject({ name: 'Bindings of the Windseeker', slot: 'Trinket', recommended_classes: ['Warrior'] })
    expect(await screen.findByLabelText('Screenshot file')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(await screen.findByText('Bindings of the Windseeker')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete Sulfuras' }))
    await user.click(screen.getByRole('button', { name: 'Yes' }))
    await waitFor(() => expect(screen.queryByText('Sulfuras')).not.toBeInTheDocument())
  })
})

describe('Items on many bosses', () => {
  async function openMc(user: ReturnType<typeof userEvent.setup>) {
    renderAt('/wow-forever/raids', true)
    await user.click(await screen.findByRole('button', { name: 'MC' }))
    await screen.findByText('Sulfuras')
  }

  it('creates an item for several bosses and marks it hard reserved', async () => {
    const user = userEvent.setup()
    await openMc(user)
    await user.click(screen.getAllByRole('button', { name: '+ Item' })[0])
    await user.type(screen.getByLabelText('Item name'), 'Eye of Divinity')
    await user.click(screen.getByRole('combobox', { name: 'Drops from' }))
    await user.click(screen.getByRole('option', { name: 'Trash' }))
    await user.click(screen.getByLabelText('Hard reserve'))
    await user.type(screen.getByLabelText('Hard reserve note'), 'main tank')
    await user.click(screen.getByRole('button', { name: 'Add item' }))
    await waitFor(() => expect(calls.some(c => c.method === 'POST' && c.url.endsWith('/bosses/b1/items'))).toBe(true))
    expect(calls.find(c => c.method === 'POST' && c.url.endsWith('/bosses/b1/items'))!.body).toMatchObject({ name: 'Eye of Divinity', hard_reserved: true, hard_reserve_note: 'main tank', boss_ids: ['b1', 'b0'] })
    expect(calls.some(c => c.method === 'PUT' && c.url.endsWith('/items/i2'))).toBe(false)
  })

  it('attaches an existing item to another boss and detaches it again', async () => {
    const user = userEvent.setup()
    raids[0].bosses[0].items = [{ ...item, hard_reserved: true, hard_reserve_note: 'tank', bosses: [...item.bosses, { id: 'b0', name: 'Trash', is_trash: true, position: 999, raid: mc }] }]
    await openMc(user)
    expect(screen.getByText('Guild hard reserve')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add existing item to Trash' }))
    await user.click(await screen.findByRole('combobox', { name: 'Existing item' }))
    await user.click(await screen.findByRole('option', { name: /Sulfuras/ }))
    await waitFor(() => expect(calls.some(c => c.method === 'POST' && c.url.endsWith('/bosses/b0/items/i1'))).toBe(true))

    await user.click(screen.getByRole('button', { name: 'Detach Sulfuras from Ragnaros' }))
    await user.click(screen.getByRole('button', { name: 'Yes' }))
    await waitFor(() => expect(calls.some(c => c.method === 'DELETE' && c.url.endsWith('/bosses/b1/items/i1'))).toBe(true))
  })

  it('lists an item once with its bosses and will not let members pick a hard reserve', async () => {
    const user = userEvent.setup()
    const hr = { ...item, hard_reserved: true, bosses: [...item.bosses, { id: 'b0', name: 'Trash', is_trash: true, position: 999, raid: mc }] }
    raids[0].bosses[0].items = [hr]
    raids[0].bosses[1].items = [hr]
    detail.attendance = [{ character: { id: 'c1', name: 'Thrall', class: 'Shaman', user_id: 'u1' }, status: 'signed', note: null }]
    renderAt('/wow-forever/loot/e1', false)
    await user.click(await screen.findByRole('combobox', { name: 'Item' }))
    const options = await screen.findAllByRole('option')
    expect(options).toHaveLength(1)
    expect(options[0]).toHaveAttribute('aria-disabled', 'true')
    expect(options[0]).toHaveTextContent('Ragnaros, Trash')
    expect(options[0]).toHaveTextContent('Guild hard reserve')
  })
})

describe('Cancelling and corrections (leadership)', () => {
  it('cancels an event', async () => {
    const user = userEvent.setup()
    renderAt('/wow-forever/events/e1', true)
    await user.click(await screen.findByRole('button', { name: 'Cancel event' }))
    await waitFor(() => expect(calls.some(c => c.method === 'PUT' && c.url.endsWith('/events/e1') && c.body?.cancelled === true)).toBe(true))
  })

  it('shows the cancelled badge', async () => {
    detail.cancelled = true
    renderAt('/wow-forever/events/e1', true)
    expect(await screen.findByText('Cancelled')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Uncancel' })).toBeInTheDocument()
  })

  it('adds and removes a bonus correction', async () => {
    const user = userEvent.setup()
    detail.reserves = [{ id: 'r1', event_id: 'e1', character: { id: 'c1', name: 'Thrall', class: 'Shaman', user_id: 'u1' }, item, plus: 10, outcome: 'reserved', created_by: null, created_at: null }]
    renderAt('/wow-forever/events/e1', true)
    await user.click(await screen.findByRole('combobox', { name: 'Corrected reserve' }))
    await user.click(screen.getByRole('option', { name: 'Thrall - Sulfuras' }))
    expect(screen.getByRole('button', { name: 'Add correction' })).toBeDisabled()
    await user.type(screen.getByLabelText('Correction amount'), '-10')
    await user.type(screen.getByLabelText('Correction reason'), 'missed raid, was online')
    await user.click(screen.getByRole('button', { name: 'Add correction' }))
    expect(await screen.findByText('missed raid, was online')).toBeInTheDocument()
    expect(calls.find(c => c.method === 'POST' && c.url.endsWith('/events/e1/adjustments'))!.body).toEqual({ character_id: 'c1', item_id: 'i1', amount: -10, reason: 'missed raid, was online' })

    await user.click(screen.getByRole('button', { name: 'Remove correction Thrall Sulfuras' }))
    await user.click(screen.getByRole('button', { name: 'Yes' }))
    await waitFor(() => expect(screen.queryByText('missed raid, was online')).not.toBeInTheDocument())
  })

  it('shows the API refusal when deleting an event with loot history', async () => {
    const user = userEvent.setup()
    const base = fetchSpy.getMockImplementation()!
    fetchSpy.mockImplementation((url: string | URL, init?: RequestInit) =>
      init?.method === 'DELETE' ? Promise.resolve(new Response(JSON.stringify({ status: 'error', message: 'Event has loot history; cancel it instead' }), { status: 200 })) : base(url, init))
    renderAt('/wow-forever/events/e1', true)
    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Yes' }))
    expect(await screen.findByText(/Event has loot history; cancel it instead/)).toBeInTheDocument()
  })
})

describe('Audit log (leadership)', () => {
  const row = (i: number): ApiAudit => ({
    id: `a${i}`, actor: { id: 'u1', username: 'Jakob' }, action: 'item.update', target_type: 'item', target_id: `t${i}`,
    detail: { name: `Thing ${i}`, boss: 'Ragnaros' }, created_at: new Date(Date.UTC(2099, 0, 1) - i * 60_000).toISOString(),
  })

  it('refuses members', async () => {
    renderAt('/wow-forever/audit', false)
    expect(await screen.findByText(/for WoW guild leadership/)).toBeInTheDocument()
  })

  it('lists entries, filters by target type and pages with before', async () => {
    const user = userEvent.setup()
    audit = Array.from({ length: 100 }, (_, i) => row(i))
    renderAt('/wow-forever/audit', true)
    expect(await screen.findByText('name: Thing 0, boss: Ragnaros')).toBeInTheDocument()

    const logCalls = () => calls.filter(c => new URL(c.url, 'http://x').pathname.endsWith('/audit'))
    await user.click(screen.getByRole('button', { name: 'Load more' }))
    await waitFor(() => expect(logCalls().length).toBe(2))
    const paged = new URL(logCalls()[1].url, 'http://x')
    expect(paged.searchParams.get('before')).toBe(audit[99].created_at)

    await user.click(screen.getByRole('combobox', { name: 'Target type' }))
    await user.click(screen.getByRole('option', { name: 'item' }))
    await waitFor(() => expect(calls.some(c => c.url.includes('target_type=item'))).toBe(true))
  })

  it('searches, filters by clicking, and clears', async () => {
    const user = userEvent.setup()
    audit = [row(0), { ...row(1), action: 'item.create', detail: { name: 'Sulfuras' } }]
    renderAt('/wow-forever/audit', true)
    expect(await screen.findByText('name: Thing 0, boss: Ragnaros')).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox', { name: 'Search the log' }), 'sulf')
    await waitFor(() => expect(screen.queryByText('name: Thing 0, boss: Ragnaros')).not.toBeInTheDocument())
    expect(screen.getByText('name: Sulfuras')).toBeInTheDocument()
    expect(calls.some(c => c.url.includes('q=sulf'))).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(await screen.findByText('name: Thing 0, boss: Ragnaros')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Thing 0' }))
    expect(await screen.findByText(/History of item/)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('name: Sulfuras')).not.toBeInTheDocument())
    expect(calls.some(c => c.url.includes('target_id=t0'))).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Show every target' }))
    expect(await screen.findByText('name: Sulfuras')).toBeInTheDocument()

    await user.type(screen.getByLabelText('From'), '2099-01-01')
    await waitFor(() => expect(calls.some(c => c.url.includes('since='))).toBe(true))
  })
})
