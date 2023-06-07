const { Db } = require('../services/initialization')
const Backup = require('./Backup')
const Badge = require('./Badge')
const Device = require('./Device')
const Gym = require('./Gym')
const Nest = require('./Nest')
const Pokestop = require('./Pokestop')
const Pokemon = require('./Pokemon')
const Portal = require('./Portal')
const Ring = require('./Ring')
const ScanCell = require('./ScanCell')
const Session = require('./Session')
const Spawnpoint = require('./Spawnpoint')
const User = require('./User')
const Weather = require('./Weather')

const models = {
  Backup,
  Badge,
  Device,
  Gym,
  Nest,
  Pokestop,
  Pokemon,
  Portal,
  ScanCell,
  Session,
  Spawnpoint,
  User,
  Weather,
}

/**
 * @typedef {typeof models} DbModels
 */

Db.bindConnections(models)

module.exports = {
  ...models,
  Ring,
}
