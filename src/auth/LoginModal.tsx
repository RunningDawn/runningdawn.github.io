import { Modal } from '../components/Modal'
import { useAuth, type AuthUser, type GuildStatus } from './authContext'

// One row of chips per game: roles share a row when their slug prefix matches (wowf_member, wowf_leadership).
function byGame({ roles, quiet = [] }: GuildStatus): Record<string, [string, boolean][]> {
  const out: Record<string, [string, boolean][]> = {}
  for (const [role, ok] of Object.entries(roles)) {
    if (!ok && quiet.includes(role)) continue
    const game = role.split('_')[0]
    ;(out[game] ??= []).push([role, ok])
  }
  return out
}

// 'running_dawn' -> 'Running Dawn'
function titleCase(slug: string): string {
  return slug
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function AccessChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded ${ok ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}
    >
      {ok ? '✓' : '✗'} {label}
    </span>
  )
}

// One row per guild the backend reports on: membership chip + a chip per named role.
function GuildAccess({ user }: { user: AuthUser }) {
  const guilds = Object.entries(user.guilds)
  return (
    <div className="pb-1 space-y-2">
      <p className="text-sm text-[#e2e4ed]">Guild access</p>
      {guilds.length === 0 && (
        <p className="text-xs text-[#9ca3af]">No guild status yet. Try logging in again.</p>
      )}
      {guilds.map(([slug, status]) => (
        <div key={slug} className="space-y-1">
          <p className="text-xs text-[#6b7280]">{titleCase(slug)}</p>
          <div className="flex flex-wrap gap-2">
            <AccessChip ok={status.is_member} label="Member" />
          </div>
          {Object.values(byGame(status)).map(roles => (
            <div key={roles[0][0]} className="flex flex-wrap gap-2">
              {roles.map(([role, ok]) => (
                <AccessChip key={role} ok={ok} label={status.labels?.[role] ?? `${titleCase(role)} role`} />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, isAuthenticated, login, logout } = useAuth()

  return (
    <Modal open={open} onClose={onClose} title="Account">
      <div className="px-5 py-4">
        {isAuthenticated && user ? (
          <div className="space-y-4">
            {/* Account */}
            <div className="flex items-center gap-3">
              {user.avatar && (
                <img src={user.avatar} alt="" width={40} height={40} className="rounded-full" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[#e2e4ed] truncate">{user.username}</p>
                <p className="text-xs text-[#6b7280] truncate">{user.discord_id}</p>
              </div>
              <button
                onClick={() => logout()}
                className="text-xs px-3 py-1.5 rounded font-semibold text-white bg-red-600/80 hover:bg-red-600 transition-colors cursor-pointer shrink-0"
              >
                Logout
              </button>
            </div>

            {/* Guild access */}
            <div className="border-t border-[#2a2d3a] pt-3">
              <GuildAccess user={user} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-sm text-[#e2e4ed]">Sign in to unlock:</p>
              <ul className="text-xs text-[#9ca3af] space-y-1 list-disc list-inside">
                <li>
                  Access the guild-only <span className="text-[#e2e4ed]">WoW: Forever</span> roster and loot tools.
                </li>
                <li>Your guild membership and roles sync from Discord automatically.</li>
              </ul>
            </div>
            <button
              onClick={() => login()}
              className="w-full py-2 rounded text-sm font-semibold text-white bg-[#5865F2] hover:bg-[#4752c4] transition-colors cursor-pointer"
            >
              Login with Discord
            </button>
            <p className="text-xs text-[#6b7280] leading-relaxed border-t border-[#2a2d3a] pt-3">
              Login gives access to guild services, which require Running Dawn membership and the WoW guild role.
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
