import { expect, test } from 'bun:test'
import { groupRules } from './rule-grouping'
import type { Rule } from './rule-types'

function ruleFixture(overrides: Partial<Rule> & { id: number }): Rule {
  return {
    category: 'pokemon',
    name: 'Rule',
    size: null,
    glow: null,
    notify: false,
    speciesId: null,
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
    sizeMin: null,
    sizeMax: null,
    pvpLeague: null,
    pvpRankMin: null,
    pvpRankMax: null,
    exclusions: [],
    ...overrides,
  }
}

test('rules identical except for species form one group', () => {
  const groups = groupRules([
    ruleFixture({ id: 1, name: 'Rare', speciesId: 147, size: 'lg' }),
    ruleFixture({ id: 2, name: 'Rare', speciesId: 246, size: 'lg' }),
  ])
  expect(groups).toHaveLength(1)
  expect(groups[0]?.ruleIds).toEqual([1, 2])
})

test('a differing condition splits the group', () => {
  const groups = groupRules([
    ruleFixture({ id: 1, name: 'Rare', speciesId: 147, size: 'lg' }),
    ruleFixture({ id: 2, name: 'Rare', speciesId: 246, size: 'xl' }),
  ])
  expect(groups).toHaveLength(2)
})

test('groups sort by their lowest rule id, and never shuffle', () => {
  const groups = groupRules([
    ruleFixture({ id: 9, name: 'B', speciesId: 1 }),
    ruleFixture({ id: 3, name: 'A', speciesId: 2 }),
  ])
  expect(groups.map((g) => g.name)).toEqual(['A', 'B'])
})

test('exclusions participate in the key, so rules with different ones do not group', () => {
  const groups = groupRules([
    ruleFixture({ id: 1, name: 'Any', speciesId: null, exclusions: [129] }),
    ruleFixture({ id: 2, name: 'Any', speciesId: null, exclusions: [] }),
  ])
  expect(groups).toHaveLength(2)
})
