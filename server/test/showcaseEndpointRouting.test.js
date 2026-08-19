const assert = require('node:assert/strict')
const { test } = require('node:test')
const knexFactory = require('knex')

require('./stateMock')

const scannerQuery = require('../src/utils/evalScannerQuery')
const areaSql = require('../src/utils/getAreaSql')
const questLayerMode = require('../src/utils/questLayerMode')

const baseArgs = {
  minLat: 0,
  maxLat: 1,
  minLon: 0,
  maxLon: 1,
  filters: {
    onlyAllPokestops: false,
    onlyEventStops: true,
    onlyLevels: 'all',
    onlyAreas: [],
    y3: {},
  },
}

const baseContext = {
  hasAltQuests: false,
  hasMultiInvasions: true,
  multiInvasionMs: false,
  hasRewardAmount: true,
  hasPowerUp: false,
  hasConfirmed: true,
  mem: 'http://unused-golbat',
  secret: '',
  httpAuth: null,
}

test('Buddy Showcase filters stay on the exact Golbat endpoint path', async (t) => {
  const requests = []
  const ts = Math.floor(Date.now() / 1000)
  t.mock.method(scannerQuery, 'evalScannerQuery', async (...request) => {
    requests.push(request)
    return {
      pokestops: [
        {
          id: 'buddy-showcase',
          lat: 0.5,
          lon: 0.5,
          enabled: true,
          deleted: false,
          updated: ts,
          lure_id: 501,
          lure_expire_timestamp: ts + 3600,
          showcase_expiry: ts + 3600,
          showcase_focus: { type: 'buddy', min_level: 3 },
          invasions: [
            {
              character: 0,
              display_type: 9,
              expiration: ts + 3600,
              confirmed: false,
            },
          ],
        },
      ],
    }
  })
  t.mock.method(areaSql, 'getAreaSql', () => true)

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
      return Promise.resolve([]).then(resolve, reject)
    }
    return query
  }

  const result = await Pokestop.getAll(
    {
      eventStops: true,
      pokestops: false,
      lures: false,
      quests: false,
      invasions: false,
      areaRestrictions: [],
    },
    baseArgs,
    baseContext,
  )

  assert.equal(result.length, 1)
  assert.deepEqual(result[0].events[0].showcase_focus, {
    type: 'buddy',
    min_level: 3,
  })
  assert.equal(sqlExecutions, 0)
  assert.equal(requests.length, 1)
  const requestBody = JSON.parse(requests[0][2])
  assert.deepEqual(requestBody.filters, [
    { contest_focus: [{ type: 'buddy', min_level: 3 }] },
  ])
})

test('all-stop and AR-only modes are authorized at the model boundary', async (t) => {
  let endpointRows = []
  t.mock.method(scannerQuery, 'evalScannerQuery', async () => ({
    pokestops: endpointRows,
  }))
  t.mock.method(areaSql, 'getAreaSql', () => true)
  t.mock.method(questLayerMode, 'isDualQuestLayerMode', () => true)

  const pokestopModule = require.resolve('../src/models/Pokestop')
  delete require.cache[pokestopModule]
  const { Pokestop } = require('../src/models/Pokestop')
  const originalQuery = Pokestop.query
  const knex = knexFactory({ client: 'mysql2' })
  let sqlRows = []

  t.after(async () => {
    Pokestop.query = originalQuery
    delete require.cache[pokestopModule]
    await knex.destroy()
  })

  Pokestop.query = () => {
    const query = knex('pokestop')
    query.then = (resolve, reject) =>
      Promise.resolve(sqlRows).then(resolve, reject)
    return query
  }

  const ordinaryStop = {
    id: 'ordinary-stop',
    lat: 0.5,
    lon: 0.5,
    enabled: true,
    deleted: false,
    updated: Math.floor(Date.now() / 1000),
    ar_scan_eligible: 1,
  }
  const args = {
    ...baseArgs,
    filters: {
      onlyAllPokestops: true,
      onlyEventStops: false,
      onlyLevels: 'all',
      onlyAreas: [],
    },
  }
  const eventOnlyPerms = {
    eventStops: true,
    pokestops: false,
    lures: false,
    quests: false,
    invasions: false,
    areaRestrictions: [],
  }

  endpointRows = [ordinaryStop]
  assert.deepEqual(await Pokestop.getAll(eventOnlyPerms, args, baseContext), [])
  assert.equal(
    (
      await Pokestop.getAll(
        { ...eventOnlyPerms, pokestops: true },
        args,
        baseContext,
      )
    ).length,
    1,
  )

  const arArgs = {
    ...baseArgs,
    filters: {
      onlyAllPokestops: false,
      onlyArEligible: true,
      onlyEventStops: false,
      onlyLevels: 'all',
      onlyAreas: [],
    },
  }
  assert.deepEqual(
    await Pokestop.getAll(eventOnlyPerms, arArgs, baseContext),
    [],
  )
  assert.equal(
    (
      await Pokestop.getAll(
        { ...eventOnlyPerms, pokestops: true },
        arArgs,
        baseContext,
      )
    ).length,
    1,
  )

  sqlRows = [ordinaryStop]
  const sqlContext = {
    ...baseContext,
    mem: '',
    hasMultiInvasions: false,
  }
  assert.deepEqual(await Pokestop.getAll(eventOnlyPerms, args, sqlContext), [])
  assert.equal(
    (
      await Pokestop.getAll(
        { ...eventOnlyPerms, pokestops: true },
        args,
        sqlContext,
      )
    ).length,
    1,
  )
  assert.deepEqual(
    await Pokestop.getAll(eventOnlyPerms, arArgs, sqlContext),
    [],
  )
  assert.equal(
    (
      await Pokestop.getAll(
        { ...eventOnlyPerms, pokestops: true },
        arArgs,
        sqlContext,
      )
    ).length,
    1,
  )
})
