const { clientSideOptions } = require('../config')

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
    },
    pokestops: {
      clustering: { type: 'bool', perm: ['pokestops', 'quests', 'invasions'] },
      invasionTimers: { type: 'bool', perm: ['invasions'] },
      lureTimers: { type: 'bool', perm: ['lures'] },
      interactionRanges: { type: 'bool', perm: ['pokestops'] },
    },
    pokemon: {
      clustering: { type: 'bool', perm: ['pokemon'] },
      prioritizePvpInfo: { type: 'bool', perm: ['pvp'] },
      legacyFilter: { type: 'bool', perm: ['iv', 'stats', 'pvp'] },
      interactionRanges: { type: 'bool', perm: ['pokemon'] },
      glow: { type: 'bool', sub: {}, perm: ['pokemon'] },
    },
    wayfarer: {
      clustering: { type: 'bool', perm: ['portals'] },
      oldPortals: { type: 'color', perm: ['portals'] },
      newPortals: { type: 'color', perm: ['portals'] },
    },
  }

  // only the keys & values are stored locally
  const clientValues = {}

  Object.entries(clientMenus).forEach(category => {
    const [key, options] = category
    clientValues[key] = {}
    Object.entries(options).forEach(option => {
      const [name, meta] = option
      clientMenus[key][name].value = clientSideOptions[key][name] || false
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
