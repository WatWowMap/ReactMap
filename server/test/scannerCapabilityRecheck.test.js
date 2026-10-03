const assert = require('node:assert/strict')
const { test, mock } = require('node:test')

// evalScannerQuery reads fetchJson at load, so stub the module before it loads.
let reply
mock.module(require.resolve('../src/utils/fetchJson'), {
  cache: true,
  namedExports: { fetchJson: async () => reply },
})

const { golbatCapabilities } = require('../src/services/GolbatCapabilities')
const { evalScannerQuery } = require('../src/utils/evalScannerQuery')

const MEM = 'http://golbat-a'

test('a 4xx from a Golbat feature call rechecks that instance immediately', async (t) => {
  const rechecked = []
  t.mock.method(golbatCapabilities, 'recheck', async (mem) => {
    rechecked.push(mem)
  })

  reply = { status: 422, statusText: 'Unprocessable Entity' }
  await evalScannerQuery('tag', `${MEM}/api/pokestop/scan`, '{}', 'POST')
  assert.deepEqual(rechecked, [MEM])

  reply = { status: 400, statusText: 'Bad Request' }
  await evalScannerQuery('tag', `${MEM}/api/pokemon/v3/scan`, '{}', 'POST')
  assert.deepEqual(rechecked, [MEM, MEM])
})

test('other outcomes of a Golbat call do not trigger a recheck', async (t) => {
  const rechecked = []
  t.mock.method(golbatCapabilities, 'recheck', async (mem) => {
    rechecked.push(mem)
  })

  reply = { pokestops: [] }
  await evalScannerQuery('tag', `${MEM}/api/pokestop/scan`, '{}', 'POST')
  reply = { status: 404, statusText: 'Not Found' }
  await evalScannerQuery('tag', `${MEM}/api/pokestop/id/abc`, undefined, 'GET')
  reply = { status: 503, statusText: 'Service Unavailable' }
  await evalScannerQuery('tag', `${MEM}/api/fort/available`, undefined, 'GET')
  reply = undefined
  await evalScannerQuery('tag', `${MEM}/api/pokestop/scan`, '{}', 'POST')

  assert.deepEqual(rechecked, [])
})
