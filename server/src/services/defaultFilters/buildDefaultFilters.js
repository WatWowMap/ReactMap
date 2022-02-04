const {
  defaultFilters,
  map: { enableMapJsFilter },
} = require('../config')
const buildPokemon = require('./buildPokemon')
const buildPokestops = require('./buildPokestops')
const buildGyms = require('./buildGyms')
const { GenericFilter, PokemonFilter } = require('../../models/index')

const base = new PokemonFilter(defaultFilters.pokemon.allPokemon)
const custom = new PokemonFilter(defaultFilters.pokemon.allPokemon, 'md', ...Object.values(defaultFilters.pokemon.globalValues))

module.exports = function buildDefault(perms) {
  const stopReducer = perms.pokestops || perms.lures || perms.quests || perms.invasions
  const gymReducer = perms.gyms || perms.raids
  const pokemonReducer = perms.iv || perms.pvp
  const pokemon = buildPokemon(defaultFilters, base, custom)

  return {
    gyms: gymReducer ? {
      enabled: defaultFilters.gyms.enabled,
      allGyms: perms.gyms ? defaultFilters.gyms.enabled : undefined,
      raids: perms.raids ? defaultFilters.gyms.raids : undefined,
      exEligible: perms.gyms ? defaultFilters.gyms.exEligible : undefined,
      inBattle: perms.gyms ? defaultFilters.gyms.exEligible : undefined,
      arEligible: perms.gyms ? false : undefined,
      gymBadges: perms.gymBadges ? defaultFilters.gyms.gymBadges : undefined,
      badge: perms.gymBadges ? 'all' : undefined,
      filter: {
        ...buildGyms(perms, defaultFilters.gyms),
        ...pokemon.raids,
      },
    } : undefined,
    nests: perms.nests ? {
      enabled: defaultFilters.nests.enabled,
      pokemon: defaultFilters.nests.pokemon,
      polygons: defaultFilters.nests.polygons,
      filter: pokemon.nests,
    } : undefined,
    pokestops: stopReducer ? {
      enabled: defaultFilters.pokestops.enabled,
      allPokestops: perms.pokestops ? defaultFilters.pokestops.enabled : undefined,
      lures: perms.lures ? defaultFilters.pokestops.lures : undefined,
      quests: perms.quests ? defaultFilters.pokestops.quests : undefined,
      showQuestSet: defaultFilters.pokestops.questSet,
      invasions: perms.invasions ? defaultFilters.pokestops.invasions : undefined,
      arEligible: perms.pokestops ? false : undefined,
      filter: {
        ...buildPokestops(perms, defaultFilters.pokestops),
        ...pokemon.quests,
      },
    } : undefined,
    pokemon: perms.pokemon ? {
      enabled: defaultFilters.pokemon.enabled,
      legacy: (pokemonReducer && enableMapJsFilter) ? defaultFilters.pokemon.legacyFilter : undefined,
      iv: perms.iv ? true : undefined,
      pvp: perms.pvp ? true : undefined,
      standard: base,
      ivOr: custom,
      xsRat: false,
      xlKarp: false,
      zeroIv: perms.iv ? false : undefined,
      hundoIv: perms.iv ? true : undefined,
      filter: pokemon.full,
    } : undefined,
    portals: perms.portals ? {
      enabled: defaultFilters.portals.enabled,
      filter: {
        global: new GenericFilter(),
        old: new GenericFilter(),
        new: new GenericFilter(),
      },
    } : undefined,
    scanAreas: perms.scanAreas ? {
      enabled: defaultFilters.scanAreas.enabled,
      filter: {},
    } : undefined,
    submissionCells: perms.submissionCells ? {
      enabled: defaultFilters.submissionCells.enabled,
      filter: { global: new GenericFilter() },
    } : undefined,
    weather: perms.weather ? {
      enabled: defaultFilters.weather.enabled,
      filter: { global: new GenericFilter() },
    } : undefined,
    spawnpoints: perms.spawnpoints ? {
      enabled: defaultFilters.spawnpoints.enabled,
      filter: {
        global: new GenericFilter(),
        confirmed: new GenericFilter(),
        unconfirmed: new GenericFilter(),
      },
    } : undefined,
    scanCells: perms.scanCells ? {
      enabled: defaultFilters.scanCells.enabled,
      filter: { global: new GenericFilter() },
    } : undefined,
    devices: perms.devices ? {
      enabled: defaultFilters.devices.enabled,
      filter: {
        online: new GenericFilter(),
        offline: new GenericFilter(),
        global: new GenericFilter(),
      },
    } : undefined,
  }
}
