import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AuthProvider } from '../../../auth/AuthProvider'
import { LayoutOverrideProvider } from '../../../components/LayoutOverride'
import { CraftSettingsPage } from './CraftSettingsPage'

const fetchSpy = vi.fn()
globalThis.fetch = fetchSpy

function ok(payload: unknown) {
  return new Response(JSON.stringify({ status: 'ok', message: '', payload }), { status: 200 })
}

const CITIES = ['Bridgewatch', 'Martlock', 'Thetford', 'FortSterling', 'Lymhurst', 'Caerleon', 'Brecilien']
const STATIONS = ['forge', 'hunters_lodge', 'mages_tower', 'toolmaker', 'alchemists_lab', 'cook', 'refining']

const SETTINGS = {
  cities: Object.fromEntries(
    CITIES.map(c => [c, {
      station_fees: Object.fromEntries(STATIONS.map(s => [s, 0])),
    }]),
  ),
}

beforeEach(() => {
  fetchSpy.mockReset()
  localStorage.clear()
  fetchSpy.mockImplementation((url: string | URL, init?: RequestInit) => {
    const u = String(url)
    if (u.includes('/auth/me')) {
      return Promise.resolve(ok({
        id: 'u1', discord_id: 'd1', username: 'Tester#0001', avatar: 'h',
        guilds: { running_dawn: { is_member: true, roles: { albion_guild: true } } },
      }))
    }
    if (u.includes('/game/albion/craft-settings')) {
      if (init?.method === 'PUT') return Promise.resolve(ok(null))
      return Promise.resolve(ok({ settings: SETTINGS, updated_at: '2026-07-01T10:00:00+00:00' }))
    }
    return Promise.resolve(new Response(JSON.stringify({ status: 'error' }), { status: 404 }))
  })
})

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LayoutOverrideProvider>
          <CraftSettingsPage />
        </LayoutOverrideProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('CraftSettingsPage', () => {
  it('shows the global banner, city bonuses with rates, and saves flat station fees', async () => {
    renderPage()

    expect(screen.getByText(/station fees are global/i)).toBeInTheDocument()

    const forgeFee = await screen.findByLabelText("Martlock Warrior's Forge fee")
    expect(screen.getByText(/refining bonus \(\+40% = 36\.7% return\)/i)).toBeInTheDocument()
    expect(screen.getByText(/crafting bonus \(\+15% = 24\.8% return\)/i)).toBeInTheDocument()
    // static bonus data rendered
    expect(screen.getByText('Hide')).toBeInTheDocument()
    expect(screen.getByText(/axes, quarterstaffs, frost staffs/i)).toBeInTheDocument()

    fireEvent.change(forgeFee, { target: { value: '350' } })
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/shared with everyone\./i)).toBeInTheDocument()
    })
    const putCall = fetchSpy.mock.calls.find(
      call => (call[1] as RequestInit | undefined)?.method === 'PUT',
    )!
    const body = JSON.parse(String((putCall[1] as RequestInit).body))
    expect(body.cities.Martlock.station_fees.forge).toBe(350)
    expect(body.cities.Caerleon.station_fees.forge).toBe(0)
  })

  it('premium toggle is per-user and persists to localStorage', async () => {
    renderPage()
    const toggle = await screen.findByLabelText(/i have premium/i)
    expect(toggle).toBeChecked()
    expect(screen.getByText(/sales tax 4%/i)).toBeInTheDocument()

    await userEvent.click(toggle)
    expect(screen.getByText(/sales tax 8%/i)).toBeInTheDocument()
    expect(localStorage.getItem('forgegames_albion_premium_v1')).toBe('false')
  })

  it('focus toggle switches the return-rate readout and persists', async () => {
    renderPage()
    const toggle = await screen.findByLabelText(/i craft with focus/i)
    expect(toggle).not.toBeChecked()
    expect(screen.getByText(/15\.2% base/)).toBeInTheDocument()

    await userEvent.click(toggle)
    expect(screen.getByText(/43\.5% base/)).toBeInTheDocument()
    expect(screen.getByText(/53\.9% refining bonus/)).toBeInTheDocument()
    expect(localStorage.getItem('forgegames_albion_focus_v1')).toBe('true')
  })

  it('default town selector persists to localStorage', async () => {
    renderPage()
    const select = await screen.findByLabelText(/default town/i)
    expect(select).toHaveValue('Bridgewatch')

    await userEvent.selectOptions(select, 'Martlock')
    expect(localStorage.getItem('forgegames_albion_default_city_v1')).toBe('Martlock')
  })

  it('renders a fee input for every station type', async () => {
    renderPage()
    await screen.findByLabelText("Martlock Warrior's Forge fee")
    expect(screen.getByLabelText("Caerleon Hunter's Lodge fee")).toBeInTheDocument()
    expect(screen.getByLabelText('Brecilien Refining fee')).toBeInTheDocument()
    expect(screen.getByLabelText("Thetford Alchemist's Lab fee")).toBeInTheDocument()
  })
})
