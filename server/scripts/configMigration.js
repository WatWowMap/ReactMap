/* eslint-disable no-console */
const fs = require('fs')
const oldConfig = require('../src/configs/config.json')

const convertObjToArr = (obj) => Object.entries(obj).map(([k, v]) => ({
  name: k,
  ...v,
}))

const convertMapObject = (obj) => ({
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
    telegramBotEnvRef: obj?.telegramBotEnvRef,
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
  },
  theme: obj?.theme,
  clustering: {
    gym: {
      zoomLevel: obj?.clusterZoomLevels?.gyms,
      forcedLimit: obj?.clusterZoomLevels?.forcedClusterLimit,
    },
    pokestop: {
      zoomLevel: obj?.clusterZoomLevels?.pokestops,
      forcedLimit: obj?.clusterZoomLevels?.forcedClusterLimit,
    },
    pokemon: {
      zoomLevel: obj?.clusterZoomLevels?.pokemon,
      forcedLimit: obj?.clusterZoomLevels?.forcedClusterLimit,
    },
    portal: {
      zoomLevel: obj?.clusterZoomLevels?.portals,
      forcedLimit: obj?.clusterZoomLevels?.forcedClusterLimit,
    },
    spawnpoint: {
      zoomLevel: obj?.clusterZoomLevels?.spawnpoints,
      forcedLimit: obj?.clusterZoomLevels?.forcedClusterLimit,
    },
  },
  messageOfTheDay: obj.messageOfTheDay
    ? ensureMotd(obj?.messageOfTheDay)
    : undefined,
  donationPage: obj?.donationPage,
  loginPage: obj?.loginPage,
})

