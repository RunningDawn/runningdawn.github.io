import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthContext, type AuthContextType } from '../../auth/authContext'
import type { GuildRosterEntry } from './api'
import { GuildRoster } from './GuildRoster'
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

function row(over: Partial<ApiCharacter>): ApiCharacter {
  return {
    id: 'a', user_id: 'u1', name: 'Thrall Hellscream', faction: 'Horde', race: 'Orc', class: 'Shaman',
    ruleset: 'PvP', level: 60, main_spec: 'Enhancement', off_spec: null, role: 'Melee DPS', professions: ['Mining'],
    is_main: true, position: 0, data: {}, updated_at: '2026-10-28T00:00:00+00:00', ...over,
  }
}

const entry = (over: Partial<GuildRosterEntry>): GuildRosterEntry => ({
  user_id: 'u?', username: '?', discord_username: '?', avatar: null, nickname: null,
  is_member: true, has_role: true, characters: [], ...over,
})

let entries: GuildRosterEntry[] = []
const calls: { method: string; url: string; body?: Record<string, unknown> }[] = []
const ok = (p: unknown) => new Response(JSON.stringify({ status: 'ok', message: '', payload: p }), { status: 200 })

beforeEach(() => {
  calls.length = 0
  entries = [
    entry({ user_id: 'u1', username: 'Jakob', discord_username: 'jakob', nickname: 'Jak', characters: [
      row({}),
      row({ id: 'b', user_id: 'u1', name: 'Vol Jin', race: 'Troll', class: 'Mage', level: 20, main_spec: null, professions: [], is_main: false, position: 1, updated_at: null }),
    ] }),
    entry({ user_id: 'u2', username: 'Pat', discord_username: 'pat#2', characters: [
      row({ id: 'c', user_id: 'u2', name: 'Jaina Proudmoore', faction: 'Alliance', race: 'Human', class: 'Mage', ruleset: 'PvE', main_spec: 'Frost', professions: [] }),
    ] }),
    entry({ user_id: 'u3', username: 'Gone', discord_username: 'gone', is_member: false, has_role: false, characters: [
      row({ id: 'd', user_id: 'u3', name: 'Ghost Walker', race: 'Undead', class: 'Rogue', main_spec: null, professions: [] }),
    ] }),
    entry({ user_id: 'u4', username: 'Newbie', discord_username: 'newbie' }),
    entry({ user_id: null, username: 'Pickup players', discord_username: null, is_member: false, has_role: false, characters: [
      row({ id: 'p', user_id: null, name: 'Pug Player', class: 'Warrior', main_spec: null, professions: [], is_main: false }),
    ] }),
  ]
  fetchSpy.mockReset()
  fetchSpy.mockImplementation((url: string | URL, init?: RequestInit) => {
    const u = String(url)
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(init.body as string) : undefined
    calls.push({ method, url: u, body })
    if (method === 'POST' && u.endsWith('/guild/pickups')) {
      const created = row({ id: 'new-pickup', user_id: null, ...body, is_main: false })
      entries[4].characters.push(created)
      return Promise.resolve(ok(created))
    }
    if (method === 'PUT' && u.endsWith('/assign')) {
      const id = u.split('/').slice(-2)[0]
      const char = entries[4].characters.find(c => c.id === id)!
      entries[4].characters = entries[4].characters.filter(c => c.id !== id)
      entries.find(e => e.user_id === body.user_id)!.characters.push({ ...char, user_id: body.user_id })
      return Promise.resolve(ok(null))
    }
    if (method === 'POST' && body.name === 'Taken Name') return Promise.resolve(new Response(JSON.stringify({ status: 'error', message: 'Name taken on PvP' }), { status: 200 }))
    if (method === 'POST') {
      const userId = u.split('/members/')[1].split('/')[0]
      const e = entries.find(x => x.user_id === userId)!
      const created = row({ id: `new-${userId}`, user_id: userId, ...body, is_main: e.characters.length === 0 || body.is_main })
      e.characters.push(created)
      return Promise.resolve(ok(created))
    }
    if (method === 'PUT') {
      const id = u.split('/').pop()!
      for (const e of entries) e.characters = e.characters.map(c => (c.id === id ? { ...c, ...body, updated_at: '2026-10-30T00:00:00+00:00' } : c))
      return Promise.resolve(ok(null))
    }
    if (method === 'DELETE') {
      const [path, qs] = u.split('?')
      const id = path.split('/').pop()!
      for (const e of entries) {
        e.characters = qs === 'hard=true' ? e.characters.filter(c => c.id !== id) : e.characters.map(c => (c.id === id ? { ...c, archived: true } : c))
      }
      return Promise.resolve(ok(null))
    }
    return Promise.resolve(ok(entries))
  })
})

