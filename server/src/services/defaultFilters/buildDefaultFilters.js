const { map: { defaultFilters } } = require('../config.js')
const buildPokemon = require('./buildPokemon.js')
const buildQuests = require('./buildQuests.js')
// const buildInvasions = require('./buildInvasions.js')
const buildGyms = require('./buildGyms')
const { GenericFilter, Gym, PokemonFilter } = require('../../models/index')

module.exports = async function buildDefault(perms) {
  const stopReducer = perms.pokestops || perms.lures || perms.quests || perms.invasions
  const gymReducer = perms.gyms || perms.raids
  const pokemonReducer = perms.iv || perms.stats || perms.pvp

  return {
    gyms: gymReducer ? {
      enabled: defaultFilters.gyms.enabled,
      gyms: perms.gyms ? defaultFilters.gyms.enabled : undefined,
      raids: perms.raids ? defaultFilters.gyms.raids : undefined,
      exEligible: perms.gyms ? defaultFilters.gyms.exEligible : undefined,
      inBattle: perms.gyms ? defaultFilters.gyms.exEligible : undefined,
      filter: {
        ...buildGyms(perms, defaultFilters.gyms),
        ...await Gym.getAvailableRaidBosses(perms.raids, defaultFilters.gyms.pokemon),
      },
    } : undefined,
    pokestops: stopReducer ? {
      enabled: defaultFilters.pokestops.enabled,
      pokestops: perms.pokestops ? defaultFilters.pokestops.enabled : undefined,
      lures: perms.lures ? defaultFilters.pokestops.lures : undefined,
      quests: perms.quests ? defaultFilters.pokestops.quests : undefined,
      invasions: perms.invasions ? defaultFilters.pokestops.invasions : undefined,
      filter: {
        s0: new GenericFilter(),
        l501: perms.lures ? new GenericFilter(defaultFilters.pokestops.lures) : undefined,
        l502: perms.lures ? new GenericFilter(defaultFilters.pokestops.lures) : undefined,
        l503: perms.lures ? new GenericFilter(defaultFilters.pokestops.lures) : undefined,
        l504: perms.lures ? new GenericFilter(defaultFilters.pokestops.lures) : undefined,
        ...await buildQuests(perms.quests, defaultFilters.pokestops),
        // ...buildInvasions(perms.invasions),
      },
    } : undefined,
    pokemon: perms.pokemon ? {
      enabled: defaultFilters.pokemon.enabled,
      legacy: pokemonReducer ? defaultFilters.pokemon.legacyFilter : undefined,
      iv: perms.iv ? true : undefined,
      stats: perms.stats ? true : undefined,
      pvp: perms.pvp ? true : undefined,
      standard: new PokemonFilter(),
      ivOr: new PokemonFilter(...Object.values(defaultFilters.pokemon.globalValues)),
      filter: await buildPokemon(perms.pokemon, 'pokemon'),
    } : undefined,
    portals: perms.portals ? {
      enabled: defaultFilters.portals.enabled,
      filter: {},
    } : undefined,
    submissionCells: perms.submissionCells ? {
      enabled: defaultFilters.submissionCells.enabled,
      filter: {},
    } : undefined,
    weather: perms.weather ? {
      enabled: defaultFilters.weather.enabled,
      filter: {},
    } : undefined,
    spawnpoints: perms.spawnpoints ? {
      enabled: defaultFilters.spawnpoints.enabled,
      filter: {},
    } : undefined,
    s2cells: perms.s2cells ? {
      enabled: defaultFilters.scanCells.enabled,
      filter: {},
    } : undefined,
    devices: perms.devices ? {
      enabled: defaultFilters.devices.enabled,
      filter: {},
    } : undefined,
  }
}