const ensureMotd = (obj) => {
  if (obj.messages) {
    const updateFieldRec = (messages) => messages.map(message => {
      if (message.messages) {
        message.components = updateFieldRec(message.messages)
        delete message.messages
      }
      return message
    })
    obj.components = obj.messages.map(m => {
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
  let authMethods = await fs.promises.readdir('server/src/strategies')
    .then(files => files
      .filter(file => file !== 'local.js' && file !== 'discord.js' && file !== 'telegram.js'))
  if (authMethods?.length) {
    authMethods = authMethods.map(file => file.replace('.js', ''))
    console.log('Found Custom Auth Methods:', authMethods, '\n', 'You should double check these were migrated correctly!')
  }

  const flattenArray = (perm) => ([
    ...oldConfig?.discord?.perms?.[perm]?.roles || [],
    ...oldConfig?.telegram?.perms?.[perm]?.roles || [],
    ...authMethods.flatMap(m => oldConfig?.[m]?.perms[perm]?.roles || []),
  ])

  const discordObj = (obj) => ({
    enabled: obj?.enabled,
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
  })

  const telegramObj = (obj) => ({
    enabled: obj?.enabled,
    botToken: obj?.botToken,
    groups: obj?.groups,
  })

  const localObj = (obj) => ({
    enabled: obj?.enabled,
  })

  const checkEnabled = (perm) => oldConfig?.discord?.perms?.[perm]?.enabled
    || oldConfig?.telegram?.perms?.[perm]?.enabled

  const baseAuth = {
    discord: oldConfig.discord
      ? discordObj(oldConfig.discord)
      : undefined,
    telegram: oldConfig.telegram
      ? telegramObj(oldConfig.telegram)
      : undefined,
    local: oldConfig.local
      ? localObj(oldConfig.local)
      : undefined,
    areaRestrictions: [
      ...oldConfig?.discord?.areaRestrictions || [],
      ...oldConfig?.telegram?.areaRestrictions || [],
      ...oldConfig?.local?.areaRestrictions || [],
      ...authMethods.flatMap(m => oldConfig?.[m]?.areaRestrictions || []),
    ],
    excludeFromTutorial: oldConfig?.excludeFromTutorial,
    alwaysEnabledPerms: oldConfig?.alwaysEnabledPerms,
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
      gym: {
        enabled: checkEnabled('gyms'),
        roles: flattenArray('gyms'),
      },
      raid: {
        enabled: checkEnabled('raids'),
        roles: flattenArray('raids'),
      },
      pokestop: {
        enabled: checkEnabled('pokestops'),
        roles: flattenArray('pokestops'),
      },
      quest: {
        enabled: checkEnabled('quests'),
        roles: flattenArray('quests'),
      },
      lure: {
        enabled: checkEnabled('lures'),
        roles: flattenArray('lures'),
      },
      portal: {
        enabled: checkEnabled('portals'),
        roles: flattenArray('portals'),
      },
      submissionCell: {
        enabled: checkEnabled('submissionCells'),
        roles: flattenArray('submissionCells'),
      },
      invasions: {
        enabled: checkEnabled('invasions'),
        roles: flattenArray('invasions'),
      },
      nest: {
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
      spawnpoint: {
        enabled: checkEnabled('spawnpoints'),
        roles: flattenArray('spawnpoints'),
      },
      scanCell: {
        enabled: checkEnabled('scanCells'),
        roles: flattenArray('s2cells'),
      },
      device: {
        enabled: checkEnabled('devices'),
        roles: flattenArray('devices'),
      },
      donor: {
        enabled: checkEnabled('donor'),
        roles: flattenArray('donor'),
      },
    },
  }
  if (oldConfig?.local?.perms) {
    oldConfig.local.perms.forEach(perm => {
      Object.keys(baseAuth.perms).forEach(key => {
        if (perm.includes(key)) {
          baseAuth.perms[key].roles.push('local')
        }
      })
    })
  }
  authMethods.forEach(m => {
    if (m.toLowerCase().includes('discord')) {
      baseAuth[m] = discordObj(oldConfig[m])
    } else if (m.toLowerCase().includes('telegram')) {
      baseAuth[m] = telegramObj(oldConfig[m])
    } else if (m.toLowerCase().includes('local')) {
      baseAuth[m] = localObj(oldConfig[m])
    } else {
      console.warn('Unable to process Auth Method:', m)
    }
  })
  return baseAuth
}

const rebuildConfig = async () => ({
  interface: oldConfig?.interface,
  port: oldConfig?.port,
  devOptions: oldConfig?.devOptions,
  api: {
    sessionSecret: `${oldConfig?.api?.sessionSecret}x`,
    reactMapSecret: oldConfig?.api?.reactMapSecret,
    maxSessions: oldConfig?.api?.maxSessions,
    rateLimit: oldConfig?.api?.rateLimit,
    portalUpdateLimit: oldConfig?.api?.portalUpdateLimit,
    weatherCellLimit: oldConfig?.api?.weatherCellLimit,
    searchResultLimit: oldConfig?.api?.searchResultLimit,
    nestHemisphere: oldConfig?.api?.nestHemisphere,
    queryAvailable: oldConfig?.api?.queryAvailable
      ? {
        pokemon: oldConfig?.api?.queryAvailable?.pokemon,
        quest: oldConfig?.api?.queryAvailable?.quests,
        raid: oldConfig?.api?.queryAvailable?.raids,
        nest: oldConfig?.api?.queryAvailable?.nests,
      }
      : undefined,
    pvp: {
      leagues: oldConfig?.database?.settings?.leagues,
      levels: oldConfig?.database?.settings?.pvpLevels,
      reactMapHandlesPvp: oldConfig?.database?.settings?.reactMapHandlesPvp,
      minCp: {
        great: oldConfig?.api?.pvpMinCp?.great,
        ultra: oldConfig?.api?.pvpMinCp?.ultra,
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
  clientSideOptions: oldConfig?.clientSideOptions ? {
    admin: oldConfig.clientSideOptions.admin,
    gym: oldConfig.clientSideOptions.gyms,
    pokestop: oldConfig.clientSideOptions.pokestops,
    pokemon: oldConfig.clientSideOptions.pokemon,
    wayfarer: oldConfig.clientSideOptions.wayfarer,
  } : undefined,
  defaultFilters: oldConfig?.defaultFilters ? {
    device: oldConfig?.defaultFilters?.devices,
    gym: oldConfig?.defaultFilters?.gyms,
    nest: oldConfig?.defaultFilters?.nests,
    pokestop: oldConfig?.defaultFilters?.pokestops,
    pokemon: oldConfig?.defaultFilters?.pokemon,
    portal: oldConfig?.defaultFilters?.portals,
    scanArea: oldConfig?.defaultFilters?.scanAreas,
    scanCell: oldConfig?.defaultFilters?.scanCells,
    spawnpoint: oldConfig?.defaultFilters?.spawnpoints,
    submissionCell: oldConfig?.defaultFilters?.submissionCells,
    weather: oldConfig?.defaultFilters?.weather,
  } : undefined,
  database: {
    settings: {
      ...oldConfig?.database?.settings,
      leagues: undefined,
      reactMapHandlesPvp: undefined,
      pvpLevels: undefined,
    },
    schemas: Object.values(oldConfig?.database?.schemas),
  },
  webhooks: oldConfig?.webhooks,
  authentication: await mergeAuth(),
  tileServers: oldConfig?.tileServers
    ? convertObjToArr(oldConfig?.tileServers)
    : undefined,
  navigation: oldConfig?.navigation
    ? convertObjToArr(oldConfig?.navigation)
    : undefined,
  icons: oldConfig?.icons,
  rarity: oldConfig?.rarity,
  manualAreas: oldConfig?.manualAreas
    ? convertObjToArr(oldConfig?.manualAreas)
    : undefined,
})

const cleanConfig = (obj, round) => {
  Object.entries(obj).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(subObj => {
        if (typeof subObj === 'object') {
          cleanConfig(subObj, round)
        }
      })
    } else if (typeof value === 'object') {
      if (!Object.keys(value).length || Object.values(value).every(v => v === undefined)) {
        delete obj[key]
        console.log('Removed empty object:', key, round)
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
  fs.writeFileSync(
    'server/src/configs/local.json',
    JSON.stringify(config, null, 2),
    'utf8',
    () => { },
  )
}

module.exports.migrator = migrator

if (require.main === module) {
  migrator().then(() => console.log('Migrated Config'))
}
