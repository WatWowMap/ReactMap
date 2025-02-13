// @ts-check
const config = require('@rm/config')

/** @param {import("@rm/types").Permissions} perms */
function clientOptions(perms) {
  const clientSideOptions = config.getSafe('clientSideOptions')
  const map = config.getSafe('map')
  const levels = config.getSafe('api.pvp.levels')

  // the values here are the relevant perms to use them, they are looped through and the values are set based on your config, then the type is set based off of those values in the above function
  const clientMenus = {
    admin: {
      devicePathColor: { type: 'color', perm: ['devices'] },
    },
    gyms: {
      clustering: {
        type: 'bool',
        perm: ['gyms', 'raids'],
        category: 'markers',
      },
      raidTimers: { type: 'bool', perm: ['raids'], category: 'tooltips' },
      interactionRanges: {
        type: 'bool',
        perm: ['gyms', 'raids'],
        category: 'markers',
      },
      '300mRange': { type: 'bool', perm: ['raids'], category: 'markers' },
      customRange: {
        type: 'number',
        perm: ['raids', 'gyms'],
        min: 0,
        max: 5000,
        category: 'markers',
      },
      showExBadge: { type: 'bool', perm: ['gyms'], category: 'markers' },
      showArBadge: { type: 'bool', perm: ['gyms'], category: 'markers' },
      raidLevelBadges: { type: 'bool', perm: ['raids'], category: 'markers' },
      gymBadgeDiamonds: {
        type: 'bool',
        perm: ['gymBadges'],
        category: 'markers',
      },
      raidOpacity: {
        type: 'bool',
        perm: ['raids'],
        category: 'dynamic_opacity',
      },
      opacityTenMinutes: {
        type: 'number',
        perm: ['raids'],
        category: 'dynamic_opacity',
      },
      opacityFiveMinutes: {
        type: 'number',
        perm: ['raids'],
        category: 'dynamic_opacity',
      },
      opacityOneMinute: {
        type: 'number',
        perm: ['raids'],
        category: 'dynamic_opacity',
      },
      enableGymPopupCoords: map.misc.enableGymPopupCoordsSelector
        ? { type: 'bool', perm: ['gyms'], category: 'popups' }
        : undefined,
    },
    pokestops: {
      clustering: {
        type: 'bool',
        perm: ['pokestops', 'quests', 'invasions'],
        category: 'markers',
      },
      invasionTimers: {
        type: 'bool',
        perm: ['invasions'],
        category: 'tooltips',
      },
      lureTimers: { type: 'bool', perm: ['lures'], category: 'tooltips' },
      eventStopTimers: {
        type: 'bool',
        perm: ['pokestops'],
        category: 'tooltips',
      },
      interactionRanges: {
        type: 'bool',
        perm: ['pokestops'],
        category: 'markers',
      },
      lureRange: { type: 'bool', perm: ['lures'], category: 'markers' },
      customRange: {
        type: 'number',
        perm: ['raids', 'gyms'],
        min: 0,
        max: 5000,
        category: 'markers',
      },
      hasQuestIndicator: {
        type: 'bool',
        perm: ['quests'],
        category: 'markers',
      },
      showArBadge: { type: 'bool', perm: ['pokestops'], category: 'markers' },
      invasionOpacity: {
        type: 'bool',
        perm: ['invasions'],
        category: 'dynamic_opacity',
      },
      opacityTenMinutes: {
        type: 'number',
        perm: ['invasions'],
        category: 'dynamic_opacity',
      },
      opacityFiveMinutes: {
        type: 'number',
        perm: ['invasions'],
        category: 'dynamic_opacity',
      },
      opacityOneMinute: {
        type: 'number',
        perm: ['invasions'],
        category: 'dynamic_opacity',
      },
      enablePokestopPopupCoords: map.misc.enablePokestopPopupCoordsSelector
        ? { type: 'bool', perm: ['pokestops'], category: 'popups' }
        : undefined,
    },
    stations: {
      clustering: {
        type: 'bool',
        perm: ['stations', 'dynamax'],
        category: 'markers',
      },
      stationTimers: {
        type: 'bool',
        perm: ['stations', 'dynamax'],
        category: 'tooltips',
      },
      interactionRanges: {
        type: 'bool',
        perm: ['stations', 'dynamax'],
        category: 'markers',
      },
      stationsOpacity: {
        type: 'bool',
        perm: ['stations', 'dynamax'],
        category: 'dynamic_opacity',
      },
      opacityTenMinutes: {
        type: 'number',
        perm: ['stations', 'dynamax'],
        category: 'dynamic_opacity',
      },
      opacityFiveMinutes: {
        type: 'number',
        perm: ['stations', 'dynamax'],
        category: 'dynamic_opacity',
      },
      opacityOneMinute: {
        type: 'number',
        perm: ['stations', 'dynamax'],
        category: 'dynamic_opacity',
      },
      enableStationPopupCoords: map.misc.enableStationPopupCoordsSelector
        ? { type: 'bool', perm: ['stations', 'dynamax'], category: 'popups' }
        : undefined,
    },
    pokemon: {
      clustering: { type: 'bool', perm: ['pokemon'], category: 'markers' },
      linkGlobalAndAdvanced: {
        type: 'bool',
        perm: ['pokemon'],
        category: 'filters',
      },
      pokemonTimers: { type: 'bool', perm: ['pokemon'], category: 'tooltips' },
      ivCircles: { type: 'bool', perm: ['iv'], category: 'tooltips' },
      minIvCircle: {
        type: 'number',
        perm: ['iv'],
        label: '%',
        category: 'tooltips',
      },
      levelCircles: { type: 'bool', perm: ['iv'], category: 'tooltips' },
      minLevelCircle: { type: 'number', perm: ['iv'], category: 'tooltips' },
      interactionRanges: {
        type: 'bool',
        perm: ['pokemon'],
        category: 'markers',
      },
      spacialRendRange: {
        type: 'bool',
        perm: ['pokemon'],
        category: 'markers',
      },
      showDexNumInPopup: {
        type: 'bool',
        perm: ['pokemon'],
        category: 'popups',
      },
      weatherIndicator: {
        type: 'bool',
        perm: ['pokemon'],
        category: 'tooltips',
      },
      pvpMega: { type: 'bool', perm: ['pvp'], category: 'filters' },
      showAllPvpRanks: { type: 'bool', perm: ['pvp'], category: 'filters' },
      showSizeIndicator: {
        type: 'bool',
        perm: ['pokemon'],
        category: 'tooltips',
      },
      pokemonOpacity: {
        type: 'bool',
        perm: ['pokemon'],
        category: 'dynamic_opacity',
      },
      opacityTenMinutes: {
        type: 'number',
        perm: ['pokemon'],
        category: 'dynamic_opacity',
      },
      opacityFiveMinutes: {
        type: 'number',
        perm: ['pokemon'],
        category: 'dynamic_opacity',
      },
      opacityOneMinute: {
        type: 'number',
        perm: ['pokemon'],
        category: 'dynamic_opacity',
      },
      ...Object.fromEntries(
        levels.map((level) => [
          `pvp${level}`,
          { type: 'bool', perm: ['pvp'], category: 'filters' },
        ]),
      ),
      legacyFilter: map.misc.enableMapJsFilter
        ? { type: 'bool', perm: ['iv'], category: 'filters' }
        : undefined,
      glow: clientSideOptions.pokemon.glow.length
        ? {
            type: 'bool',
            perm: ['pokemon'],
            category: 'markers',
            sub: Object.fromEntries(
              clientSideOptions.pokemon.glow.map(({ name, ...glow }) => [
                name,
                { ...glow, disabled: !perms[glow.perm], type: 'color' },
              ]),
            ),
          }
        : undefined,
      enablePokemonPopupCoords: map.misc.enablePokemonPopupCoordsSelector
        ? { type: 'bool', perm: ['pokemon'], category: 'popups' }
        : undefined,
    },
    wayfarer: {
      clustering: { type: 'bool', perm: ['portals'], category: 'markers' },
      oldPortals: { type: 'color', perm: ['portals'], category: 'filters' },
      newPortals: { type: 'color', perm: ['portals'], category: 'filters' },
      oneStopTillNext: {
        type: 'color',
        perm: ['submissionCells'],
        category: 'markers',
      },
      twoStopsTillNext: {
        type: 'color',
        perm: ['submissionCells'],
        category: 'markers',
      },
      noMoreGyms: {
        type: 'color',
        perm: ['submissionCells'],
        category: 'markers',
      },
      lightMapBorder: {
        type: 'color',
        perm: ['submissionCells'],
        category: 'markers',
      },
      darkMapBorder: {
        type: 'color',
        perm: ['submissionCells'],
        category: 'markers',
      },
      cellBlocked: {
        type: 'color',
        perm: ['submissionCells'],
        category: 'markers',
      },
      poiColor: {
        type: 'color',
        perm: ['submissionCells'],
        category: 'markers',
      },
      partnerColor: {
        type: 'color',
        perm: ['submissionCells'],
        category: 'markers',
      },
      showcaseColor: {
        type: 'color',
        perm: ['submissionCells'],
        category: 'markers',
      },
      enablePortalPopupCoords: map.misc.enablePortalPopupCoordsSelector
        ? { type: 'bool', perm: ['portals'], category: 'popups' }
        : undefined,
    },
    s2cells: {
      lightMapBorder: { type: 'color', perm: ['s2cells'] },
      darkMapBorder: { type: 'color', perm: ['s2cells'] },
    },
    scanAreas: {
      alwaysShowLabels: { type: 'bool', perm: ['scanAreas'] },
      tapToToggle: { type: 'bool', perm: ['scanAreas'] },
    },
    weather: {
      clickableIcon: { type: 'bool', perm: ['weather'] },
      lightMapBorder: { type: 'color', perm: ['weather'] },
      darkMapBorder: { type: 'color', perm: ['weather'] },
    },
    notifications: {
      enabled: {
        type: 'bool',
        perm: [
          'pokemon',
          'raids',
          // 'invasions',
          // 'quests',
          // 'eventStops',
          // 'lures',
        ],
      },
      audio: {
        type: 'bool',
        perm: [
          'pokemon',
          'raids',
          // 'invasions',
          // 'quests',
          // 'eventStops',
          // 'lures',
        ],
      },
      audioAlwaysOn: {
        type: 'bool',
        perm: [
          'pokemon',
          'raids',
          // 'invasions',
          // 'quests',
          // 'eventStops',
          // 'lures',
        ],
      },
      volumeLevel: {
        type: 'number',
        perm: [
          'pokemon',
          'raids',
          // 'invasions',
          // 'quests',
          // 'eventStops',
          // 'lures',
        ],
        min: 0,
        max: 100,
      },
      pokemon: { type: 'bool', perm: ['pokemon'] },
      raids: { type: 'bool', perm: ['raids'] },
      // invasions: { type: 'bool', perm: ['invasions'] },
      // quests: { type: 'bool', perm: ['quests'] },
      // eventStops: { type: 'bool', perm: ['eventStops'] },
      // lures: { type: 'bool', perm: ['lures'] },
    },
  }
  /** @type {import('@rm/types').ClientOptions} */
  const clientValues = {
    pokemon: {
      glow: true,
      ...Object.fromEntries(
        clientSideOptions.pokemon.glow.map((glow) => [glow.name, glow.value]),
      ),
    },
  }

  Object.entries(clientMenus).forEach(([key, options]) => {
    if (!clientValues[key]) clientValues[key] = {}
    Object.entries(options).forEach(([name, meta]) => {
      if (!meta) return
      clientMenus[key][name].value =
        clientSideOptions[key][name] || meta.value || false
      clientMenus[key][name].disabled = !meta.perm.some((x) => perms[x])
      clientValues[key][name] = meta.value
      delete clientMenus[key][name].perm
    })
  })

  clientMenus.pokemon.glow.value = true
  clientValues.pokemon.glow = true

  return { clientValues, clientMenus }
}

module.exports = { clientOptions }
