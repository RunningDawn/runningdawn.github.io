import { describe, it, expect } from 'vitest'
import { parseTier, parseEnchant, withTier, withEnchant } from './itemMeta'

describe('itemMeta', () => {
  it('parses tier and enchant from the id', () => {
    expect(parseTier('T4_MAIN_SWORD@2')).toBe(4)
    expect(parseEnchant('T4_MAIN_SWORD@2')).toBe(2)
    expect(parseEnchant('T4_MAIN_SWORD')).toBe(0)
    expect(parseEnchant('T5_ORE_LEVEL3@3')).toBe(3)
  })

  it('rewrites the tier in place', () => {
    expect(withTier('T4_MAIN_SWORD@2', 7)).toBe('T7_MAIN_SWORD@2')
    expect(withTier('T5_ORE_LEVEL1@1', 6)).toBe('T6_ORE_LEVEL1@1')
  })

  it('gear enchants use a plain @n suffix', () => {
    expect(withEnchant('T4_MAIN_SWORD', 3)).toBe('T4_MAIN_SWORD@3')
    expect(withEnchant('T4_MAIN_SWORD@1', 2)).toBe('T4_MAIN_SWORD@2')
    expect(withEnchant('T4_MAIN_SWORD@3', 0)).toBe('T4_MAIN_SWORD')
  })

  it('resource enchants use the _LEVELn@n form', () => {
    expect(withEnchant('T5_ORE', 2)).toBe('T5_ORE_LEVEL2@2')
    expect(withEnchant('T5_ORE_LEVEL1@1', 3)).toBe('T5_ORE_LEVEL3@3')
    expect(withEnchant('T5_METALBAR_LEVEL2@2', 0)).toBe('T5_METALBAR')
    expect(withEnchant('T5_PLANKS', 1)).toBe('T5_PLANKS_LEVEL1@1')
  })
})
