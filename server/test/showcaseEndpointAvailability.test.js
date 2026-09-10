const assert = require('node:assert/strict')
const { test } = require('node:test')
const knexFactory = require('knex')

require('./stateMock')

const fortAvailable = require('../src/utils/fortAvailable')

const { golbatCapabilities } = require('../src/services/GolbatCapabilities')

const MEM = 'http://unused-golbat'

const CONTEXT = {
  hasAltQuests: false,
  hasMultiInvasions: true,
  multiInvasionMs: false,
  hasRewardAmount: true,
  hasConfirmed: true,
  hasShowcaseData: false,
  hasShowcaseForm: false,
  hasShowcaseType: false,
  hasShowcaseFocus: false,
  mem: MEM,
  secret: '',
  httpAuth: null,
}

/** A combined-availability pokestop payload carrying one Buddy showcase. */
const showcasePayload = (extra = {}) => ({
  quests: [],
  invasions: [{ character: 0, display_type: 9 }],
  lures: [],
  showcases: [
    {
      pokemon_id: null,
      form: null,
      type_id: null,
      showcase_focus: { type: 'buddy', min_level: 3 },
    },
  ],
  ...extra,
})

/**
 * Loads a fresh Pokestop model whose combined-availability fetch returns
 * `getPokestops()` and whose SQL path counts (and rejects) any query.
 * @param {import('node:test').TestContext} t
 * @param {() => object} getPokestops
 */
function loadPokestop(t, getPokestops) {
  t.mock.method(fortAvailable, 'getCombinedFortAvailable', async () => ({
    pokestops: getPokestops(),
  }))
  const pokestopModule = require.resolve('../src/models/Pokestop')
  delete require.cache[pokestopModule]
  const { Pokestop } = require('../src/models/Pokestop')
  const originalQuery = Pokestop.query
  const sql = { executions: 0 }
  t.after(() => {
    Pokestop.query = originalQuery
    delete require.cache[pokestopModule]
  })
  Pokestop.query = () => {
    sql.executions += 1
    throw new Error('endpoint availability must not query SQL')
  }
  return { Pokestop, sql }
}

/**
 * Pins the capability registry's answer for MEM. `filters` null = the status
 * route reported no filters block (older Golbat).
 * @param {import('node:test').TestContext} t
 * @param {Record<string, boolean> | null} filters
 */
function mockStatus(t, filters) {
  t.mock.method(golbatCapabilities, 'advertisesFilters', (mem) =>
    mem === MEM ? filters !== null : false,
  )
  t.mock.method(golbatCapabilities, 'supportsFilter', (mem, key) =>
    mem === MEM ? filters?.[key] === true : false,
  )
  t.mock.method(golbatCapabilities, 'recheck', async () => {})
}

test('a Golbat that advertises showcase_focus serves availability without the legacy flag', async (t) => {
  mockStatus(t, { showcase_focus: true })
  const { Pokestop, sql } = loadPokestop(t, () => showcasePayload())

  const result = await Pokestop.getAvailable(CONTEXT)

  assert.deepEqual(result.available, ['b9', 'y3'])
  assert.equal(sql.executions, 0)
})

test('a Golbat that advertises filters without showcase_focus is rejected even if the legacy flag says true', async (t) => {
  mockStatus(t, { battle_available: true })
  const { Pokestop, sql } = loadPokestop(t, () =>
    showcasePayload({ showcase_focus_filter: true }),
  )

  await assert.rejects(
    Pokestop.getAvailable(CONTEXT),
    /required showcase_focus filter capability/,
  )
  assert.equal(sql.executions, 0)
})

test('a Golbat without a filters block is judged by the legacy showcase_focus_filter flag', async (t) => {
  mockStatus(t, null)
  let pokestops = showcasePayload({ showcase_focus_filter: true })
  const { Pokestop, sql } = loadPokestop(t, () => pokestops)

  const result = await Pokestop.getAvailable(CONTEXT)
  assert.deepEqual(result.available, ['b9', 'y3'])

  pokestops = showcasePayload({ showcase_focus_filter: false })
  await assert.rejects(
    Pokestop.getAvailable(CONTEXT),
    /required showcase_focus filter capability/,
  )

  pokestops = showcasePayload()
  await assert.rejects(
    Pokestop.getAvailable(CONTEXT),
    /required showcase_focus filter capability/,
  )
  assert.equal(sql.executions, 0)
})

test('an unsupported verdict rechecks the status route once before failing', async (t) => {
  // Registry still says "no filters block" from before an upgrade that dropped
  // the legacy flag; the recheck flips it and the same call succeeds.
  let filters = null
  t.mock.method(golbatCapabilities, 'advertisesFilters', () => filters !== null)
  t.mock.method(
    golbatCapabilities,
    'supportsFilter',
    (_mem, key) => filters?.[key] === true,
  )
  const rechecks = []
  t.mock.method(golbatCapabilities, 'recheck', async (mem) => {
    rechecks.push(mem)
    filters = { showcase_focus: true }
  })
  const { Pokestop, sql } = loadPokestop(t, () => showcasePayload())

  const result = await Pokestop.getAvailable(CONTEXT)

  assert.deepEqual(rechecks, [MEM])
  assert.deepEqual(result.available, ['b9', 'y3'])
  assert.equal(sql.executions, 0)
})

test('malformed endpoint availability falls through to dual-source SQL', async (t) => {
  t.mock.method(fortAvailable, 'getCombinedFortAvailable', async () => ({
    pokestops: {
      showcase_focus_filter: true,
      quests: [],
      invasions: [],
      lures: {},
      showcases: [],
    },
  }))

  const pokestopModule = require.resolve('../src/models/Pokestop')
  delete require.cache[pokestopModule]
  const { Pokestop } = require('../src/models/Pokestop')
  const originalQuery = Pokestop.query
  const knex = knexFactory({ client: 'mysql2' })
  let sqlExecutions = 0

  t.after(async () => {
    Pokestop.query = originalQuery
    delete require.cache[pokestopModule]
    await knex.destroy()
  })

  Pokestop.query = () => {
    const query = knex('pokestop')
    query.then = (resolve, reject) => {
      sqlExecutions += 1
      const rows = query.toSQL().sql.includes('showcase_focus')
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
    mem: 'http://malformed-golbat',
    secret: '',
    httpAuth: null,
  })

  assert.equal(sqlExecutions > 0, true)
  assert.equal(result.available.includes('y4'), true)
})
