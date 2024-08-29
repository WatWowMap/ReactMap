// @ts-check
const fs = require('fs')
const path = require('path')

const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')

const { DbManager } = require('./DbManager')
const { EventManager } = require('./EventManager')
const { PvpWrapper } = require('./PvpWrapper')
const { setCache } = require('./cache')
const { migrate } = require('../db/migrate')
const { Stats } = require('./Stats')

const state = {
  db: new DbManager(),
  pvp: config.getSafe('api.pvp.reactMapHandlesPvp') ? new PvpWrapper() : null,
  event: new EventManager(),
  stats: new Stats(),
  startTimers() {
    this.event.startIntervals(this.db, this.pvp)
  },
  setAuthClients() {
    log.info(TAGS.auth, 'setting authentication clients')
    this.event.authClients = Object.fromEntries(
      config
        .getSafe('authentication.strategies')
        .filter(({ name, enabled }) => {
          log.info(
            TAGS.auth,
            `Strategy ${name} ${enabled ? '' : 'was not '}initialized`,
          )
          return !!enabled
        })
        .map(({ name, type }, i) => {
          try {
            if (this.event.authClients[name]) {
              // Clear any existing trials before we reinitialize
              this.event.authClients[name]?.trialManager?.end()
            }
            const buildStrategy = fs.existsSync(
              path.resolve(__dirname, `../strategies/${name}.js`),
            )
              ? require(path.resolve(__dirname, `../strategies/${name}.js`))
              : require(path.resolve(__dirname, `../strategies/${type}.js`))
            return [
              name ?? `${type}-${i}}`,
              typeof buildStrategy === 'function'
                ? buildStrategy(name)
                : buildStrategy,
            ]
          } catch (e) {
            log.error(TAGS.auth, e)
            return [name, null]
          }
        }),
    )
  },
  /**
   * @param {string} [strategy]
   */
  getTrialStatus(strategy) {
    if (strategy) {
      if (strategy in this.event.authClients) {
        return this.event.authClients[strategy]?.trialManager?.status() ?? null
      }
      throw new Error(`Strategy ${strategy} not found`)
    } else {
      return Object.fromEntries(
        Object.entries(this.event.authClients).map(([k, v]) => [
          k,
          v.trialManager?.status() ?? null,
        ]),
      )
    }
  },
  /**
   * @param {boolean} active
   * @param {string} [strategy]
   */
  setTrials(active, strategy) {
    if (strategy) {
      if (strategy in this.event.authClients) {
        this.event.authClients[strategy]?.trialManager?.setActive(active)
      } else {
        throw new Error(`Strategy ${strategy} not found`)
      }
    } else {
      Object.values(this.event.authClients).forEach((client) => {
        client?.trialManager?.setActive(active)
      })
    }
  },
  /** @param {import('@rm/types').StateReportObj} [reloadReport] */
  async loadLocalContexts(reloadReport) {
    const promises = [this.event.cleanupTrials()]
    if (!reloadReport || reloadReport.database) {
      if (!reloadReport || reloadReport.historical) {
        promises.push(this.db.historicalRarity())
      }
      promises.push(
        this.db.getFilterContext(),
        this.event.setAvailable('gyms', 'Gym', this.db),
        this.event.setAvailable('pokestops', 'Pokestop', this.db),
        this.event.setAvailable('pokemon', 'Pokemon', this.db),
        this.event.setAvailable('nests', 'Nest', this.db),
      )
    }
    await Promise.all(promises)
  },
  /** @param {import('@rm/types').StateReportObj} [reloadReport] */
  async loadExternalContexts(reloadReport) {
    const promises = []
    if (!reloadReport || reloadReport.icons) {
      promises.push(this.event.getUniversalAssets('uicons'))
    }
    if (!reloadReport || reloadReport.audio) {
      promises.push(this.event.getUniversalAssets('uaudio'))
    }
    if (!reloadReport || reloadReport.masterfile) {
      promises.push(
        this.event.getMasterfile(this.db.historical, this.db.rarity),
      )
    }
    if ((!reloadReport || reloadReport.pvp) && this.pvp) {
      promises.push(this.pvp.fetchLatestPokemon())
    }
    if (!reloadReport || reloadReport.invasions) {
      promises.push(this.event.getInvasions())
    }
    if (!reloadReport || reloadReport.webhooks) {
      promises.push(this.event.getWebhooks())
    }
    await Promise.all(promises)
  },
  /** @param {import('@rm/types').StateReportObj} reloadReport */
  async reload(reloadReport) {
    if (reloadReport.database) {
      await this.writeCache()
      await migrate()
      this.db = new DbManager()
    }
    if (reloadReport.pvp) {
      this.pvp = config.getSafe('api.pvp.reactMapHandlesPvp')
        ? new PvpWrapper()
        : null
    }
    if (reloadReport.strategies) {
      this.setAuthClients()
    }
    if (reloadReport.events) {
      this.event.startIntervals(this.db, this.pvp)
    }
    return this
  },
  /** @param {NodeJS.Signals} [e] */
  async writeCache(e) {
    if (e) {
      log.info(TAGS.ReactMap, 'received signal', e, 'writing cache...')
    } else {
      log.info(TAGS.ReactMap, 'writing cache...')
    }
    await Promise.all([
      setCache('scanUserHistory.json', this.stats.serializeScanCache()),
      setCache('userDataLimitCache.json', this.stats.serializeApiCache()),
      setCache('rarity.json', this.db.rarity),
      setCache('historical.json', this.db.historical),
      setCache('available.json', this.event.available),
      setCache('filterContext.json', this.db.filterContext),
      setCache('questConditions.json', this.db.questConditions),
      setCache('uaudio.json', this.event.uaudio),
      setCache('uicons.json', this.event.uicons),
    ])
    if (e) {
      log.info(TAGS.ReactMap, 'exiting...')
    } else {
      log.info(TAGS.ReactMap, 'cache written')
    }
  },
}

process.on('SIGINT', async (e) => {
  await state.writeCache(e)
  process.exit(0)
})
process.on('SIGTERM', async (e) => {
  await state.writeCache(e)
  process.exit(0)
})
process.on('SIGUSR1', async (e) => {
  await state.writeCache(e)
  process.exit(0)
})
process.on('SIGUSR2', async (e) => {
  await state.writeCache(e)
  process.exit(0)
})
process.on('uncaughtException', async (e) => {
  log.error(TAGS.ReactMap, e)
  await state.writeCache('SIGBREAK')
  process.exit(99)
})

module.exports = { state }
