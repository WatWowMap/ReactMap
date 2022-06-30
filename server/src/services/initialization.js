/* eslint-disable no-console */
const fs = require('fs')
const { resolve } = require('path')
const {
  database: { schemas: exampleSchemas },
} = require('../configs/local.example.json')
const config = require('./config')

const staticMf = JSON.parse(
  fs.readFileSync(resolve(__dirname, '../data/masterfile.json')),
)

const DbCheck = require('./DbCheck')
const EventManager = require('./EventManager')
const PvpWrapper = require('./PvpWrapper')

const Db = new DbCheck(
  exampleSchemas,
  config.database,
  config.devOptions.queryDebug,
  config.api,
  config.map.distanceUnit,
)
const Pvp = config.api.pvp.reactMapHandlesPvp
  ? new PvpWrapper(config.api.pvp)
  : null
const Event = new EventManager(staticMf)

Event.setTimers(config, Db, Pvp)

module.exports = {
  Db,
  Pvp,
  Event,
}
