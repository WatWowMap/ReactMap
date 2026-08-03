const test = require('node:test')
const assert = require('node:assert/strict')

const {
  dedupeRocketPokemonKeys,
  hasRocketPokemonFilter,
} = require('./rocketPokemonKeys')

test('matches a reward whichever form the ticked filter carries', () => {
  // Deino: masterfile says form 2291, the scanner records 0. Both must match.
  assert.equal(hasRocketPokemonFilter({ 'a633-2291': {} }, 633), true)
  assert.equal(hasRocketPokemonFilter({ 'a633-0': {} }, 633), true)
  assert.equal(hasRocketPokemonFilter({ a633: {} }, 633), true)
})

test('does not match a different species', () => {
  assert.equal(hasRocketPokemonFilter({ 'a714-3070': {} }, 633), false)
  assert.equal(hasRocketPokemonFilter({}, 633), false)
})

test('does not confuse species whose ids share a prefix', () => {
  // `a1` must not match Pokemon 12, nor `a12` match Pokemon 1.
  assert.equal(hasRocketPokemonFilter({ a12: {} }, 1), false)
  assert.equal(hasRocketPokemonFilter({ 'a12-0': {} }, 1), false)
  assert.equal(hasRocketPokemonFilter({ a1: {} }, 12), false)
})

test('a falsy pokemon id never matches', () => {
  assert.equal(hasRocketPokemonFilter({ a0: {} }, 0), false)
  assert.equal(hasRocketPokemonFilter({ a633: {} }, undefined), false)
})

test('collapses the Taillow duplicate to the masterfile form', () => {
  // The scanner contributes `a276-0`, the masterfile fallback `a276-3163`.
  const available = new Set(['a276-0', 'a276-3163'])
  dedupeRocketPokemonKeys(available)
  assert.deepEqual([...available], ['a276-3163'])
})

test('keeps the form-less key when it is the only one', () => {
  const available = new Set(['a276'])
  dedupeRocketPokemonKeys(available)
  assert.deepEqual([...available], ['a276'])
})

test('prefers a real form over a zero form regardless of order', () => {
  const forwards = new Set(['a633-0', 'a633-2291'])
  dedupeRocketPokemonKeys(forwards)
  assert.deepEqual([...forwards], ['a633-2291'])

  const backwards = new Set(['a633-2291', 'a633-0'])
  dedupeRocketPokemonKeys(backwards)
  assert.deepEqual([...backwards], ['a633-2291'])
})

test('collapses a form-less key against a form-carrying one', () => {
  const available = new Set(['a633', 'a633-2291'])
  dedupeRocketPokemonKeys(available)
  assert.deepEqual([...available], ['a633-2291'])
})

test('leaves distinct species and non-Rocket keys untouched', () => {
  const available = new Set([
    'a276-0',
    'a276-3163',
    'a633-2291',
    'i12', // grunt type
    'l501', // lure
    'q1', // item
    'f25-0', // showcase
  ])
  dedupeRocketPokemonKeys(available)
  assert.deepEqual(
    [...available].sort(),
    ['a276-3163', 'a633-2291', 'f25-0', 'i12', 'l501', 'q1'].sort(),
  )
})

test('the survivor still matches, so the menu entry works', () => {
  const available = new Set(['a276-0', 'a276-3163'])
  dedupeRocketPokemonKeys(available)
  const filters = Object.fromEntries([...available].map((k) => [k, {}]))
  // Confirmed grunt reports form 0, unconfirmed reports 3163 - both match.
  assert.equal(hasRocketPokemonFilter(filters, 276), true)
})
