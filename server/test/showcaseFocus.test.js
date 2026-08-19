const assert = require('node:assert/strict')
const { test } = require('node:test')
const knexFactory = require('knex')

const { buildDefaultFilters } = require('../src/filters/builder/base')
const { buildPokestops } = require('../src/filters/builder/pokestop')
const { buildPokestopDnfFilters } = require('../src/filters/fort/pokestop')
const { resolvers } = require('../src/graphql/resolvers')
const { Pokestop } = require('../src/models/Pokestop')
const { clientOptions } = require('../src/ui/clientOptions')
const {
  mapAvailablePokestops,
} = require('../src/models/pokestopAvailableMapper')
const { mapScanPokestop } = require('../src/models/pokestopScanMapper')
const { state } = require('../src/services/state')
const {
  hasAnyPokestopPermission,
} = require('../src/utils/hasAnyPokestopPermission')
const {
  SHOWCASE_BUDDY_FILTER_KEYS,
  getShowcaseEventFilterKey,
  getShowcaseFocusDisplay,
  getShowcaseFocusFilterKey,
  parseShowcaseFocus,
} = require('../src/utils/showcaseFocus')

test('Showcase focus normalizes JSON text and native objects', () => {
  const buddy = { type: 'buddy', min_level: 3 }

  assert.deepEqual(parseShowcaseFocus(JSON.stringify(buddy)), buddy)
  assert.equal(parseShowcaseFocus(buddy), buddy)
  assert.equal(parseShowcaseFocus('{broken'), null)
  assert.equal(parseShowcaseFocus([]), null)
  assert.equal(parseShowcaseFocus({ min_level: 3 }), null)

  assert.equal(getShowcaseFocusFilterKey(buddy), 'y3')
  assert.equal(
    getShowcaseFocusFilterKey({
      type: 'pokemon',
      pokemon_id: 25,
      pokemon_form: 0,
    }),
    'f25-0',
  )
  assert.equal(
    getShowcaseFocusFilterKey({ type: 'type', pokemon_type_1: 13 }),
    'h13',
  )
  assert.deepEqual(getShowcaseFocusDisplay(buddy), {
    focus: buddy,
    pokemonId: null,
    pokemonFormId: null,
    pokemonTypeId: null,
  })
})

test('structured Buddy focus wins over stale legacy Showcase fields', () => {
  assert.equal(
    getShowcaseEventFilterKey({
      display_type: 9,
      showcase_focus: { type: 'buddy', min_level: 3 },
      showcase_pokemon_id: 25,
      showcase_pokemon_form_id: 0,
      showcase_pokemon_type_id: 13,
    }),
    'y3',
  )
  assert.equal(
    getShowcaseEventFilterKey({
      display_type: 9,
      showcase_focus: { type: 'generation', generation: 1 },
      showcase_pokemon_id: 25,
    }),
    'b9',
  )
  assert.equal(
    getShowcaseEventFilterKey({
      display_type: 9,
      showcase_pokemon_id: 25,
      showcase_pokemon_form_id: 0,
    }),
    'f25-0',
  )
  assert.equal(
    getShowcaseEventFilterKey({
      display_type: 9,
      showcase_pokemon_type_id: 13,
    }),
    'h13',
  )
  assert.equal(getShowcaseEventFilterKey({ display_type: 0 }), 'b0')
})

test('Golbat scan mapper preserves string and object Showcase focus', () => {
  const mappedObject = mapScanPokestop({
    id: 'object',
    enabled: true,
    deleted: false,
    showcase_focus: { type: 'buddy', min_level: 2 },
  })
  const mappedString = mapScanPokestop({
    id: 'string',
    enabled: true,
    deleted: false,
    showcase_focus: '{"type":"buddy","min_level":4}',
  })

  assert.deepEqual(JSON.parse(mappedObject.showcase_focus), {
    type: 'buddy',
    min_level: 2,
  })
  assert.equal(mappedString.showcase_focus, '{"type":"buddy","min_level":4}')
})

