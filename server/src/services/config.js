/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */
/* eslint-disable no-console */
process.env.NODE_CONFIG_DIR = `${__dirname}/../configs`

const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

dotenv.config()

const config = require('config')

if (!fs.existsSync(path.resolve(`${__dirname}/../configs/local.json`))) {
  // add database env variables from .env or docker-compose
  const {
    SCANNER_DB_HOST, SCANNER_DB_PORT, SCANNER_DB_NAME, SCANNER_DB_USERNAME, SCANNER_DB_PASSWORD,
    MANUAL_DB_HOST, MANUAL_DB_PORT, MANUAL_DB_NAME, MANUAL_DB_USERNAME, MANUAL_DB_PASSWORD,
    MAP_GENERAL_START_LAT, MAP_GENERAL_START_LON,
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
  if (!MAP_GENERAL_START_LAT || !MAP_GENERAL_START_LON) {
    console.warn('Missing, MAP_GENERAL_START_LAT OR MAP_GENERAL_START_LON\nYou will be able to proceed but you should add these values to your docker-compose file')
  }
}
if (fs.existsSync(path.resolve(`${__dirname}/../configs/config.json`))) {
  console.log('[CONFIG] Config v1 (config.json) found, it is fine to leave it but make sure you are using and updating local.json instead.')
}

const mergeMapConfig = (obj) => {
  if (process.env.TELEGRAM_BOT_NAME && !obj?.customRoutes?.telegramBotName) {
    if (obj.customRoutes) obj.customRoutes.telegramBotName = process.env.TELEGRAM_BOT_NAME
    console.warn('[CONFIG] TELEGRAM_BOT_NAME has been moved from the .env file to your config, telegramBotEnvRef is now deprecated.\nplease use customRoutes.telegramBotName instead\n(Move them from your .env file to your config file)')
  }
  if (obj?.customRoutes?.telegramBotEnvRef) {
    console.warn('[CONFIG] TELEGRAM_BOT_NAME has been moved from the .env file to your config, telegramBotEnvRef is now deprecated.\nplease use customRoutes.telegramBotName instead\n(Move them from your .env file to your config file)')
    obj.customRoutes.telegramBotName = process.env[obj.customRoutes.telegramBotEnvRef]
  }
  ['messageOfTheDay', 'donationPage', 'loginPage'].forEach(category => {
    if (obj?.[category]?.components) {
      obj[category].components.forEach(component => {
        if (component.type === 'telegram' && component.telegramBotEnvRef) {
          console.warn('[CONFIG] telegramBotEnvRef is deprecated, please use telegramBotName instead\n', category)
          console.warn('OLD:\n', component)
          component.telegramBotName = process.env[component.telegramBotEnvRef]
          delete component.telegramBotEnvRef
          console.warn('NEW:\n', component)
        }
      })
    }
  })
  return {
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
  }
}

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
