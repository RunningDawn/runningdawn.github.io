// Roster data + pure helpers. Keep UI out of here so the helpers stay testable.
// Reference data comes from data/wowfMeta.json, shared byte-for-byte with forge-api,
// which enforces the same rules server-side.
import meta from './data/wowfMeta.json'

export type Faction = keyof typeof meta.raceClasses
export type Ruleset = string

export const FACTIONS = Object.keys(meta.raceClasses) as Faction[]
export const RULESETS: readonly string[] = meta.rulesets
export const MAX_LEVEL: number = meta.maxLevel
const NAME_PATTERN = new RegExp(meta.namePattern)
// WoW: Forever names are "Firstname Lastname" (same rule as forge-api).
export const validName = (name: string) => name.trim().length <= meta.maxName && NAME_PATTERN.test(name.trim())
export const MAX_PROFESSIONS: number = meta.maxProfessions
export const PROFESSIONS: readonly string[] = meta.professions
export const CLASS_SPECS: Record<string, string[]> = meta.classSpecs
export const CLASSES = Object.keys(CLASS_SPECS)
export const CLASS_COLORS: Record<string, string> = meta.classColors
export const ROLES: readonly string[] = meta.roles
const SPEC_ROLES: Record<string, Record<string, string>> = meta.specRoles
// Wowhead spec art, bundled under assets/specs so cards never hit a third-party CDN.
const SPEC_ART = import.meta.glob<string>('./assets/specs/*.jpg', { eager: true, import: 'default', query: '?url' })
const SPEC_ICONS: Record<string, Record<string, string>> = meta.specIcons
export const roleFor = (cls: string, spec: string): string => SPEC_ROLES[cls]?.[spec] ?? ''
export const specIcon = (cls: string, spec: string): string | null => {
  const slug = SPEC_ICONS[cls]?.[spec]
  return slug ? SPEC_ART[`./assets/specs/${slug}.jpg`] ?? null : null
}
export const EVENT_KINDS: readonly string[] = meta.eventKinds
export const EVENT_STYLES: readonly string[] = meta.eventStyles
export const SLOTS: readonly string[] = meta.slots
export const RESERVE_OUTCOMES: readonly string[] = meta.reserveOutcomes
export const ATTENDANCE_STATUSES: readonly string[] = meta.attendanceStatuses
export const MAX_RESERVE_LIMIT: number = meta.maxReserveLimit

// Composition buckets: melee and ranged DPS count together.
export type Bucket = 'tank' | 'healer' | 'dps'
export type Composition = Record<Bucket, number>
export const BUCKETS: readonly Bucket[] = ['tank', 'healer', 'dps']
export const BUCKET_LABELS: Record<Bucket, string> = { tank: 'Tanks', healer: 'Healers', dps: 'DPS' }
export const bucketOf = (role: string | null | undefined): Bucket | null =>
  role === 'Tank' ? 'tank' : role === 'Healer' ? 'healer' : role?.endsWith('DPS') ? 'dps' : null
export function roleCounts(roles: (string | null | undefined)[]): Composition {
  const out: Composition = { tank: 0, healer: 0, dps: 0 }
  for (const r of roles) { const b = bucketOf(r); if (b) out[b]++ }
  return out
}
export type RoleTally = Composition & { none: number }
// Role buckets as shown in the availability panels: label and colours.
export const ROLE_TILES = [
  { key: 'tank', label: 'Tanks', one: 'Tank', text: 'text-sky-300', dot: 'bg-sky-400' },
  { key: 'healer', label: 'Healers', one: 'Healer', text: 'text-green-300', dot: 'bg-green-400' },
  { key: 'dps', label: 'DPS', one: 'DPS', text: 'text-red-300', dot: 'bg-red-400' },
  { key: 'none', label: 'No role', one: 'No role', text: 'text-[#9ca3af]', dot: 'bg-[#6b7280]' },
] as const
export const tileOf = (role: string | null | undefined) => ROLE_TILES.find(t => t.key === (bucketOf(role) ?? 'none'))!
export function roleTally(roles: (string | null | undefined)[]): RoleTally {
  const c = roleCounts(roles)
  return { ...c, none: roles.length - c.tank - c.healer - c.dps }
}
// `total` = everyone counted; the rest have no role (their main has no spec).
export function roleSummary(c: Composition, total = c.tank + c.healer + c.dps) {
  const none = total - c.tank - c.healer - c.dps
  return `${c.tank} Tank${c.tank === 1 ? '' : 's'}, ${c.healer} Healer${c.healer === 1 ? '' : 's'}, ${c.dps} DPS${none > 0 ? `, ${none} no role` : ''}`
}

// Event extras live in the event's free-form `data`.
export const eventStyle = (data: Record<string, unknown>): string | null =>
  typeof data.style === 'string' && EVENT_STYLES.includes(data.style) ? data.style : null
export function eventComposition(data: Record<string, unknown>): Composition | null {
  const c = data.composition
  if (!c || typeof c !== 'object') return null
  const out: Composition = { tank: 0, healer: 0, dps: 0 }
  for (const b of BUCKETS) out[b] = Math.max(0, Math.floor(Number((c as Record<string, unknown>)[b])) || 0)
  return out.tank + out.healer + out.dps > 0 ? out : null
}

