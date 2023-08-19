const fs = require('fs')
const { resolve } = require('path')
const { log } = require('@rm/logger')

const oldConfig = JSON.parse(
  fs.readFileSync(resolve(__dirname, '../src/configs/config.json')),
)

const convertObjToArr = (obj) =>
  obj
    ? Object.entries(obj).map(([k, v]) => ({
        name: k,
        ...v,
      }))
    : undefined

const convertMapObject = (obj) =>
  obj
    ? {
        general: {
          title: obj?.title,
          headerTitle: obj?.headerTitle,
          startLat: obj?.startLat,
          startLon: obj?.startLon,
          startZoom: obj?.startZoom,
          minZoom: obj?.minZoom,
          maxZoom: obj?.maxZoom,
          interactionRangeZoom: obj?.interactionRangeZoom,
        },
        localeSelection: obj?.localeSelection,
        customRoutes: {
          discordAuthUrl: obj?.discordAuthUrl,
          telegramAuthUrl: obj?.telegramAuthUrl,
          telegramBotName: obj?.telegramBotEnvRef,
          localAuthUrl: obj?.localAuthUrl,
        },
        links: {
          discordInvite: obj?.discordInvite,
          feedbackLink: obj?.feedbackLink,
          statsLink: obj?.statsLink,
          rolesLinksName: obj?.rolesLinksName,
          rolesLink: obj?.rolesLink,
        },
        holidayEffects: {
          christmasSnow: obj?.christmasSnow,
          newYearsFireworks: obj?.newYearsFireworks,
          valentinesDay: obj?.valentinesDay,
        },
        misc: {
          enableMapJsFilter: obj?.legacyPkmnFilter,
          questRewardTypeFilters: obj?.questRewardTypeFilters,
          fetchLatestInvasions: obj?.fetchLatestInvasions,
          invasionCacheHrs: obj?.invasionCacheHrs,
          navigationControls: obj?.navigationControls,
          forceTutorial: obj?.forceTutorial,
          enableTutorial: obj?.enableTutorial,
          enableUserProfile: obj?.enableUserProfile,
          enableQuestSetSelector: obj?.enableQuestSetSelector,
          noScanAreaOverlay: obj?.noScanAreaOverlay,
        },
        theme: obj?.theme,
        clustering: {
          gyms: {
            zoomLevel: obj?.clusterZoomLevels?.gyms,
            forcedLimit: obj?.clusterZoomLevels?.forcedClusterLimit,
          },
          pokestops: {
            zoomLevel: obj?.clusterZoomLevels?.pokestops,
            forcedLimit: obj?.clusterZoomLevels?.forcedClusterLimit,
          },
          pokemon: {
            zoomLevel: obj?.clusterZoomLevels?.pokemon,
            forcedLimit: obj?.clusterZoomLevels?.forcedClusterLimit,
          },
          portals: {
            zoomLevel: obj?.clusterZoomLevels?.portals,
            forcedLimit: obj?.clusterZoomLevels?.forcedClusterLimit,
          },
          spawnpoints: {
            zoomLevel: obj?.clusterZoomLevels?.spawnpoints,
            forcedLimit: obj?.clusterZoomLevels?.forcedClusterLimit,
          },
        },
        messageOfTheDay: obj?.messageOfTheDay
          ? ensureMotd(obj?.messageOfTheDay)
          : undefined,
        donationPage: obj?.donationPage,
        loginPage: obj?.loginPage,
      }
    : undefined

const ensureMotd = (obj) => {
  if (obj?.messages) {
    const updateFieldRec = (messages) =>
      messages.map((message) => {
        if (message.messages) {
          message.components = updateFieldRec(message.messages)
          delete message.messages
        }
        return message
      })
    obj.components = obj.messages.map((m) => {
      if (m.type !== 'parent') return m
      if (m.messages) {
        m.components = m.components || updateFieldRec(m.messages)
        delete m.messages
      }
      return m
    })
    delete obj.messages
  }
  return obj
}

