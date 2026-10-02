const assert = require('node:assert/strict')
const { DatabaseSync } = require('node:sqlite')
const { test } = require('node:test')
const knexFactory = require('knex')
const config = require('@rm/config')

const { state } = require('./stateMock')

const scannerQuery = require('../src/utils/evalScannerQuery')
const areaSql = require('../src/utils/getAreaSql')
const clientTime = require('../src/utils/getClientTime')
const pokemonData = require('../src/services/PokemonData')
const { buildDefaultFilters } = require('../src/filters/builder/base')
const {
  getEffectiveIncludeUpcoming,
} = require('../../src/features/station/battleState')

test('All Power Spots honors Include Upcoming across endpoint and SQL sources', async (t) => {
  const ts = Math.floor(Date.now() / 1000)
  const activeBattle = {
    battle_pokemon_id: 1,
    battle_pokemon_form: 0,
    battle_level: 1,
    battle_start: ts - 60,
    battle_end: ts + 600,
  }
  const upcomingBattle = { ...activeBattle, battle_start: ts + 60 }
  const stations = [
    { id: 'active', ...activeBattle },
    { id: 'unknown-start', ...activeBattle, battle_start: null },
    { id: 'zero-start', ...activeBattle, battle_start: 0 },
    { id: 'starting-now', ...activeBattle, battle_start: ts },
    { id: 'upcoming', ...upcomingBattle },
    { id: 'ended', ...activeBattle, battle_end: ts },
    { id: 'empty' },
    {
      id: 'mixed',
      ...activeBattle,
      battles: [upcomingBattle, activeBattle],
    },
    { id: 'expired', ...activeBattle, end_time: ts },
  ].map((station) => ({
    name: station.id,
    lat: 0.5,
    lon: 0.5,
    updated: ts,
    start_time: ts - 3600,
    end_time: ts + 3600,
    total_stationed_gmax: 1,
    battles: station.battle_end ? [{ ...station }] : [],
    ...station,
  }))

  t.mock.method(clientTime, 'getEpoch', () => ts)
  t.mock.method(areaSql, 'getAreaSql', () => true)
  t.mock.method(areaSql, 'areaRestrictionsDenyAll', () => false)
  t.mock.method(pokemonData, 'ensurePokemonData', async () => null)
  t.mock.method(scannerQuery, 'evalScannerQuery', async () => ({ stations }))

  const stationModule = require.resolve('../src/models/Station')
  delete require.cache[stationModule]
  const { Station } = require('../src/models/Station')
  const knex = knexFactory({ client: 'mysql2' })
  const database = new DatabaseSync(':memory:')
  let sqlExecutions = 0

  t.after(async () => {
    database.close()
    await knex.destroy()
    delete require.cache[stationModule]
  })

  database.exec(`
    CREATE TABLE station (
      id TEXT PRIMARY KEY, name TEXT, lat REAL, lon REAL, updated INTEGER,
      start_time INTEGER, end_time INTEGER, battle_start INTEGER,
      battle_end INTEGER, battle_pokemon_id INTEGER, battle_level INTEGER
    );
    CREATE TABLE station_battle (
      station_id TEXT, battle_start INTEGER, battle_end INTEGER,
      battle_pokemon_id INTEGER, battle_level INTEGER
    );
  `)
  const insertStation = database.prepare(`
    INSERT INTO station VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertBattle = database.prepare(`
    INSERT INTO station_battle VALUES (?, ?, ?, ?, ?)
  `)
  stations.forEach((station) => {
    insertStation.run(
      station.id,
      station.name,
      station.lat,
      station.lon,
      station.updated,
      station.start_time,
      station.end_time,
      station.battle_start ?? null,
      station.battle_end ?? null,
      station.battle_pokemon_id ?? null,
      station.battle_level ?? null,
    )
    station.battles.forEach((battle) => {
      insertBattle.run(
        station.id,
        battle.battle_start,
        battle.battle_end,
        battle.battle_pokemon_id,
        battle.battle_level,
      )
    })
  })

  t.mock.method(Station, 'knex', () => knex)
  t.mock.method(Station, 'query', () => {
    const query = knex('station')
    query.then = (resolve, reject) =>
      Promise.resolve()
        .then(() => {
          sqlExecutions += 1
          const { sql, bindings } = query.toSQL()
          return database.prepare(sql).all(...bindings)
        })
        .then(resolve, reject)
    return query
  })

  const perms = { stations: true, dynamax: false, areaRestrictions: [] }
  const args = {
    minLat: 0,
    maxLat: 1,
    minLon: 0,
    maxLon: 1,
    filters: {
      onlyAllStations: true,
      onlyMaxBattles: false,
      onlyBattleTier: 5,
      onlyGmaxStationed: true,
      onlyAreas: [],
    },
  }
  const sources = [
    { name: 'Golbat', mem: 'http://unused-golbat', hasMultiBattles: true },
    { name: 'SQL multi-battle', mem: '', hasMultiBattles: true },
    { name: 'SQL single-battle', mem: '', hasMultiBattles: false },
  ]
  const activeIds = [
    'active',
    'unknown-start',
    'zero-start',
    'starting-now',
    'mixed',
  ].sort()
  const liveIds = stations
    .filter((station) => station.id !== 'expired')
    .map((station) => station.id)
    .sort()

  await Promise.all(
    sources.map((source) =>
      t.test(source.name, async () => {
        const context = {
          ...source,
          hasStationedGmax: true,
          hasBattlePokemonStats: false,
        }
        const previousExecutions = sqlExecutions
        const active = await Station.getAll(
          perms,
          {
            ...args,
            filters: { ...args.filters, onlyIncludeUpcoming: false },
          },
          context,
        )
        assert.deepEqual(active.map((station) => station.id).sort(), activeIds)
        assert.ok(active.every((station) => !station.battles?.length))

        const upcoming = await Station.getAll(perms, args, context)
        assert.deepEqual(upcoming.map((station) => station.id).sort(), liveIds)

        const inactiveArgs = {
          ...args,
          filters: {
            ...args.filters,
            onlyInactiveStations: true,
            onlyIncludeUpcoming: false,
          },
        }
        const inactive = await Station.getAll(perms, inactiveArgs, context)
        assert.deepEqual(
          inactive.map((station) => station.id).sort(),
          activeIds,
        )

        const all = await Station.getAll(
          perms,
          {
            ...inactiveArgs,
            filters: { ...inactiveArgs.filters, onlyIncludeUpcoming: true },
          },
          context,
        )
        assert.deepEqual(
          all.map((station) => station.id).sort(),
          stations.map((station) => station.id).sort(),
        )
        assert.equal(sqlExecutions - previousExecutions, source.mem ? 0 : 4)
      }),
    ),
  )

  await t.test(
    'All mode ignores selected tiers with Max Battles enabled',
    async () => {
      const result = await Station.getAll(
        { ...perms, dynamax: true },
        {
          ...args,
          filters: {
            ...args.filters,
            onlyMaxBattles: true,
            onlyIncludeUpcoming: false,
          },
        },
        sources[0],
      )
      assert.deepEqual(result.map((station) => station.id).sort(), activeIds)
      assert.ok(result.every((station) => station.battles.length === 1))
    },
  )
})

test('Power Spot users receive the existing Include Upcoming default', (t) => {
  const previousStation = state.db.models.Station
  const previousMasterfile = state.event.masterfile
  t.after(() => {
    state.db.models.Station = previousStation
    state.event.masterfile = previousMasterfile
  })
  state.db.models.Station = {}
  state.event.masterfile = { pokemon: {} }
  const permissions = [
    { stations: true, dynamax: false },
    { stations: false, dynamax: true },
  ]
  permissions.forEach((perms) => {
    assert.equal(
      buildDefaultFilters(perms).stations.includeUpcoming,
      config.getSafe('defaultFilters.stations.includeUpcoming'),
    )
  })
})

test('All Power Spots does not override the client Include Upcoming setting', () => {
  assert.equal(
    getEffectiveIncludeUpcoming({ allStations: true, includeUpcoming: false }),
    false,
  )
  assert.equal(getEffectiveIncludeUpcoming({ allStations: true }), true)
})
