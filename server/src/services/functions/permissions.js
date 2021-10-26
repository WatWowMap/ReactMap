module.exports = function permissionManager(permToCheck, perms) {
  if (permToCheck.startsWith('quick')) {
    permToCheck = permToCheck.replace('quick', '').toLowerCase()
  }
  switch (permToCheck) {
    case 'map': return perms.map
    case 'team':
    case 'teams':
    case 'gym':
    case 'gyms': return perms.gyms
    case 'egg':
    case 'eggs':
    case 'raid':
    case 'raids': return perms.raids
    case 'monster':
    case 'monsters':
    case 'pokemon':
    case 'pokemons': return perms.pokemon
    case 'stat':
    case 'stats': return perms.stats
    case 'iv':
    case 'ivs': return perms.iv
    case 'pvp':
    case 'pvps': return perms.pvp
    case 'nest':
    case 'nests': return perms.nests
    case 'pokestop':
    case 'pokestops': return perms.pokestops
    case 'quest':
    case 'quests': return perms.quests
    case 'lure':
    case 'lures': return perms.lures
    case 'invasion':
    case 'invasions': return perms.invasions
    case 'scanArea':
    case 'scanAreas': return perms.scanAreas
    case 'spawnpoint':
    case 'spawnpoints': return perms.spawnpoints
    case 'webhook':
    case 'setLocation':
    case 'setAreas':
    case 'switchProfile':
    case 'webhooks': return perms.webhooks
    default: return false
  }
}
