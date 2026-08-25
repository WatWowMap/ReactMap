import { expect, test } from 'bun:test'
import {
  profile,
  rule,
  ruleExclusion,
  rulePokemon,
} from '../src/db/rules-schema'

test('every rule table is exported under the name the schema uses', () => {
  expect(rule).toBeDefined()
  expect(rulePokemon).toBeDefined()
  expect(ruleExclusion).toBeDefined()
  expect(profile).toBeDefined()
})

test('rule_pokemon carries one pvp league, not three', () => {
  const columns = Object.keys(rulePokemon)
  expect(columns).toContain('pvpLeague')
  expect(columns).toContain('pvpRankMin')
  expect(columns).toContain('pvpRankMax')
  expect(columns).not.toContain('greatMin')
  expect(columns).not.toContain('ultraMin')
})

test('size is a numeric range, not two booleans', () => {
  const columns = Object.keys(rulePokemon)
  expect(columns).toContain('sizeMin')
  expect(columns).toContain('sizeMax')
  expect(columns).not.toContain('xxs')
  expect(columns).not.toContain('xxl')
})
