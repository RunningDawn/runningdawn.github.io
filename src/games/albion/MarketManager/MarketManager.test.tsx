import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AuthProvider } from '../../../auth/AuthProvider'
import { LayoutOverrideProvider } from '../../../components/LayoutOverride'
import { MarketManager } from './MarketManager'

const fetchSpy = vi.fn()
globalThis.fetch = fetchSpy

function testUser(member: boolean, role: boolean) {
  return {
    id: 'u1',
    discord_id: 'd1',
    username: 'TestUser#0001',
    avatar: 'https://cdn.discordapp.com/avatars/d1/hash.png',
    guilds: { running_dawn: { is_member: member, roles: { albion_guild: role } } },
  }
}

const origLocation = window.location

beforeEach(() => {
  fetchSpy.mockReset()
  sessionStorage.clear()
  localStorage.clear()
  // runningdawn authenticates from a stored bearer token; seed one so the
  // AuthProvider actually calls /auth/me (mocked per-test below).
  localStorage.setItem('forge_token', 'test-token')

  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...origLocation, href: '', pathname: '/albion/market-manager', origin: 'https://runningdawn.com' },
  })
})

afterEach(() => {
  Object.defineProperty(window, 'location', { writable: true, value: origLocation })
})

function renderMM() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LayoutOverrideProvider>
          <MarketManager />
        </LayoutOverrideProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('MarketManager', () => {
  it('shows loading spinner initially', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ status: 'error' }), { status: 401 }))

    const { container } = renderMM()

    await waitFor(() => {
      expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })
  })

  it('shows login button when unauthenticated', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ status: 'error', message: 'Not authenticated' }), { status: 401 }))

    renderMM()

    const button = await screen.findByText('Login with Discord')
    expect(button).toBeInTheDocument()
  })

  it('calls login when Discord button is clicked', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ status: 'error' }), { status: 401 }))

    renderMM()

    const button = await screen.findByText('Login with Discord')
    await userEvent.click(button)

    expect(window.location.href).toContain('discord.com/api/oauth2/authorize')
  })

  it('shows welcome message when authenticated', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({
      status: 'ok',
      payload: testUser(true, true),
    }), { status: 200 }))

    renderMM()

    await waitFor(() => {
      expect(screen.getByText('Welcome, TestUser#0001')).toBeInTheDocument()
    })
  })

  it('shows guild denied message when not a guild member', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({
      status: 'ok',
      payload: testUser(false, true),
    }), { status: 200 }))

    renderMM()

    await waitFor(() => {
      expect(screen.getByText('Not a Running Dawn guild member.')).toBeInTheDocument()
    })
  })

  it('shows role denied message when missing role', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({
      status: 'ok',
      payload: testUser(true, false),
    }), { status: 200 }))

    renderMM()

    await waitFor(() => {
      expect(screen.getByText("You don't have the needed discord role.")).toBeInTheDocument()
    })
  })

  it('shows both denied messages when missing both', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({
      status: 'ok',
      payload: testUser(false, false),
    }), { status: 200 }))

    renderMM()

    await waitFor(() => {
      expect(screen.getByText('Not a Running Dawn guild member.')).toBeInTheDocument()
      expect(screen.getByText("You don't have the needed discord role.")).toBeInTheDocument()
    })
  })
})
