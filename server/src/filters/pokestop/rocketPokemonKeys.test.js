const test = require('node:test')
const assert = require('node:assert/strict')

const {
  dedupeRocketPokemonKeys,
  getCanonicalRewardForm,
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

test('getCanonicalRewardForm prefers the masterfile encounter form', () => {
  // Wobbuffet (202): scanner reports 602 for this grunt, masterfile says 2328.
  const encounters = [
    { id: 202, form: 2328 },
    { id: 359, form: 830 },
  ]
  assert.equal(getCanonicalRewardForm(encounters, 202, 602), 2328)
})

test('getCanonicalRewardForm falls back when the species is not in the pool', () => {
  const encounters = [{ id: 359, form: 830 }]
  assert.equal(getCanonicalRewardForm(encounters, 202, 602), 602)
})

test('getCanonicalRewardForm falls back to 0 with no encounters and no fallback', () => {
  assert.equal(getCanonicalRewardForm(undefined, 202, undefined), 0)
})

test('canonical form keeps repeated polls from minting a second key', () => {
  // Poll 1: confirmed slot reports scanner form 602 for Wobbuffet.
  const poll1 = new Set()
  const form1 = getCanonicalRewardForm([{ id: 202, form: 2328 }], 202, 602)
  poll1.add(`a202-${form1}`)
  dedupeRocketPokemonKeys(poll1)

  // Poll 2: a different grunt occurrence, scanner form is 0 this time.
  const poll2 = new Set()
  const form2 = getCanonicalRewardForm([{ id: 202, form: 2328 }], 202, 0)
  poll2.add(`a202-${form2}`)
  dedupeRocketPokemonKeys(poll2)

  // Both polls must agree on the exact same key - nothing left to reconcile.
  assert.deepEqual([...poll1], [...poll2])
  assert.deepEqual([...poll1], ['a202-2328'])
})
