import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AuthProvider } from '../../../../auth/AuthProvider'
import { LayoutOverrideProvider } from '../../../../components/LayoutOverride'
import { ItemIndexPage } from './ItemIndexPage'

const fetchSpy = vi.fn()
globalThis.fetch = fetchSpy

function ok(payload: unknown) {
  return new Response(JSON.stringify({ status: 'ok', message: '', payload }), { status: 200 })
}

beforeEach(() => {
  fetchSpy.mockReset()
  localStorage.clear()
  fetchSpy.mockImplementation((url: string | URL) => {
    const u = String(url)
    if (u.includes('/auth/me')) {
      return Promise.resolve(ok({
        id: 'u1', discord_id: 'd1', username: 'Tester#0001', avatar: 'h',
        guilds: { running_dawn: { is_member: true, roles: { albion_guild: true } } },
      }))
    }
    if (u.includes('/game/albion/recipes/')) {
      return Promise.resolve(ok([{ item_id: 'T4_BAG', craftable: false, recipe: [] }]))
    }
    if (u.includes('/game/albion/prices/volumes/')) {
      return Promise.resolve(ok([
        { item_id: 'T4_BAG', city: 'Bridgewatch', quality: 1, sold_1h: 2, sold_24h: 37, avg_price_24h: 1100 },
      ]))
    }
    if (u.includes('/game/albion/prices/')) {
      return Promise.resolve(ok([
        { item_id: 'T4_BAG', city: 'Bridgewatch', quality: 1, sell_price_min: 1234, buy_price_max: 1000, timestamp: '2020-01-01T12:00:00' },
      ]))
    }
    if (u.includes('/game/albion/items')) {
      return Promise.resolve(ok([{ id: 'T4_BAG', name: "Adept's Bag" }]))
    }
    return Promise.resolve(new Response(JSON.stringify({ status: 'error' }), { status: 404 }))
  })
})

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LayoutOverrideProvider>
          <ItemIndexPage />
        </LayoutOverrideProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('ItemIndexPage', () => {
  it('renders the search box and a searched item with its live price', async () => {
    renderPage()

    expect(screen.getByPlaceholderText(/search items/i)).toBeInTheDocument()
    expect(await screen.findByText("Adept's Bag")).toBeInTheDocument()
    // live price merged into the row
    expect(await screen.findByText('1,234')).toBeInTheDocument()
    // per-row scan dot: 2020 scan date vs a fresh fetch = red (3+ days stale)
    const dot = screen.getByTitle(/scanned in game jan 1/i)
    expect(dot.className).toContain('text-[#f87171]')
  })
})