const RACE_CLASSES: Record<Faction, Record<string, string[]>> = meta.raceClasses
export const FACTION_RACES: Record<Faction, string[]> = {
  Horde: Object.keys(RACE_CLASSES.Horde),
  Alliance: Object.keys(RACE_CLASSES.Alliance),
}
export const classesFor = (faction: Faction, race: string): string[] => RACE_CLASSES[faction][race] ?? []

// Client-side shape (camelCase). `secondSpec` is the API's off_spec.
export interface WowfCharacter {
  id: string
  name: string
  faction: Faction
  race: string
  ruleset: Ruleset
  class: string
  level: number
  mainSpec: string
  secondSpec: string
  // Raid role; defaults from the main spec, leadership or the owner can override.
  role: string
  // Up to MAX_PROFESSIONS, kept sorted so rosters sort and compare cleanly.
  professions: string[]
  main: boolean
  archived?: boolean
  // Server stamp of the last save (null before the first save).
  updatedAt: string | null
}

export interface Roster {
  characters: WowfCharacter[]
}

// Row as forge-api returns it.
export interface ApiCharacter {
  id: string
  user_id: string | null
  name: string
  faction: string
  race: string
  class: string
  ruleset: string
  level: number
  main_spec: string | null
  off_spec: string | null
  role: string | null
  professions: string[]
  is_main: boolean
  archived?: boolean
  position: number
  data: Record<string, unknown>
  updated_at: string | null
}

// Body forge-api accepts for create/replace.
export interface CharacterBody {
  name: string
  faction: string
  race: string
  class: string
  ruleset: string
  level: number
  main_spec: string | null
  off_spec: string | null
  professions: string[]
  is_main: boolean
  base_updated_at?: string | null
}

// sanitize() coerces values but also forces one main per list, so the row's
// own flag is restored afterwards.
export function fromApi(row: ApiCharacter): WowfCharacter {
  const c = sanitize({ characters: [{
    id: row.id,
    name: row.name,
    faction: row.faction as Faction,
    race: row.race,
    ruleset: row.ruleset,
    class: row.class,
    level: row.level,
    mainSpec: row.main_spec ?? '',
    secondSpec: row.off_spec ?? '',
    role: row.role ?? '',
    professions: row.professions,
    main: row.is_main,
    updatedAt: row.updated_at,
  }] }).characters[0]
  return { ...c, main: row.is_main, archived: row.archived === true }
}

export function toApi(c: WowfCharacter, baseUpdatedAt?: string | null): CharacterBody {
  const body: CharacterBody = {
    name: c.name.trim(),
    faction: c.faction,
    race: c.race,
    class: c.class,
    ruleset: c.ruleset,
    level: c.level,
    main_spec: c.mainSpec || null,
    off_spec: c.secondSpec || null,
    professions: [...c.professions].sort(),
    is_main: c.main,
  }
  if (baseUpdatedAt !== undefined) body.base_updated_at = baseUpdatedAt
  return body
}

export function newCharacter(main: boolean): WowfCharacter {
  return {
    id: crypto.randomUUID(),
    name: '',
    faction: 'Horde',
    race: '',
    ruleset: 'PvP',
    class: '',
    level: 1,
    mainSpec: '',
    secondSpec: '',
    role: '',
    professions: [],
    main,
    updatedAt: null,
  }
}

export const clampLevel = (n: number) => Math.min(MAX_LEVEL, Math.max(1, Math.floor(n) || 1))

export function reorder<T>(list: T[], from: number, to: number): T[] {
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

// Exactly one main: picking one clears the rest.
export function setMain(list: WowfCharacter[], id: string): WowfCharacter[] {
  return list.map(c => ({ ...c, main: c.id === id }))
}

// Coerce any stored/server blob into a valid roster: unknown values fall back
// to defaults, one main is guaranteed when the list is non-empty.
export function sanitize(raw: unknown): Roster {
  const list = Array.isArray((raw as Roster | null)?.characters) ? (raw as Roster).characters : []
  const characters = list.map((c): WowfCharacter => {
    const d = newCharacter(false)
    const r = (c ?? {}) as Partial<WowfCharacter>
    const cls = CLASSES.includes(r.class ?? '') ? r.class! : ''
    const specs = CLASS_SPECS[cls] ?? []
    const pick = (v: unknown, allowed: readonly string[]) => (typeof v === 'string' && allowed.includes(v) ? v : '')
    const profs = Array.isArray(r.professions)
      ? [...new Set(r.professions.filter(v => typeof v === 'string' && PROFESSIONS.includes(v)))].sort().slice(0, MAX_PROFESSIONS)
      : []
    const faction = (pick(r.faction, FACTIONS) || d.faction) as Faction
    return {
      id: typeof r.id === 'string' && r.id ? r.id : d.id,
      name: typeof r.name === 'string' ? r.name : '',
      faction,
      race: pick(r.race, FACTION_RACES[faction]),
      ruleset: pick(r.ruleset, RULESETS) || d.ruleset,
      class: cls,
      level: clampLevel(Number(r.level)),
      mainSpec: pick(r.mainSpec, specs),
      secondSpec: pick(r.secondSpec, specs),
      role: pick(r.role, ROLES),
      professions: profs,
      main: r.main === true,
      archived: r.archived === true,
      updatedAt: typeof r.updatedAt === 'string' && !Number.isNaN(Date.parse(r.updatedAt)) ? r.updatedAt : null,
    }
  })
  if (characters.length && !characters.some(c => c.main)) characters[0].main = true
  return { characters }
}

// Coarse relative time for "updated" labels.
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