const mergeAuth = async () => {
  let authMethods = await fs.promises
    .readdir(`${__dirname}/../src/strategies`)
    .then((files) =>
      files.filter(
        (file) =>
          file !== 'local.js' &&
          file !== 'discord.js' &&
          file !== 'telegram.js',
      ),
    )
  if (authMethods?.length) {
    authMethods = authMethods.map((file) => file.replace('.js', ''))
    log.info(
      'Found Custom Auth Methods:',
      authMethods,
      '\n',
      'You should double check these were migrated correctly!',
    )
  }

  const flattenArray = (perm) => [
    ...(oldConfig?.discord?.perms?.[perm]?.roles || []),
    ...(oldConfig?.telegram?.perms?.[perm]?.roles || []),
    ...authMethods.flatMap((m) => oldConfig?.[m]?.perms[perm]?.roles || []),
  ]

  const discordObj = (obj, name) => ({
    name,
    enabled: obj?.enabled,
    type: 'discord',
    logChannelId: obj?.logChannelId,
    presence: obj?.presence,
    presenceType: obj?.presenceType,
    botToken: obj?.botToken,
    clientId: obj?.clientId,
    clientSecret: obj?.clientSecret,
    redirectUri: obj?.redirectUri,
    allowedGuilds: obj?.allowedGuilds,
    blockedGuilds: obj?.blockedGuilds,
    allowedUsers: obj?.allowedUsers,
    clientPrompt: obj?.clientPrompt,
  })

  const telegramObj = (obj, name) => ({
    name,
    enabled: obj?.enabled,
    type: 'telegram',
    botToken: obj?.botToken,
    groups: obj?.groups,
  })

  const localObj = (obj, name) => ({
    name,
    enabled: obj?.enabled,
    type: 'local',
  })

  const checkEnabled = (perm) =>
    oldConfig?.discord?.perms?.[perm]?.enabled ||
    oldConfig?.telegram?.perms?.[perm]?.enabled ||
    false

  const baseAuth = {
    strategies: [],
    areaRestrictions: [
      ...(oldConfig?.discord?.areaRestrictions || []),
      ...(oldConfig?.telegram?.areaRestrictions || []),
      ...(oldConfig?.local?.areaRestrictions || []),
      ...authMethods.flatMap((m) => oldConfig?.[m]?.areaRestrictions || []),
    ],
    excludeFromTutorial: oldConfig?.excludeFromTutorial
      ? oldConfig.excludeFromTutorial.map((perm) =>
          perm === 's2cells' ? 'scanCells' : perm,
        )
      : undefined,
    alwaysEnabledPerms: oldConfig?.alwaysEnabledPerms
      ? oldConfig.alwaysEnabledPerms.map((perm) =>
          perm === 's2cells' ? 'scanCells' : perm,
        )
      : undefined,
    perms: {
      map: {
        enabled: checkEnabled('map'),
        roles: flattenArray('map'),
      },
      pokemon: {
        enabled: checkEnabled('pokemon'),
        roles: flattenArray('pokemon'),
      },
      iv: {
        enabled: checkEnabled('iv'),
        roles: flattenArray('iv'),
      },
      pvp: {
        enabled: checkEnabled('pvp'),
        roles: flattenArray('pvp'),
      },
      gyms: {
        enabled: checkEnabled('gyms'),
        roles: flattenArray('gyms'),
      },
      raids: {
        enabled: checkEnabled('raids'),
        roles: flattenArray('raids'),
      },
      pokestops: {
        enabled: checkEnabled('pokestops'),
        roles: flattenArray('pokestops'),
      },
      quests: {
        enabled: checkEnabled('quests'),
        roles: flattenArray('quests'),
      },
      lures: {
        enabled: checkEnabled('lures'),
        roles: flattenArray('lures'),
      },
      portals: {
        enabled: checkEnabled('portals'),
        roles: flattenArray('portals'),
      },
      submissionCells: {
        enabled: checkEnabled('submissionCells'),
        roles: flattenArray('submissionCells'),
      },
      invasions: {
        enabled: checkEnabled('invasions'),
        roles: flattenArray('invasions'),
      },
      nests: {
        enabled: checkEnabled('nests'),
        roles: flattenArray('nests'),
      },
      scanAreas: {
        enabled: checkEnabled('scanAreas'),
        roles: flattenArray('scanAreas'),
      },
      weather: {
        enabled: checkEnabled('weather'),
        roles: flattenArray('weather'),
      },
      spawnpoints: {
        enabled: checkEnabled('spawnpoints'),
        roles: flattenArray('spawnpoints'),
      },
      scanCells: {
        enabled: checkEnabled('scanCells'),
        roles: flattenArray('s2cells'),
      },
      devices: {
        enabled: checkEnabled('devices'),
        roles: flattenArray('devices'),
      },
      donor: {
        enabled: checkEnabled('donor'),
        roles: flattenArray('donor'),
      },
    },
  }
  if (oldConfig?.discord) {
    baseAuth.strategies.push(discordObj(oldConfig?.discord, 'discord'))
  }
  if (oldConfig?.telegram) {
    baseAuth.strategies.push(telegramObj(oldConfig?.telegram, 'telegram'))
  }
  if (oldConfig?.local) {
    baseAuth.strategies.push(localObj(oldConfig?.local, 'local'))
    if (oldConfig?.local?.perms) {
      oldConfig.local.perms.forEach((perm) => {
        if (perm === 's2cells') {
          baseAuth.perms.scanCells.roles.push('local')
        } else {
          Object.keys(baseAuth.perms).forEach((key) => {
            if (perm.includes(key)) {
              baseAuth.perms[key].roles.push('local')
            }
          })
        }
      })
    }
  }
  authMethods.forEach((m) => {
    if (m.toLowerCase().includes('discord')) {
      baseAuth.strategies.push(discordObj(oldConfig[m], m))
    } else if (m.toLowerCase().includes('telegram')) {
      baseAuth.strategies.push(telegramObj(oldConfig[m], m))
    } else if (m.toLowerCase().includes('local')) {
      baseAuth.strategies.push(localObj(oldConfig[m], m))
    } else {
      log.warn(
        'Unable to process Auth Method:',
        m,
        'you will need to manually migrate this!',
      )
    }
  })
  return baseAuth
}

