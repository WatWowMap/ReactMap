/* eslint-disable no-console */
process.env.NODE_CONFIG_DIR = `${__dirname}/../configs`

const fs = require('fs')
const { resolve } = require('path')
const dotenv = require('dotenv')
const { default: center } = require('@turf/center')

dotenv.config()

const config = require('config')

if (!fs.existsSync(resolve(`${__dirname}/../configs/local.json`))) {
  // add database env variables from .env or docker-compose
  const {
    SCANNER_DB_HOST,
    SCANNER_DB_PORT,
    SCANNER_DB_NAME,
    SCANNER_DB_USERNAME,
    SCANNER_DB_PASSWORD,
    MANUAL_DB_HOST,
    MANUAL_DB_PORT,
    MANUAL_DB_NAME,
    MANUAL_DB_USERNAME,
    MANUAL_DB_PASSWORD,
    MAP_GENERAL_START_LAT,
    MAP_GENERAL_START_LON,
  } = process.env

  if (
    SCANNER_DB_HOST &&
    SCANNER_DB_PORT &&
    SCANNER_DB_NAME &&
    SCANNER_DB_USERNAME &&
    SCANNER_DB_PASSWORD
  ) {
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
    console.error(
      'Missing scanner database config! \nCheck to make sure you have SCANNER_DB_HOST,SCANNER_DB_PORT, SCANNER_DB_NAME, SCANNER_DB_USERNAME, and SCANNER_DB_PASSWORD',
    )
  }
  if (
    MANUAL_DB_HOST &&
    MANUAL_DB_PORT &&
    MANUAL_DB_NAME &&
    MANUAL_DB_USERNAME &&
    MANUAL_DB_PASSWORD
  ) {
    config.database.schemas.push({
      host: MANUAL_DB_HOST,
      port: +MANUAL_DB_PORT,
      database: MANUAL_DB_NAME,
      username: MANUAL_DB_USERNAME,
      password: MANUAL_DB_PASSWORD,
      useFor: ['session', 'user', 'nest', 'portal'],
    })
  } else {
    console.error(
      'Missing manual database config! \nCheck to make sure you have MANUAL_DB_HOST,MANUAL_DB_PORT, MANUAL_DB_NAME, MANUAL_DB_USERNAME, and MANUAL_DB_PASSWORD',
    )
  }
  if (!MAP_GENERAL_START_LAT || !MAP_GENERAL_START_LON) {
    console.warn(
      'Missing, MAP_GENERAL_START_LAT OR MAP_GENERAL_START_LON\nYou will be able to proceed but you should add these values to your docker-compose file',
    )
  }
}
if (fs.existsSync(resolve(`${__dirname}/../configs/config.json`))) {
  console.log(
    '[CONFIG] Config v1 (config.json) found, it is fine to leave it but make sure you are using and updating local.json instead.',
  )
}

const checkExtraJsons = (fileName, domain = '') => {
  const generalJson = fs.existsSync(
    resolve(`${__dirname}/../configs/${fileName}.json`),
  )
    ? JSON.parse(
        fs.readFileSync(resolve(__dirname, `../configs/${fileName}.json`)),
      )
    : {}
  if (Object.keys(generalJson).length) {
    console.log(
      `[CONFIG] config ${fileName}.json found, overwriting your config.map.${fileName} with the found data.`,
    )
  }
  if (
    domain &&
    fs.existsSync(resolve(`${__dirname}/../configs/${fileName}/${domain}.json`))
  ) {
    const domainJson =
      JSON.parse(
        fs.readFileSync(
          resolve(__dirname, `../configs/${fileName}/${domain}.json`),
        ),
      ) || {}
    if (Object.keys(domainJson).length) {
      console.log(
        `[CONFIG] config ${fileName}/${domain}.json found, overwriting your config.map.${fileName} with the found data.`,
      )
    }
    return {
      components: [],
      ...generalJson,
      ...domainJson,
    }
  }
  return generalJson
}

