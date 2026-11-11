const assert = require('node:assert/strict')
const { test, mock } = require('node:test')

// evalScannerQuery reads fetchJson at load, so stub the module before it loads.
let reply
mock.module(require.resolve('../src/utils/fetchJson'), {
  cache: true,
  namedExports: { fetchJson: async () => reply },
})

require('./stateMock')

const { DbManager } = require('../src/services/DbManager')
const { Station } = require('../src/models/Station')

const source = (connection, result) => ({
  connection,
  SubModel: { getDynamaxMons: async () => result },
})

const manager = (sources) => {
  const db = Object.create(DbManager.prototype)
  db.models = { Station: sources }
  db.log = { warn: () => {} }
  return db
}

const mons = (count, form = 0) =>
  Array.from({ length: count }, (_, i) => ({
    pokemon_id: 800 + i,
    form,
    costume: 0,
    gender: 1,
    bread_mode: i < 4 ? 2 : 0,
  }))

test('a station missing from another source keeps all of its mons', async () => {
  const db = manager([
    source(0, { updated: 100, stationed_pokemon: mons(15) }),
    source(1, null),
  ])

  const results = await db.getStationPokemon(1)

  assert.deepEqual(results, mons(15))
})

test('the source with the freshest station wins', async () => {
  const db = manager([
    source(0, { updated: 100, stationed_pokemon: mons(15) }),
    source(1, { updated: 200, stationed_pokemon: mons(3, 1) }),
  ])

  const results = await db.getStationPokemon(1)

  assert.deepEqual(results, mons(3, 1))
})

test('an HTTP error from the endpoint falls back to SQL', async () => {
  reply = { status: 404, statusText: 'Not Found' }
  const row = { updated: 100, stationed_pokemon: JSON.stringify(mons(15)) }
  const SubModel = {
    query: () => ({ findById: () => ({ select: async () => row }) }),
  }

  const result = await Station.getDynamaxMons.call(SubModel, 1, {
    mem: 'http://golbat',
  })

  assert.deepEqual(result, { updated: 100, stationed_pokemon: mons(15) })
})
