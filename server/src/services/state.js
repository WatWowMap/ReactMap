// @ts-check
const NodeCache = require('node-cache')
const fs = require('fs')
const path = require('path')

const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')

const DbCheck = require('./DbCheck')
const EventManager = require('./EventManager')
const PvpWrapper = require('./PvpWrapper')
const { getCache, setCache } = require('./cache')
const { migrate } = require('../db/migrate')

const serverState = {
  db: new DbCheck(),
  pvp: config.getSafe('api.pvp.reactMapHandlesPvp') ? new PvpWrapper() : null,
  event: new EventManager(),
  userCache: new NodeCache({ stdTTL: 60 * 60 * 24 }),
  userRequestCache: new Map(
    Object.entries(getCache('userDataLimitCache.json', {})),
  ),
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
              this.event.authClients[name].trialManager.end()
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
        return this.event.authClients[strategy].trialManager.status()
      }
      throw new Error(`Strategy ${strategy} not found`)
    } else {
      return Object.fromEntries(
        Object.entries(this.event.authClients).map(([k, v]) => [
          k,
          v.trialManager.status(),
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
        this.event.authClients[strategy].trialManager.setActive(active)
      } else {
        throw new Error(`Strategy ${strategy} not found`)
      }
    } else {
      Object.values(this.event.authClients).forEach((client) => {
        client.trialManager.setActive(active)
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
      this.db = new DbCheck()
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

    const cacheObj = {}
    this.userCache.keys().forEach((key) => {
      cacheObj[key] = this.userCache.get(key)
    })
    const userRequestCacheObj = {}
    this.userRequestCache.forEach((v, k) => {
      userRequestCacheObj[k] = v
    })

    await Promise.all([
      setCache('scanUserHistory.json', cacheObj),
      setCache('userDataLimitCache.json', userRequestCacheObj),
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

Object.entries(getCache('scanUserHistory.json', {})).forEach(([k, v]) =>
  serverState.userCache.set(k, v),
)

process.on('SIGINT', async (e) => {
  await serverState.writeCache(e)
  process.exit(0)
})
process.on('SIGTERM', async (e) => {
  await serverState.writeCache(e)
  process.exit(0)
})
process.on('SIGUSR1', async (e) => {
  await serverState.writeCache(e)
  process.exit(0)
})
process.on('SIGUSR2', async (e) => {
  await serverState.writeCache(e)
  process.exit(0)
})
process.on('uncaughtException', async (e) => {
  log.error(TAGS.ReactMap, e)
  await serverState.writeCache('SIGBREAK')
  process.exit(99)
})

module.exports = serverState
