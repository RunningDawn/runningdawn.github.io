import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AuthProvider } from '../../../auth/AuthProvider'
import { MarketManagerSidebar } from './MarketManagerSidebar'

const SK = 'forgegames_albion_mm_collapsed_v1'

const fetchSpy = vi.fn()
globalThis.fetch = fetchSpy

beforeEach(() => {
  fetchSpy.mockReset()
  localStorage.clear()
  // Bearer session: seed a token so AuthProvider fetches /auth/me and the
  // authenticated nav (category sections) renders.
  localStorage.setItem('forge_token', 'test-token')
  fetchSpy.mockResolvedValue(new Response(JSON.stringify({
    status: 'ok',
    payload: {
      id: 'u1', discord_id: 'd1', username: 'Tester#0001', avatar: null,
      guilds: { running_dawn: { is_member: true, roles: { albion_guild: true } } },
    },
  }), { status: 200 }))
})

function renderSidebar() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <MarketManagerSidebar isOpen onClose={() => {}} onOpenSettings={() => {}} onOpenLogin={() => {}} />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('MarketManagerSidebar collapse persistence', () => {
  // The sidebar shell renders a mobile and a desktop copy, so queries use *AllBy*.
  it('collapsing a section persists to localStorage', async () => {
    renderSidebar()

    expect((await screen.findAllByText('Siege Equipment')).length).toBeGreaterThan(0)
    await userEvent.click(screen.getAllByText('Toolmaker')[0])

    expect(screen.queryAllByText('Siege Equipment')).toHaveLength(0)
    expect(JSON.parse(localStorage.getItem(SK)!)).toEqual({ Toolmaker: true })
  })

  it('collapsed sections stay collapsed on a fresh render', async () => {
    localStorage.setItem(SK, JSON.stringify({ Refining: true }))

    renderSidebar()

    // Other sections unaffected, Refining's links hidden.
    expect((await screen.findAllByText('Siege Equipment')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Refining').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('Fiber')).toHaveLength(0)
  })
})
