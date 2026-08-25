import { describe, expect, test } from 'bun:test'
import { toRuleRow, toRuleRows } from '../src/services/rule-row'

const stored = {
  id: 3,
  category: 'pokemon',
  name: 'XXL Larvitar',
  size: null,
  glow: null,
  notify: false,
  speciesId: 246,
  formId: null,
  pvpTargetSpecies: null,
  ivMin: null,
  ivMax: null,
  atkMin: null,
  atkMax: null,
  defMin: null,
  defMax: null,
  staMin: null,
  staMax: null,
  levelMin: null,
  levelMax: null,
  cpMin: null,
  cpMax: null,
  gender: null,
  sizeMin: 5,
  sizeMax: 5,
  pvpLeague: null,
  pvpRankMin: null,
  pvpRankMax: null,
  exclusions: [],
} as any

describe('toRuleRow', () => {
  test('carries the size bounds under the names both evaluators read', () => {
    const row = toRuleRow(stored)
    expect(row.size_min).toBe(5)
    expect(row.size_max).toBe(5)
  })

  test('an unset size stays null rather than becoming a bound', () => {
    const row = toRuleRow({ ...stored, sizeMin: null, sizeMax: null })
    expect(row.size_min).toBeNull()
    expect(row.size_max).toBeNull()
  })

  test('toRuleRows maps every row', () => {
    expect(toRuleRows([stored, stored])).toHaveLength(2)
  })
})
