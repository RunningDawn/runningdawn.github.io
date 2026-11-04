import { API_URLS } from '../../config/apiUrls'
import { forgeFetch, type Envelope } from '../../lib/api'
import type { ApiCharacter, CharacterBody } from './roster'

const BASE = '/game/wowf'

// Own roster (login required; forge-api scopes rows to the caller).
export function listCharacters() {
  return forgeFetch<ApiCharacter[]>(`${BASE}/characters`)
}

export function createCharacter(body: CharacterBody) {
  return forgeFetch<ApiCharacter>(`${BASE}/characters`, { method: 'POST', body: JSON.stringify(body) })
}

export function updateCharacter(id: string, body: CharacterBody) {
  return forgeFetch<ApiCharacter>(`${BASE}/characters/${id}`, { method: 'PUT', body: JSON.stringify(body) })
}

// Archives the character (keeps its loot history); restoreCharacter brings it back.
export function deleteCharacter(id: string) {
  return forgeFetch<null>(`${BASE}/characters/${id}`, { method: 'DELETE' })
}

export function restoreCharacter(id: string) {
  return forgeFetch<ApiCharacter>(`${BASE}/characters/${id}/restore`, { method: 'POST' })
}

export function putOrder(order: string[]) {
  return forgeFetch<null>(`${BASE}/characters/order`, { method: 'PUT', body: JSON.stringify({ order }) })
}

// Leadership views and edits (wowf_leadership role, checked server-side).
// `user_id` null is the trailing "Pickup players" group: characters with no account yet.
export interface GuildRosterEntry {
  user_id: string | null
  username: string
  discord_username: string | null
  nickname: string | null
  avatar: string | null
  is_member: boolean
  has_role: boolean
  characters: ApiCharacter[]
}

export function getGuildRoster() {
  return forgeFetch<GuildRosterEntry[]>(`${BASE}/guild/roster`)
}

export function guildCreateCharacter(userId: string, body: CharacterBody) {
  return forgeFetch<ApiCharacter>(`${BASE}/guild/members/${userId}/characters`, {
    method: 'POST', body: JSON.stringify(body),
  })
}

export function createPickup(body: CharacterBody) {
  return forgeFetch<ApiCharacter>(`${BASE}/guild/pickups`, { method: 'POST', body: JSON.stringify(body) })
}

export function assignCharacter(id: string, userId: string) {
  return forgeFetch<ApiCharacter>(`${BASE}/guild/characters/${id}/assign`, { method: 'PUT', body: JSON.stringify({ user_id: userId }) })
}

export function guildUpdateCharacter(id: string, body: CharacterBody) {
  return forgeFetch<ApiCharacter>(`${BASE}/guild/characters/${id}`, { method: 'PUT', body: JSON.stringify(body) })
}

// Leadership: brings back an archived pickup (owned characters are restored by their owner).
export function guildRestorePickup(id: string) {
  return forgeFetch<ApiCharacter>(`${BASE}/guild/characters/${id}/restore`, { method: 'POST' })
}

// Leadership: archives by default; hard = delete permanently.
export function guildDeleteCharacter(id: string, hard = false) {
  return forgeFetch<null>(`${BASE}/guild/characters/${id}${hard ? '?hard=true' : ''}`, { method: 'DELETE' })
}

// Events, items, reserves, attendance (SR+ loot). Shapes mirror forge-api's payloads.
export interface ApiEvent {
  id: string
  kind: string
  name: string
  raid_id: string | null
  raid: { id: string; name: string; short_name: string } | null
  starts_at: string
  duration_minutes: number
  ends_at: string
  ruleset: string
  reserve_limit: number
  locked: boolean
  locked_at: string | null
  cancelled: boolean
  cancelled_at: string | null
  notes: string | null
  created_by: string | null
  data: Record<string, unknown>
  updated_at: string | null
}

export interface EventBody {
  kind: string
  name: string
  starts_at: string
  duration_minutes: number
  ruleset: string
  raid_id: string | null
  reserve_limit: number
  notes: string | null
  locked: boolean
  cancelled: boolean
  // Extras: `style` (eventStyles) and `composition` ({tank, healer, dps} wanted).
  data?: Record<string, unknown>
}

export interface ApiItemBoss {
  id: string
  name: string
  is_trash?: boolean
  position?: number
  raid: { id: string; name: string; short_name: string }
}

export interface ApiItem {
  id: string
  name: string
  slot: string | null
  recommended_classes: string[]
  image_url: string | null
  notes: string | null
  hard_reserved: boolean
  hard_reserve_note?: string | null
  bosses: ApiItemBoss[]
  updated_at: string | null
}

export interface ReserveCharacter {
  id: string
  name: string
  class: string
  user_id: string | null
  role?: string | null
}