test('endpoint availability maps structured Showcase focus', () => {
  const api = {
    showcase_focus_filter: true,
    showcases: [
      {
        showcase_focus: { type: 'buddy', min_level: 2 },
        pokemon_id: null,
        form: null,
        type_id: null,
      },
      {
        showcase_focus: { type: 'buddy', min_level: 5 },
        pokemon_id: null,
        form: null,
        type_id: null,
      },
      {
        showcase_focus: {
          type: 'pokemon',
          pokemon_id: 25,
          pokemon_form: 0,
        },
        pokemon_id: 25,
        form: 0,
        type_id: null,
      },
      {
        pokemon_id: 133,
        form: 0,
        type_id: null,
      },
    ],
  }

  const exact = mapAvailablePokestops(api, { invasions: {} })
  assert.deepEqual(exact.available, ['y2', 'y5', 'f25-0', 'f133-0'])
})

test('Buddy Showcase DNF uses Golbat exact focus selectors', () => {
  assert.deepEqual(
    buildPokestopDnfFilters({ onlyEventStops: true, y3: true }),
    [{ contest_focus: [{ type: 'buddy', min_level: 3 }] }],
  )
  assert.deepEqual(
    buildPokestopDnfFilters({
      onlyEventStops: true,
      y3: true,
      y4: true,
      b9: true,
    }),
    [
      { incident_display_type: [9] },
      {
        contest_focus: [
          { type: 'buddy', min_level: 3 },
          { type: 'buddy', min_level: 4 },
        ],
      },
    ],
  )
  assert.deepEqual(
    buildPokestopDnfFilters({ onlyEventStops: false, y3: true }),
    [],
  )
})

test('builder defaults exact Showcase filters without broad b9', (t) => {
  const previousAvailable = state.event.available.pokestops
  t.after(() => {
    state.event.available.pokestops = previousAvailable
  })
  state.event.available.pokestops = [...SHOWCASE_BUDDY_FILTER_KEYS, 'b9']

  const filters = buildPokestops(
    { eventStops: true },
    { showcasePokemon: true },
  )

  assert.deepEqual(
    SHOWCASE_BUDDY_FILTER_KEYS.map((key) => filters[key].enabled),
    [true, true, true, true],
  )
  assert.equal(filters.b9.enabled, false)
  assert.equal(buildPokestops({}, { showcasePokemon: true }).y2, undefined)
})

test('shared Pokestop access gate includes every Pokestop facet', () => {
  ;['pokestops', 'eventStops', 'quests', 'invasions', 'lures'].forEach(
    (permission) => {
      assert.equal(hasAnyPokestopPermission({ [permission]: true }), true)
    },
  )
  assert.equal(hasAnyPokestopPermission({ pokemon: true }), false)
  assert.equal(hasAnyPokestopPermission(null), false)
})

test('Event Stop-only users receive the Pokestop filter tree', (t) => {
  const previousModels = state.db.models.Pokestop
  const previousAvailable = state.event.available.pokestops
  const previousMasterfile = state.event.masterfile
  t.after(() => {
    state.db.models.Pokestop = previousModels
    state.event.available.pokestops = previousAvailable
    state.event.masterfile = previousMasterfile
  })
  state.db.models.Pokestop = [{}]
  state.event.available.pokestops = ['y3']
  state.event.masterfile = {
    items: {},
    pokemon: {
      25: { family: 25, forms: { 0: {} } },
    },
  }

  const filters = buildDefaultFilters({ eventStops: true })

  assert.ok(filters.pokestops)
  assert.equal(filters.pokestops.allPokestops, undefined)
  assert.equal(filters.pokestops.quests, undefined)
  assert.equal(typeof filters.pokestops.eventStops, 'boolean')
  assert.ok(filters.pokestops.filter.s0)
  assert.equal(filters.pokestops.filter.y3.enabled, true)
  assert.equal(filters.pokestops.filter['25'], undefined)
  assert.equal(filters.pokestops.filter['25-0'], undefined)
  assert.equal(filters.pokestops.filter.c25, undefined)
  assert.equal(filters.pokestops.filter.x25, undefined)

  const questFilters = buildDefaultFilters({ quests: true })
  assert.ok(questFilters.pokestops.filter['25'])
  assert.ok(questFilters.pokestops.filter['25-0'])
})

test('Event Stop-only users can configure their visible Pokestop markers', () => {
  const { clientMenus } = clientOptions({ eventStops: true })

  assert.equal(clientMenus.pokestops.clustering.disabled, false)
  assert.equal(clientMenus.pokestops.eventStopTimers.disabled, false)
  assert.equal(clientMenus.pokestops.showcaseRange.disabled, false)
  assert.equal(clientMenus.pokestops.interactionRanges.disabled, true)
})

