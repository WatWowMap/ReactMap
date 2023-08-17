// @ts-check
const config = require('config')

const DbCheck = require('./DbCheck')
const EventManager = require('./EventManager')
const PvpWrapper = require('./PvpWrapper')

const Db = new DbCheck()
const Pvp = config.getSafe('api.pvp.reactMapHandlesPvp')
  ? new PvpWrapper()
  : null
const Event = new EventManager()

Event.setTimers(Db, Pvp)

module.exports = {
  Db,
  Pvp,
  Event,
}
