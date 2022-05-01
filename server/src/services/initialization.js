/* eslint-disable no-console */
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
const Event = new EventManager(staticMf)

Event.setTimers(config, Db, Pvp)

Db.determineType()
  .then(async () => {
    await Promise.all([
      Event.getUicons(config.icons.styles),
      Event.getMasterfile(),
      Event.getInvasions(),
      Event.getWebhooks(config),
      Event.setAvailable('gyms', 'Gym', Db),
      Event.setAvailable('pokestops', 'Pokestop', Db),
      Event.setAvailable('pokemon', 'Pokemon', Db),
      Event.setAvailable('nests', 'Nest', Db),
    ])
  })

module.exports = {
  Db,
  Pvp,
  Event,
}
