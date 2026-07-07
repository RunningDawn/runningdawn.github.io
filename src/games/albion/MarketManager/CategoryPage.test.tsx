import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AuthProvider } from '../../../auth/AuthProvider'
import { LayoutOverrideProvider } from '../../../components/LayoutOverride'
import { CategoryPage } from './CategoryPage'

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
    if (u.includes('/game/albion/items/by-category/warrior-weapons/sword')) {
      return Promise.resolve(ok([
        { id: 'T4_MAIN_SWORD', name: 'Broadsword' },
        { id: 'T5_MAIN_SWORD', name: 'Broadsword' },
        { id: 'T4_MAIN_SWORD@1', name: 'Broadsword' },
      ]))
    }
    if (u.includes('/game/albion/recipes/')) {
      return Promise.resolve(ok([{
        item_id: 'T4_MAIN_SWORD', craftable: true,
        recipe: [{ item_id: 'T4_METALBAR', name: 'Metal Bar', count: 2, craftable: false, recipe: [] }],
      }]))
    }
    if (u.includes('/game/albion/prices/volumes/')) {
      return Promise.resolve(ok([
        { item_id: 'T4_MAIN_SWORD', city: 'Bridgewatch', quality: 1, sold_1h: 1, sold_24h: 12, avg_price_24h: 4200 },
      ]))
    }
    if (u.includes('/game/albion/prices/')) {
      return Promise.resolve(ok([
        { item_id: 'T4_MAIN_SWORD', city: 'Bridgewatch', quality: 1, sell_price_min: 4321, buy_price_max: 4000 },
        { item_id: 'T4_METALBAR', city: 'Bridgewatch', quality: 1, sell_price_min: 100, buy_price_max: 80 },
      ]))
    }
    return Promise.resolve(new Response(JSON.stringify({ status: 'error' }), { status: 404 }))
  })
})

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LayoutOverrideProvider>
          <CategoryPage slug="warrior-weapons/sword" />
        </LayoutOverrideProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('CategoryPage', () => {
  it('loads the category items with live prices and craft columns', async () => {
    renderPage()

    expect(screen.getByText('Sword')).toBeInTheDocument()
    expect(await screen.findAllByText('Broadsword')).toHaveLength(3)
    expect(await screen.findByText('4,321')).toBeInTheDocument()
    expect(screen.getByText('Craft (base)')).toBeInTheDocument()
    expect(screen.getByText('Craft (optimized)')).toBeInTheDocument()
  })

  it('mat-source toggle switches craft costs to buy-order prices and persists', async () => {
    renderPage()
    // instant buy: 2 × 100 × 0.848 = 169.6 → 170
    expect(await screen.findAllByText('170')).not.toHaveLength(0)

    await userEvent.click(screen.getByText('Buy orders'))
    // buy orders: 2 × 80 × 0.848 = 135.68 → 136
    expect(await screen.findAllByText('136')).not.toHaveLength(0)
    expect(localStorage.getItem('forgegames_albion_mat_source_v1')).toBe('buy')
  })

  it('profit (sell) is clickable and lists the materials to buy', async () => {
    renderPage()
    // profit = 4321 × 0.96 − 169.6 = 3978.56 → +3,979
    const profitButton = await screen.findByText('+3,979')

    await userEvent.click(profitButton)
    expect(screen.getByText(/materials to buy \(optimized\)/i)).toBeInTheDocument()
    expect(screen.getByText(/2× T4 Metal Bar/)).toBeInTheDocument()
    expect(screen.getByText('Craft cost')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Base mats'))
    expect(localStorage.getItem('forgegames_albion_craft_strategy_v1')).toBe('base')
  })

  it('opens the column help modal', async () => {
    renderPage()
    await screen.findAllByText('Broadsword')

    await userEvent.click(screen.getByLabelText(/explain the table columns/i))
    expect(screen.getByText('Item Table Columns')).toBeInTheDocument()
    expect(screen.getByText(/Sell\(min\) × \(1 − tax\) − Craft cost/)).toBeInTheDocument()
    expect(screen.getByText(/cheapest sell order on the market/i)).toBeInTheDocument()
  })

  it('narrows rows with the tier filter and the name filter', async () => {
    renderPage()
    expect(await screen.findAllByText('Broadsword')).toHaveLength(3)

    await userEvent.type(screen.getByPlaceholderText(/filter sword items/i), 't5_')
    expect(screen.getAllByText('Broadsword')).toHaveLength(1)
    expect(screen.getByText('T5')).toBeInTheDocument()

    await userEvent.clear(screen.getByPlaceholderText(/filter sword items/i))
    expect(screen.getAllByText('Broadsword')).toHaveLength(3)
  })

  it('lists only tiers that have items in the Tier dropdown', async () => {
    renderPage()
    await screen.findAllByText('Broadsword')
    // this sword category holds T4 + T5 only - the Tier dropdown must not offer T1-3/T6-8
    await userEvent.click(screen.getAllByRole('combobox')[0])
    expect(screen.getByRole('option', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'T4' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'T5' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'T3' })).toBeNull()
    expect(screen.queryByRole('option', { name: 'T6' })).toBeNull()
  })
})