function renderPage(leadership: boolean) {
  return render(
    <AuthContext.Provider value={ctx(leadership)}>
      <GuildRoster />
    </AuthContext.Provider>,
  )
}

describe('GuildRoster', () => {
  it('refuses non-leadership without calling the API', () => {
    renderPage(false)
    expect(screen.getByText(/for WoW guild leadership/)).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('lists every character, flags members without a role, and filters', async () => {
    const user = userEvent.setup()
    renderPage(true)
    expect(await screen.findByText('Thrall Hellscream')).toBeInTheDocument()
    expect(screen.getByText('Jaina Proudmoore')).toBeInTheDocument()
    expect(screen.getByText(/No WoW guild role but still on the roster: Gone/)).toBeInTheDocument()
    expect(screen.getByText(/Registered without characters: Newbie/)).toBeInTheDocument()
    expect(screen.getAllByText(/jakob · Jak/)).toHaveLength(2)
    expect(screen.getByText(/5 of 5 characters · 4 members/)).toBeInTheDocument()
    expect(screen.getByText('Pickup')).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Class' }))
    await user.click(screen.getByRole('option', { name: 'Mage' }))
    expect(screen.queryByText('Thrall Hellscream')).not.toBeInTheDocument()
    expect(screen.getByText(/2 of 5 characters/)).toBeInTheDocument()

    await user.click(screen.getByLabelText('Mains only'))
    expect(screen.queryByText('Vol Jin')).not.toBeInTheDocument()
    expect(screen.getByText('Jaina Proudmoore')).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Class' }))
    await user.click(screen.getByRole('option', { name: 'All classes' }))
    await user.click(screen.getByLabelText('Mains only'))
    await user.click(screen.getByRole('combobox', { name: 'Filter by profession' }))
    await user.click(screen.getByRole('option', { name: 'Mining' }))
    expect(screen.getByText(/1 of 5 characters/)).toBeInTheDocument()
    expect(screen.getByText('1 selected')).toBeInTheDocument()
    if (!screen.queryByRole('option', { name: 'Mining' })) {
      await user.click(screen.getByRole('combobox', { name: 'Filter by profession' }))
    }
    await user.click(screen.getByRole('option', { name: 'Mining' }))
    await user.type(screen.getByLabelText('Search'), 'jak')
    expect(screen.getByText('Thrall Hellscream')).toBeInTheDocument()
    expect(screen.queryByText('Jaina Proudmoore')).not.toBeInTheDocument()
  })

  it("edits another member's character only after confirmation", async () => {
    const user = userEvent.setup()
    renderPage(true)
    await user.click(await screen.findByRole('button', { name: 'Edit Jaina Proudmoore' }))
    expect(screen.getByLabelText('Main')).toBeInTheDocument()
    const name = screen.getByLabelText('Character name')
    await user.clear(name)
    await user.type(name, 'Kalec Gos')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByText("Save changes to Pat's Jaina Proudmoore?")).toBeInTheDocument()
    expect(calls.some(c => c.method === 'PUT')).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByText('Kalec Gos')).toBeInTheDocument()
    const put = calls.find(c => c.method === 'PUT')!
    expect(put.url).toContain('/game/wowf/guild/characters/c')
    expect(put.body).toMatchObject({ name: 'Kalec Gos', base_updated_at: '2026-10-28T00:00:00+00:00' })
  })

  it('archives, shows archived on demand, and deletes permanently', async () => {
    const user = userEvent.setup()
    renderPage(true)
    await user.click(await screen.findByRole('button', { name: 'Archive Ghost Walker' }))
    await user.click(screen.getByRole('button', { name: 'Yes' }))
    await waitFor(() => expect(screen.queryByText('Ghost Walker')).not.toBeInTheDocument())
    expect(calls.find(c => c.method === 'DELETE')!.url).toMatch(/\/game\/wowf\/guild\/characters\/d$/)

    await user.click(screen.getByLabelText('Show archived'))
    expect(await screen.findByText('Ghost Walker')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit Ghost Walker' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete Ghost Walker permanently' }))
    await user.click(screen.getByRole('button', { name: 'Yes' }))
    await waitFor(() => expect(screen.queryByText('Ghost Walker')).not.toBeInTheDocument())
    expect(calls.filter(c => c.method === 'DELETE')[1].url).toContain('/guild/characters/d?hard=true')
  })

  it('adds a character for a member and shows a realm name clash in the form', async () => {
    const user = userEvent.setup()
    renderPage(true)
    await screen.findByText('Thrall Hellscream')

    await user.click(screen.getByRole('combobox', { name: 'Add character for' }))
    await user.click(screen.getByRole('option', { name: 'Newbie' }))
    await user.type(screen.getByLabelText('Character name'), 'Taken Name')
    await user.click(screen.getByRole('combobox', { name: 'Race' }))
    await user.click(screen.getByRole('option', { name: 'Tauren' }))
    await user.click(screen.getAllByRole('combobox', { name: 'Class' })[1])
    expect(screen.queryByRole('option', { name: 'Rogue' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: 'Druid' }))
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByText('Name taken on PvP')).toBeInTheDocument()
    const name = screen.getByLabelText('Character name')
    await user.clear(name)
    await user.type(name, 'Fresh Face')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByText('Fresh Face')).toBeInTheDocument()
    const post = calls.filter(c => c.method === 'POST').pop()!
    expect(post.url).toContain('/game/wowf/guild/members/u4/characters')
    expect(post.body).toMatchObject({ name: 'Fresh Face', race: 'Tauren', class: 'Druid', is_main: true })
  })

  it('creates a pickup character and assigns it to a member', async () => {
    const user = userEvent.setup()
    renderPage(true)
    await user.click(await screen.findByRole('button', { name: '+ Pickup' }))
    await user.type(screen.getByLabelText('Character name'), 'Rando Person')
    await user.click(screen.getByRole('combobox', { name: 'Race' }))
    await user.click(screen.getByRole('option', { name: 'Orc' }))
    await user.click(screen.getAllByRole('combobox', { name: 'Class' })[1])
    await user.click(screen.getByRole('option', { name: 'Hunter' }))
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByText('Rando Person')).toBeInTheDocument()
    const post = calls.find(c => c.method === 'POST')!
    expect(post.url).toContain('/game/wowf/guild/pickups')
    expect(post.body).toMatchObject({ name: 'Rando Person', race: 'Orc', class: 'Hunter', is_main: false })
    expect(screen.getAllByText('Pickup')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Assign Pug Player' }))
    expect(screen.getByRole('button', { name: 'Assign' })).toBeDisabled()
    await user.click(screen.getByRole('combobox', { name: 'Assign to' }))
    await user.click(screen.getByRole('option', { name: 'Newbie' }))
    await user.click(screen.getByRole('button', { name: 'Assign' }))
    await waitFor(() => expect(screen.getAllByText('Pickup')).toHaveLength(1))
    const put = calls.find(c => c.method === 'PUT')!
    expect(put.url).toContain('/game/wowf/guild/characters/p/assign')
    expect(put.body).toEqual({ user_id: 'u4' })
    expect(screen.queryByText(/Registered without characters/)).not.toBeInTheDocument()
  })
})