test('available Pokestop permissions classify Showcase filters as Event Stops', () => {
  const Event = {
    available: {
      pokestops: [
        'f25-0',
        'h13',
        'b9',
        ...SHOWCASE_BUDDY_FILTER_KEYS,
        'd500',
        'l501',
      ],
    },
  }

  assert.deepEqual(
    resolvers.Query.availablePokestops(null, null, {
      Event,
      perms: { eventStops: true },
    }),
    ['f25-0', 'h13', 'b9', 'y2', 'y3', 'y4', 'y5'],
  )
  assert.deepEqual(
    resolvers.Query.availablePokestops(null, null, {
      Event,
      perms: { quests: true },
    }),
    ['d500'],
  )
  assert.deepEqual(
    resolvers.Query.availablePokestops(null, null, {
      Event,
      perms: { lures: true },
    }),
    ['l501'],
  )
})

test('Event Stop permission can query Pokestop markers', async () => {
  let queryCalls = 0
  const result = await resolvers.Query.pokestops(
    null,
    {},
    {
      perms: { eventStops: true },
      Db: {
        query: async () => {
          queryCalls += 1
          return []
        },
      },
    },
  )

  assert.deepEqual(result, [])
  assert.equal(queryCalls, 1)
})

test('secondary filter exact-matches Buddy level and emits normalized focus', () => {
  const ts = Math.floor(Date.now() / 1000)
  const stop = {
    id: 'buddy-showcase',
    lat: 1,
    lon: 2,
    enabled: true,
    showcase_expiry: ts + 600,
    showcase_focus: '{"type":"buddy","min_level":3}',
    showcase_pokemon_id: 25,
    showcase_pokemon_form_id: 0,
    showcase_pokemon_type_id: 13,
    showcase_rankings: '{}',
    quests: [],
    invasions: [
      {
        grunt_type: 0,
        display_type: 9,
        incident_expire_timestamp: ts + 600,
      },
    ],
  }
  const perms = { eventStops: true, showcaseRankings: false }
  const run = (filters) =>
    Pokestop.secondaryFilter(
      [stop],
      { onlyEventStops: true, ...filters },
      ts,
      0,
      perms,
      false,
      false,
      'both',
      10,
    )

  const matching = run({ y3: true })
  assert.equal(matching.length, 1)
  assert.deepEqual(matching[0].events[0].showcase_focus, {
    type: 'buddy',
    min_level: 3,
  })
  assert.equal(matching[0].events[0].showcase_pokemon_id, null)
  assert.equal(matching[0].events[0].showcase_pokemon_type_id, null)
  assert.deepEqual(run({ y2: true, b9: true }), [])
  assert.deepEqual(run({ b9: true }), [])

  assert.equal(
    Pokestop.secondaryFilter(
      [{ ...stop, showcase_focus: '{broken' }],
      { onlyEventStops: true, 'f25-0': true },
      ts,
      0,
      perms,
      false,
      false,
      'both',
      10,
    ).length,
    1,
  )
})

test('SQL availability selects and derives active structured focus', async (t) => {
  const previousQuery = Pokestop.query
  const knex = knexFactory({ client: 'mysql2' })
  const sql = []

  t.after(async () => {
    Pokestop.query = previousQuery
    await knex.destroy()
  })

  Pokestop.query = () => {
    const query = knex('pokestop')
    query.then = (resolve, reject) => {
      const statement = query.toSQL().sql
      sql.push(statement)
      const rows = statement.includes('showcase_focus')
        ? [{ showcase_focus: '{"type":"buddy","min_level":4}' }]
        : []
      return Promise.resolve(rows).then(resolve, reject)
    }
    return query
  }

  const result = await Pokestop.getAvailable({
    hasAltQuests: false,
    hasMultiInvasions: false,
    multiInvasionMs: false,
    hasRewardAmount: true,
    hasConfirmed: false,
    hasShowcaseData: false,
    hasShowcaseForm: false,
    hasShowcaseType: false,
    hasShowcaseFocus: true,
  })

  assert.equal(result.available.includes('y4'), true)
  assert.equal(
    sql.some(
      (statement) =>
        statement.includes('showcase_focus') &&
        statement.includes('showcase_expiry'),
    ),
    true,
  )
})
