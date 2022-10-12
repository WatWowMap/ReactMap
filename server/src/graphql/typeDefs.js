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
    available: Available
    badges: [Badge]
    devices(filters: JSON): [Device]
    geocoder(search: String, name: String): [Geocoder]
    gyms(
      minLat: Float
      maxLat: Float
      minLon: Float
      maxLon: Float
      ts: Int
      filters: JSON
    ): [Gym]
    gymsSingle(id: ID, perm: String): Gym
    nests(
      minLat: Float
      maxLat: Float
      minLon: Float
      maxLon: Float
      ts: Int
      filters: JSON
    ): [Nest]
    nestsSingle(id: ID, perm: String): Nest
    pokestops(
      minLat: Float
      maxLat: Float
      minLon: Float
      maxLon: Float
      ts: Int
      midnight: Int
      filters: JSON
    ): [Pokestop]
    pokestopsSingle(id: ID, perm: String): Pokestop
    pokemon(
      minLat: Float
      maxLat: Float
      minLon: Float
      maxLon: Float
      ts: Int
      filters: JSON
    ): [Pokemon]
    pokemonSingle(id: ID, perm: String): Pokemon
    portals(
      minLat: Float
      maxLat: Float
      minLon: Float
      maxLon: Float
      ts: Int
      filters: JSON
    ): [Portal]
    portalsSingle(id: ID, perm: String): Portal
    scanCells(
      minLat: Float
      maxLat: Float
      minLon: Float
      maxLon: Float
      ts: Int
      filters: JSON
      zoom: Int
    ): [ScanCell]
    scanAreas: [ScanArea]
    scanAreasMenu: [ScanAreasMenu]
    search(
      search: String
      category: String
      lat: Float
      lon: Float
      locale: String
      webhookName: String
      ts: Int
      midnight: Int
      onlyAreas: [String]
    ): [Search]
    searchQuest(
      search: String
      category: String
      lat: Float
      lon: Float
      locale: String
      webhookName: String
      midnight: Int

      onlyAreas: [String]
    ): [SearchQuest]
    spawnpoints(
      minLat: Float
      maxLat: Float
      minLon: Float
      maxLon: Float
      ts: Int
      filters: JSON
    ): [Spawnpoint]
    submissionCells(
      minLat: Float
      maxLat: Float
      minLon: Float
      maxLon: Float
      ts: Int
      zoom: Int
      filters: JSON
    ): [SubmissionCell]
    weather(filters: JSON): [Weather]
    webhook(category: String, status: String, name: String): Poracle
    scanner(category: String, method: String, data: JSON): ScannerApi
  }

  type Mutation {
    webhook(category: String, data: JSON, status: String, name: String): Poracle
    tutorial(tutorial: Boolean): Boolean
    strategy(strategy: String): Boolean
    checkUsername(username: String): Boolean
    setGymBadge(gymId: String, badge: Int): Boolean
    setExtraFields(key: String, value: String): Boolean
  }
`
