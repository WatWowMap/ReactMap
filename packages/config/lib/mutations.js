// @ts-check

const fs = require('fs')
const path = require('path')

const { log, TAGS } = require('@rm/logger')

const { validateJsons } = require('./validateJsons')

let firstRun = true

/** @param {import('config').IConfig} config */
const applyMutations = (config) => {
  const defaults = /** @type {import('@rm/types').Config} */ (
    config.util
      .getConfigSources()
      .find(({ name }) => name.endsWith('default.json'))?.parsed
  )
  if (!defaults) {
    log.error(TAGS.config, 'Could not find default.json')
    return
  }

  if (process.env.NODE_CONFIG_ENV) {
    if (firstRun)
      log.info(TAGS.config, `Using config for ${process.env.NODE_CONFIG_ENV}`)
  }
  const [rootConfigDir, serverConfigDir] = (
    process.env.NODE_CONFIG_DIR || ''
  ).split(path.delimiter)

  try {
    const refLength = +fs.readFileSync(
      path.join(__dirname, '../.configref'),
      'utf8',
    )
    const defaultLength = fs.readFileSync(
      path.join(rootConfigDir, 'default.json'),
      'utf8',
    ).length

    if (refLength !== defaultLength && firstRun) {
      log.warn(
        TAGS.config,
        'It looks like you have modified the `default.json` file, you should not do this! Make all of your config changes in your `local.json` file.',
      )
    }
  } catch (e) {
    log.error(
      TAGS.config,
      'Error trying to read either the default.json or .ref file',
      e,
    )
  }

  if (!fs.existsSync(path.join(serverConfigDir, `local.json`))) {
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

    config.database.schemas = []
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
        TAGS.config,
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
        TAGS.config,
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
        TAGS.config,
        'Neither a ReactMap database or Manual database was found, you will need one of these to proceed.',
      )
    }
  }
  if (fs.existsSync(path.join(serverConfigDir, `config.json`))) {
    log.info(
      TAGS.config,
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
      if (firstRun)
        log.warn(
          TAGS.config,
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
      ? merged.general.menuOrder.filter((x) =>
          defaults.map.general.menuOrder.includes(x),
        )
      : []

    defaults.map.general.menuOrder.forEach((item) => {
      if (!merged.general.menuOrder.includes(item)) {
        log.warn(
          TAGS.config,
          `Missing menu item: ${item} in map.general.menuOrder, adding it to the end of the list.`,
        )
        merged.general.menuOrder.push(item)
      }
    })

    merged.loginPage = config.util.extendDeep(
      {},
      merged.loginPage,
      validateJsons('loginPage', merged.domain),
    )
    merged.donationPage = config.util.extendDeep(
      {},
      merged.donationPage,
      validateJsons('donationPage', merged.domain),
    )
    merged.messageOfTheDay = config.util.extendDeep(
      {},
      merged.messageOfTheDay,
      validateJsons('messageOfTheDay', merged.domain),
    )

    return merged
  }

  config.map = mergeMapConfig()

  if (config.has('multiDomains')) {
    if (firstRun)
      log.warn(
        TAGS.config,
        '`multiDomains` has been deprecated and will be removed in the next major release. Please switch to the new format that makes use of `NODE_CONFIG_ENV`',
      )
    // Create multiDomain Objects
    config.multiDomainsObj = Object.fromEntries(
      config.multiDomains.map((d) => [
        d.domain.replaceAll('.', '_'),
        mergeMapConfig(d),
      ]),
    )
  } else {
    config.multiDomainsObj = {}
  }

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
  /** @param {string} role */
  const replaceAliases = (role) => aliasObj[role] ?? role

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
    const enabled =
      /** @type {(keyof import('@rm/types').Config['authentication']['perms'])[]} */ (
        Object.keys(config.authentication.perms).filter(
          (perm) => config.authentication.perms[perm].enabled,
        )
      )
    if (firstRun)
      log.warn(
        TAGS.config,
        'No authentication strategies enabled, adding the following perms to alwaysEnabledPerms array:\n',
        enabled,
      )
    config.authentication.alwaysEnabledPerms = enabled
  }
  firstRun = false
}

module.exports = { applyMutations }
