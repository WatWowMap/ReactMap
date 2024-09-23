// @ts-check
const config = require('@rm/config')

const { state } = require('../../services/state')
const { buildPokemon } = require('./pokemon')
const { buildPokestops } = require('./pokestop')
const { buildGyms } = require('./gym')
const { BaseFilter } = require('../Base')
const { PokemonFilter } = require('../pokemon/Frontend')

/**
 * @param {import("@rm/types").Permissions} perms
 * @returns
 */
function buildDefaultFilters(perms) {
  const defaultFilters = config.getSafe('defaultFilters')

  const base = new PokemonFilter(defaultFilters.pokemon.allPokemon)
  const custom = new PokemonFilter(
    defaultFilters.pokemon.allPokemon,
    'md',
    defaultFilters.pokemon.globalValues.iv,
    defaultFilters.pokemon.globalValues.level,
    defaultFilters.pokemon.globalValues.atk_iv,
    defaultFilters.pokemon.globalValues.def_iv,
    defaultFilters.pokemon.globalValues.sta_iv,
    defaultFilters.pokemon.globalValues.pvp,
    defaultFilters.pokemon.globalValues.gender,
    defaultFilters.pokemon.globalValues.cp,
    defaultFilters.pokemon.globalValues.xxs,
    defaultFilters.pokemon.globalValues.xxl,
  )

  const stopReducer =
    perms.pokestops || perms.lures || perms.quests || perms.invasions
  const gymReducer = perms.gyms || perms.raids
  const pokemonReducer = perms.iv || perms.pvp
  const stationReducer = perms.stations || perms.dynamax
  const pokemon = buildPokemon(defaultFilters, base, custom)

  return {
    gyms:
      gymReducer && state.db.models.Gym
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
            standard: new BaseFilter(),
            filter: {
              ...buildGyms(perms, defaultFilters.gyms),
              ...pokemon.raids,
            },
          }
        : undefined,
    nests:
      perms.nests && state.db.models.Nest
        ? {
            enabled: defaultFilters.nests.enabled,
            onlyShowAvailable: defaultFilters.nests.onlyShowAvailable,
            pokemon: defaultFilters.nests.pokemon,
            avgFilter: defaultFilters.nests.avgFilter,
            polygons: defaultFilters.nests.polygons,
            standard: new BaseFilter(),
            filter: pokemon.nests,
            active: defaultFilters.nests.active,
          }
        : undefined,
    pokestops:
      stopReducer && state.db.models.Pokestop
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
            excludeGrunts: perms.invasions
              ? defaultFilters.pokestops.excludeGrunts
              : undefined,
            excludeLeaders: perms.invasions
              ? defaultFilters.pokestops.excludeLeaders
              : undefined,
            invasions: perms.invasions
              ? defaultFilters.pokestops.invasions
              : undefined,
            arEligible: perms.pokestops ? false : undefined,
            standard: new BaseFilter(),
            filter: {
              ...pokemon.rocket,
              ...buildPokestops(perms, defaultFilters.pokestops),
              ...pokemon.quests,
            },
          }
        : undefined,
    stations:
      stationReducer && state.db.models.Station
        ? {
            enabled: defaultFilters.stations.enabled,
            allStations: perms.stations
              ? defaultFilters.stations.enabled
              : undefined,
            standard: new BaseFilter(),
            battleTier: perms.dynamax
              ? defaultFilters.stations.battleTier
              : undefined,
            maxBattles: perms.stations
              ? defaultFilters.stations.battles
              : undefined,
            filter: pokemon.stations,
          }
        : undefined,
    pokemon:
      perms.pokemon && state.db.models.Pokemon
        ? {
            enabled: defaultFilters.pokemon.enabled,
            easyMode: defaultFilters.pokemon.easyMode,
            onlyShowAvailable: defaultFilters.pokemon.onlyShowAvailable,
            legacy:
              pokemonReducer && config.getSafe('map.misc.enableMapJsFilter')
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
    routes:
      perms.routes && state.db.models.Route
        ? {
            enabled: defaultFilters.routes.enabled,
            distance: [
              0,
              Math.ceil(state.db.filterContext.Route.maxDistance / 1000) + 1,
            ],
            standard: new BaseFilter(),
            filter: {
              global: new BaseFilter(),
            },
          }
        : undefined,
    portals:
      perms.portals && state.db.models.Portal
        ? {
            enabled: defaultFilters.portals.enabled,
            standard: new BaseFilter(),
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
          standard: new BaseFilter(),
          filterByAreas: false,
          filter: { areas: [], search: '' },
        }
      : undefined,
    submissionCells:
      perms.submissionCells && state.db.models.Pokestop && state.db.models.Gym
        ? {
            enabled: defaultFilters.submissionCells.enabled,
            rings: defaultFilters.submissionCells.rings,
            s17Cells: defaultFilters.submissionCells.s17Cells,
            s14Cells: defaultFilters.submissionCells.s14Cells,
            includeSponsored: defaultFilters.submissionCells.includeSponsored,
            standard: new BaseFilter(),
            filter: { global: new BaseFilter() },
          }
        : undefined,
    s2cells: perms.s2cells
      ? {
          enabled: defaultFilters.s2cells.enabled,
          cells: defaultFilters.s2cells.cells,
          standard: new BaseFilter(),
          filter: { global: new BaseFilter() },
        }
      : undefined,
    weather:
      perms.weather && state.db.models.Weather
        ? {
            enabled: defaultFilters.weather.enabled,
            standard: new BaseFilter(),
            filter: { global: new BaseFilter() },
          }
        : undefined,
    spawnpoints:
      perms.spawnpoints && state.db.models.Spawnpoint
        ? {
            enabled: defaultFilters.spawnpoints.enabled,
            standard: new BaseFilter(),
            tth: defaultFilters.spawnpoints.tth,
            filter: {
              global: new BaseFilter(),
              confirmed: new BaseFilter(),
              unconfirmed: new BaseFilter(),
            },
          }
        : undefined,
    scanCells:
      perms.scanCells && state.db.models.ScanCell
        ? {
            enabled: defaultFilters.scanCells.enabled,
            standard: new BaseFilter(),
            filter: { global: new BaseFilter() },
          }
        : undefined,
    devices:
      perms.devices && state.db.models.Device
        ? {
            enabled: defaultFilters.devices.enabled,
            standard: new BaseFilter(),
            filter: {
              online: new BaseFilter(),
              offline: new BaseFilter(),
              global: new BaseFilter(),
            },
          }
        : undefined,
  }
}

module.exports = { buildDefaultFilters }
