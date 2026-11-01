const assert = require('node:assert/strict')
const { test } = require('node:test')

require('./stateMock')

const { DbManager } = require('../src/services/DbManager')

const source = (connection, result, extra = {}) => {
  const calls = []
  return {
    calls,
    entry: {
      connection,
      ...extra,
      SubModel: {
        search: async () => {
          calls.push(connection)
          if (result instanceof Error) throw result
          return result
        },
      },
    },
  }
}

const manager = (models, connections) => {
  const warnings = []
  const db = Object.create(DbManager.prototype)
  db.models = models
  db.connections = connections
  db.log = {
    warn: (...args) => warnings.push(args),
    debug: () => {},
    info: () => {},
  }
  return { db, warnings }
}

const args = { lat: 42.36, lon: -71.06, search: 'park' }

test('a fort search skips a source with no database behind it', async () => {
  const sql = source(0, [{ id: 'g1', updated: 1, distance: 1 }])
  const endpoint = source(
    1,
    new Error('no database connection available for a query'),
    { mem: 'http://golbat:4001' },
  )
  const { db, warnings } = manager({ Gym: [sql.entry, endpoint.entry] }, [{}])

  const results = await db.search('Gym', {}, args)

  assert.deepEqual(
    results.map((r) => r.id),
    ['g1'],
  )
  assert.equal(endpoint.calls.length, 0)
  assert.equal(warnings.length, 0)
})

test('a Pokemon search still asks its endpoint source', async () => {
  const endpoint = source(0, [{ id: 'p1', updated: 1, distance: 1 }], {
    mem: 'http://golbat:4001',
  })
  const { db } = manager({ Pokemon: [endpoint.entry] }, [])

  const results = await db.search('Pokemon', {}, args)

  assert.deepEqual(
    results.map((r) => r.id),
    ['p1'],
  )
  assert.ok(endpoint.calls.length > 0)
})

test('a failing database source is still logged', async () => {
  const sql = source(0, new Error('ER_ACCESS_DENIED'))
  const { db, warnings } = manager({ Gym: [sql.entry] }, [{}])

  const results = await db.search('Gym', {}, args)

  assert.deepEqual(results, [])
  assert.equal(warnings.length, 1)
})
