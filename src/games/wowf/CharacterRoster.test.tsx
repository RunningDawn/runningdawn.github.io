import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthContext, type AuthContextType } from '../../auth/authContext'
import { STORAGE_KEYS } from '../../config/storageKeys'
import { CharacterRoster } from './CharacterRoster'
import type { ApiCharacter } from './roster'

const member: AuthContextType = {
  user: {
    id: 'u1', discord_id: 'd1', username: 'Jakob', avatar: null,
    guilds: { running_dawn: { is_member: true, roles: { wowf_member: true } } },
  },
  loading: false, isAuthenticated: true,
  login: vi.fn(), logout: vi.fn(),
}

const fetchSpy = vi.fn()
globalThis.fetch = fetchSpy

const ok = (payload: unknown) =>
  new Response(JSON.stringify({ status: 'ok', message: '', payload }), { status: 200 })

function row(over: Partial<ApiCharacter>): ApiCharacter {
  return {
    id: 'a', user_id: 'u1', name: 'Thrall Hellscream', faction: 'Horde', race: 'Orc', class: 'Shaman',
    ruleset: 'PvP', level: 60, main_spec: 'Enhancement', off_spec: null, role: 'Melee DPS', professions: ['Mining'],
    is_main: true, position: 0, data: {}, updated_at: '2026-10-29T10:00:00+00:00', ...over,
  }
}

// Tiny in-memory forge-api so the page's reload-after-mutation flow is real.
let store: ApiCharacter[] = []
const calls: { method: string; url: string; body?: Record<string, unknown> }[] = []

beforeEach(() => {
  localStorage.clear()
  store = []
  calls.length = 0
  fetchSpy.mockReset()
  fetchSpy.mockImplementation((url: string | URL, init?: RequestInit) => {
    const u = String(url)
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(init.body as string) : undefined
    calls.push({ method, url: u, body })
    if (u.endsWith('/characters/order')) return Promise.resolve(ok(null))
    if (method === 'POST' && u.endsWith('/restore')) {
      const id = u.split('/').slice(-2)[0]
      store = store.map(c => (c.id === id ? { ...c, archived: false } : c))
      return Promise.resolve(ok(store.find(c => c.id === id)))
    }
    if (method === 'POST' && body.name === 'Taken Name') return Promise.resolve(new Response(JSON.stringify({ status: 'error', message: 'Name taken on PvP' }), { status: 200 }))
    if (method === 'POST') {
      const created = row({ id: `c${store.length + 1}`, ...body, main_spec: body.main_spec, off_spec: body.off_spec, is_main: store.length === 0 || body.is_main, position: store.length })
      if (created.is_main) store = store.map(c => ({ ...c, is_main: false }))
      store.push(created)
      return Promise.resolve(ok(created))
    }
    if (method === 'PUT') {
      const id = u.split('/').pop()!
      if (body.is_main) store = store.map(c => ({ ...c, is_main: false }))
      store = store.map(c => (c.id === id ? { ...c, ...body, is_main: body.is_main || c.is_main, updated_at: '2026-10-30T00:00:00+00:00' } : c))
      return Promise.resolve(ok(store.find(c => c.id === id)))
    }
    if (method === 'DELETE') {
      store = store.map(c => (c.id === u.split('/').pop() ? { ...c, archived: true } : c))
      return Promise.resolve(ok(null))
    }
    return Promise.resolve(ok(store))
  })
})

function renderRoster() {
  return render(
    <AuthContext.Provider value={member}>
      <CharacterRoster />
    </AuthContext.Provider>,
  )
}

