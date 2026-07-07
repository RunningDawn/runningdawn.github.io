import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router'
import { AuthProvider } from '../../../../auth/AuthProvider'
import { LayoutOverrideProvider } from '../../../../components/LayoutOverride'
import { ItemDetailPage } from './ItemDetailPage'

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
    if (u.includes('/game/albion/prices/history/')) {
      return Promise.resolve(ok([
        {
          item_id: 'T5_MAIN_SWORD', location: 'Caerleon', quality: 1,
          data: [
            { timestamp: new Date(Date.now() - 3_600_000).toISOString().replace('Z', ''), avg_price: 5000, item_count: 3 },
            { timestamp: new Date().toISOString().replace('Z', ''), avg_price: 5200, item_count: 2 },
          ],
        },
        {
          item_id: 'T5_MAIN_SWORD', location: 'Caerleon', quality: 2,
          data: [{ timestamp: new Date().toISOString().replace('Z', ''), avg_price: 6100, item_count: 1 }],
        },
      ]))
    }
    if (u.includes('/game/albion/recipes/')) {
      const requestedId = decodeURIComponent(u.split('/recipes/')[1].split(',')[0])
      return Promise.resolve(ok([{
        item_id: requestedId, name: "Expert's Broadsword", count: 1, craftable: true,
        has_quality: requestedId.includes('MAIN_SWORD'), // gear -> quality; a crest -> none
        recipe: [
          {
            item_id: 'T5_METALBAR', name: 'Metal Bar', count: 16, craftable: true,
            recipe: [{ item_id: 'T5_ORE', name: 'Iron Ore', count: 2, craftable: false, recipe: [] }],
          },
          { item_id: 'T5_LEATHER', name: 'Leather', count: 8, craftable: false, recipe: [] },
        ],
      }]))
    }
    if (u.includes('/game/albion/prices/volumes/')) {
      return Promise.resolve(ok([
        { item_id: 'T5_MAIN_SWORD', city: 'Caerleon', quality: 1, sold_1h: 3, sold_24h: 55, avg_price_24h: 5050 },
      ]))
    }
    if (u.includes('/game/albion/prices/')) {
      return Promise.resolve(ok([
        { item_id: 'T5_MAIN_SWORD', city: 'Caerleon', quality: 1, sell_price_min: 5100, buy_price_max: 4500 },
        { item_id: 'T5_MAIN_SWORD', city: 'Caerleon', quality: 2, sell_price_min: 6200, buy_price_max: 5000 },
        { item_id: 'T5_METALBAR', city: 'Caerleon', quality: 1, sell_price_min: 100, buy_price_max: 90 },
        { item_id: 'T5_LEATHER', city: 'Caerleon', quality: 1, sell_price_min: 50, buy_price_max: 40 },
        { item_id: 'T5_ORE', city: 'Caerleon', quality: 1, sell_price_min: 60, buy_price_max: 50 },
      ]))
    }
    if (u.includes('/game/albion/items')) {
      // Sword family exists T3-T8 (no T1/T2) - drives the tier-gating switcher.
      return Promise.resolve(ok([3, 4, 5, 6, 7, 8].map(t => ({ id: `T${t}_MAIN_SWORD`, name: 'Broadsword' }))))
    }
    return Promise.resolve(new Response(JSON.stringify({ status: 'error' }), { status: 404 }))
  })
})

