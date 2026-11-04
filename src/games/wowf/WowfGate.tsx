import type { ReactNode } from 'react'
import { useWowfAccess } from './access'

export function WowfGate({ children }: { children: ReactNode }) {
  const { loading, isAuthenticated, member, role, username, login } = useWowfAccess()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div
          className="w-8 h-8 border-2 border-[#c4af64] border-t-transparent rounded-full animate-spin"
          role="status"
          aria-label="Loading"
        />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <p className="text-sm text-[#9ca3af]">Sign in with Discord to continue.</p>
        <button
          onClick={() => login()}
          className="px-5 py-2 rounded text-sm font-semibold text-white bg-[#5865F2] hover:bg-[#4752c4] transition-colors cursor-pointer"
        >
          Login with Discord
        </button>
      </div>
    )
  }

  const denied: string[] = []
  if (!member) denied.push('Not a Running Dawn guild member.')
  if (!role) denied.push("You don't have the WoW: Forever member role.")

  if (denied.length > 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <p className="text-sm text-[#9ca3af]">Signed in as {username}</p>
        {denied.map(msg => <p key={msg} className="text-sm text-red-400">{msg}</p>)}
        <p className="text-xs text-[#6b7280] mt-2">Ask leadership for access, then log in again.</p>
      </div>
    )
  }

  return <>{children}</>
}
