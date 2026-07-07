import { API_URLS } from '../config/apiUrls'
import { notifyUnauthenticated } from '../auth/unauthorized'

export type Envelope<T> =
  | { status: 'ok'; message?: string; payload: T }
  | { status: 'error'; message: string }

// Credentialed fetch against forge-api. runningdawn is a separate origin from
// api.forgehaven.io, so it authenticates with the Bearer token stored at login
// (localStorage 'forge_token') instead of a cookie. Always returns the
// {status, message, payload} envelope: 401s trigger the auth cleanup hook, and
// FastAPI HTTPException bodies ({detail}) are normalized into the envelope.
export async function forgeFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<Envelope<T>> {
  const token = localStorage.getItem('forge_token')
  const res = await fetch(`${API_URLS.forgeAPI}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })

  if (res.status === 401) {
    notifyUnauthenticated()
    return { status: 'error', message: 'Not authenticated' }
  }

  const body = await res.json()

  if (body && typeof body === 'object' && !('status' in body) && 'detail' in body) {
    return { status: 'error', message: String(body.detail) }
  }

  return body
}
