const {
  defaultFilters,
  map: { enableMapJsFilter },
} = require('../../config')
const buildPokemon = require('./pokemon')
const buildPokestops = require('./pokestop')
const buildGyms = require('./gym')
const BaseFilter = require('../Base')
const PokemonFilter = require('../pokemon/Frontend')

const base = new PokemonFilter(defaultFilters.pokemon.allPokemon)
const custom = new PokemonFilter(
  defaultFilters.pokemon.allPokemon,
  'md',
  ...Object.values(defaultFilters.pokemon.globalValues),
)

module.exports = function buildDefault(perms, available, dbModels) {
  const stopReducer =
    perms.pokestops || perms.lures || perms.quests || perms.invasions
  const gymReducer = perms.gyms || perms.raids
  const pokemonReducer = perms.iv || perms.pvp
  const pokemon = buildPokemon(defaultFilters, base, custom, available)

  return {
    gyms:
      gymReducer && dbModels.Gym
        ? {
            enabled: defaultFilters.gyms.enabled,
            allGyms: perms.gyms ? defaultFilters.gyms.enabled : undefined,
            levels: perms.gyms ? defaultFilters.gyms.levels : undefined,
            raids: perms.raids ? defaultFilters.gyms.raids : undefined,
            exEligible: perms.gyms ? defaultFilters.gyms.exEligible : undefined,
            inBattle: perms.gyms ? defaultFilters.gyms.exEligible : undefined,
            arEligible: perms.gyms ? false : undefined,
            gymBadges: perms.gymBadges
              ? defaultFilters.gyms.gymBadges
              : undefined,
            badge: perms.gymBadges ? 'all' : undefined,
            raidTier: perms.raids ? 'all' : undefined,
            filter: {
              ...buildGyms(perms, defaultFilters.gyms, available),
              ...pokemon.raids,
            },
          }
        : undefined,
    nests:
      perms.nests && dbModels.Nest
        ? {
            enabled: defaultFilters.nests.enabled,
            pokemon: defaultFilters.nests.pokemon,
            polygons: defaultFilters.nests.polygons,
            avgFilter: defaultFilters.nests.avgFilter,
            filter: pokemon.nests,
          }
        : undefined,
    pokestops:
      stopReducer && dbModels.Pokestop
        ? {
            enabled: defaultFilters.pokestops.enabled,
            allPokestops: perms.pokestops
              ? defaultFilters.pokestops.enabled
              : undefined,
            levels: perms.pokestops
              ? defaultFilters.pokestops.levels
              : undefined,
            lures: perms.lures ? defaultFilters.pokestops.lures : undefined,
            eventStops: perms.eventStops
              ? defaultFilters.pokestops.eventStops
              : undefined,
            quests: perms.quests ? defaultFilters.pokestops.quests : undefined,
            showQuestSet: defaultFilters.pokestops.questSet,
            confirmed: perms.invasions
              ? defaultFilters.pokestops.confirmed
              : undefined,
            invasions: perms.invasions
              ? defaultFilters.pokestops.invasions
              : undefined,
            arEligible: perms.pokestops ? false : undefined,
            filter: {
              ...pokemon.rocket,
              ...buildPokestops(perms, defaultFilters.pokestops, available),
              ...pokemon.quests,
            },
          }
        : undefined,
    pokemon:
      perms.pokemon && dbModels.Pokemon
        ? {
            enabled: defaultFilters.pokemon.enabled,
            legacy:
              pokemonReducer && enableMapJsFilter
                ? defaultFilters.pokemon.legacyFilter
                : undefined,
            iv: perms.iv ? true : undefined,
            pvp: perms.pvp ? true : undefined,
            standard: base,
            ivOr: custom,
            // xsRat: defaultFilters.pokemon.xsRat,
            // xlKarp: defaultFilters.pokemon.xlKarp,
            gender: defaultFilters.pokemon.globalValues.gender,
            zeroIv: perms.iv ? false : undefined,
            hundoIv: perms.iv ? true : undefined,
            filter: pokemon.full,
          }
        : undefined,
    portals:
      perms.portals && dbModels.Portal
        ? {
            enabled: defaultFilters.portals.enabled,
            filter: {
              global: new BaseFilter(),
              old: new BaseFilter(),
              new: new BaseFilter(),
            },
          }
        : undefined,
    scanAreas: perms.scanAreas
      ? {
          enabled: defaultFilters.scanAreas.enabled,
          filter: { areas: [], search: '' },
        }
      : undefined,
    submissionCells:
      perms.submissionCells && dbModels.Pokestop && dbModels.Gym
        ? {
            enabled: defaultFilters.submissionCells.enabled,
            rings: defaultFilters.submissionCells.rings,
            s17Cells: defaultFilters.submissionCells.s17Cells,
            s14Cells: defaultFilters.submissionCells.s14Cells,
            filter: { global: new BaseFilter() },
          }
        : undefined,
    s2cells: perms.s2cells
      ? {
          enabled: defaultFilters.s2cells.enabled,
          cells: defaultFilters.s2cells.cells,
          filter: { global: new BaseFilter() },
        }
      : undefined,
    weather:
      perms.weather && dbModels.Weather
        ? {
            enabled: defaultFilters.weather.enabled,
            filter: { global: new BaseFilter() },
          }
        : undefined,
    spawnpoints:
      perms.spawnpoints && dbModels.Spawnpoint
        ? {
            enabled: defaultFilters.spawnpoints.enabled,
            filter: {
              global: new BaseFilter(),
              confirmed: new BaseFilter(),
              unconfirmed: new BaseFilter(),
            },
          }
        : undefined,
    scanCells:
      perms.scanCells && dbModels.ScanCell
        ? {
            enabled: defaultFilters.scanCells.enabled,
            filter: { global: new BaseFilter() },
          }
        : undefined,
    devices:
      perms.devices && dbModels.Device
        ? {
            enabled: defaultFilters.devices.enabled,
            filter: {
              online: new BaseFilter(),
              offline: new BaseFilter(),
              global: new BaseFilter(),
            },
          }
        : undefined,
  }
}
