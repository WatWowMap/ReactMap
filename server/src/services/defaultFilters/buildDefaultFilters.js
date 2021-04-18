const { map: { filters } } = require('../config.js')
const buildPokemon = require('./buildPokemon.js')
const buildQuests = require('./buildQuests.js')
const buildInvasions = require('./buildInvasions.js')
const { Pokestop } = require('../../models/index')

module.exports = async function buildDefault(perms) {
  const stopReducer = perms.pokestops || perms.lures || perms.quests || perms.invasions
  const globalFilters = {
    gyms: perms.gyms ? {
      enabled: filters.gyms,
      filter: {},
    } : undefined,
    raids: perms.raids ? {
      enabled: filters.raids,
      filter: {},
    } : undefined,
    pokestops: stopReducer ? {
      enabled: filters.pokestops,
      filter: {
        p0: perms.pokestops ? { enabled: true, size: 'md' } : undefined,
        p501: perms.lures ? { enabled: true, size: 'md' } : undefined,
        p502: perms.lures ? { enabled: true, size: 'md' } : undefined,
        p503: perms.lures ? { enabled: true, size: 'md' } : undefined,
        p504: perms.lures ? { enabled: true, size: 'md' } : undefined,
        ...buildInvasions(perms),
        ...buildQuests(perms, await Pokestop.getAvailableQuests()),
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
  return globalFilters
}
