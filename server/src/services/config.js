/* eslint-disable global-require */
/* eslint-disable no-console */
process.env.NODE_CONFIG_DIR = `${__dirname}/../configs`

const fs = require('fs')
const config = require('config')

if (!fs.existsSync(`${__dirname}/../configs/local.json`)) {
  console.log('Config v2 (local.json) not found, you need to run the migration with "yarn config-migrate"')
  process.exit(1)
}

const initWebhooks = require('./initWebhooks')

const mergeMapConfig = (obj) => ({
  localeSelection: obj.localeSelection,
  ...obj,
  ...obj.general,
  ...obj.customRoutes,
  ...obj.links,
  ...obj.holidayEffects,
  ...obj.misc,
  general: undefined,
  customRoutes: undefined,
  links: undefined,
  holidayEffects: undefined,
  misc: undefined,
})

config.map = mergeMapConfig(config.map)

config.multiDomainsObj = Object.fromEntries(
  config.multiDomains.map(d => [d.domain, mergeMapConfig(d)]),
)

config.authMethods = []
config.authentication.strategies.forEach(strategy => {
  if (strategy.enabled) {
    config.authentication[strategy.name] = strategy
    config.authMethods.push(strategy.name)
  }
})

config.map.noScanAreaOverlay = Boolean(config.manualAreas.length)

if (config.webhooks.length) {
  (async () => {
    config.webhookObj = await initWebhooks(config)
  })()
}
['tileServers', 'navigation'].forEach(opt => {
  if (!config[opt].length) console.warn(`[${opt}] is empty, you need to add options to it or remove the empty array from your config.`)
})

config.scanAreas = fs.existsSync(`${__dirname}/../configs/areas.json`)
  ? require('../configs/areas.json')
  : { features: [] }

module.exports = config
