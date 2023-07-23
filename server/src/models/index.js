const { Db } = require('../services/initialization')
const Backup = require('./Backup')
const Badge = require('./Badge')
const Device = require('./Device')
const Gym = require('./Gym')
const Nest = require('./Nest')
const NestSubmission = require('./NestSubmission')
const Pokestop = require('./Pokestop')
const Pokemon = require('./Pokemon')
const Portal = require('./Portal')
const Ring = require('./Ring')
const ScanCell = require('./ScanCell')
const Session = require('./Session')
const Spawnpoint = require('./Spawnpoint')
const User = require('./User')
const Weather = require('./Weather')

const rmModels = {
  Backup,
  Badge,
  NestSubmission,
  Session,
  User,
}

const scannerModels = {
  Device,
  Gym,
  Nest,
  Pokestop,
  Pokemon,
  Portal,
  ScanCell,
  Spawnpoint,
  Weather,
}

/**
 * @typedef {typeof rmModels} RmModels
 * @typedef {keyof RmModels} RmModelKeys
 * @typedef {typeof scannerModels} ScannerModels
 * @typedef {keyof ScannerModels} ScannerModelKeys
 * @typedef {RmModels & ScannerModels} Models
 * @typedef {keyof Models} ModelKeys
 */

Db.bindConnections({ ...rmModels, ...scannerModels })

module.exports = {
  ...rmModels,
  ...scannerModels,
  Ring,
}
