import { createContext, useContext } from 'react'

export interface GuildStatus {
  is_member: boolean
  roles: Record<string, boolean>
}

export interface AuthUser {
  id: string
  discord_id: string
  username: string
  avatar: string | null
  guilds: Record<string, GuildStatus>
}

// Slug of the guild whose albion_guild role gates Albion access. Must match
// the backend's guild registry (forge-api src/util/auth/guilds.py).
export const MM_GUILD = 'running_dawn'

export function mmAccess(user: AuthUser | null): { member: boolean; role: boolean } {
  const g = user?.guilds?.[MM_GUILD]
  return { member: !!g?.is_member, role: !!g?.roles?.albion_guild }
}

export interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  isAuthenticated: boolean
  login: () => void
  logout: () => Promise<void>
  clearAuth: () => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