function renderPage(initial = '/albion/market-manager/item/T5_MAIN_SWORD?quality=1&city=Caerleon') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <AuthProvider>
        <LayoutOverrideProvider>
          <Routes>
            <Route path="/albion/market-manager/item/:itemId" element={<ItemDetailPage />} />
          </Routes>
        </LayoutOverrideProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('ItemDetailPage', () => {
  it('shows the item with per-quality prices, variant switchers, and craft stats', async () => {
    renderPage()

    expect(await screen.findByText("Expert's Broadsword")).toBeInTheDocument()
    // quality strip + stat cards both show the Q1/Q2 sells
    expect(await screen.findAllByText('5,100')).not.toHaveLength(0)
    expect(screen.getAllByText('6,200')).not.toHaveLength(0)
    // variant switchers
    expect(screen.getByText('T8')).toBeInTheDocument()
    expect(screen.getByText('.4')).toBeInTheDocument()
    // tier gating: sword family is T3-T8, so T3 shows but T1/T2 do not
    expect(screen.getByText('T3')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('T1')).toBeNull())
    expect(screen.queryByText('T2')).toBeNull()
    // craft: base = optimized = 16×100 + 8×50 = 2000 at 15.2% base return → 1696
    expect(await screen.findAllByText('1,696')).not.toHaveLength(0)
  })

  it('hides the quality strip for items that do not support quality (has_quality=false)', async () => {
    // a crest (shopcategory "other") has no quality -> only Normal, no Q1-5 strip
    renderPage('/albion/market-manager/item/T4_CAPEITEM_UNDEAD_BP?quality=1&city=Caerleon')
    expect(await screen.findByText("Expert's Broadsword")).toBeInTheDocument()
    // the non-Normal quality labels live only in the strip - they must be gone
    await waitFor(() => expect(screen.queryByText('Good')).toBeNull())
    expect(screen.queryByText('Outstanding')).toBeNull()
    expect(screen.queryByText('Masterpiece')).toBeNull()
  })

  it('scales the aggregated shopping list by quantity', async () => {
    renderPage()
    expect(await screen.findByText("Expert's Broadsword")).toBeInTheDocument()
    await screen.findAllByText('1,696')

    // rr 15.2%: 16×0.848 = 13.57 → ceil 14 metalbars for qty 1; label carries tier + name
    expect(await screen.findByText(/14× T5 Metal Bar/)).toBeInTheDocument()

    const qtyInput = screen.getByLabelText('Crafting tree quantity')
    fireEvent.change(qtyInput, { target: { value: '10' } })

    // 13.57 × 10 = 135.7 → 136
    await waitFor(() => {
      expect(screen.getByText(/136× T5 Metal Bar/)).toBeInTheDocument()
    })
    expect(screen.getByText('Total for 10')).toBeInTheDocument()
  })

  it('crafting tree toggles between optimized and full expansion and scales by qty', async () => {
    renderPage()
    expect(await screen.findByText("Expert's Broadsword")).toBeInTheDocument()
    expect(await screen.findByText('Crafting Tree')).toBeInTheDocument()

    // Optimized: metalbar craft (2×60×0.85 = 102) loses to buy (100) → ore stays hidden.
    expect(screen.queryByText(/Iron Ore/)).toBeNull()

    await userEvent.click(screen.getByText('Full craft'))
    // Full craft refines from raw: 16×0.848 = 13.57 metalbars → 2×0.848×13.57 = 23.01 → 24 ore.
    // Ore appears in the tree AND the aggregated list beside it.
    expect(await screen.findAllByText(/Iron Ore/)).toHaveLength(2)
    expect(screen.getByText('24×')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Crafting tree quantity'), { target: { value: '10' } })
    await waitFor(() => {
      // 2×0.848×135.68 = 230.1 → 231 ore for 10 swords.
      expect(screen.getByText('231×')).toBeInTheDocument()
    })
  })

  it('renders the three strategy cards, selects one, and recomputes cost for buy orders', async () => {
    renderPage()
    expect(await screen.findByText("Expert's Broadsword")).toBeInTheDocument()
    await screen.findAllByText('1,696')

    // base / optimized / full-craft are the single strategy control now (one label each)
    expect(screen.getByText('Optimized')).toBeInTheDocument()
    expect(screen.getByText('Full craft')).toBeInTheDocument()
    const baseCard = screen.getByText('Base mats').closest('[role="button"]')!
    await userEvent.click(baseCard)
    expect(baseCard).toHaveAttribute('aria-pressed', 'true')

    // Buy orders on the always-visible Optimized card: metalbar min(buy 90, craft
    // 2×50×0.848=84.8)=84.8; leather 40 → 13.568×84.8 + 6.784×40 = 1421.9 → 1,422
    await userEvent.click(screen.getByText('Buy orders'))
    expect(await screen.findAllByText('1,422')).not.toHaveLength(0)
  })

  it('reconciles the shopping-list total to the strategy cost via a resource-return credit', async () => {
    renderPage()
    expect(await screen.findByText("Expert's Broadsword")).toBeInTheDocument()
    await screen.findAllByText('1,696')
    // Whole-unit buys (14×100 + 7×50 = 1,750) minus the return credit foot to the amortized
    // cost the cards + profit use (1,696), shown as the shopping-list total.
    expect(screen.getByText('Resource return')).toBeInTheDocument()
    expect(screen.getByText('Total for 1')).toBeInTheDocument()
  })

  it('resources have no quality strip or quality label', async () => {
    renderPage('/albion/market-manager/item/T5_PLANKS?city=Caerleon')

    expect(await screen.findByText('Crafting Tree')).toBeInTheDocument()
    // gear pages show the per-quality strip; resources hide it entirely
    expect(screen.queryByText('Masterpiece')).toBeNull()
    expect(screen.queryByText('Outstanding')).toBeNull()
  })

  it('gear pages keep the quality strip', async () => {
    renderPage()
    expect(await screen.findByText("Expert's Broadsword")).toBeInTheDocument()
    expect(screen.getByText('Masterpiece')).toBeInTheDocument()
  })

  it('shows the traded average with a suspect flag when the live ask is a lone troll', async () => {
    fetchSpy.mockImplementation((url: string | URL) => {
      const u = String(url)
      if (u.includes('/auth/me')) {
        return Promise.resolve(ok({
          id: 'u1', discord_id: 'd1', username: 'Tester#0001', avatar: 'h',
          guilds: { running_dawn: { is_member: true, roles: { albion_guild: true } } },
        }))
      }
      if (u.includes('/game/albion/prices/history/')) {
        return Promise.resolve(ok([{
          item_id: 'T5_MAIN_SWORD', location: 'Caerleon', quality: 1,
          data: [{ timestamp: new Date().toISOString().replace('Z', ''), avg_price: 5050, item_count: 2 }],
        }]))
      }
      if (u.includes('/game/albion/recipes/')) {
        const requestedId = decodeURIComponent(u.split('/recipes/')[1].split(',')[0])
        return Promise.resolve(ok([{
          item_id: requestedId, name: "Expert's Broadsword", count: 1, craftable: true,
          has_quality: true,
          recipe: [{ item_id: 'T5_METALBAR', name: 'Metal Bar', count: 16, craftable: false, recipe: [] }],
        }]))
      }
      if (u.includes('/game/albion/prices/volumes/')) {
        return Promise.resolve(ok([
          {
            item_id: 'T5_MAIN_SWORD', city: 'Caerleon', quality: 1,
            sold_1h: 3, sold_24h: 55, sold_7d: 300, sold_30d: 1200,
            avg_price_24h: 5050, avg_price_7d: 5000, avg_price_30d: 4900,
            avg_daily_sold: 40,
          },
        ]))
      }
      if (u.includes('/game/albion/prices/')) {
        // A lone troll ask; the server capped effective_sell to the traded average.
        return Promise.resolve(ok([
          { item_id: 'T5_MAIN_SWORD', city: 'Caerleon', quality: 1, sell_price_min: 799999, effective_sell: 5050, sell_suspect: true, buy_price_max: 4500 },
          { item_id: 'T5_METALBAR', city: 'Caerleon', quality: 1, sell_price_min: 100, buy_price_max: 90 },
        ]))
      }
      if (u.includes('/game/albion/items')) {
        return Promise.resolve(ok([3, 4, 5, 6, 7, 8].map(t => ({ id: `T${t}_MAIN_SWORD`, name: 'Broadsword' }))))
      }
      return Promise.resolve(new Response(JSON.stringify({ status: 'error' }), { status: 404 }))
    })

    renderPage()
    expect(await screen.findByText("Expert's Broadsword")).toBeInTheDocument()
    // the troll 799,999 never renders; the traded average shows instead
    await waitFor(() => expect(screen.queryByText('799,999')).toBeNull())
    expect(screen.getAllByText(/5,050/).length).toBeGreaterThan(0)
    // the raw ask is preserved on the suspect marker's tooltip
    expect(screen.getAllByTitle(/799,999 looks like a lone troll listing/).length).toBeGreaterThan(0)
  })

  it('switching enchant navigates to the @n variant', async () => {
    renderPage()
    expect(await screen.findByText("Expert's Broadsword")).toBeInTheDocument()

    await userEvent.click(screen.getByText('.2'))
    await waitFor(() => {
      const calls = fetchSpy.mock.calls.map(c => String(c[0]))
      expect(calls.some(u => u.includes('T5_MAIN_SWORD%402') || u.includes('T5_MAIN_SWORD@2'))).toBe(true)
    })
  })
})
