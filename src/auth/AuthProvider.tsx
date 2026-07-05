import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { API_URLS, DISCORD_CLIENT_ID } from '../config/apiUrls'
import { setOnUnauthenticated } from './unauthorized'
import { AuthContext, type AuthUser } from './authContext'

// runningdawn holds its OWN session independent of forgehaven.io. The api.forgehaven.io
// cookie can't be used cross-domain, so we keep the JWT the callback returns in
// localStorage and send it as `Authorization: Bearer` on every backend call.
const TOKEN_KEY = 'forge_token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }, [])

  useEffect(() => {
    setOnUnauthenticated(() => {
      localStorage.removeItem(TOKEN_KEY)
      setUser(null)
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    async function check() {
      const token = localStorage.getItem(TOKEN_KEY)
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const res = await fetch(`${API_URLS.forgeAPI}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const body = await res.json()
        if (cancelled) return
        if (body.status === 'ok') {
          setUser(body.payload)
        } else {
          localStorage.removeItem(TOKEN_KEY)
        }
      } catch {
        /* network error - keep the token, treat as logged out for this load */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    check()
    return () => { cancelled = true }
  }, [])

  const login = useCallback(() => {
    sessionStorage.setItem('auth_return_path', window.location.pathname)
    const redirectUri = `${window.location.origin}/auth/callback`
    const params = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify guilds guilds.members.read',
    })
    window.location.href = `${API_URLS.discordAuthorize}?${params}`
  }, [])

  const logout = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    try {
      await fetch(`${API_URLS.forgeAPI}/auth/logout`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
    } catch {
      /* offline or API down - proceed with the client-side logout */
    }
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    window.location.reload()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: user !== null, login, logout, clearAuth }}>
      {children}
    </AuthContext.Provider>
  )
}
