import { useSyncExternalStore } from 'react'
import { STORAGE_KEYS } from '../../../config/storageKeys'

// Every saver below emits this event so open pages re-read the prefs live -
// the Craft Settings modal changes them while a table is on screen.
export const PREFS_EVENT = 'albion-prefs-changed'
let prefsVersion = 0

export function emitPrefsChanged(): void {
  prefsVersion++
  window.dispatchEvent(new Event(PREFS_EVENT))
}

export function subscribePrefs(callback: () => void): () => void {
  window.addEventListener(PREFS_EVENT, callback)
  return () => window.removeEventListener(PREFS_EVENT, callback)
}

// Live view of one pref: re-renders whenever any saver runs. `load` must
// return a primitive (stable snapshot) - all loaders here do.
export function usePref<T extends string | number | boolean>(load: () => T): T {
  return useSyncExternalStore(subscribePrefs, load)
}

// Bumps on every prefs change - a dependency for memos/effects that read
// several prefs internally (rrOf, tax) instead of taking them as args.
export function usePrefsVersion(): number {
  return useSyncExternalStore(subscribePrefs, () => prefsVersion)
}

// Shared manual price overrides live on the server; saving/clearing one bumps this
// so open price hooks (item tables, Best Value) refetch and pick up the new value.
export const OVERRIDES_EVENT = 'albion-overrides-changed'
let overridesVersion = 0

export function emitOverridesChanged(): void {
  overridesVersion++
  window.dispatchEvent(new Event(OVERRIDES_EVENT))
}

export function useOverridesVersion(): number {
  return useSyncExternalStore(
    cb => {
      window.addEventListener(OVERRIDES_EVENT, cb)
      return () => window.removeEventListener(OVERRIDES_EVENT, cb)
    },
    () => overridesVersion,
  )
}

// Per-user flags (local-only - unlike station fees, these are per player).
// Premium (defaults to true) drives the 4%/8% sales tax; focus (defaults to
// false) switches Best Value to the focus return rates (43.5/53.9/47.9%).
export function loadPremium(): boolean {
  return localStorage.getItem(STORAGE_KEYS.albionPremium) !== 'false'
}

export function savePremium(premium: boolean): void {
  localStorage.setItem(STORAGE_KEYS.albionPremium, String(premium))
  emitPrefsChanged()
}

export function loadFocus(): boolean {
  return localStorage.getItem(STORAGE_KEYS.albionFocus) === 'true'
}

export function saveFocus(focus: boolean): void {
  localStorage.setItem(STORAGE_KEYS.albionFocus, String(focus))
  emitPrefsChanged()
}

export function loadDefaultCity(): string {
  return localStorage.getItem(STORAGE_KEYS.albionDefaultCity) || 'Bridgewatch'
}

export function saveDefaultCity(city: string): void {
  localStorage.setItem(STORAGE_KEYS.albionDefaultCity, city)
  emitPrefsChanged()
}

// How materials are acquired: 'sell' = pay the lowest sell order (instant),
// 'buy' = place buy orders at the current top bid and wait (cheaper).
export type MatSource = 'sell' | 'buy'

export function loadMatSource(): MatSource {
  return localStorage.getItem(STORAGE_KEYS.albionMatSource) === 'buy' ? 'buy' : 'sell'
}

export function saveMatSource(source: MatSource): void {
  localStorage.setItem(STORAGE_KEYS.albionMatSource, source)
  emitPrefsChanged()
}

// Which craft cost the profit columns use: the fully optimized tree, or just the
// top-level (base) materials for crafters who skip the sub-refining.
export type CraftStrategy = 'optimized' | 'base'

export function loadCraftStrategy(): CraftStrategy {
  return localStorage.getItem(STORAGE_KEYS.albionCraftStrategy) === 'base' ? 'base' : 'optimized'
}

export function saveCraftStrategy(strategy: CraftStrategy): void {
  localStorage.setItem(STORAGE_KEYS.albionCraftStrategy, strategy)
  emitPrefsChanged()
}

// Best Value scope: 'craftable' (default) keeps only items made at a real
// crafting station; 'all' includes the stationless outliers too.
export type BvScope = 'all' | 'craftable'

export function loadBvScope(): BvScope {
  return localStorage.getItem(STORAGE_KEYS.albionBvScope) === 'all' ? 'all' : 'craftable'
}

export function saveBvScope(scope: BvScope): void {
  localStorage.setItem(STORAGE_KEYS.albionBvScope, scope)
  emitPrefsChanged()
}
