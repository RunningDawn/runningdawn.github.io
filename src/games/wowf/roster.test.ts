import { describe, expect, it } from 'vitest'
import {
  classesFor, clampLevel, fromApi, newCharacter, reorder, roleFor, sanitize, setMain, specIcon, timeAgo, toApi, validName,
} from './roster'

describe('roster helpers', () => {
  it('newCharacter defaults to Horde / PvP / level 1', () => {
    const c = newCharacter(true)
    expect(c).toMatchObject({ faction: 'Horde', ruleset: 'PvP', level: 1, main: true, professions: [] })
  })

  it('reorder moves an item to the drop index', () => {
    expect(reorder(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
    expect(reorder(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
  })

  it('setMain keeps exactly one main', () => {
    const list = [newCharacter(true), newCharacter(false)]
    const next = setMain(list, list[1].id)
    expect(next.map(c => c.main)).toEqual([false, true])
  })

  it('clampLevel bounds to 1-60', () => {
    expect(clampLevel(0)).toBe(1)
    expect(clampLevel(61)).toBe(60)
    expect(clampLevel(NaN)).toBe(1)
    expect(clampLevel(42.7)).toBe(42)
  })

  it('sanitize drops invalid values and guarantees a main', () => {
    const { characters } = sanitize({ characters: [
      { id: 'x', name: 'Thrall', faction: 'Nope', race: 'Human', ruleset: 'PvP', class: 'Shaman', level: 99,
        mainSpec: 'Fire', secondSpec: 'Restoration', professions: ['Skinning', 'Cooking', 'Mining', 'Mining', 'Herbalism'] },
      { name: 7, faction: 'Alliance', race: 'Gnome', class: 'Warrior', level: '30', main: false },
    ] })
    expect(characters[0]).toMatchObject({
      id: 'x', name: 'Thrall', faction: 'Horde', race: '', class: 'Shaman', level: 60,
      mainSpec: '', secondSpec: 'Restoration', professions: ['Herbalism', 'Mining'], main: true,
    })
    expect(characters[1]).toMatchObject({ name: '', race: 'Gnome', class: 'Warrior', level: 30, main: false })
    expect(sanitize(null)).toEqual({ characters: [] })
  })

  it('keeps a valid updatedAt and drops junk', () => {
    const { characters } = sanitize({ characters: [
      { name: 'A', updatedAt: '2026-10-29T10:00:00Z' }, { name: 'B', updatedAt: 'yesterday' },
    ] })
    expect(characters[0].updatedAt).toBe('2026-10-29T10:00:00Z')
    expect(characters[1].updatedAt).toBeNull()
  })

  it('classesFor follows the Forever matrix', () => {
    expect(classesFor('Horde', 'Undead')).toContain('Paladin')
    expect(classesFor('Horde', 'Tauren')).not.toContain('Rogue')
    expect(classesFor('Alliance', 'Dwarf')).toContain('Shaman')
    expect(classesFor('Alliance', 'Nope')).toEqual([])
  })

  it('maps API rows both ways', () => {
    const c = fromApi({
      id: 'a', user_id: 'u1', name: 'Thrall', faction: 'Horde', race: 'Orc', class: 'Shaman',
      ruleset: 'PvP', level: 60, main_spec: 'Enhancement', off_spec: null, role: 'Melee DPS', professions: ['Skinning', 'Mining'],
      is_main: true, position: 0, data: {}, updated_at: '2026-10-29T10:00:00+00:00',
    })
    expect(c).toMatchObject({ mainSpec: 'Enhancement', secondSpec: '', professions: ['Mining', 'Skinning'], main: true })
    expect(toApi(c, c.updatedAt)).toEqual({
      name: 'Thrall', faction: 'Horde', race: 'Orc', class: 'Shaman', ruleset: 'PvP', level: 60,
      main_spec: 'Enhancement', off_spec: null, professions: ['Mining', 'Skinning'], is_main: true,
      base_updated_at: '2026-10-29T10:00:00+00:00',
    })
    expect('base_updated_at' in toApi(c)).toBe(false)
    expect(fromApi({ id: 'b', user_id: 'u1', name: 'Alt', faction: 'Horde', race: 'Orc', class: 'Mage', ruleset: 'PvP', level: 1, main_spec: null, off_spec: null, role: null, professions: [], is_main: false, position: 1, data: {}, updated_at: null }).main).toBe(false)
  })

  it('maps specs to roles and icons', () => {
    expect(roleFor('Shaman', 'Restoration')).toBe('Healer')
    expect(roleFor('Druid', 'Feral')).toBe('Tank')
    expect(roleFor('Mage', 'Nope')).toBe('')
    expect(specIcon('Mage', 'Frost')).toContain('spell_frost_frostbolt02.jpg')
    expect(specIcon('Mage', 'Nope')).toBeNull()
  })

  it('timeAgo buckets', () => {
    const now = Date.parse('2026-10-29T12:00:00Z')
    expect(timeAgo('2026-10-29T11:59:30Z', now)).toBe('just now')
    expect(timeAgo('2026-10-29T11:30:00Z', now)).toBe('30m ago')
    expect(timeAgo('2026-10-29T03:00:00Z', now)).toBe('9h ago')
    expect(timeAgo('2026-10-20T12:00:00Z', now)).toBe('9d ago')
  })
})

describe('validName', () => {
  it('wants Firstname Lastname', () => {
    expect(validName(' Thrall Hellscream ')).toBe(true)
    expect(validName('Zoë Ashfall')).toBe(true)
    for (const bad of ['Thrall', 'Thrall  Hellscream', 'Thrall Hell Scream', 'Thrall H3ll', 'Abc ' + 'x'.repeat(24)]) {
      expect(validName(bad)).toBe(false)
    }
  })
})
