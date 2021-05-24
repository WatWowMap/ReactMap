const { map: { defaultFilters } } = require('../config.js')
const buildPokemon = require('./buildPokemon.js')
const buildPokestops = require('./buildPokestops.js')
const buildGyms = require('./buildGyms')
const { GenericFilter, PokemonFilter } = require('../../models/index')

module.exports = function buildDefault(perms) {
  const stopReducer = perms.pokestops || perms.lures || perms.quests || perms.invasions
  const gymReducer = perms.gyms || perms.raids
  const pokemonReducer = perms.iv || perms.stats || perms.pvp
  const pokemon = buildPokemon(defaultFilters)
  return {
    gyms: gymReducer ? {
      enabled: defaultFilters.gyms.enabled,
      gyms: perms.gyms ? defaultFilters.gyms.enabled : undefined,
      raids: perms.raids ? defaultFilters.gyms.raids : undefined,
      exEligible: perms.gyms ? defaultFilters.gyms.exEligible : undefined,
      inBattle: perms.gyms ? defaultFilters.gyms.exEligible : undefined,
      filter: {
        ...buildGyms(perms, defaultFilters.gyms),
        ...pokemon.raids,
      },
    } : undefined,
    pokestops: stopReducer ? {
      enabled: defaultFilters.pokestops.enabled,
      allPokestops: perms.pokestops ? defaultFilters.pokestops.enabled : undefined,
      lures: perms.lures ? defaultFilters.pokestops.lures : undefined,
      quests: perms.quests ? defaultFilters.pokestops.quests : undefined,
      invasions: perms.invasions ? defaultFilters.pokestops.invasions : undefined,
      filter: {
        ...buildPokestops(perms, defaultFilters.pokestops),
        ...pokemon.quests,
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
      filter: pokemon.full,
    } : undefined,
    portals: perms.portals ? {
      enabled: defaultFilters.portals.enabled,
      filter: {
        all: new GenericFilter(),
        new: new GenericFilter(),
      },
    } : undefined,
    submissionCells: perms.submissionCells ? {
      enabled: defaultFilters.submissionCells.enabled,
      filter: {},
    } : undefined,
    weather: perms.weather ? {
      enabled: defaultFilters.weather.enabled,
      filter: { all: new GenericFilter() },
    } : undefined,
    spawnpoints: perms.spawnpoints ? {
      enabled: defaultFilters.spawnpoints.enabled,
      filter: {
        confirmed: new GenericFilter(),
        unconfirmed: new GenericFilter(),
      },
    } : undefined,
    s2cells: perms.s2cells ? {
      enabled: defaultFilters.scanCells.enabled,
      filter: { all: new GenericFilter() },
    } : undefined,
    devices: perms.devices ? {
      enabled: defaultFilters.devices.enabled,
      filter: {
        online: new GenericFilter(),
        offline: new GenericFilter(),
      },
    } : undefined,
  }
}
