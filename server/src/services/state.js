// @ts-check
const NodeCache = require('node-cache')

const config = require('@rm/config')
const { log, HELPERS } = require('@rm/logger')

const DbCheck = require('./DbCheck')
const EventManager = require('./EventManager')
const PvpWrapper = require('./PvpWrapper')
const { getCache, setCache } = require('./cache')

const Db = new DbCheck()
const Pvp = config.getSafe('api.pvp.reactMapHandlesPvp')
  ? new PvpWrapper()
  : null
const Event = new EventManager()

const userCache = new NodeCache({ stdTTL: 60 * 60 * 24 })

Object.entries(getCache('scanUserHistory.json', {})).forEach(([k, v]) =>
  userCache.set(k, v),
)

Event.setTimers(Db, Pvp)

/** @param {NodeJS.Signals} e */
const onShutdown = async (e) => {
  log.info(HELPERS.ReactMap, 'received signal', e, 'writing cache...')
  const cacheObj = {}
  userCache.keys().forEach((key) => {
    cacheObj[key] = userCache.get(key)
  })
  await Promise.all([
    setCache('scanUserHistory.json', cacheObj),
    setCache('rarity.json', Db.rarity),
    setCache('historical.json', Db.historical),
    setCache('available.json', Event.available),
    setCache('filterContext.json', Db.filterContext),
    setCache('questConditions.json', Db.questConditions),
    setCache('uaudio.json', Event.uaudio),
    setCache('uicons.json', Event.uicons),
  ])
  log.info(HELPERS.ReactMap, 'exiting...')
}

process.on('SIGINT', async (e) => {
  await onShutdown(e)
  process.exit(0)
})
process.on('SIGTERM', async (e) => {
  await onShutdown(e)
  process.exit(0)
})
process.on('SIGUSR1', async (e) => {
  await onShutdown(e)
  process.exit(0)
})
process.on('SIGUSR2', async (e) => {
  await onShutdown(e)
  process.exit(0)
})
process.on('uncaughtException', async (e) => {
  log.error(HELPERS.ReactMap, e)
  await onShutdown('SIGBREAK')
  process.exit(99)
})

module.exports = {
  Db,
  Pvp,
  Event,
  userCache,
}
