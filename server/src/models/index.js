// @ts-check
const { Backup } = require('./Backup')
const { Badge } = require('./Badge')
const { Device } = require('./Device')
const { Gym } = require('./Gym')
const { Hyperlocal } = require('./Hyperlocal')
const { Nest } = require('./Nest')
const { NestSubmission } = require('./NestSubmission')
const { Pokestop } = require('./Pokestop')
const { Pokemon } = require('./Pokemon')
const { Portal } = require('./Portal')
const { PoI } = require('./PoI')
const { Route } = require('./Route')
const { ScanCell } = require('./ScanCell')
const { Session } = require('./Session')
const { Spawnpoint } = require('./Spawnpoint')
const { Station } = require('./Station')
const { User } = require('./User')
const { Weather } = require('./Weather')

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
  Hyperlocal,
  Nest,
  Pokestop,
  Pokemon,
  Portal,
  Route,
  ScanCell,
  Spawnpoint,
  Station,
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

/** @param {import('../services/DbManager').DbManager} db */
const bindConnections = (db) =>
  db.bindConnections({ ...rmModels, ...scannerModels })

module.exports = {
  ...rmModels,
  ...scannerModels,
  bindConnections,
  PoI,
}
