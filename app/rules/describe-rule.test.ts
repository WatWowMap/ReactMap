import { expect, test } from 'bun:test'
import { describeRule } from './describe-rule'
import type { Rule } from './rule-types'

function ruleFixture(overrides: Partial<Rule> = {}): Rule {
  return {
    id: 1,
    category: 'pokemon',
    name: 'Test',
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

test('the seeded Everything rule says what it does rather than nothing', () => {
  // No conditions and no treatment. An empty second line would read as a
  // rendering bug rather than as a rule that matches everything.
  expect(describeRule(ruleFixture({ name: 'Everything' }))).toBe(
    'shown normally',
  )
})

test('the design’s own example renders as written', () => {
  const hundos = ruleFixture({
    name: 'Hundos',
    ivMin: 100,
    ivMax: 100,
    size: 'xl',
    glow: '#ffc83d',
    notify: true,
  })
  expect(describeRule(hundos)).toBe('IV 100% · extra large · ring · notifies')
})

test('a league names its own rank, since a rule carries only one', () => {
  const great = ruleFixture({
    name: 'Great League',
    pvpLeague: 1500,
    pvpRankMin: 1,
    pvpRankMax: 100,
    glow: '#4f8cff',
  })
  expect(describeRule(great)).toBe('Great rank 1–100 · ring')
})

test('equal bounds read as one value, not a range', () => {
  expect(describeRule(ruleFixture({ ivMin: 100, ivMax: 100 }))).toBe('IV 100%')
  expect(describeRule(ruleFixture({ ivMin: 90, ivMax: 100 }))).toBe(
    'IV 90–100%',
  )
})

test('a single bound reads as an inequality', () => {
  expect(describeRule(ruleFixture({ ivMin: 90 }))).toBe('IV 90%+')
  expect(describeRule(ruleFixture({ cpMax: 1500 }))).toBe('CP up to 1500')
})

test('an unbounded condition is not mentioned at all', () => {
  // Every column null except size. Nothing should invent "IV 0-100".
  expect(describeRule(ruleFixture({ size: 'lg' }))).toBe('large')
})

test('the size range uses the 1-to-5 vocabulary, not the marker size words', () => {
  // rule.size is how big the marker draws; sizeMin/sizeMax are the Pokemon's
  // own XXS..XXL. Two different scales that must not be confused.
  expect(describeRule(ruleFixture({ sizeMin: 5, sizeMax: 5 }))).toBe('size XXL')
  expect(describeRule(ruleFixture({ sizeMin: 1, sizeMax: 2 }))).toBe(
    'size XXS–XS',
  )
})

test('exclusions are counted rather than listed', () => {
  // Naming 24 excluded species would be longer than the rule itself.
  expect(describeRule(ruleFixture({ ivMin: 90, exclusions: [129] }))).toBe(
    'IV 90%+ · 1 exception',
  )
  expect(describeRule(ruleFixture({ exclusions: [129, 10, 98] }))).toBe(
    '3 exceptions',
  )
})

test('conditions come before appearance, so the rule reads before its effect', () => {
  const rule = ruleFixture({
    ivMin: 100,
    ivMax: 100,
    levelMin: 30,
    size: 'xl',
    notify: true,
  })
  expect(describeRule(rule)).toBe(
    'IV 100% · level 30+ · extra large · notifies',
  )
})