export interface ApiReserve {
  id: string
  event_id: string
  character: ReserveCharacter
  item: ApiItem
  plus: number
  outcome: string
  created_by: string | null
  created_at: string | null
}

export interface ApiAttendance {
  character: ReserveCharacter
  status: string
  note: string | null
}

export interface ApiDrop {
  id: string
  event: { id: string; name: string; starts_at: string | null }
  item: ApiItem
  boss: { id: string; name: string } | null
  character: ReserveCharacter | null
  sr: boolean
  plus: number
  created_at: string | null
}

export interface ApiAdjustment {
  id: string
  event_id: string
  character: ReserveCharacter
  item: { id: string; name: string }
  amount: number
  reason: string
  created_at: string | null
}

export interface ApiEventDetail extends ApiEvent {
  reserves: ApiReserve[]
  attendance: ApiAttendance[]
  drops: ApiDrop[]
  adjustments?: ApiAdjustment[]
}

export interface ApiHistoryEntry {
  id: string
  event: { id: string; name: string; kind: string; starts_at: string | null }
  item: ApiItem
  plus: number
  outcome: string
}

export function listEvents() {
  return forgeFetch<ApiEvent[]>(`${BASE}/events`)
}

export function createEvent(body: EventBody) {
  return forgeFetch<ApiEvent>(`${BASE}/events`, { method: 'POST', body: JSON.stringify(body) })
}

export function getEvent(id: string) {
  return forgeFetch<ApiEventDetail>(`${BASE}/events/${id}`)
}

export function updateEvent(id: string, body: EventBody) {
  return forgeFetch<ApiEvent>(`${BASE}/events/${id}`, { method: 'PUT', body: JSON.stringify(body) })
}

export function deleteEvent(id: string) {
  return forgeFetch<null>(`${BASE}/events/${id}`, { method: 'DELETE' })
}

export function createReserve(eventId: string, characterId: string, itemId: string) {
  return forgeFetch<ApiReserve>(`${BASE}/events/${eventId}/reserves`, {
    method: 'POST', body: JSON.stringify({ character_id: characterId, item_id: itemId }),
  })
}

export function deleteReserve(id: string) {
  return forgeFetch<null>(`${BASE}/reserves/${id}`, { method: 'DELETE' })
}

export function setReserveOutcome(id: string, outcome: string) {
  return forgeFetch<ApiReserve>(`${BASE}/reserves/${id}`, { method: 'PUT', body: JSON.stringify({ outcome }) })
}

export function putAttendance(eventId: string, entries: { character_id: string; status: string }[]) {
  return forgeFetch<{ applied: number; attendance: ApiAttendance[] }>(`${BASE}/events/${eventId}/attendance`, {
    method: 'PUT', body: JSON.stringify({ entries }),
  })
}

// Standing reserves per character; signing up copies them into the event.
export function getPresets(characterId: string) {
  return forgeFetch<ApiItem[]>(`${BASE}/characters/${characterId}/reserves`)
}

export function putPresets(characterId: string, itemIds: string[]) {
  return forgeFetch<ApiItem[]>(`${BASE}/characters/${characterId}/reserves`, { method: 'PUT', body: JSON.stringify({ item_ids: itemIds }) })
}

export function signUp(eventId: string, characterId: string, note: string | null) {
  return forgeFetch<ApiEventDetail & { added: number }>(`${BASE}/events/${eventId}/signup`, {
    method: 'POST', body: JSON.stringify({ character_id: characterId, note }),
  })
}

export function withdraw(eventId: string, characterId: string, reason: string) {
  return forgeFetch<ApiEventDetail>(`${BASE}/events/${eventId}/withdraw`, {
    method: 'POST', body: JSON.stringify({ character_id: characterId, reason }),
  })
}

export function listItems() {
  return forgeFetch<ApiItem[]>(`${BASE}/items`)
}

export function characterHistory(characterId: string) {
  return forgeFetch<ApiHistoryEntry[]>(`${BASE}/characters/${characterId}/history`)
}

export interface ApiReserveWithEvent extends ApiReserve {
  event: { id: string; name: string; kind: string; starts_at: string | null; locked: boolean }
}

export interface ReserveFilters {
  event_id?: string
  character_id?: string
  item_id?: string
  outcome?: string
}

export function listAllReserves(filters: ReserveFilters = {}) {
  const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]).toString()
  return forgeFetch<ApiReserveWithEvent[]>(`${BASE}/reserves${qs ? `?${qs}` : ''}`)
}

// Log an item that dropped; characterId null = nobody took it (disenchanted).
// bossId is needed only when several bosses of the raid drop the item.
export function recordDrop(eventId: string, itemId: string, characterId: string | null, bossId?: string) {
  return forgeFetch<ApiDrop>(`${BASE}/events/${eventId}/drops`, {
    method: 'POST', body: JSON.stringify({ item_id: itemId, character_id: characterId, ...(bossId ? { boss_id: bossId } : {}) }),
  })
}

