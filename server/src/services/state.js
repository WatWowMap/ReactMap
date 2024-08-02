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
  reload() {
    this.db = new DbCheck()
    this.pvp = config.getSafe('api.pvp.reactMapHandlesPvp')
      ? new PvpWrapper()
      : null
    this.event = new EventManager()
    this.setTimers()
    this.setAuthClients()
  },
}

Object.entries(getCache('scanUserHistory.json', {})).forEach(([k, v]) =>
  serverState.userCache.set(k, v),
)

/**
 * @param {NodeJS.Signals} e
 * @param {typeof serverState} state
 */
const onShutdown = async (e, state) => {
  log.info(HELPERS.ReactMap, 'received signal', e, 'writing cache...')
  const cacheObj = {}
  state.userCache.keys().forEach((key) => {
    cacheObj[key] = state.userCache.get(key)
  })
  await Promise.all([
    setCache('scanUserHistory.json', cacheObj),
    setCache('rarity.json', state.db.rarity),
    setCache('historical.json', state.db.historical),
    setCache('available.json', state.event.available),
    setCache('filterContext.json', state.db.filterContext),
    setCache('questConditions.json', state.db.questConditions),
    setCache('uaudio.json', state.event.uaudio),
    setCache('uicons.json', state.event.uicons),
  ])
  log.info(HELPERS.ReactMap, 'exiting...')
}

process.on('SIGINT', async (e) => {
  await onShutdown(e, serverState)
  process.exit(0)
})
process.on('SIGTERM', async (e) => {
  await onShutdown(e, serverState)
  process.exit(0)
})
process.on('SIGUSR1', async (e) => {
  await onShutdown(e, serverState)
  process.exit(0)
})
process.on('SIGUSR2', async (e) => {
  await onShutdown(e, serverState)
  process.exit(0)
})
process.on('uncaughtException', async (e) => {
  log.error(HELPERS.ReactMap, e)
  await onShutdown('SIGBREAK', serverState)
  process.exit(99)
})

module.exports = serverState
