const { map: { filters } } = require('../config.js')
const buildPokemon = require('./buildPokemon.js')
const buildQuests = require('./buildQuests.js')
// const buildInvasions = require('./buildInvasions.js')
const buildGyms = require('./buildGyms')
const { Pokestop, GenericFilter, Gym } = require('../../models/index')

module.exports = async function buildDefault(perms) {
  const stopReducer = perms.pokestops || perms.lures || perms.quests || perms.invasions
  const gymReducer = perms.gyms || perms.raids
  const pokemonReducer = perms.iv || perms.stats || perms.pvp

  return {
    gyms: gymReducer ? {
      enabled: filters.gyms,
      gyms: perms.gyms ? filters.gyms : undefined,
      raids: perms.raids ? filters.raids : undefined,
      exEligible: perms.gyms ? false : undefined,
      inBattle: perms.gyms ? false : undefined,
      filter: {
        ...buildGyms(perms),
        ...await Gym.getAvailableRaidBosses(perms.raids),
      },
    } : undefined,
    pokestops: stopReducer ? {
      enabled: filters.pokestops,
      pokestops: perms.pokestops ? filters.pokestops : undefined,
      lures: perms.lures ? filters.lures : undefined,
      invasions: perms.invasions ? filters.invasions : undefined,
      quests: perms.quests ? filters.quests : undefined,
      filter: {
        l501: perms.lures ? new GenericFilter() : undefined,
        l502: perms.lures ? new GenericFilter() : undefined,
        l503: perms.lures ? new GenericFilter() : undefined,
        l504: perms.lures ? new GenericFilter() : undefined,
        ...buildQuests(perms.quests, await Pokestop.getAvailableQuests()),
        // ...buildInvasions(perms.invasions),
      },
    } : undefined,
    pokemon: perms.pokemon ? {
      enabled: filters.pokemon,
      legacy: pokemonReducer ? false : undefined,
      filter: buildPokemon(perms.pokemon, 'pokemon'),
    } : undefined,
    portals: perms.portals ? {
      enabled: filters.portals,
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
    spawnpoints: perms.spawnpoints ? {
      enabled: filters.spawnpoints,
      filter: {},
    } : undefined,
    s2Cells: perms.s2Cells ? {
      enabled: filters.scanCells,
      filter: {},
    } : undefined,
    devices: perms.devices ? {
      enabled: filters.devices,
      filter: {},
    } : undefined,
  }
}
