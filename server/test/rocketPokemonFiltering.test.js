const assert = require('node:assert/strict')
const { afterAll, beforeAll, test } = require('bun:test')
const i18next = require('i18next')
const knexFactory = require('knex')

const config = require('@rm/config')

const { state } = require('./stateMock')
const { buildPokestops } = require('../src/filters/builder/pokestop')
const { Pokestop } = require('../src/models/Pokestop')
const {
  mapAvailablePokestops,
} = require('../src/models/pokestopAvailableMapper')
const {
  ROCKET_POKEMON_FILTER_EXCLUDED_CHARACTERS,
  collapseRocketPokemonFilterKeys,
  getRocketPokemonFilterKey,
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

beforeAll(() => state.event.setInvasions(invasions))
afterAll(() => state.event.setInvasions(previousInvasions))

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

test('Rocket Pokemon keys preserve explicit forms and omit unknown forms', () => {
  assert.equal(getRocketPokemonFilterKey(633), 'a633')
  assert.equal(getRocketPokemonFilterKey(633, null), 'a633')
  assert.equal(getRocketPokemonFilterKey(633, ''), 'a633')
  assert.equal(getRocketPokemonFilterKey(633, 0), 'a633-0')
  assert.equal(getRocketPokemonFilterKey(633, 2291), 'a633-2291')

  assert.deepEqual(
    [
      ...collapseRocketPokemonFilterKeys([
        'a633-0',
        'a633-2291',
        'a633-undefined',
        'a633',
        'a19-46',
        'i12',
      ]),
    ],
    ['a633-0', 'a633-2291', 'a19-46', 'i12'],
  )
  assert.deepEqual([...collapseRocketPokemonFilterKeys(['a633'])], ['a633'])
  assert.deepEqual(
    [...collapseRocketPokemonFilterKeys(['a633-undefined', 'a633'])],
    ['a633'],
  )
})

test('unknown Rocket forms match any exact sibling or a species-wide filter', () => {
  assert.equal(Pokestop.hasRocketPokemonFilter({ 'a633-0': true }, 633), true)
  assert.equal(
    Pokestop.hasRocketPokemonFilter({ 'a633-2291': true }, 633),
    true,
  )
  assert.equal(Pokestop.hasRocketPokemonFilter({ a633: true }, 633), true)
  assert.equal(Pokestop.hasRocketPokemonFilter({ 'a633-0': false }, 633), false)

  assert.equal(
    Pokestop.hasRocketPokemonFilter({ 'a633-0': true }, 633, 0),
    true,
  )
  assert.equal(Pokestop.hasRocketPokemonFilter({ a633: true }, 633, 0), true)
  assert.equal(
    Pokestop.hasRocketPokemonFilter({ 'a633-2291': true }, 633, 2291),
    true,
  )
  assert.equal(
    Pokestop.hasRocketPokemonFilter({ 'a633-0': true }, 633, 2291),
    false,
  )
  assert.equal(Pokestop.hasRocketPokemonFilter({ a633: true }, 633, 2291), true)
})

test('community Rocket filters do not require lineup-scanning support', () => {
  const previousAvailable = state.event.available.pokestops
  try {
    state.event.available.pokestops = ['a633']

    const filters = buildPokestops(
      { invasions: true },
      { allInvasions: true, invasionPokemon: true },
    )
    assert.equal(filters.a633.enabled, true)
  } finally {
    state.event.available.pokestops = previousAvailable
  }
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

test('confirmed partial lineups fall back only for missing reward slots', () => {
  const testInvasions = {
    1: {
      grunt: 'Grunt',
      firstReward: true,
      secondReward: true,
      thirdReward: false,
      encounters: {
        first: [
          { id: 19, form: 0 },
          { id: 20, form: 0 },
        ],
        second: [{ id: 21 }],
        third: [{ id: 22, form: 0 }],
      },
    },
  }
  const previousTestInvasions = state.event.invasions
  try {
    state.event.setInvasions(testInvasions)

    const partial = {
      grunt_type: 1,
      confirmed: true,
      slot_1_pokemon_id: 19,
      slot_1_form: 0,
      slot_2_pokemon_id: null,
      slot_2_form: null,
      slot_3_pokemon_id: null,
      slot_3_form: null,
    }

    assert.equal(
      Pokestop.invasionMatchesFilters(partial, { a19: true }, true),
      true,
      'a populated reward slot matches its observation',
    )
    assert.equal(
      Pokestop.invasionMatchesFilters(partial, { a20: true }, true),
      false,
      'a populated reward slot does not fall back to other configured encounters',
    )
    assert.equal(
      Pokestop.invasionMatchesFilters(partial, { a21: true }, true),
      true,
      'a missing reward slot falls back to its configured encounters',
    )
    assert.equal(
      Pokestop.invasionMatchesFilters(partial, { 'a21-0': true }, true),
      true,
      'an unknown fallback form matches an enabled exact sibling',
    )
    assert.equal(
      Pokestop.invasionMatchesFilters(partial, { a22: true }, true),
      false,
      'a slot that is not reward-enabled never falls back',
    )

    assert.equal(
      Pokestop.invasionMatchesFilters(
        { ...partial, slot_2_pokemon_id: 23, slot_2_form: 0 },
        { a21: true },
        true,
      ),
      false,
      'a populated nonmatching slot remains authoritative',
    )
    assert.equal(
      Pokestop.invasionMatchesFilters(partial, { a20: true }, false),
      true,
      'sources without confirmed-lineup support retain event fallback behavior',
    )
  } finally {
    state.event.setInvasions(previousTestInvasions)
  }
})

test('SQL prefilter retains confirmed rows with a matching missing reward slot', async () => {
  const testInvasions = {
    1: {
      grunt: 'Grunt',
      firstReward: true,
      secondReward: true,
      thirdReward: false,
      encounters: {
        first: [{ id: 19, form: 0 }],
        second: [{ id: 21, form: 0 }],
        third: [{ id: 22, form: 0 }],
      },
    },
  }
  const previousTestInvasions = state.event.invasions
  const previousQuery = Pokestop.query
  const previousGetSafe = config.getSafe
  const knex = knexFactory({ client: 'mysql2' })

  try {
    state.event.setInvasions(testInvasions)
    config.getSafe = (key) => {
      if (key === 'areas') return { polygons: {} }
      if (key === 'authentication') {
        return { strictAreaRestrictions: false, areaRestrictions: [] }
      }
      return previousGetSafe.call(config, key)
    }
    const query = knex('pokestop')
    query.then = (resolve, reject) => Promise.resolve([]).then(resolve, reject)
    Pokestop.query = () => query

    await Pokestop.getAll(
      {
        lures: false,
        quests: false,
        invasions: true,
        pokestops: false,
        eventStops: false,
        areaRestrictions: [],
      },
      {
        minLat: 51,
        minLon: 0,
        maxLat: 52,
        maxLon: 1,
        filters: {
          onlyLevels: 'all',
          onlyLures: false,
          onlyQuests: false,
          onlyInvasions: true,
          onlyArEligible: false,
          onlyAllPokestops: false,
          onlyEventStops: false,
          onlyConfirmed: false,
          onlyAreas: [],
          onlyExcludeGrunts: false,
          onlyExcludeLeaders: false,
          a21: true,
        },
      },
      {
        hasAltQuests: true,
        hasMultiInvasions: true,
        multiInvasionMs: false,
        hasRewardAmount: true,
        hasPowerUp: false,
        hasConfirmed: true,
      },
    )

    const { sql } = query.toSQL()
    assert.match(
      sql,
      /`character` in \(\?\) and \(`slot_2_pokemon_id` is null or `slot_2_pokemon_id` = \?\)/,
    )
    assert.doesNotMatch(sql, /`slot_1_pokemon_id` is null/)
    assert.doesNotMatch(sql, /`slot_3_pokemon_id` is null/)

    const legacyQuery = knex('pokestop')
    legacyQuery.then = (resolve, reject) =>
      Promise.resolve([]).then(resolve, reject)
    Pokestop.query = () => legacyQuery

    await Pokestop.getAll(
      {
        lures: false,
        quests: false,
        invasions: true,
        pokestops: false,
        eventStops: false,
        areaRestrictions: [],
      },
      {
        minLat: 51,
        minLon: 0,
        maxLat: 52,
        maxLon: 1,
        filters: {
          onlyLevels: 'all',
          onlyLures: false,
          onlyQuests: false,
          onlyInvasions: true,
          onlyArEligible: false,
          onlyAllPokestops: false,
          onlyEventStops: false,
          onlyConfirmed: false,
          onlyAreas: [],
          onlyExcludeGrunts: false,
          onlyExcludeLeaders: false,
          a21: true,
        },
      },
      {
        hasAltQuests: false,
        hasMultiInvasions: false,
        multiInvasionMs: false,
        hasRewardAmount: true,
        hasPowerUp: false,
        hasConfirmed: false,
      },
    )

    const legacySql = legacyQuery.toSQL()
    assert.match(legacySql.sql, /`grunt_type` in \(\?\)/)
    assert.match(legacySql.sql, /`incident_expire_timestamp` >= \?/)
    assert.equal(legacySql.bindings.includes('1'), true)
  } finally {
    state.event.setInvasions(previousTestInvasions)
    Pokestop.query = previousQuery
    config.getSafe = previousGetSafe
    await knex.destroy()
  }
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
      showcase_focus_filter: true,
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

test('available mapper distinguishes unknown and explicit zero forms', () => {
  const { available } = mapAvailablePokestops(
    {
      showcase_focus_filter: true,
      invasions: [
        {
          character: 1,
          display_type: 1,
          confirmed: true,
          slot1_pokemon_id: 19,
          slot1_form: 0,
          slot2_pokemon_id: 20,
          slot2_form: null,
        },
      ],
    },
    {
      invasions: {
        1: {
          firstReward: true,
          secondReward: true,
          thirdReward: false,
        },
      },
    },
  )

  assert.equal(available.includes('a19-0'), true)
  assert.equal(available.includes('a20'), true)
  assert.equal(available.includes('a20-0'), false)
})

test('SQL availability accepts partial lineups and community-only sources', async () => {
  const previousTestInvasions = state.event.invasions
  const previousQuery = Pokestop.query
  const knex = knexFactory({ client: 'mysql2' })
  const sql = []

  try {
    state.event.setInvasions({
      1: {
        grunt: 'Grunt',
        firstReward: true,
        secondReward: false,
        thirdReward: false,
        encounters: {
          first: [{ id: 633 }],
          second: [],
          third: [],
        },
      },
    })
    Pokestop.query = () => {
      const query = knex('pokestop')
      query.then = (resolve, reject) => {
        sql.push(query.toSQL().sql)
        return Promise.resolve([]).then(resolve, reject)
      }
      return query
    }

    const context = {
      hasAltQuests: false,
      hasMultiInvasions: true,
      multiInvasionMs: false,
      hasRewardAmount: true,
      hasConfirmed: true,
      hasShowcaseData: false,
      hasShowcaseForm: false,
      hasShowcaseType: false,
      hasShowcaseFocus: false,
    }
    const confirmed = await Pokestop.getAvailable(context)
    const rocketSql = sql.find(
      (statement) =>
        statement.includes('from `incident`') &&
        statement.includes('slot_1_pokemon_id'),
    )

    assert.ok(rocketSql)
    assert.match(
      rocketSql,
      /`slot_1_pokemon_id` > \? or `slot_2_pokemon_id` > \? or `slot_3_pokemon_id` > \?/,
    )
    assert.match(rocketSql, /`confirmed` = \? and `expiration` >= \?/)
    assert.equal(confirmed.available.includes('a633'), true)

    sql.length = 0
    const communityOnly = await Pokestop.getAvailable({
      ...context,
      hasConfirmed: false,
    })
    assert.equal(communityOnly.available.includes('a633'), true)
    assert.equal(
      sql.some((statement) => statement.includes('slot_1_pokemon_id')),
      false,
    )
  } finally {
    state.event.setInvasions(previousTestInvasions)
    Pokestop.query = previousQuery
    await knex.destroy()
  }
})

test('Pokemon search exclusion does not suppress direct Decoy name matches', async () => {
  const searchPreviousInvasions = state.event.invasions
  const previousAvailable = state.event.available.pokestops
  const previousMasterfile = state.event.masterfile
  const previousQuery = Pokestop.query
  const previousTranslate = i18next.t
  const previousGetSafe = config.getSafe
  const knex = knexFactory({ client: 'mysql2' })

  try {
    state.event.setInvasions({
      1: rewardConfig(69),
      46: rewardConfig(69),
    })
    state.event.available.pokestops = ['a69']
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
    assert.match(sql, /`grunt_type` in \(\?\) or/)
    assert.match(sql, /`grunt_type` not in/)
    assert.match(sql, /`incident_expire_timestamp` >= \?/)

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
    assert.match(fallbackQuery.toSQL().sql, /`grunt_type` in \(\?\)/)

    const millisecondQuery = knex('pokestop')
    millisecondQuery.then = (resolve, reject) =>
      Promise.resolve([{ grunt_type: 1 }]).then(resolve, reject)
    Pokestop.query = () => millisecondQuery
    await Pokestop.searchInvasions(
      { areaRestrictions: [] },
      { search: 'pokemon', onlyAreas: [], locale: 'en' },
      { hasMultiInvasions: true, multiInvasionMs: true, hasConfirmed: false },
      'distance',
      { minLat: 0, maxLat: 1, minLon: 0, maxLon: 1 },
    )
    assert.match(millisecondQuery.toSQL().sql, /`expiration_ms` >= \?/)
  } finally {
    state.event.setInvasions(searchPreviousInvasions)
    state.event.available.pokestops = previousAvailable
    state.event.masterfile = previousMasterfile
    Pokestop.query = previousQuery
    i18next.t = previousTranslate
    config.getSafe = previousGetSafe
    await knex.destroy()
  }
})
