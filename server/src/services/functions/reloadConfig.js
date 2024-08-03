// @ts-check
const { log, HELPERS } = require('@rm/logger')

const state = require('../state')
const { bindConnections } = require('../../models')
const { loadLatestAreas } = require('../areas')
const { loadAuthStrategies } = require('../../routes/authRouter')
const { deepCompare } = require('./deepCompare')

/**
 * Reloads the configuration and updates the state
 * @returns {Promise<null | Error>}
 */
async function reloadConfig() {
  const startTime = process.hrtime()
  try {
    log.info(HELPERS.config, 'starting config reload...')
    const oldConfig = require('@rm/config').reload()
    const newConfig = require('@rm/config')

    const { areas, ...oldWithoutAreas } = oldConfig

    const { report, areEqual, changed } = deepCompare(
      oldWithoutAreas,
      newConfig,
    )
    const [seconds, nanoseconds] = process.hrtime(startTime)
    log.debug(
      HELPERS.config,
      `deep comparing took ${seconds}.${nanoseconds} seconds`,
    )
    if (areEqual) {
      return null
    }

    log.info(HELPERS.config, 'updating the following config values:', changed)

    const stateReport = /** @type {import('@rm/types').StateReportObj} */ ({
      database:
        !report.database.areEqual || !report.devOptions.report.queryDebug,
      pvp:
        !report.api.report.pvp.report.reactMapHandlesPvp ||
        !report.api.report.pvp.areEqual,
      icons: !report.icons.report.styles.areEqual,
      audio: !report.audio.report.styles.areEqual,
      historical: !report.rarity.report.percents.areEqual,
      masterfile:
        !report.rarity.areEqual ||
        !report.api.report.pogoApiEndpoints.report.masterfile,
      invasions: !report.api.report.pogoApiEndpoints.report.invasions,
      webhooks: !report.webhooks.areEqual,
      strategies: !report.authentication.report.strategies.areEqual,
      events:
        !report.api.report.queryUpdateHours.areEqual ||
        !report.api.report.queryOnSessionInit.areEqual ||
        !report.api.report.pogoApiEndpoints.areEqual ||
        !report.icons.report.cacheHrs ||
        !report.audio.report.cacheHrs ||
        !report.map.report.misc.report.masterfileCacheHrs ||
        !report.map.report.misc.report.invasionCacheHrs ||
        !report.map.report.misc.report.webhookCacheHrs ||
        !report.map.report.misc.report.masterfileCacheHrs,
    })
    const newState = await state.reload(stateReport)

    if (stateReport.database) {
      bindConnections(newState.db)
      await newState.db.getDbContext()
      await newState.loadLocalContexts(stateReport)
    }
    await newState.loadExternalContexts(stateReport)

    if (stateReport.strategies) {
      loadAuthStrategies()
    }
    if (
      !report.api.report.kojiOptions.areEqual ||
      !report.map.report.general.report.geoJsonFileName
    ) {
      newConfig.setAreas(await loadLatestAreas())
    } else {
      newConfig.setAreas(areas)
    }
    return null
  } catch (e) {
    log.error(HELPERS.config, e)
    return e
  } finally {
    const [seconds, nanoseconds] = process.hrtime(startTime)
    log.debug(
      HELPERS.config,
      `configuration reload completed in ${seconds}.${nanoseconds} seconds`,
    )
  }
}

module.exports = { reloadConfig }
