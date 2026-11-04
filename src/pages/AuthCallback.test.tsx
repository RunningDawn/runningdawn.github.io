import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import AuthCallback from './AuthCallback'

function renderAt(query: string) {
  render(<MemoryRouter initialEntries={[`/auth/callback?${query}`]}><AuthCallback /></MemoryRouter>)
}

describe('AuthCallback state check', () => {
  afterEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('refuses a callback this tab did not start', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    sessionStorage.setItem('auth_state', 'mine')
    renderAt('code=c&state=theirs')
    expect(await screen.findByText(/not started here/)).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('auth_state')).toBeNull()
  })

  it('refuses a callback with no login in progress', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    renderAt('code=c&state=any')
    expect(await screen.findByText(/not started here/)).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('exchanges the code when the state matches', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'error', message: 'Bad code' })),
    )
    sessionStorage.setItem('auth_state', 'mine')
    renderAt('code=c&state=mine')
    expect(await screen.findByText('Bad code')).toBeInTheDocument()
    expect(fetchSpy).toHaveBeenCalledOnce()
  })
})
