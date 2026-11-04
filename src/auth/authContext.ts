import { createContext, useContext } from 'react'

export interface GuildStatus {
  is_member: boolean
  roles: Record<string, boolean>
  // Display text per role and roles to hide when missing; absent from older APIs.
  labels?: Record<string, string>
  quiet?: string[]
}

export interface AuthUser {
  id: string
  discord_id: string
  username: string
  avatar: string | null
  guilds: Record<string, GuildStatus>
}

// Guild + role that gate the WoW: Forever section. Names must match forge-api's
// guild registry (src/util/auth/guilds.py).
export const WOWF_GUILD = 'running_dawn'
export const WOWF_ROLE = 'wowf_member'
export const WOWF_LEADERSHIP_ROLE = 'wowf_leadership'

export function wowfAccess(user: AuthUser | null): { member: boolean; role: boolean; leadership: boolean } {
  const g = user?.guilds?.[WOWF_GUILD]
  return {
    member: !!g?.is_member,
    role: !!g?.roles?.[WOWF_ROLE],
    leadership: !!g?.roles?.[WOWF_LEADERSHIP_ROLE],
  }
}

export interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  isAuthenticated: boolean
  login: () => void
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
