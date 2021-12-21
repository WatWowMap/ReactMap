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
    devices: [Device]
    geocoder(search: String, name: String): [Geocoder]
    gyms(minLat: Float, maxLat: Float, minLon: Float, maxLon: Float, ts: Int, filters: JSON): [Gym]
    gymsSingle(id: ID, perm: String): Gym
    nests(minLat: Float, maxLat: Float, minLon: Float, maxLon: Float, ts: Int, filters: JSON): [Nest]
    nestsSingle(id: ID, perm: String): Nest
    pokestops(minLat: Float, maxLat: Float, minLon: Float, maxLon: Float, ts: Int, midnight: Int, filters: JSON): [Pokestop]
    pokestopsSingle(id: ID, perm: String): Pokestop
    pokemon(minLat: Float, maxLat: Float, minLon: Float, maxLon: Float, ts: Int, filters: JSON): [Pokemon]
    pokemonSingle(id: ID, perm: String): Pokemon
    portals(minLat: Float, maxLat: Float, minLon: Float, maxLon: Float, ts: Int, filters: JSON): [Portal]
    portalsSingle(id: ID, perm: String): Portal
    s2cells(minLat: Float, maxLat: Float, minLon: Float, maxLon: Float, ts: Int, filters: JSON, zoom: Int): [S2cell]
    scanAreas: [ScanArea]
    search(search: String, category: String, lat: Float, lon: Float, locale: String, webhookName: String, ts: Int, midnight: Int): [Search]
    spawnpoints(minLat: Float, maxLat: Float, minLon: Float, maxLon: Float, ts: Int, filters: JSON): [Spawnpoint]
    submissionCells(minLat: Float, maxLat: Float, minLon: Float, maxLon: Float, ts: Int, zoom: Int): [SubmissionCell]
    weather: [Weather]
    webhook(category: String, status: String, name: String): Poracle
  }

  type Mutation {
    webhook(category: String, data: JSON, status: String, name: String): Poracle
  }
`
