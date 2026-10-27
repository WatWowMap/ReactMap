// @ts-check
const assert = require('node:assert/strict')
const { test } = require('node:test')

require('./stateMock')

const {
  draws,
  shinyFor,
  backgroundFor,
  buildRates,
} = require('../src/services/personalShiny')
const {
  jsifyIvFilter,
  dnfifyIvFilter,
} = require('../src/filters/pokemon/functions')
const { PkmnBackend } = require('../src/filters/pokemon/Backend')
const { PokemonFilter } = require('../src/filters/pokemon/Frontend')
const { passesAll } = require('../src/filters/pokemon/personalShiny')

// Test vectors of Golbat #423 (decoder/api_pokemon_shiny_test.go)
const PLAYERS = ['0123456789abcdef', 'Player-ID:ABC/123', ' Trainer-é '].map(
  (id) => ({ id, name: id }),
)

/**
 * Rates as the rates service gives them: shiny rate and background rate per
 * variant
 * @param {[string, number, number?][]} entries key, shiny rate, background rate
 */
const remoteRates = (entries) => {
  const rates = /** @type {any} */ (
    new Map(entries.map(([key, rate]) => [key, rate]))
  )
  rates.remote = true
  rates.backgrounds = new Map(
    entries
      .filter(([, , background]) => background)
      .map(([key, , background]) => [key, background]),
  )
  return rates
}

/** @param {object} pkmn */
const wild = (pkmn) => ({ id: '1', form: 0, seen_type: 'wild', ...pkmn })

test('the draws match Golbat #423 bit for bit', () => {
  const expected = [
    [0.2214, 0.1432],
    [0.3685, 0.9563],
    [0.0377, 0.7366],
  ]
  PLAYERS.forEach(({ id }, i) => {
    const [first, second] = draws('1', id, 2)
    assert.equal(first.toFixed(4), expected[i][0].toFixed(4), id)
    assert.equal(second.toFixed(4), expected[i][1].toFixed(4), id)
  })
})

test('a shiny-capable variant: shiny is the first draw, background the second', () => {
  const rates = remoteRates([['25-0', 0.1, 0.2]])
  const pkmn = wild({ pokemon_id: 25 })
  assert.deepEqual(shinyFor(pkmn, PLAYERS, rates), [' Trainer-é '])
  assert.deepEqual(backgroundFor(pkmn, PLAYERS, rates), ['0123456789abcdef'])
})

test('a never-shiny variant takes no shiny draw: the background is the first', () => {
  const rates = remoteRates([['29-0', 0, 0.2]])
  const pkmn = wild({ pokemon_id: 29 })
  assert.deepEqual(shinyFor(pkmn, PLAYERS, rates), [])
  assert.deepEqual(backgroundFor(pkmn, PLAYERS, rates), [' Trainer-é '])
})

test('a known Ditto is shiny on the third draw at 1/64', () => {
  // the variant it disguises as would be shiny for everyone
  const rates = remoteRates([['16-0', 1, 1]])
  /** @param {number} encounter */
  const ditto = (encounter) =>
    wild({ id: `${encounter}`, pokemon_id: 132, display_pokemon_id: 16 })
  // pinned in Golbat's test: 6 only for Player-ID:ABC/123, 26 only for
  // Trainer-é, 1, 15 and 25 for nobody
  assert.deepEqual(shinyFor(ditto(6), PLAYERS, rates), ['Player-ID:ABC/123'])
  assert.deepEqual(shinyFor(ditto(26), PLAYERS, rates), [' Trainer-é '])
  ;[1, 15, 25].forEach((encounter) =>
    assert.deepEqual(shinyFor(ditto(encounter), PLAYERS, rates), []),
  )
  assert.deepEqual(backgroundFor(ditto(6), PLAYERS, rates), [])
})

test('nearby Pokémon and other disguises are never personal shinies', () => {
  const rates = remoteRates([['16-0', 1, 1]])
  assert.deepEqual(
    shinyFor(
      wild({ pokemon_id: 16, seen_type: 'nearby_stop' }),
      PLAYERS,
      rates,
    ),
    [],
  )
  assert.deepEqual(
    shinyFor(wild({ pokemon_id: 16, display_pokemon_id: 19 }), PLAYERS, rates),
    [],
  )
})

test('without a rates service only variants seen shiny are predicted', () => {
  const own = buildRates([
    { pokemon_id: 25, form: 0, days_ago: 1, shiny: 2, checks: 900 },
    { pokemon_id: 837, form: 0, days_ago: 1, shiny: 0, checks: 300 },
  ])
  const rates = /** @type {any} */ (new Map(own))
  rates.seenShiny = own.seenShiny
  rates.remote = false
  // never seen shiny (an unreleased shiny such as Rolycoly): never predicted
  const neverShiny = Array.from({ length: 3000 }, (_, i) =>
    shinyFor(
      wild({ id: `${1e15 + i * 7919}`, pokemon_id: 837 }),
      PLAYERS,
      rates,
    ),
  ).flat()
  assert.equal(neverShiny.length, 0)
  // seen shiny: predicted (at the default rate)
  const seen = Array.from({ length: 3000 }, (_, i) =>
    shinyFor(
      wild({ id: `${1e15 + i * 7919}`, pokemon_id: 25 }),
      PLAYERS,
      rates,
    ),
  ).flat()
  assert.ok(seen.length > 0)
})

test('the legacy filter knows the shiny term', () => {
  const shiny = { iv: 100, personal_shiny: ['me'] }
  const notShiny = { iv: 100, personal_shiny: [] }
  const js = jsifyIvFilter('shiny & 90-100')
  assert.ok(js)
  assert.equal(js(/** @type {any} */ (shiny)), true)
  assert.equal(js(/** @type {any} */ (notShiny)), false)
  assert.equal(jsifyIvFilter('shiny shiny'), null)

  const pokemon = [{ id: 1, form: 0 }]
  assert.deepEqual(dnfifyIvFilter('90-100 | shiny', pokemon), [
    { pokemon, iv: { min: 90, max: 100 } },
    { pokemon, personal_shiny: true },
  ])
  assert.deepEqual(dnfifyIvFilter('100 shiny', pokemon), [])
})

test('only personal shinies: a PvP rank condition is kept when all ranks are shown', () => {
  const perms = { pokemon: true, iv: true, pvp: true, areaRestrictions: [] }
  const great = { ...new PokemonFilter(), great: [1, 50], enabled: true }
  /** @param {number} rank */
  const pkmn = (rank) =>
    /** @type {any} */ ({
      id: '1',
      pokemon_id: 16,
      form: 0,
      iv: 50,
      pvp: { great: [{ pokemon: 16, form: 0, rank, cp: 1400, capped: true }] },
    })
  ;[false, true].forEach((onlyAllPvp) => {
    const mods = { onlyLinkGlobal: false, onlyIvOr: true, onlyAllPvp }
    const backend = new PkmnBackend('global', great, great, perms, mods)
    assert.equal(passesAll(backend, pkmn(10)), true, `rank 10, all ${onlyAllPvp}`)
    assert.equal(passesAll(backend, pkmn(900)), false, `rank 900, all ${onlyAllPvp}`)
  })
})