export interface AdjustmentBody { character_id: string; item_id: string; amount: number; reason: string }

export function createAdjustment(eventId: string, body: AdjustmentBody) {
  return forgeFetch<ApiAdjustment>(`${BASE}/events/${eventId}/adjustments`, { method: 'POST', body: JSON.stringify(body) })
}

export function deleteAdjustment(id: string) {
  return forgeFetch<null>(`${BASE}/adjustments/${id}`, { method: 'DELETE' })
}

export interface ApiAvailabilityWindow {
  users: { user_id: string; username: string; nickname: string | null; role: string | null }[]
  hours: { at: string; user_ids: string[] }[]
  free_all: string[]
}

export function getAvailabilityWindow(start: string, minutes: number, realm: string) {
  return forgeFetch<ApiAvailabilityWindow>(`${BASE}/availability/window?start=${encodeURIComponent(start)}&minutes=${minutes}&realm=${encodeURIComponent(realm)}`)
}

export interface ApiAudit {
  id: string
  actor: { id: string; username: string } | null
  action: string
  target_type: string
  target_id: string | null
  detail: Record<string, unknown> | null
  created_at: string
}

export interface ApiAuditFacets {
  actions: string[]
  target_types: string[]
  actors: { id: string; username: string }[]
}

export interface AuditQuery {
  limit?: number; before?: string; since?: string; target_type?: string; target_id?: string
  actor?: string; action?: string; q?: string
}

// Leadership: newest first; `since` inclusive, `q` searches action / actor / target id / details.
export function getAudit(opts: AuditQuery = {}) {
  const qs = new URLSearchParams(Object.entries(opts).filter(([, v]) => v) as [string, string][]).toString()
  return forgeFetch<ApiAudit[]>(`${BASE}/audit${qs ? `?${qs}` : ''}`)
}

// Leadership: the actions, target types and actors present in the log.
export function getAuditFacets() {
  return forgeFetch<ApiAuditFacets>(`${BASE}/audit/facets`)
}

export function deleteDrop(id: string) {
  return forgeFetch<{ deleted: boolean }>(`${BASE}/drops/${id}`, { method: 'DELETE' })
}

export function listDrops(filters: Omit<ReserveFilters, 'outcome'> = {}) {
  const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]).toString()
  return forgeFetch<ApiDrop[]>(`${BASE}/drops${qs ? `?${qs}` : ''}`)
}

export function removeAttendance(eventId: string, characterId: string) {
  return forgeFetch<null>(`${BASE}/events/${eventId}/attendance/${characterId}`, { method: 'DELETE' })
}

// Availability. Week hours are offsets from the UTC Monday 00:00 (0-167); default_hours are local wall-clock slots in tz.
export interface ApiWeek { week_start: string; hours: number[]; from_default: boolean }
export interface ApiAvailability { tz: string | null; default_hours: number[] | null; weeks: ApiWeek[] }
export interface ApiHeatmap {
  start: string
  weeks: number
  users: { user_id: string; username: string; nickname: string | null; role: string | null }[]
  slots: Record<string, string[]>
}

export function getMyAvailability(start: string, weeks: number) {
  return forgeFetch<ApiAvailability>(`${BASE}/availability/me?start=${start}&weeks=${weeks}`)
}

export function putWeeks(weeks: { week_start: string; hours: number[] }[]) {
  return forgeFetch<ApiWeek[]>(`${BASE}/availability/me/weeks`, { method: 'PUT', body: JSON.stringify({ weeks }) })
}

export function putAvailabilitySettings(tz: string, defaultHours: number[] | null) {
  return forgeFetch<{ tz: string; default_hours: number[] | null }>(`${BASE}/availability/me/settings`, {
    method: 'PUT', body: JSON.stringify({ tz, default_hours: defaultHours }),
  })
}

export function getHeatmap(start: string, weeks: number) {
  return forgeFetch<ApiHeatmap>(`${BASE}/availability?start=${start}&weeks=${weeks}`)
}

// Loot catalog: raids -> bosses -> items.
export interface ApiBoss {
  id: string
  raid_id: string
  name: string
  position: number
  is_trash: boolean
  items: ApiItem[]
}

export interface ApiRaid {
  id: string
  name: string
  short_name: string
  position: number
  active: boolean
  bosses: ApiBoss[]
}

export interface RaidBody { name: string; short_name: string; position: number; active: boolean }
export interface BossBody { name: string; position: number }
export interface ItemBody {
  name: string
  slot: string | null
  recommended_classes: string[]
  notes: string | null
  hard_reserved: boolean
  hard_reserve_note: string | null
  boss_ids?: string[]
}

