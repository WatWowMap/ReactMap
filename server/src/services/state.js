// @ts-check
const NodeCache = require('node-cache')
const fs = require('fs')
const path = require('path')

const config = require('@rm/config')
const { log, HELPERS } = require('@rm/logger')

const DbCheck = require('./DbCheck')
const EventManager = require('./EventManager')
const PvpWrapper = require('./PvpWrapper')
const { getCache, setCache } = require('./cache')

const serverState = {
  db: new DbCheck(),
  pvp: config.getSafe('api.pvp.reactMapHandlesPvp') ? new PvpWrapper() : null,
  event: new EventManager(),
  userCache: new NodeCache({ stdTTL: 60 * 60 * 24 }),
  userRequestCache: new Map(
    Object.entries(getCache('userDataLimitCache.json', {})),
  ),
  setTimers() {
    this.event.setTimers(this.db, this.pvp)
  },
  setAuthClients() {
    this.event.authClients = Object.fromEntries(
      config
        .getSafe('authentication.strategies')
        .filter(({ name, enabled }) => {
          log.info(
            HELPERS.auth,
            `Strategy ${name} ${enabled ? '' : 'was not '}initialized`,
          )
          return !!enabled
        })
        .map(({ name, type }, i) => {
          try {
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
            log.error(HELPERS.auth, e)
            return [name, null]
          }
        }),
    )
  },
  async loadLocalContexts() {
    await Promise.all([
      this.db.historicalRarity(),
      this.db.getFilterContext(),
      this.event.setAvailable('gyms', 'Gym', this.db),
      this.event.setAvailable('pokestops', 'Pokestop', this.db),
      this.event.setAvailable('pokemon', 'Pokemon', this.db),
      this.event.setAvailable('nests', 'Nest', this.db),
    ])
  },
  async loadExternalContexts() {
    await Promise.all([
      this.event.getUniversalAssets(config.getSafe('icons.styles'), 'uicons'),
      this.event.getUniversalAssets(config.getSafe('audio.styles'), 'uaudio'),
      this.event.getMasterfile(this.db.historical, this.db.rarity),
      this.event.getInvasions(config.getSafe('api.pogoApiEndpoints.invasions')),
      this.event.getWebhooks(),
    ])
  },
  reload() {
    this.db = new DbCheck()
    this.pvp = config.getSafe('api.pvp.reactMapHandlesPvp')
      ? new PvpWrapper()
      : null
    this.event = new EventManager()
    this.setTimers()
    this.setAuthClients()
    return this
  },
  /** @param {NodeJS.Signals} e */
  async shutdown(e) {
    log.info(HELPERS.ReactMap, 'received signal', e, 'writing cache...')
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
    log.info(HELPERS.ReactMap, 'exiting...')
  },
}

Object.entries(getCache('scanUserHistory.json', {})).forEach(([k, v]) =>
  serverState.userCache.set(k, v),
)

process.on('SIGINT', async (e) => {
  await serverState.shutdown(e)
  process.exit(0)
})
process.on('SIGTERM', async (e) => {
  await serverState.shutdown(e)
  process.exit(0)
})
process.on('SIGUSR1', async (e) => {
  await serverState.shutdown(e)
  process.exit(0)
})
process.on('SIGUSR2', async (e) => {
  await serverState.shutdown(e)
  process.exit(0)
})
process.on('uncaughtException', async (e) => {
  log.error(HELPERS.ReactMap, e)
  await serverState.shutdown('SIGBREAK')
  process.exit(99)
})

module.exports = serverState
