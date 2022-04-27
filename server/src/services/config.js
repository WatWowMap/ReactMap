/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */
/* eslint-disable no-console */
process.env.NODE_CONFIG_DIR = `${__dirname}/../configs`

const fs = require('fs')
const path = require('path')
const config = require('config')

// Check if new config exists
if (!fs.existsSync(path.resolve(`${__dirname}/../configs/local.json`))) {
  // Only process env variables if local.json doesn't exist
  // Generally for quick docker setups
  const {
    SCANNER_DB_HOST, SCANNER_DB_PORT, SCANNER_DB_NAME, SCANNER_DB_USERNAME, SCANNER_DB_PASSWORD,
    MANUAL_DB_HOST, MANUAL_DB_PORT, MANUAL_DB_NAME, MANUAL_DB_USERNAME, MANUAL_DB_PASSWORD,
    TITLE, START_LAT, START_LON,
  } = process.env

  if (SCANNER_DB_HOST && SCANNER_DB_PORT && SCANNER_DB_NAME && SCANNER_DB_USERNAME && SCANNER_DB_PASSWORD) {
    config.database.schemas.push({
      host: SCANNER_DB_HOST,
      port: +SCANNER_DB_PORT,
      database: SCANNER_DB_NAME,
      username: SCANNER_DB_USERNAME,
      password: SCANNER_DB_PASSWORD,
      useFor: [
        'device',
        'gym',
        'pokemon',
        'pokestop',
        'scanCell',
        'spawnpoint',
        'weather',
      ],
    })
  } else {
    throw new Error('Missing scanner database config! \nCheck to make sure you have SCANNER_DB_HOST,SCANNER_DB_PORT, SCANNER_DB_NAME, SCANNER_DB_USERNAME, and SCANNER_DB_PASSWORD')
  }
  if (MANUAL_DB_HOST && MANUAL_DB_PORT && MANUAL_DB_NAME && MANUAL_DB_USERNAME && MANUAL_DB_PASSWORD) {
    config.database.schemas.push({
      host: MANUAL_DB_HOST,
      port: +MANUAL_DB_PORT,
      database: MANUAL_DB_NAME,
      username: MANUAL_DB_USERNAME,
      password: MANUAL_DB_PASSWORD,
      useFor: [
        'session',
        'user',
        'nest',
        'portal',
      ],
    })
  } else {
    throw new Error('Missing manual database config! \nCheck to make sure you have MANUAL_DB_HOST,MANUAL_DB_PORT, MANUAL_DB_NAME, MANUAL_DB_USERNAME, and MANUAL_DB_PASSWORD')
  }
  if (!TITLE || !START_LAT || !START_LON) {
    console.warn('Missing, TITLE, START_LAT, OR START_LON\nYou will be able to process but but these are recommended to add to your docker-compose file')
  }
  config.map.general.title = TITLE
  config.map.general.headerTitle = TITLE
  config.map.general.startLat = +START_LAT
  config.map.general.startLon = +START_LON
}

if (fs.existsSync(path.resolve(`${__dirname}/../configs/config.json`))) {
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
const loadScanPolygons = (fileName) => fs.existsSync(path.resolve(`${__dirname}/../configs/${fileName}`))
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

if (!config.authentication.strategies.length || !config.authentication.strategies.find(strategy => strategy.enabled)) {
  config.authentication.alwaysEnabledPerms = Object.keys(config.authentication.perms)
}

// Map manual areas
config.manualAreas = Object.fromEntries(config.manualAreas.map(area => [area.name, area]))

module.exports = config
