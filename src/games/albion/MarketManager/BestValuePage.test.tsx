import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AuthProvider } from '../../../auth/AuthProvider'
import { LayoutOverrideProvider } from '../../../components/LayoutOverride'
import { BestValuePage } from './BestValuePage'

const fetchSpy = vi.fn()
globalThis.fetch = fetchSpy

function ok(payload: unknown) {
  return new Response(JSON.stringify({ status: 'ok', message: '', payload }), { status: 200 })
}

const PAYLOAD = {
  computed_at: '2026-07-02T10:00:00+00:00',
  rows: [
    {
      item_id: 'T4_MAIN_SWORD', name: 'Broadsword', tier: 4, enchant: 0,
      city: 'Martlock', quality: 1, sell_price_min: 5000,
      revenue: 4800, sold_24h: 25, avg_price_24h: 4800,
      craft_cost_base: 300, craft_cost_optimized: 200, profit: 4475, return_pct: 2237.5,
    },
    {
      item_id: 'T4_MAIN_SWORD', name: 'Broadsword', tier: 4, enchant: 0,
      city: 'Caerleon', quality: 1, sell_price_min: 1000,
      revenue: 1000, sold_24h: 0, avg_price_24h: null,
      craft_cost_base: null, craft_cost_optimized: 200, profit: 735, return_pct: 367.5,
    },
  ],
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
    if (u.includes('/game/albion/best-value')) {
      return Promise.resolve(ok(PAYLOAD))
    }
    return Promise.resolve(new Response(JSON.stringify({ status: 'error' }), { status: 404 }))
  })
})

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LayoutOverrideProvider>
          <BestValuePage />
        </LayoutOverrideProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('BestValuePage', () => {
  it('strategy toggles refetch with new params and persist to localStorage', async () => {
    renderPage()
    expect(await screen.findAllByText('Broadsword')).toHaveLength(2)

    await userEvent.click(screen.getByText('Buy orders'))
    await waitFor(() => {
      const urls = fetchSpy.mock.calls.map(c => String(c[0])).filter(u => u.includes('best-value'))
      expect(urls.some(u => u.includes('mats=buy'))).toBe(true)
    })
    expect(localStorage.getItem('forgegames_albion_mat_source_v1')).toBe('buy')

    await userEvent.click(screen.getByText('Base mats'))
    await waitFor(() => {
      const urls = fetchSpy.mock.calls.map(c => String(c[0])).filter(u => u.includes('best-value'))
      expect(urls.some(u => u.includes('strategy=base'))).toBe(true)
    })
    expect(localStorage.getItem('forgegames_albion_craft_strategy_v1')).toBe('base')
  })

  it('renders (item, city) rows across cities with returns and detail links', async () => {
    renderPage()

    // same item appears once per city
    expect(await screen.findAllByText('Broadsword')).toHaveLength(2)
    expect(screen.getByText('Martlock')).toBeInTheDocument()
    expect(screen.getByText('Caerleon')).toBeInTheDocument()
    expect(screen.getByText('+2237.5%')).toBeInTheDocument()
    expect(screen.getByText('+4,475')).toBeInTheDocument()
    // Sell shows the realistic resale basis (revenue 4,800), not the raw lowest ask (5,000)
    expect(screen.getByText('4,800')).toBeInTheDocument()
    expect(screen.queryByText('5,000')).toBeNull()

    const links = screen.getAllByText('Broadsword').map(el => el.closest('a')!.getAttribute('href'))
    expect(links).toContain('/albion/market-manager/item/T4_MAIN_SWORD?quality=1&city=Martlock')

    // no filter controls - the per-user flags + strategy toggles ride the request
    expect(screen.queryByLabelText(/city/i)).toBeNull()
    const url = fetchSpy.mock.calls.map(c => String(c[0])).find(u => u.includes('best-value'))!
    expect(url).toContain('/game/albion/best-value?premium=true&focus=false&mats=sell&strategy=optimized')
  })
})
