// @ts-check
const config = require('@rm/config')

const { Db } = require('../../initialization')
const buildPokemon = require('./pokemon')
const buildPokestops = require('./pokestop')
const buildGyms = require('./gym')
const BaseFilter = require('../Base')
const PokemonFilter = require('../pokemon/Frontend')

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

/**
 * @param {import("@rm/types").Permissions} perms
 * @returns
 */
function buildDefaultFilters(perms) {
  const stopReducer =
    perms.pokestops || perms.lures || perms.quests || perms.invasions
  const gymReducer = perms.gyms || perms.raids
  const pokemonReducer = perms.iv || perms.pvp
  const pokemon = buildPokemon(defaultFilters, base, custom)

  return {
    gyms:
      gymReducer && Db.models.Gym
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
      perms.nests && Db.models.Nest
        ? {
            enabled: defaultFilters.nests.enabled,
            pokemon: defaultFilters.nests.pokemon,
            polygons: defaultFilters.nests.polygons,
            avgFilter: defaultFilters.nests.avgFilter,
            standard: new BaseFilter(),
            filter: pokemon.nests,
          }
        : undefined,
    pokestops:
      stopReducer && Db.models.Pokestop
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
            standard: new BaseFilter(),
            filter: {
              ...pokemon.rocket,
              ...buildPokestops(perms, defaultFilters.pokestops),
              ...pokemon.quests,
            },
          }
        : undefined,
    pokemon:
      perms.pokemon && Db.models.Pokemon
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
      perms.routes && Db.models.Route
        ? {
            enabled: defaultFilters.routes.enabled,
            distance: [
              0,
              Math.ceil(Db.filterContext.Route.maxDistance / 1000) + 1,
            ],
            standard: new BaseFilter(),
            filter: {
              global: new BaseFilter(),
            },
          }
        : undefined,
    portals:
      perms.portals && Db.models.Portal
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
      perms.submissionCells && Db.models.Pokestop && Db.models.Gym
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
      perms.weather && Db.models.Weather
        ? {
            enabled: defaultFilters.weather.enabled,
            standard: new BaseFilter(),
            filter: { global: new BaseFilter() },
          }
        : undefined,
    spawnpoints:
      perms.spawnpoints && Db.models.Spawnpoint
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
      perms.scanCells && Db.models.ScanCell
        ? {
            enabled: defaultFilters.scanCells.enabled,
            standard: new BaseFilter(),
            filter: { global: new BaseFilter() },
          }
        : undefined,
    devices:
      perms.devices && Db.models.Device
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

module.exports = buildDefaultFilters
