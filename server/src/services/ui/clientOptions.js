const {
  clientSideOptions,
  map: { enableMapJsFilter },
  api: { pvp: { levels } },
} = require('../config')
const dbSelection = require('../functions/dbSelection')

module.exports = function clientOptions(perms) {
  // the values here are the relevant perms to use them, they are looped through and the values are set based on your config, then the type is set based off of those values in the above function
  const clientMenus = {
    admin: {
      devicePathColor: { type: 'color', perm: ['devices'] },
    },
    gyms: {
      clustering: { type: 'bool', perm: ['gyms', 'raids'] },
      raidTimers: { type: 'bool', perm: ['raids'] },
      interactionRanges: { type: 'bool', perm: ['gyms', 'raids'] },
      showExBadge: { type: 'bool', perm: ['gyms'] },
      showArBadge: { type: 'bool', perm: ['gyms'] },
      raidLevelBadges: { type: 'bool', perm: ['raids'] },
      raidsOr: { type: 'bool', perm: ['raids'] },
    },
    pokestops: {
      clustering: { type: 'bool', perm: ['pokestops', 'quests', 'invasions'] },
      invasionTimers: { type: 'bool', perm: ['invasions'] },
      lureTimers: { type: 'bool', perm: ['lures'] },
      interactionRanges: { type: 'bool', perm: ['pokestops'] },
      hasQuestIndicator: { type: 'bool', perm: ['quests'] },
      showArBadge: { type: 'bool', perm: ['pokestops'] },
    },
    pokemon: {
      clustering: { type: 'bool', perm: ['pokemon'] },
      linkGlobalAndAdvanced: { type: 'bool', perm: ['pokemon'] },
      pokemonTimers: { type: 'bool', perm: ['pokemon'] },
      ivCircles: { type: 'bool', perm: ['iv'] },
      minIvCircle: { type: 'number', perm: ['iv'], label: '%' },
      interactionRanges: { type: 'bool', perm: ['pokemon'] },
      showDexNumInPopup: { type: 'bool', perm: ['pokemon'] },
      weatherIndicator: { type: 'bool', perm: ['pokemon'] },
      pvpMega: { type: 'bool', perm: ['pokemon'] },
    },
    wayfarer: {
      clustering: { type: 'bool', perm: ['portals'] },
      oldPortals: { type: 'color', perm: ['portals'] },
      newPortals: { type: 'color', perm: ['portals'] },
    },
  }

  levels.forEach(level => {
    clientMenus.pokemon[`pvp${level}`] = {
      type: 'bool', perm: ['pvp'], value: true,
    }
  })

  // special case options that require additional checks
  if (enableMapJsFilter) {
    clientMenus.pokemon.legacyFilter = { type: 'bool', perm: ['iv', 'pvp'] }
  }
  if (clientSideOptions.pokemon.glow.length) {
    clientMenus.pokemon.glow = { type: 'bool', sub: {}, perm: ['pokemon'] }
  }
  if (dbSelection('pokestop').type === 'mad') {
    clientMenus.pokestops.madQuestText = { type: 'bool', perm: ['quests'] }
  }

  // only the keys & values are stored locally
  const clientValues = {}

  Object.entries(clientMenus).forEach(category => {
    const [key, options] = category
    clientValues[key] = {}
    Object.entries(options).forEach(option => {
      const [name, meta] = option
      clientMenus[key][name].value = clientSideOptions[key][name] || meta.value || false
      clientMenus[key][name].disabled = !meta.perm.some(x => perms[x])
      clientValues[key][name] = meta.value
      if (meta.sub) clientMenus[key][name].sub = {}
      delete clientMenus[key][name].perm
    })
  })

  clientMenus.pokemon.glow.value = true
  clientValues.pokemon.glow = true
  clientSideOptions.pokemon.glow.forEach(option => {
    clientMenus.pokemon.glow.sub[option.name] = { ...option }
    clientMenus.pokemon.glow.sub[option.name].disabled = !perms[option.perm]
    clientMenus.pokemon.glow.sub[option.name].type = 'color'
    clientValues.pokemon[option.name] = option.value
  })

  return { clientValues, clientMenus }
}
