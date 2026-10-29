const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const knexFactory = require('knex')
const ts = require('typescript')
const config = require('@rm/config')

const { state } = require('./stateMock')
const { buildTappables } = require('../src/filters/builder/tappable')
const { Tappable } = require('../src/models/Tappable')

const perms = { tappables: true, areaRestrictions: [] }
const bounds = { minLat: 0, maxLat: 1, minLon: 0, maxLon: 1 }

function captureQueries(t, rowsFor = () => []) {
  const previousQuery = Tappable.query
  const previousGetSafe = config.getSafe
  const knex = knexFactory({ client: 'mysql2' })
  const statements = []

  t.after(async () => {
    Tappable.query = previousQuery
    config.getSafe = previousGetSafe
    await knex.destroy()
  })

  config.getSafe = (key) =>
    key === 'areas' ? { polygons: {} } : previousGetSafe.call(config, key)

  Tappable.query = () => {
    const query = knex('tappable')
    query.then = (resolve, reject) => {
      const statement = query.toSQL().toNative()
      statements.push(statement)
      return Promise.resolve(rowsFor(statement.sql)).then(resolve, reject)
    }
    return query
  }
  return statements
}

function loadClientModule(relativePath) {
  const filename = path.resolve(__dirname, '../../', relativePath)
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  })
  const exports = {}
  vm.runInNewContext(outputText, { exports }, { filename })
  return exports
}

test('available tappable rewards map Golbat reward types to filter keys', async (t) => {
  const statements = captureQueries(t, () => [
    { reward_type: 'item', item_id: 1301, reward_pokemon_id: null },
    { reward_type: 'pokemon_candy', item_id: null, reward_pokemon_id: 25 },
    { reward_type: 'xl_candy', item_id: null, reward_pokemon_id: 25 },
    {
      reward_type: 'mega_energy_pokemon_id',
      item_id: null,
      reward_pokemon_id: 6,
    },
    {
      reward_type: 'temp_evo_pokemon_branch',
      item_id: null,
      reward_pokemon_id: 6,
    },
  ])

  const { available } = await Tappable.getAvailable({
    hasTappableRewards: true,
  })

  assert.deepEqual(available.sort(), ['c25', 'm6', 'q1301', 'x25'])
  assert.equal(statements.length, 1)
  assert.match(statements[0].sql, /`reward_type` in/)
})

test('available tappables keep item-only keys without reward columns', async (t) => {
  const statements = captureQueries(t, () => [{ item_id: 1301 }])

  const { available } = await Tappable.getAvailable({})

  assert.deepEqual(available, ['q1301'])
  assert.doesNotMatch(statements[0].sql, /reward_type/)
})

test('tappable query filters each reward type by its own id column', async (t) => {
  const statements = captureQueries(t)

  await Tappable.getAll(
    perms,
    { ...bounds, filters: { q1301: {}, c25: {}, m6: {}, onlyAreas: [] } },
    { hasTappableRewards: true },
  )

  const { sql, bindings } = statements[0]
  assert.match(sql, /`reward_type`, `reward_pokemon_id`/)
  assert.match(
    sql,
    /`reward_type` in \(\?\) and `item_id` is not null and `item_id` in \(\?\)/,
  )
  assert.match(
    sql,
    /or \(`reward_type` in \(\?\) and `reward_pokemon_id` is not null and `reward_pokemon_id` in \(\?\)\)/,
  )
  assert.equal(bindings.includes('xl_candy'), false)
  assert.equal(bindings.includes('pokemon_candy'), true)
  assert.equal(bindings.includes('temp_evo_pokemon_branch'), true)
})

test('tappable query without reward columns stays item-only', async (t) => {
  const statements = captureQueries(t)

  await Tappable.getAll(perms, { ...bounds, filters: { q1301: {} } }, {})

  assert.doesNotMatch(statements[0].sql, /reward/)
  assert.match(statements[0].sql, /`item_id` is not null/)
})

test('tappable filters are built for available candy and mega energy', () => {
  state.event.masterfile = { items: {} }
  state.event.available.tappables = ['c25', 'x25', 'm6']

  const filters = buildTappables(perms, {
    items: true,
    candy: false,
    xlCandy: true,
    megaEnergy: false,
  })

  assert.equal(filters.c25.enabled, false)
  assert.equal(filters.x25.enabled, true)
  assert.equal(filters.m6.enabled, false)
})

test('client resolves tappable rewards from Golbat reward types', () => {
  const { getTappableReward } = loadClientModule(
    'src/features/tappable/rewards.js',
  )

  assert.deepEqual(
    { ...getTappableReward({ reward_type: 'item', item_id: 1301 }) },
    { filterKey: 'q1301', questRewardType: 2, id: 1301 },
  )
  assert.deepEqual(
    {
      ...getTappableReward({
        reward_type: 'pokemon_candy',
        reward_pokemon_id: 25,
      }),
    },
    { filterKey: 'c25', questRewardType: 4, id: 25 },
  )
  assert.deepEqual(
    {
      ...getTappableReward({
        reward_type: 'temp_evo_pokemon_branch',
        reward_pokemon_id: 6,
      }),
    },
    { filterKey: 'm6', questRewardType: 12, id: 6 },
  )
  // rows from databases without reward_type are always items
  assert.equal(getTappableReward({ item_id: 1 }).filterKey, 'q1')
  assert.equal(getTappableReward({ reward_type: 'stardust' }), null)
})

test('client resolves tappable filter keys and reward names', () => {
  const { getTappableRewardFromKey, getTappableRewardName } = loadClientModule(
    'src/features/tappable/rewards.js',
  )
  const t = (key) => `<${key}>`

  assert.equal(getTappableRewardFromKey('q0'), null)
  assert.equal(getTappableRewardFromKey('global'), null)
  assert.equal(
    getTappableRewardName(getTappableRewardFromKey('c25'), t),
    '<poke_25> <candy>',
  )
  assert.equal(
    getTappableRewardName(getTappableRewardFromKey('x25'), t),
    '<poke_25> <xl>',
  )
  assert.equal(
    getTappableRewardName(getTappableRewardFromKey('m6'), t),
    '<poke_6> <quest_reward_12>',
  )
  assert.equal(
    getTappableRewardName(getTappableRewardFromKey('q1301'), t),
    '<item_1301>',
  )
})