describe('CharacterRoster', () => {
  it('creates a character through the API and mirrors the list locally', async () => {
    const user = userEvent.setup()
    renderRoster()

    expect(await screen.findByText(/No characters yet/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '+ Add character' }))
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
    await user.type(screen.getByLabelText('Character name'), 'Thrall Hellscream')
    await user.click(screen.getByRole('combobox', { name: 'Race' }))
    await user.click(screen.getByRole('option', { name: 'Orc' }))
    await user.click(screen.getByRole('combobox', { name: 'Class' }))
    expect(screen.queryByRole('option', { name: 'Paladin' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: 'Shaman' }))
    await user.click(screen.getByRole('combobox', { name: 'Main spec' }))
    await user.click(screen.getByRole('option', { name: 'Restoration' }))
    await user.click(screen.getByRole('combobox', { name: 'Professions' }))
    await user.click(screen.getByRole('option', { name: 'Skinning' }))
    await user.click(screen.getByRole('combobox', { name: 'Professions' }))
    await user.click(screen.getByRole('option', { name: 'Mining' }))
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByText('Thrall Hellscream')).toBeInTheDocument()
    expect(screen.getByText('Main')).toBeInTheDocument()
    const post = calls.find(c => c.method === 'POST')!
    expect(post.url).toContain('/game/wowf/characters')
    expect(post.body).toMatchObject({ name: 'Thrall Hellscream', faction: 'Horde', race: 'Orc', class: 'Shaman', ruleset: 'PvP', level: 1, main_spec: 'Restoration', professions: ['Mining', 'Skinning'] })
    const mirror = JSON.parse(localStorage.getItem(STORAGE_KEYS.wowfRoster)!)
    expect(mirror.characters[0]).toMatchObject({ name: 'Thrall Hellscream', main: true })
  })

  it('edits with a CAS base, cannot move the main, archives and restores', async () => {
    const user = userEvent.setup()
    store = [row({}), row({ id: 'b', name: 'Jaina Proudmoore', faction: 'Alliance', race: 'Human', class: 'Mage', level: 40, main_spec: null, professions: [], is_main: false, position: 1 })]
    renderRoster()
    expect(await screen.findByText('Jaina Proudmoore')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[1])
    expect(screen.queryByLabelText('Main')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    const put = calls.find(c => c.method === 'PUT' && c.url.endsWith('/characters/b'))!
    await waitFor(() => expect(put).toBeDefined())
    expect(put.body).toMatchObject({ is_main: false, base_updated_at: '2026-10-29T10:00:00+00:00' })
    expect(screen.getByText('Jaina Proudmoore').closest('[draggable]')?.textContent).not.toContain('Main')

    await user.click(screen.getAllByRole('button', { name: 'Archive' })[0])
    expect(screen.getByText(/It leaves your roster but keeps its loot history\. You can restore it later\./)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Yes' }))
    expect(await screen.findByText('Archived (1)')).toBeInTheDocument()
    expect(calls.some(c => c.method === 'DELETE' && c.url.endsWith('/characters/a'))).toBe(true)
    expect(screen.getAllByRole('button', { name: 'Archive' })).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Restore Thrall Hellscream' }))
    await waitFor(() => expect(screen.queryByText('Archived (1)')).not.toBeInTheDocument())
    expect(calls.some(c => c.method === 'POST' && c.url.endsWith('/characters/a/restore'))).toBe(true)
    expect(screen.getAllByRole('button', { name: 'Archive' })).toHaveLength(2)
  })

  it('keeps the form open and shows a realm name clash', async () => {
    const user = userEvent.setup()
    renderRoster()
    await user.click(await screen.findByRole('button', { name: '+ Add character' }))
    await user.type(screen.getByLabelText('Character name'), 'Taken Name')
    await user.click(screen.getByRole('combobox', { name: 'Race' }))
    await user.click(screen.getByRole('option', { name: 'Orc' }))
    await user.click(screen.getByRole('combobox', { name: 'Class' }))
    await user.click(screen.getByRole('option', { name: 'Shaman' }))
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(await screen.findByText('Name taken on PvP')).toBeInTheDocument()
    expect(screen.getByLabelText('Character name')).toBeInTheDocument()
  })

  it('shows a conflict message and reloads', async () => {
    const user = userEvent.setup()
    store = [row({})]
    renderRoster()
    expect(await screen.findByText('Thrall Hellscream')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    fetchSpy.mockImplementationOnce(() =>
      Promise.resolve(new Response(JSON.stringify({ status: 'error', message: 'conflict', payload: store[0] }), { status: 200 })))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText(/changed elsewhere/)).toBeInTheDocument()
  })
})
