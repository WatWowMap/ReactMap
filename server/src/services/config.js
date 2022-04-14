/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */
/* eslint-disable no-console */
process.env.NODE_CONFIG_DIR = `${__dirname}/../configs`

const fs = require('fs')
const config = require('config')

// Check if new config exists
if (!fs.existsSync(`${__dirname}/../configs/local.json`)) {
  console.log('[CONFIG] Config v2 (local.json) not found, you need to run the migration with "yarn config-migrate"')
  process.exit(1)
}
if (fs.existsSync(`${__dirname}/../configs/config.json`)) {
  console.log('[CONFIG] Config v1 (config.json) found, it is fine to leave it but make sure you are using and updating local.json instead.')
}

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

// Merge sub-objects for the map object
config.map = mergeMapConfig(config.map)

// Create multiDomain Objects
config.multiDomainsObj = Object.fromEntries(
  config.multiDomains.map(d => [d.domain, mergeMapConfig(d)]),
)

// Consolidate Auth Methods
// Create Authentication Objects
config.authMethods = [...new Set(config.authentication.strategies
  .filter(strategy => strategy.enabled)
  .map(strategy => {
    config.authentication[strategy.name] = strategy
    return strategy.type
  })),
];

// Check if empty
['tileServers', 'navigation'].forEach(opt => {
  if (!config[opt].length) console.warn(`[${opt}] is empty, you need to add options to it or remove the empty array from your config.`)
})

// Load each areas.json
const loadScanPolygons = (fileName) => fs.existsSync(`${__dirname}/../configs/${fileName}`)
  ? require(`../configs/${fileName}`)
  : { features: [] }

// Check if an areas.json exists
config.scanAreas = {
  main: loadScanPolygons(config.map.geoJsonFileName),
  ...Object.fromEntries(
    config.multiDomains.map(d => [d.general?.geoJsonFileName ? d.domain : 'main', loadScanPolygons(d.general?.geoJsonFileName || config.map.geoJsonFileName)]),
  ),
}

config.api.pvp.leagueObj = Object.fromEntries(config.api.pvp.leagues.map(league => [league.name, league.cp]))
const hasLittle = config.api.pvp.leagues.find(league => league.name === 'little')
if (hasLittle) {
  config.api.pvp.leagueObj.little = hasLittle.littleCupRules ? 500 : { little: false, cap: 500 }
}

// Map manual areas
config.manualAreas = Object.fromEntries(config.manualAreas.map(area => [area.name, area]))

module.exports = config
