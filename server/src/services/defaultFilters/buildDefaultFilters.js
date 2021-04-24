const { map: { filters } } = require('../config.js')
const buildPokemon = require('./buildPokemon.js')
const buildQuests = require('./buildQuests.js')
const buildInvasions = require('./buildInvasions.js')
const buildGyms = require('./buildGyms')
const { Pokestop } = require('../../models/index')

module.exports = async function buildDefault(perms) {
  const stopReducer = perms.pokestops || perms.lures || perms.quests || perms.invasions
  const gymReducer = perms.gyms || perms.raids

  return {
    gyms: gymReducer ? {
      enabled: filters.gyms,
      allGyms: perms.gyms ? filters.gyms : undefined,
      raids: perms.raids ? filters.raids : undefined,
      filter: {
        ...buildGyms(perms.gyms),
        ...buildPokemon(perms.raids),
      },
    } : undefined,

    pokestops: stopReducer ? {
      enabled: filters.pokestops,
      allStops: perms.pokestops ? filters.pokestops : undefined,
      lures: perms.lures ? filters.lures : undefined,
      invasions: perms.invasions ? filters.invasions : undefined,
      filter: {
        s0: perms.pokestops ? { enabled: true, size: 'md' } : undefined,
        s501: perms.lures ? { enabled: true, size: 'md' } : undefined,
        s502: perms.lures ? { enabled: true, size: 'md' } : undefined,
        s503: perms.lures ? { enabled: true, size: 'md' } : undefined,
        s504: perms.lures ? { enabled: true, size: 'md' } : undefined,
        ...buildInvasions(perms.invasions),
        ...buildQuests(perms.quests, await Pokestop.getAvailableQuests()),
      },
    } : undefined,

    spawnpoints: perms.spawnpoints ? {
      enabled: filters.spawnpoints,
      filter: {},
    } : undefined,
    pokemon: perms.pokemon ? {
      enabled: filters.pokemon,
      filter: buildPokemon(perms, 'pokemon'),
    } : undefined,
    portals: perms.portals ? {
      enabled: filters.portals,
      filter: {},
    } : undefined,
    s2Cells: perms.s2Cells ? {
      enabled: filters.scanCells,
      filter: {},
    } : undefined,
    submissionCells: perms.submissionCells ? {
      enabled: filters.submissionCells,
      filter: {},
    } : undefined,
    weather: perms.weather ? {
      enabled: filters.weather,
      filter: {},
    } : undefined,
    devices: perms.devices ? {
      enabled: filters.devices,
      filter: {},
    } : undefined,
  }
}
