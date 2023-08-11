const gql = require('graphql-tag')
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
    backup(id: ID): Backup
    backups: [Backup]
    checkUsername(username: String): Boolean
    fabButtons: FabButtons
    customComponent(component: String): JSON
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
    motdCheck(clientIndex: Int): Boolean
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
    s2cells(
      minLat: Float
      maxLat: Float
      minLon: Float
      maxLon: Float
      filters: JSON
    ): [S2Cell]
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
    searchable: [String]
    searchLure(
      search: String
      category: String
      lat: Float
      lon: Float
      locale: String
      webhookName: String
      midnight: Int
      onlyAreas: [String]
    ): [SearchLure]
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
    weather(
      minLat: Float
      maxLat: Float
      minLon: Float
      maxLon: Float
      filters: JSON
    ): [Weather]
    route(id: ID): Route
    routes(
      minLat: Float
      maxLat: Float
      minLon: Float
      maxLon: Float
      filters: JSON
    ): [Route]
    webhook(category: String, status: String, name: String): Poracle
    scanner(category: String, method: String, data: JSON): ScannerApi
  }

  type Mutation {
    createBackup(backup: BackupCreate): Boolean
    updateBackup(backup: BackupUpdate): Boolean
    deleteBackup(id: ID): Boolean
    webhook(category: String, data: JSON, status: String, name: String): Poracle
    tutorial(tutorial: Boolean): Boolean
    strategy(strategy: String): Boolean
    setGymBadge(gymId: String, badge: Int): Boolean
    setExtraFields(key: String, value: String): Boolean
    nestSubmission(id: ID, name: String): Boolean
  }
`