export function listRaids(activeOnly = false) {
  return forgeFetch<ApiRaid[]>(`${BASE}/raids${activeOnly ? '?active=true' : ''}`)
}

export function createRaid(body: RaidBody) {
  return forgeFetch<Omit<ApiRaid, 'bosses'>>(`${BASE}/raids`, { method: 'POST', body: JSON.stringify(body) })
}

export function updateRaid(id: string, body: RaidBody) {
  return forgeFetch<Omit<ApiRaid, 'bosses'>>(`${BASE}/raids/${id}`, { method: 'PUT', body: JSON.stringify(body) })
}

export function putRaidOrder(order: string[]) {
  return forgeFetch<{ applied: number }>(`${BASE}/raids/order`, { method: 'PUT', body: JSON.stringify({ order }) })
}

export function putBossOrder(raidId: string, order: string[]) {
  return forgeFetch<{ applied: number }>(`${BASE}/raids/${raidId}/bosses/order`, { method: 'PUT', body: JSON.stringify({ order }) })
}

export function deleteRaid(id: string) {
  return forgeFetch<null>(`${BASE}/raids/${id}`, { method: 'DELETE' })
}

export function createBoss(raidId: string, body: BossBody) {
  return forgeFetch<Omit<ApiBoss, 'items'>>(`${BASE}/raids/${raidId}/bosses`, { method: 'POST', body: JSON.stringify(body) })
}

export function updateBoss(id: string, body: BossBody) {
  return forgeFetch<Omit<ApiBoss, 'items'>>(`${BASE}/bosses/${id}`, { method: 'PUT', body: JSON.stringify(body) })
}

export function deleteBoss(id: string) {
  return forgeFetch<null>(`${BASE}/bosses/${id}`, { method: 'DELETE' })
}

export function createItem(bossId: string, body: ItemBody) {
  return forgeFetch<ApiItem>(`${BASE}/bosses/${bossId}/items`, { method: 'POST', body: JSON.stringify(body) })
}

export function updateItem(id: string, body: ItemBody) {
  return forgeFetch<ApiItem>(`${BASE}/items/${id}`, { method: 'PUT', body: JSON.stringify(body) })
}

export function deleteItem(id: string) {
  return forgeFetch<null>(`${BASE}/items/${id}`, { method: 'DELETE' })
}

export function attachItem(bossId: string, itemId: string) {
  return forgeFetch<ApiItem>(`${BASE}/bosses/${bossId}/items/${itemId}`, { method: 'POST' })
}

export function detachItem(bossId: string, itemId: string) {
  return forgeFetch<null>(`${BASE}/bosses/${bossId}/items/${itemId}`, { method: 'DELETE' })
}

export function uploadItemImage(id: string, file: File): Promise<Envelope<ApiItem>> {
  const form = new FormData()
  form.append('file', file)
  return forgeFetch<ApiItem>(`${BASE}/items/${id}/image`, { method: 'POST', body: form })
}

export function deleteItemImage(id: string) {
  return forgeFetch<null>(`${BASE}/items/${id}/image`, { method: 'DELETE' })
}

// Absolute URL for an item screenshot (the API returns a path).
export function imageSrc(item: ApiItem): string | null {
  return item.image_url ? `${API_URLS.forgeAPI}${item.image_url}` : null
}

// Kill order with Trash last, for loot lists and pickers.
export const bossOrder = (bosses: ApiBoss[]) => bosses.slice().sort((a, b) => Number(a.is_trash) - Number(b.is_trash) || a.position - b.position)

// Boss names an item drops from, joined for labels.
export const bossNames = (item: Pick<ApiItem, 'bosses'>) => item.bosses.map(b => b.name).join(', ')

// Select groups for a raid's loot: each item once, under the first boss (kill order) that drops it.
// Hard-reserved items stay listed but are flagged so pickers can disable them.
export type ItemOption = { value: string; label: string; classes: string[]; image_url: string | null; bossNames: string[]; hardReserved: boolean }
export const itemGroups = (bosses: ApiBoss[]) => {
  const ordered = bossOrder(bosses)
  const names = new Map<string, string[]>()
  for (const b of ordered) for (const i of b.items) names.set(i.id, [...(names.get(i.id) ?? []), b.name])
  const seen = new Set<string>()
  return ordered
    .map(b => ({
      label: b.name,
      options: b.items.filter(i => !seen.has(i.id) && seen.add(i.id)).map((i): ItemOption => ({
        value: i.id, label: i.name, classes: i.recommended_classes, image_url: i.image_url,
        bossNames: names.get(i.id) ?? [], hardReserved: i.hard_reserved,
      })),
    }))
    .filter(g => g.options.length > 0)
}
