import { useAuth, wowfAccess } from '../../auth/authContext'

// Gate: Running Dawn member holding the WoW: Forever member role.
export function useWowfAccess() {
  const { user, loading, isAuthenticated, login } = useAuth()
  const { member, role, leadership } = wowfAccess(user)
  return {
    loading,
    isAuthenticated,
    member,
    role,
    ok: isAuthenticated && member && role,
    leadership: isAuthenticated && member && leadership,
    username: user?.username ?? '',
    userId: user?.id ?? null,
    login,
  }
}
