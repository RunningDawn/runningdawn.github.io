import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { API_URLS } from '../config/apiUrls'
import styles from './AuthCallback.module.css'

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const initiatedRef = useRef(false)

  useEffect(() => {
    // StrictMode double-invokes effects; a Discord code is single-use, so guard.
    if (initiatedRef.current) return
    initiatedRef.current = true

    const code = searchParams.get('code')
    const errParam = searchParams.get('error')

    if (errParam) {
      const returnPath = sessionStorage.getItem('auth_return_path') || '/'
      sessionStorage.removeItem('auth_return_path')
      window.location.href = returnPath
      return
    }

    if (!code) {
      Promise.resolve().then(() => setError('No authorization code received from Discord.'))
      return
    }

    async function exchange() {
      try {
        // Send the redirect_uri we authorized with so the backend byte-matches it at
        // token exchange (the allowlist accepts runningdawn.com/auth/callback).
        const res = await fetch(`${API_URLS.forgeAPI}/auth/discord/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            redirect_uri: `${window.location.origin}/auth/callback`,
          }),
        })

        const body = await res.json()

        if (body.status === 'error') {
          setError(body.message || 'Authentication failed.')
          return
        }

        // Store the JWT for the Bearer-based session (see AuthProvider).
        if (body.payload?.token) {
          localStorage.setItem('forge_token', body.payload.token)
        }

        const returnPath = sessionStorage.getItem('auth_return_path') || '/'
        sessionStorage.removeItem('auth_return_path')
        window.location.href = returnPath
      } catch {
        setError('Network error during authentication.')
      }
    }

    exchange()
  }, [searchParams])

  if (error) {
    return (
      <div className={styles.wrap}>
        <p className={styles.error}>{error}</p>
        <a href="/" className={styles.back}>Back to Running Dawn</a>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.spinner} />
      <p className={styles.msg}>Authenticating...</p>
    </div>
  )
}