const mergeMapConfig = (obj) => {
  if (process.env.TELEGRAM_BOT_NAME && !obj?.customRoutes?.telegramBotName) {
    if (obj.customRoutes)
      obj.customRoutes.telegramBotName = process.env.TELEGRAM_BOT_NAME
    console.warn(
      '[CONFIG] TELEGRAM_BOT_NAME has been moved from the .env file to your config, telegramBotEnvRef is now deprecated.\nplease use customRoutes.telegramBotName instead\n(Move them from your .env file to your config file)',
    )
  }
  if (obj?.customRoutes?.telegramBotEnvRef) {
    console.warn(
      '[CONFIG] TELEGRAM_BOT_NAME has been moved from the .env file to your config, telegramBotEnvRef is now deprecated.\nplease use customRoutes.telegramBotName instead\n(Move them from your .env file to your config file)',
    )
    obj.customRoutes.telegramBotName =
      process.env[obj.customRoutes.telegramBotEnvRef]
  }
  ;['messageOfTheDay', 'donationPage', 'loginPage'].forEach((category) => {
    if (obj?.[category]?.components) {
      obj[category].components.forEach((component) => {
        if (component.type === 'telegram' && component.telegramBotEnvRef) {
          console.warn(
            '[CONFIG] telegramBotEnvRef is deprecated, please use telegramBotName instead\n',
            category,
          )
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
    messageOfTheDay: {
      ...obj.messageOfTheDay,
      ...checkExtraJsons('messageOfTheDay', obj.domain),
    },
    donationPage: {
      ...obj.donationPage,
      ...checkExtraJsons('donationPage', obj.domain),
    },
    loginPage: {
      ...obj.loginPage,
      ...checkExtraJsons('loginPage', obj.domain),
    },
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
  config.multiDomains.map((d) => [d.domain, mergeMapConfig(d)]),
)

// Consolidate Auth Methods
// Create Authentication Objects
config.authMethods = [
  ...new Set(
    config.authentication.strategies
      .filter((strategy) => strategy.enabled)
      .map((strategy) => {
        config.authentication[strategy.name] = strategy
        return strategy.type
      }),
  ),
]

// Check if empty
;['tileServers', 'navigation'].forEach((opt) => {
  if (!config[opt].length) {
    console.warn(
      `[${opt}] is empty, you need to add options to it or remove the empty array from your config.`,
    )
  }
})

const manualGeojson = {
  type: 'FeatureCollection',
  features: config.manualAreas
    .filter((area) =>
      ['lat', 'lon', 'name'].every((k) => k in area && !area.hidden),
    )
    .map((area) => {
      const { lat, lon, ...rest } = area
      return {
        type: 'Feature',
        properties: {
          center: [lat, lon],
          manual: true,
          ...rest,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[[lon, lat]]],
        },
      }
    }),
}

// Load each areas.json
const loadScanPolygons = (fileName, domain) => {
  const geojson = fs.existsSync(resolve(`${__dirname}/../configs/${fileName}`))
    ? JSON.parse(fs.readFileSync(resolve(__dirname, `../configs/${fileName}`)))
    : { features: [] }
  return {
    ...geojson,
    features: [
      ...manualGeojson.features.filter(
        (f) => !f.properties.domain || f.properties.domain === domain,
      ),
      ...geojson.features.map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          center: center(f).geometry.coordinates.reverse(),
        },
      })),
    ].sort((a, b) => a.properties.name.localeCompare(b.properties.name)),
  }
}

// Check if an areas.json exists
config.scanAreas = {
  main: loadScanPolygons(config.map.geoJsonFileName),
  ...Object.fromEntries(
    config.multiDomains.map((d) => [
      d.general?.geoJsonFileName ? d.domain : 'main',
      loadScanPolygons(
        d.general?.geoJsonFileName || config.map.geoJsonFileName,
      ),
    ]),
  ),
}

config.scanAreasMenu = Object.fromEntries(
  Object.entries(config.scanAreas).map(([domain, areas]) => {
    const parents = { '': { children: [], name: '' } }

    const noHidden = {
      ...areas,
      features: areas.features.filter((f) => !f.properties.hidden),
    }
    // Finds unique parents and determines if the parents have their own properties
    noHidden.features.forEach((feature) => {
      if (feature.properties.parent) {
        parents[feature.properties.parent] = {
          name: feature.properties.parent,
          details: areas.features.find(
            (area) => area.properties.name === feature.properties.parent,
          ),
          children: [],
        }
      }
    })

    // Finds the children of each parent
    noHidden.features.forEach((feature) => {
      if (feature.properties.parent) {
        parents[feature.properties.parent].children.push(feature)
      } else if (!parents[feature.properties.name]) {
        parents[''].children.push(feature)
      }
    })

    // Create blanks for better formatting when there's an odd number of children
    Object.values(parents).forEach(({ children }) => {
      if (children.length % 2 === 1) {
        children.push({
          type: 'Feature',
          properties: { name: '', manual: Boolean(config.manualAreas.length) },
        })
      }
    })
    return [domain, Object.values(parents)]
  }),
)
config.scanAreasObj = Object.fromEntries(
  Object.values(config.scanAreas)
    .flatMap((areas) => areas.features)
    .map((feature) => [feature.properties.name, feature]),
)

config.api.pvp.leagueObj = Object.fromEntries(
  config.api.pvp.leagues.map((league) => [league.name, league.cp]),
)
const hasLittle = config.api.pvp.leagues.find(
  (league) => league.name === 'little',
)
if (hasLittle) {
  config.api.pvp.leagueObj.little = hasLittle.littleCupRules
    ? 500
    : { little: false, cap: 500 }
}

if (
  !config.authentication.strategies.length ||
  !config.authentication.strategies.find((strategy) => strategy.enabled)
) {
  const enabled = Object.keys(config.authentication.perms).filter(
    (perm) => config.authentication.perms[perm].enabled,
  )
  console.warn(
    '[CONFIG] No authentication strategies enabled, adding the following perms to alwaysEnabledPerms array:\n',
    enabled,
  )
  config.authentication.alwaysEnabledPerms = enabled
}

module.exports = config
