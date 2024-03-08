// @ts-check
const config = require('@rm/config')

const clientSideOptions = config.getSafe('clientSideOptions')
const map = config.getSafe('map')
const levels = config.getSafe('api.pvp.levels')

/** @param {import("@rm/types").Permissions} perms */
function clientOptions(perms) {
  // the values here are the relevant perms to use them, they are looped through and the values are set based on your config, then the type is set based off of those values in the above function
  const clientMenus = {
    admin: {
      devicePathColor: { type: 'color', perm: ['devices'] },
    },
    gyms: {
      clustering: { type: 'bool', perm: ['gyms', 'raids'] },
      raidTimers: { type: 'bool', perm: ['raids'] },
      interactionRanges: { type: 'bool', perm: ['gyms', 'raids'] },
      '300mRange': { type: 'bool', perm: ['raids'] },
      customRange: {
        type: 'number',
        perm: ['raids', 'gyms'],
        min: 0,
        max: 5000,
      },
      showExBadge: { type: 'bool', perm: ['gyms'] },
      showArBadge: { type: 'bool', perm: ['gyms'] },
      raidLevelBadges: { type: 'bool', perm: ['raids'] },
      gymBadgeDiamonds: { type: 'bool', perm: ['gymBadges'] },
      raidOpacity: { type: 'bool', perm: ['raids'] },
      opacityTenMinutes: { type: 'number', perm: ['raids'] },
      opacityFiveMinutes: { type: 'number', perm: ['raids'] },
      opacityOneMinute: { type: 'number', perm: ['raids'] },
      enableGymPopupCoords: map.misc.enableGymPopupCoordsSelector
        ? { type: 'bool', perm: ['gyms'] }
        : undefined,
    },
    pokestops: {
      clustering: { type: 'bool', perm: ['pokestops', 'quests', 'invasions'] },
      invasionTimers: { type: 'bool', perm: ['invasions'] },
      lureTimers: { type: 'bool', perm: ['lures'] },
      eventStopTimers: { type: 'bool', perm: ['pokestops'] },
      interactionRanges: { type: 'bool', perm: ['pokestops'] },
      lureRange: { type: 'bool', perm: ['lures'] },
      customRange: {
        type: 'number',
        perm: ['raids', 'gyms'],
        min: 0,
        max: 5000,
      },
      hasQuestIndicator: { type: 'bool', perm: ['quests'] },
      showArBadge: { type: 'bool', perm: ['pokestops'] },
      invasionOpacity: { type: 'bool', perm: ['invasions'] },
      opacityTenMinutes: { type: 'number', perm: ['invasions'] },
      opacityFiveMinutes: { type: 'number', perm: ['invasions'] },
      opacityOneMinute: { type: 'number', perm: ['invasions'] },
      enablePokestopPopupCoords: map.misc.enablePokestopPopupCoordsSelector
        ? { type: 'bool', perm: ['pokestops'] }
        : undefined,
    },
    pokemon: {
      clustering: { type: 'bool', perm: ['pokemon'] },
      linkGlobalAndAdvanced: { type: 'bool', perm: ['pokemon'] },
      pokemonTimers: { type: 'bool', perm: ['pokemon'] },
      ivCircles: { type: 'bool', perm: ['iv'] },
      minIvCircle: { type: 'number', perm: ['iv'], label: '%' },
      levelCircles: { type: 'bool', perm: ['iv'] },
      minLevelCircle: { type: 'number', perm: ['iv'] },
      interactionRanges: { type: 'bool', perm: ['pokemon'] },
      spacialRendRange: { type: 'bool', perm: ['pokemon'] },
      showDexNumInPopup: { type: 'bool', perm: ['pokemon'] },
      weatherIndicator: { type: 'bool', perm: ['pokemon'] },
      pvpMega: { type: 'bool', perm: ['pvp'] },
      showAllPvpRanks: { type: 'bool', perm: ['pvp'] },
      showSizeIndicator: { type: 'bool', perm: ['pokemon'] },
      pokemonOpacity: { type: 'bool', perm: ['pokemon'] },
      opacityTenMinutes: { type: 'number', perm: ['pokemon'] },
      opacityFiveMinutes: { type: 'number', perm: ['pokemon'] },
      opacityOneMinute: { type: 'number', perm: ['pokemon'] },
      ...Object.fromEntries(
        levels.map((level) => [`pvp${level}`, { type: 'bool', perm: ['pvp'] }]),
      ),
      legacyFilter: map.misc.enableMapJsFilter
        ? { type: 'bool', perm: ['iv'] }
        : undefined,
      glow: clientSideOptions.pokemon.glow.length
        ? {
            type: 'bool',
            perm: ['pokemon'],
            sub: Object.fromEntries(
              clientSideOptions.pokemon.glow.map(({ name, ...glow }) => [
                name,
                { ...glow, disabled: !perms[glow.perm], type: 'color' },
              ]),
            ),
          }
        : undefined,
      enablePokemonPopupCoords: map.misc.enablePokemonPopupCoordsSelector
        ? { type: 'bool', perm: ['pokemon'] }
        : undefined,
    },
    wayfarer: {
      clustering: { type: 'bool', perm: ['portals'] },
      oldPortals: { type: 'color', perm: ['portals'] },
      newPortals: { type: 'color', perm: ['portals'] },
      oneStopTillNext: { type: 'color', perm: ['submissionCells'] },
      twoStopsTillNext: { type: 'color', perm: ['submissionCells'] },
      noMoreGyms: { type: 'color', perm: ['submissionCells'] },
      lightMapBorder: { type: 'color', perm: ['submissionCells'] },
      darkMapBorder: { type: 'color', perm: ['submissionCells'] },
      cellBlocked: { type: 'color', perm: ['submissionCells'] },
      poiColor: { type: 'color', perm: ['submissionCells'] },
      partnerColor: { type: 'color', perm: ['submissionCells'] },
      showcaseColor: { type: 'color', perm: ['submissionCells'] },
      enablePortalPopupCoords: map.misc.enablePortalPopupCoordsSelector
        ? { type: 'bool', perm: ['portals'] }
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

module.exports = clientOptions
