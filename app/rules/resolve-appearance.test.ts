import { expect, test } from 'bun:test'
import { resolveAppearance } from './resolve-appearance'
import { ruleMap } from './rule-fixtures'

test('size takes the maximum across matching rules', () => {
  const rules = ruleMap([
    { id: 7, size: 'xl' },
    { id: 88, size: 'lg' },
  ])
  expect(resolveAppearance([7, 88], rules).size).toBe('xl')
})

test('each glow rule contributes a ring segment, and colours are never mixed', () => {
  const rules = ruleMap([
    { id: 7, glow: '#ffc83d' },
    { id: 12, glow: '#4f8cff' },
  ])
  expect(resolveAppearance([7, 12], rules).rings).toEqual([
    '#ffc83d',
    '#4f8cff',
  ])
})

test('notify is an OR', () => {
  const rules = ruleMap([
    { id: 7, notify: false },
    { id: 12, notify: true },
  ])
  expect(resolveAppearance([7, 12], rules).notify).toBe(true)
})

test('an unknown rule id is skipped rather than throwing', () => {
  expect(() => resolveAppearance([999], ruleMap([]))).not.toThrow()
  expect(resolveAppearance([999], ruleMap([])).rings).toEqual([])
})
