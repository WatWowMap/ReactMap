const fs = require('fs')
const { resolve } = require('path')

const config = require('@rm/config')

const { log, HELPERS } = require('@rm/logger')
const checkConfigJsons = require('./functions/checkConfigJsons')
const { loadCachedAreas } = require('./areas')

const allowedMenuItems = [
  'gyms',
  'nests',
  'pokestops',
  'pokemon',
  'routes',
  'wayfarer',
  's2cells',
  'scanAreas',
  'weather',
  'admin',
  'settings',
]

try {
  const refLength = +fs.readFileSync(
    resolve(__dirname, '../../../packages/config/.configref'),
    'utf8',
  )
  const defaultLength = fs.readFileSync(
    resolve(__dirname, '../configs/default.json'),
    'utf8',
  ).length

  if (refLength !== defaultLength) {
    log.warn(
      HELPERS.config,
      'It looks like you have modified the `default.json` file, you should not do this! Make all of your config changes in your `local.json` file.',
    )
  }
} catch (e) {
  log.error(
    HELPERS.config,
    'Error trying to read either the default.json or .ref file',
    e,
  )
}

if (!fs.existsSync(resolve(`${__dirname}/../configs/local.json`))) {
  // add database env variables from .env or docker-compose
  const {
    SCANNER_DB_HOST,
    SCANNER_DB_PORT,
    SCANNER_DB_NAME,
    SCANNER_DB_USERNAME,
    SCANNER_DB_PASSWORD,
    REACT_MAP_DB_HOST,
    REACT_MAP_DB_PORT,
    REACT_MAP_DB_USERNAME,
    REACT_MAP_DB_PASSWORD,
    REACT_MAP_DB_NAME,
    MANUAL_DB_HOST,
    MANUAL_DB_PORT,
    MANUAL_DB_NAME,
    MANUAL_DB_USERNAME,
    MANUAL_DB_PASSWORD,
  } = process.env

  const hasScannerDb =
    SCANNER_DB_HOST &&
    SCANNER_DB_PORT &&
    SCANNER_DB_NAME &&
    SCANNER_DB_USERNAME &&
    SCANNER_DB_PASSWORD
  const hasReactMapDb =
    REACT_MAP_DB_HOST &&
    REACT_MAP_DB_PORT &&
    REACT_MAP_DB_USERNAME &&
    REACT_MAP_DB_PASSWORD &&
    REACT_MAP_DB_NAME
  const hasManualDb =
    MANUAL_DB_HOST &&
    MANUAL_DB_PORT &&
    MANUAL_DB_NAME &&
    MANUAL_DB_USERNAME &&
    MANUAL_DB_PASSWORD

  if (hasScannerDb) {
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
    log.error(
      HELPERS.config,
      'Missing scanner database config! \nCheck to make sure you have SCANNER_DB_HOST,SCANNER_DB_PORT, SCANNER_DB_NAME, SCANNER_DB_USERNAME, and SCANNER_DB_PASSWORD',
    )
  }
  if (hasReactMapDb) {
    config.database.schemas.push({
      host: REACT_MAP_DB_HOST,
      port: +REACT_MAP_DB_PORT,
      database: REACT_MAP_DB_NAME,
      username: REACT_MAP_DB_USERNAME,
      password: REACT_MAP_DB_PASSWORD,
      useFor: ['user'],
    })
  } else {
    log.info(
      HELPERS.config,
      'Missing ReactMap specific table, attempting to use the manual database instead.',
    )
  }
  if (hasManualDb) {
    config.database.schemas.push({
      host: MANUAL_DB_HOST,
      port: +MANUAL_DB_PORT,
      database: MANUAL_DB_NAME,
      username: MANUAL_DB_USERNAME,
      password: MANUAL_DB_PASSWORD,
      useFor: hasReactMapDb ? ['nest', 'portal'] : ['user', 'nest', 'portal'],
    })
  } else if (!hasReactMapDb) {
    log.error(
      HELPERS.config,
      'Neither a ReactMap database or Manual database was found, you will need one of these to proceed.',
    )
  }
}
if (fs.existsSync(resolve(`${__dirname}/../configs/config.json`))) {
  log.info(
    HELPERS.config,
    'Config v1 (config.json) found, it is fine to leave it but make sure you are using and updating local.json instead.',
  )
}

if (config.icons.styles.length === 0) {
  config.icons.styles.push({
    name: 'Default',
    path: 'https://raw.githubusercontent.com/WatWowMap/wwm-uicons-webp/main',
    modifiers: {
      gym: {
        0: 1,
        1: 1,
        2: 1,
        3: 3,
        4: 4,
        5: 4,
        6: 18,
        sizeMultiplier: 1.2,
      },
    },
  })
}

/**
 * @param {Partial<import("@rm/types").Config['map']>} [input]
 * @returns {import("@rm/types").Config['map']}
 */
