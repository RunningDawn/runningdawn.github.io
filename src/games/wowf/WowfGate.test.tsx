import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthContext, type AuthContextType, type AuthUser } from '../../auth/authContext'
import { WowfGate } from './WowfGate'

function ctx(over: Partial<AuthContextType>): AuthContextType {
  return {
    user: null, loading: false, isAuthenticated: false,
    login: vi.fn(), logout: vi.fn(), ...over,
  }
}

function user(isMember: boolean, hasRole: boolean): AuthUser {
  return {
    id: 'u1', discord_id: 'd1', username: 'Jakob', avatar: null,
    guilds: { running_dawn: { is_member: isMember, roles: { wowf_member: hasRole } } },
  }
}

function renderGate(value: AuthContextType) {
  return render(
    <AuthContext.Provider value={value}>
      <WowfGate><p>secret</p></WowfGate>
    </AuthContext.Provider>,
  )
}

describe('WowfGate', () => {
  it('shows a spinner while auth loads', () => {
    renderGate(ctx({ loading: true }))
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('secret')).not.toBeInTheDocument()
  })

  it('offers Discord login when logged out', async () => {
    const login = vi.fn()
    renderGate(ctx({ login }))
    await userEvent.setup().click(screen.getByRole('button', { name: 'Login with Discord' }))
    expect(login).toHaveBeenCalled()
    expect(screen.queryByText('secret')).not.toBeInTheDocument()
  })

  it('lists both reasons for a non-member', () => {
    renderGate(ctx({ isAuthenticated: true, user: user(false, false) }))
    expect(screen.getByText('Signed in as Jakob')).toBeInTheDocument()
    expect(screen.getByText('Not a Running Dawn guild member.')).toBeInTheDocument()
    expect(screen.getByText("You don't have the WoW: Forever member role.")).toBeInTheDocument()
  })

  it('lists only the role reason for a member without the role', () => {
    renderGate(ctx({ isAuthenticated: true, user: user(true, false) }))
    expect(screen.queryByText('Not a Running Dawn guild member.')).not.toBeInTheDocument()
    expect(screen.getByText("You don't have the WoW: Forever member role.")).toBeInTheDocument()
  })

  it('renders children for a member with the role', () => {
    renderGate(ctx({ isAuthenticated: true, user: user(true, true) }))
    expect(screen.getByText('secret')).toBeInTheDocument()
  })
})
