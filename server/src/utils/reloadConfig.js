// @ts-check
const dlv = require('dlv')

const { log, TAGS } = require('@rm/logger')

const state = require('../services/state')
const { bindConnections } = require('../models')
const { loadLatestAreas } = require('../services/areas')
const { loadAuthStrategies } = require('../routes/authRouter')
const { deepCompare } = require('./deepCompare')

const NO_RELOAD = new Set([
  'interface',
  'port',
  'googleAnalyticsId',
  'devOptions.skipMinified',
  'devOptions.skipUpdateCheck',
  'devOptions.graphiql',
  'api.cookieAgeDays',
  'api.sessionSecret',
  'api.rateLimit',
  'api.rateLimit.time',
  'api.rateLimit.requests',
  'api.sessionCheckIntervalMs',
  'api.enableHelmet',
  'database.settings.sessionTableName',
  'sentry',
  'sentry.client',
  'sentry.client.enabled',
  'sentry.client.debug',
  'sentry.client.dsn',
  'sentry.client.tracesSampleRate',
  'sentry.client.authToken',
  'sentry.client.org',
  'sentry.client.project',
  'sentry.server',
  'sentry.server.enabled',
  'sentry.server.debug',
  'sentry.server.dsn',
  'sentry.server.tracesSampleRate',
])

/**
 * Reloads the configuration and updates the state
 * @returns {Promise<null | Error>}
 */
async function reloadConfig() {
  const startTime = process.hrtime()
  try {
    log.info(TAGS.config, 'starting config reload...')
    const oldConfig = require('@rm/config').reload()
    const newConfig = require('@rm/config')

    const { areas, ...oldWithoutAreas } = oldConfig

    const { report, areEqual, changed } = deepCompare(
      oldWithoutAreas,
      newConfig,
    )
    const [seconds, nanoseconds] = process.hrtime(startTime)
    log.debug(
      TAGS.config,
      `deep comparing took ${seconds}.${nanoseconds} seconds`,
    )

    if (
      !report.api.report.kojiOptions.areEqual ||
      !report.map.report.general.report.geoJsonFileName ||
      !report.manualAreas.areEqual
    ) {
      newConfig.setAreas(await loadLatestAreas())
    } else {
      newConfig.setAreas(areas)
    }

    if (areEqual) {
      return null
    }

    const valid = changed.filter((key) => !NO_RELOAD.has(key))
    const invalid = changed.filter((key) => NO_RELOAD.has(key))

    /** @param {string} key */
    const print = (key) => {
      let newValue
      let oldValue
      try {
        oldValue = dlv(oldWithoutAreas, key)
      } catch {
        // do nothing
      }
      try {
        newValue = newConfig.get(key)
      } catch {
        // do nothing
      }
      log.info(TAGS.config, `'${key}' -`, 'old:', oldValue, 'new:', newValue)
    }

    if (valid.length) {
      log.info(TAGS.config, 'updating the following config values:')
      valid.forEach(print)
    }
    if (invalid.length) {
      log.warn(
        TAGS.config,
        'the following config values cannot be hot reloaded and will require a full process restart:',
      )
      invalid.forEach(print)
    }

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
    return null
  } catch (e) {
    log.error(TAGS.config, e)
    return e
  } finally {
    const [seconds, nanoseconds] = process.hrtime(startTime)
    log.debug(
      TAGS.config,
      `configuration reload completed in ${seconds}.${nanoseconds} seconds`,
    )
  }
}

module.exports = { reloadConfig }