const mergeMapConfig = (input = {}) => {
  const base = config.getSafe('map')

  /** @type {import('@rm/types').Config['map']} */
  const merged = config.util.extendDeep({}, base, input)
  if (
    merged.misc.distanceUnit !== 'kilometers' &&
    merged.misc.distanceUnit !== 'miles'
  ) {
    log.warn(
      HELPERS.config,
      `Invalid distanceUnit: ${merged.misc.distanceUnit}, only 'kilometers' OR 'miles' are allowed.`,
    )
    if (merged.misc.distance === 'km') {
      merged.misc.distanceUnit = 'kilometers'
    } else if (merged.misc.distance === 'mi') {
      merged.misc.distanceUnit = 'miles'
    } else {
      merged.misc.distanceUnit = 'kilometers'
    }
  }
  merged.general.menuOrder = merged?.general?.menuOrder
    ? merged.general.menuOrder.filter((x) => allowedMenuItems.includes(x))
    : []

  merged.loginPage = config.util.extendDeep(
    {},
    merged.loginPage,
    checkConfigJsons('loginPage', merged.domain),
  )
  merged.donationPage = config.util.extendDeep(
    {},
    merged.donationPage,
    checkConfigJsons('donationPage', merged.domain),
  )
  merged.messageOfTheDay = config.util.extendDeep(
    {},
    merged.messageOfTheDay,
    checkConfigJsons('messageOfTheDay', merged.domain),
  )

  return merged
}

config.map = mergeMapConfig()

// Create multiDomain Objects
config.multiDomainsObj = Object.fromEntries(
  config.multiDomains.map((d) => [
    d.domain.replaceAll('.', '_'),
    mergeMapConfig(d),
  ]),
)

// Check if empty
;['tileServers', 'navigation'].forEach((opt) => {
  if (!config[opt].length) {
    log.warn(
      `[${opt.toUpperCase()}] is empty, you need to add options to it or remove the empty array from your config.`,
    )
  }
})

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

const aliasObj = Object.fromEntries(
  config.authentication.aliases.map((alias) => [alias.name, alias.role]),
)

const replaceAliases = (role) => aliasObj[role] ?? role

const getJsDate = (dataObj = {}) =>
  new Date(
    dataObj.year,
    dataObj.month - 1,
    dataObj.day,
    dataObj.hour || 0,
    dataObj.minute || 0,
    dataObj.second || 0,
    dataObj.millisecond || 0,
  )

const replaceBothAliases = (incomingObj) => ({
  ...incomingObj,
  discordRoles: Array.isArray(incomingObj.discordRoles)
    ? incomingObj.discordRoles.map(replaceAliases)
    : undefined,
  telegramGroups: Array.isArray(incomingObj.telegramGroups)
    ? incomingObj.telegramGroups.map(replaceAliases)
    : undefined,
})

Object.keys(config.authentication.perms).forEach((perm) => {
  config.authentication.perms[perm].roles =
    config.authentication.perms[perm].roles.map(replaceAliases)
})

config.authentication.areaRestrictions =
  config.authentication.areaRestrictions.map(({ roles, areas }) => ({
    roles: roles.map(replaceAliases),
    areas,
  }))

config.authentication.strategies = config.authentication.strategies.map(
  (strategy) => ({
    ...strategy,
    allowedGuilds: Array.isArray(strategy.allowedGuilds)
      ? strategy.allowedGuilds.map(replaceAliases)
      : [],
    blockedGuilds: Array.isArray(strategy.blockedGuilds)
      ? strategy.blockedGuilds.map(replaceAliases)
      : [],
    groups: Array.isArray(strategy.groups)
      ? strategy.groups.map(replaceAliases)
      : [],
    allowedUsers: Array.isArray(strategy.allowedUsers)
      ? strategy.allowedUsers.map(replaceAliases)
      : [],
    trialPeriod: {
      ...strategy.trialPeriod,
      start: {
        js: getJsDate(strategy?.trialPeriod?.start),
      },
      end: {
        js: getJsDate(strategy?.trialPeriod?.end),
      },
      roles: Array.isArray(strategy?.trialPeriod?.roles)
        ? strategy.trialPeriod.roles.map(replaceAliases)
        : [],
    },
  }),
)

// Consolidate Auth Methods
// Create Authentication Objects
config.authentication.methods = [
  ...new Set(
    config.authentication.strategies
      .filter((strategy) => strategy.enabled)
      .map((strategy) => {
        config.authentication[strategy.name] = strategy
        return strategy.type
      }),
  ),
]

if (Array.isArray(config.webhooks)) {
  config.webhooks = config.webhooks.map(replaceBothAliases)
}
Object.keys(config.scanner || {}).forEach((key) => {
  config.scanner[key] = replaceBothAliases(config.scanner[key] || {})
})

if (
  !config.authentication.alwaysEnabledPerms.length &&
  (!config.authentication.strategies.length ||
    !config.authentication.strategies.find((strategy) => strategy.enabled))
) {
  const enabled = Object.keys(config.authentication.perms).filter(
    (perm) => config.authentication.perms[perm].enabled,
  )
  log.warn(
    HELPERS.config,
    'No authentication strategies enabled, adding the following perms to alwaysEnabledPerms array:\n',
    enabled,
  )
  config.authentication.alwaysEnabledPerms = enabled
}

config.areas = loadCachedAreas()

module.exports = config
