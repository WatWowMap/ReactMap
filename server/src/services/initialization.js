const {
  database: { schemas: exampleSchemas },
} = require('../configs/local.example.json')
const config = require('./config')
const staticMf = require('../data/masterfile.json')

const DbCheck = require('./DbCheck')
const EventManager = require('./EventManager')
const PvpWrapper = require('./PvpWrapper')

const Db = new DbCheck(exampleSchemas, config.database, config.devOptions.queryDebug, config.api)
const Pvp = config.api.pvp.reactMapHandlesPvp ? new PvpWrapper(config.api.pvp) : null

module.exports = {
  Db,
  Pvp,
  Event: new EventManager(config, staticMf, Db, Pvp),
}