const rebuildConfig = async () => ({
  interface: oldConfig?.interface,
  port: oldConfig?.port,
  devOptions: oldConfig?.devOptions,
  api: {
    ...oldConfig?.api,
    pvpMinCp: undefined,
    sessionSecret: `${oldConfig?.api?.sessionSecret}x`,
    pvp: {
      leagues: oldConfig?.database?.settings?.leagues,
      levels: oldConfig?.database?.settings?.pvpLevels,
      reactMapHandlesPvp: oldConfig?.database?.settings?.reactMapHandlesPvp,
      minCp: {
        ...oldConfig?.api?.pvpMinCp,
      },
    },
  },
  multiDomains: oldConfig.multiDomains
    ? Object.entries(oldConfig.multiDomains).map(([domain, values]) => ({
        domain,
        ...convertMapObject(values),
      }))
    : undefined,
  map: convertMapObject(oldConfig?.map),
  clientSideOptions: oldConfig?.clientSideOptions,
  defaultFilters: oldConfig?.defaultFilters
    ? {
        ...oldConfig?.defaultFilters,
        pokemon: {
          ...oldConfig?.defaultFilters?.pokemon,
          globalValues: {
            ...oldConfig?.defaultFilters?.pokemon?.globalValues,
            pvp: oldConfig?.defaultFilters?.pokemon?.pvpValues,
          },
          pvpValues: undefined,
        },
      }
    : undefined,
  database: {
    settings: {
      ...oldConfig?.database?.settings,
      leagues: undefined,
      reactMapHandlesPvp: undefined,
      pvpLevels: undefined,
    },
    schemas: Object.values(oldConfig?.database?.schemas).map((s) => {
      if (s.useFor.includes('s2cell')) {
        const s2cellIndex = s.useFor.indexOf('s2cell')
        s.useFor[s2cellIndex] = 'scanCell'
      }
      return s
    }),
  },
  webhooks: oldConfig?.webhooks,
  authentication: await mergeAuth(),
  tileServers: convertObjToArr(oldConfig?.tileServers),
  navigation: convertObjToArr(oldConfig?.navigation),
  icons: oldConfig?.icons,
  rarity: oldConfig?.rarity,
  manualAreas: convertObjToArr(oldConfig?.manualAreas),
})

const cleanConfig = (obj, round) => {
  Object.entries(obj).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((subObj) => {
        if (typeof subObj === 'object') {
          cleanConfig(subObj, round)
        }
      })
    } else if (typeof value === 'object') {
      if (
        !Object.keys(value).length ||
        Object.values(value).every((v) => v === undefined)
      ) {
        delete obj[key]
        log.info('Removed empty object:', key, round)
      } else {
        cleanConfig(value, round)
      }
    }
  })
}

const migrator = async () => {
  const config = await rebuildConfig()
  cleanConfig(config, '(1)')
  cleanConfig(config, '(2)')
  if (config?.tileServers?.length === 0) {
    delete config.tileServers
  }
  if (config?.navigation?.length === 0) {
    delete config.navigation
  }
  fs.writeFileSync(
    `${__dirname}/../src/configs/local.json`,
    JSON.stringify(config, null, 2),
    'utf8',
    () => {},
  )
}

module.exports.migrator = migrator

if (require.main === module) {
  migrator().then(() => log.info('Migrated Config'))
}
