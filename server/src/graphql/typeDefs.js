const { gql } = require('apollo-server-express')
const ScannerTypes = require('./scannerTypes')
const PoracleTypes = require('./poracleTypes')
const MapTypes = require('./mapTypes')

module.exports = gql`
  ${ScannerTypes}
  ${PoracleTypes}
  ${MapTypes}

  scalar JSON

  type Query {
    available(version: String): Available
    badges(version: String): [Badge]
    devices(version: String): [Device]
    geocoder(search: String, name: String, version: String): [Geocoder]
    gyms(minLat: Float, maxLat: Float, minLon: Float, maxLon: Float, ts: Int, filters: JSON, version: String): [Gym]
    gymsSingle(id: ID, perm: String, version: String): Gym
    nests(minLat: Float, maxLat: Float, minLon: Float, maxLon: Float, ts: Int, filters: JSON, version: String): [Nest]
    nestsSingle(id: ID, perm: String, version: String): Nest
    pokestops(minLat: Float, maxLat: Float, minLon: Float, maxLon: Float, ts: Int, midnight: Int, filters: JSON, version: String): [Pokestop]
    pokestopsSingle(id: ID, perm: String, version: String): Pokestop
    pokemon(minLat: Float, maxLat: Float, minLon: Float, maxLon: Float, ts: Int, filters: JSON, version: String): [Pokemon]
    pokemonSingle(id: ID, perm: String, version: String): Pokemon
    portals(minLat: Float, maxLat: Float, minLon: Float, maxLon: Float, ts: Int, filters: JSON, version: String): [Portal]
    portalsSingle(id: ID, perm: String, version: String): Portal
    scanCells(minLat: Float, maxLat: Float, minLon: Float, maxLon: Float, ts: Int, filters: JSON, zoom: Int, version: String): [ScanCell]
    scanAreas(version: String): [ScanArea]
    search(search: String, category: String, lat: Float, lon: Float, locale: String, webhookName: String, ts: Int, midnight: Int, version: String): [Search]
    searchQuest(search: String, category: String, lat: Float, lon: Float, locale: String, webhookName: String, midnight: Int, version: String): [SearchQuest]
    spawnpoints(minLat: Float, maxLat: Float, minLon: Float, maxLon: Float, ts: Int, filters: JSON, version: String): [Spawnpoint]
    submissionCells(minLat: Float, maxLat: Float, minLon: Float, maxLon: Float, ts: Int, zoom: Int, version: String): [SubmissionCell]
    weather(version: String): [Weather]
    webhook(category: String, status: String, name: String, version: String): Poracle
    scanner(category: String, method: String, data: JSON, version: String): ScannerApi
  }

  type Mutation {
    webhook(category: String, data: JSON, status: String, name: String): Poracle
    tutorial(tutorial: Boolean): Boolean
    strategy(strategy: String): Boolean
    checkUsername(username: String): Boolean
    setGymBadge(gymId: String, badge: Int): Boolean
  }
`
