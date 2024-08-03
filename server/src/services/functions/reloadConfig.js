// @ts-check
const { log, HELPERS } = require('@rm/logger')

const state = require('../state')
const { bindConnections } = require('../../models')
const { loadLatestAreas } = require('../areas')
const { loadAuthStrategies } = require('../../routes/authRouter')

/**
 * Reloads the configuration and updates the state
 * @returns {Promise<null | Error>}
 */
async function reloadConfig() {
  try {
    const newConfig = require('@rm/config').reload()

    const newState = state.reload()

    bindConnections(newState.db)

    await newState.db.getDbContext()
    await newState.loadLocalContexts()
    await newState.loadExternalContexts()
    loadAuthStrategies()

    newConfig.setAreas(await loadLatestAreas())

    return null
  } catch (e) {
    log.error(HELPERS.config, e)
    return e
  }
}

module.exports = { reloadConfig }
