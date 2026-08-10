const assert = require('node:assert/strict')
const { after, before, test } = require('node:test')
const i18next = require('i18next')
const knexFactory = require('knex')

const config = require('@rm/config')
const { Pokestop } = require('../src/models/Pokestop')
const {
  mapAvailablePokestops,
} = require('../src/models/pokestopAvailableMapper')
const { state } = require('../src/services/state')
const {
  ROCKET_POKEMON_FILTER_EXCLUDED_CHARACTERS,
  isRocketPokemonFilterExcluded,
} = require('../src/utils/rocketPokemonFiltering')

const rewardConfig = (pokemonId, grunt = 'Grunt') => ({
  grunt,
  firstReward: true,
  secondReward: false,
  thirdReward: false,
  encounters: {
    first: [{ id: pokemonId, form: 0 }],
    second: [],
    third: [],
  },
})

const invasions = {
  1: rewardConfig(19),
  44: rewardConfig(643, 'Giovanni'),
  45: rewardConfig(10),
  46: rewardConfig(69),
}
const GIOVANNI_AND_DECOY_GRUNT_TYPES = [44, 45, 46]

const previousInvasions = state.event.invasions

before(() => state.event.setInvasions(invasions))
after(() => state.event.setInvasions(previousInvasions))

test('Rocket Pokemon filter policy excludes leaders, Giovanni, and Decoys', () => {
  assert.deepEqual(
    ROCKET_POKEMON_FILTER_EXCLUDED_CHARACTERS,
    [41, 42, 43, 44, 45, 46],
  )
  assert.equal(isRocketPokemonFilterExcluded(40), false)
  assert.equal(isRocketPokemonFilterExcluded(41), true)
  assert.equal(isRocketPokemonFilterExcluded('46'), true)
  assert.equal(isRocketPokemonFilterExcluded(47), false)
})

test('Rocket Pokemon filters never match character types 44-46', () => {
  GIOVANNI_AND_DECOY_GRUNT_TYPES.forEach((gruntType) => {
    const pokemonId = invasions[gruntType].encounters.first[0].id
    const pokemonFilter = { [`a${pokemonId}-0`]: true }

    assert.equal(
      Pokestop.invasionMatchesFilters(
        { grunt_type: gruntType, confirmed: false },
        pokemonFilter,
        true,
      ),
      false,
    )
    assert.equal(
      Pokestop.invasionMatchesFilters(
        {
          grunt_type: gruntType,
          confirmed: true,
          slot_1_pokemon_id: pokemonId,
          slot_1_form: 0,
        },
        pokemonFilter,
        true,
      ),
      false,
    )
    assert.equal(
      Pokestop.invasionMatchesFilters(
        { grunt_type: gruntType, confirmed: true },
        { [`i${gruntType}`]: true },
        true,
      ),
      true,
    )
    assert.equal(
      Pokestop.invasionMatchesFilters(
        { grunt_type: gruntType, confirmed: false },
        { onlyAllPokestops: true },
        true,
      ),
      true,
    )
    assert.equal(
      Pokestop.invasionMatchesFilters(
        { grunt_type: gruntType, confirmed: false },
        { onlyAllPokestops: true, onlyConfirmed: true },
        true,
      ),
      false,
    )
  })
})

test('Rocket Pokemon filters continue to match ordinary grunts', () => {
  const pokemonFilter = { 'a19-0': true }

  assert.equal(
    Pokestop.invasionMatchesFilters(
      { grunt_type: 1, confirmed: false },
      pokemonFilter,
      true,
    ),
    true,
  )
  assert.equal(
    Pokestop.invasionMatchesFilters(
      {
        grunt_type: 1,
        confirmed: true,
        slot_1_pokemon_id: 19,
        slot_1_form: 0,
      },
      pokemonFilter,
      true,
    ),
    true,
  )
})

test('available mapper keeps invasion keys but omits rewards for 44-46', () => {
  const apiInvasion = (character, pokemonId) => ({
    character,
    display_type: 1,
    confirmed: true,
    slot1_pokemon_id: pokemonId,
    slot1_form: 0,
  })
  const { available } = mapAvailablePokestops(
    {
      invasions: [
        apiInvasion(1, 19),
        apiInvasion(44, 643),
        apiInvasion(45, 10),
        apiInvasion(46, 69),
      ],
    },
    { invasions },
  )

  assert.equal(available.includes('a19-0'), true)
  assert.equal(available.includes('a643-0'), false)
  assert.equal(available.includes('a10-0'), false)
  assert.equal(available.includes('a69-0'), false)
  GIOVANNI_AND_DECOY_GRUNT_TYPES.forEach((gruntType) => {
    assert.equal(available.includes(`i${gruntType}`), true)
  })
})

test('Pokemon search exclusion does not suppress direct Decoy name matches', async (t) => {
  const searchPreviousInvasions = state.event.invasions
  const previousAvailable = state.event.available.pokestops
  const previousMasterfile = state.event.masterfile
  const previousQuery = Pokestop.query
  const previousTranslate = i18next.t
  const previousGetSafe = config.getSafe
  const knex = knexFactory({ client: 'mysql2' })

  t.after(async () => {
    state.event.setInvasions(searchPreviousInvasions)
    state.event.available.pokestops = previousAvailable
    state.event.masterfile = previousMasterfile
    Pokestop.query = previousQuery
    i18next.t = previousTranslate
    config.getSafe = previousGetSafe
    await knex.destroy()
  })

  state.event.setInvasions({
    1: rewardConfig(69),
    46: rewardConfig(69),
  })
  state.event.available.pokestops = ['a69-0']
  state.event.masterfile = { pokemon: { 69: { forms: {} } } }
  i18next.t = (key) =>
    key === 'grunt_46' || key === 'poke_69' ? 'shared' : key
  config.getSafe = (key) =>
    key === 'areas' ? { polygons: {} } : previousGetSafe.call(config, key)

  const runSearch = (query, search, hasConfirmed = true) => {
    query.then = (resolve, reject) =>
      Promise.resolve([{ grunt_type: 46 }, { grunt_type: 1 }]).then(
        resolve,
        reject,
      )
    Pokestop.query = () => query
    return Pokestop.searchInvasions(
      { areaRestrictions: [] },
      { search, onlyAreas: [], locale: 'en' },
      {
        hasMultiInvasions: false,
        multiInvasionMs: false,
        hasConfirmed,
      },
      'distance',
      { minLat: 0, maxLat: 1, minLon: 0, maxLon: 1 },
    )
  }

  const mixedQuery = knex('pokestop')
  const mixedResults = await runSearch(mixedQuery, 'shared')

  assert.deepEqual(
    mixedResults.map(({ grunt_type }) => grunt_type),
    [46, 1],
  )
  const { sql } = mixedQuery.toSQL()
  assert.match(sql, /`character` in \(\?\) or/)
  assert.match(sql, /`character` not in/)

  i18next.t = (key) => (key === 'poke_69' ? 'pokemon' : key)
  const pokemonQuery = knex('pokestop')
  const pokemonResults = await runSearch(pokemonQuery, 'pokemon')
  assert.deepEqual(
    pokemonResults.map(({ grunt_type }) => grunt_type),
    [1],
  )

  const fallbackQuery = knex('pokestop')
  const fallbackResults = await runSearch(fallbackQuery, 'pokemon', false)
  assert.deepEqual(
    fallbackResults.map(({ grunt_type }) => grunt_type),
    [1],
  )
  assert.match(fallbackQuery.toSQL().sql, /`character` in \(\?\)/)
})
