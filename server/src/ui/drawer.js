// @ts-check
const config = require('@rm/config')
const { state } = require('../services/state')

/** @typedef {import('@rm/types').RMSlider} Slider */

// TODO this will be used later in the config
const BLOCKED = /** @type {undefined} */ (undefined)

/**
 *
 * @param {import('express').Request} req
 * @param {import("@rm/types").Permissions} perms
 * @returns
 */
function drawer(req, perms) {
  const mapConfig = config.getMapConfig(req)
  const nestFilters = config.getSafe('defaultFilters.nests')
  const leagues = config.getSafe('api.pvp.leagues')

  const ui = {
    gyms:
      (perms.gyms || perms.raids) && state.db.models.Gym
        ? {
            allGyms: perms.gyms || BLOCKED,
            raids: perms.raids || BLOCKED,
            exEligible: perms.gyms || BLOCKED,
            inBattle: perms.gyms || BLOCKED,
            arEligible: perms.gyms || BLOCKED,
            gymBadges: perms.gymBadges || BLOCKED,
          }
        : BLOCKED,
    nests:
      perms.nests && state.db.models.Nest
        ? {
            pokemon: true,
            sliders: {
              secondary: [
                {
                  name: 'avgFilter',
                  i18nKey: 'spawns_per_hour',
                  label: '',
                  min: nestFilters.avgFilter[0],
                  max: nestFilters.avgFilter[1],
                  perm: 'nests',
                  step: nestFilters.avgSliderStep,
                },
              ],
            },
            polygons: true,
            active: true,
          }
        : BLOCKED,
    pokestops:
      (perms.pokestops || perms.lures || perms.quests || perms.invasions) &&
      state.db.models.Pokestop
        ? {
            allPokestops: perms.pokestops || BLOCKED,
            lures: perms.lures || BLOCKED,
            eventStops: perms.eventStops || BLOCKED,
            quests: perms.quests || BLOCKED,
            invasions: perms.invasions || BLOCKED,
            arEligible: perms.pokestops || BLOCKED,
          }
        : BLOCKED,
    stations:
      (perms.stations || perms.dynamax) && state.db.models.Station
        ? {
            allStations: perms.stations || BLOCKED,
            maxBattles: perms.dynamax || BLOCKED,
          }
        : BLOCKED,
    pokemon:
      (perms.pokemon || perms.iv || perms.pvp) && state.db.models.Pokemon
        ? {
            legacy: perms.iv && mapConfig.misc.enableMapJsFilter,
            iv: perms.iv || BLOCKED,
            pvp: perms.pvp || BLOCKED,
            // standard: true,
            // ivOr: true,
            // gender: true,
            zeroIv: perms.iv || BLOCKED,
            hundoIv: perms.iv || BLOCKED,
            sliders: {
              primary: [
                {
                  name: 'iv',
                  label: '%',
                  min: 0,
                  max: 100,
                  perm: 'iv',
                  color: 'secondary',
                },
                ...leagues.map((league) => ({
                  name: league.name,
                  label: 'rank',
                  min: league.minRank || 1,
                  max: league.maxRank || 100,
                  perm: 'pvp',
                  color: 'primary',
                })),
              ].map((slider) => ({
                ...slider,
                disabled: !perms[slider.perm],
              })),
              secondary: [
                {
                  name: 'level',
                  label: '',
                  min: 1,
                  max: 35,
                  perm: 'iv',
                  color: 'secondary',
                },
                {
                  name: 'atk_iv',
                  label: '',
                  min: 0,
                  max: 15,
                  perm: 'iv',
                  color: 'secondary',
                },
                {
                  name: 'def_iv',
                  label: '',
                  min: 0,
                  max: 15,
                  perm: 'iv',
                  color: 'secondary',
                },
                {
                  name: 'sta_iv',
                  label: '',
                  min: 0,
                  max: 15,
                  perm: 'iv',
                  color: 'secondary',
                },
                {
                  name: 'cp',
                  label: '',
                  min: 10,
                  max: 5000,
                  perm: 'iv',
                  color: 'secondary',
                },
              ].map((slider) => ({
                ...slider,
                disabled: !perms[slider.perm],
              })),
            },
          }
        : BLOCKED,
    routes: perms.routes && state.db.models.Route ? { enabled: true } : BLOCKED,
    wayfarer:
      perms.portals || perms.submissionCells
        ? {
            portals: !!(perms.portals && state.db.models.Portal) || BLOCKED,
            submissionCells:
              !!(
                perms.submissionCells &&
                state.db.models.Pokestop &&
                state.db.models.Gym
              ) || BLOCKED,
          }
        : undefined,
    s2cells: perms.s2cells ? { enabled: true } : BLOCKED,
    scanAreas: perms.scanAreas
      ? { enabled: true, filterByAreas: true }
      : undefined,
    weather:
      perms.weather && state.db.models.Weather ? { enabled: true } : BLOCKED,
    admin:
      perms.spawnpoints || perms.scanCells || perms.devices
        ? {
            spawnpoints:
              !!(perms.spawnpoints && state.db.models.Spawnpoint) || BLOCKED,
            scanCells:
              !!(perms.scanCells && state.db.models.ScanCell) || BLOCKED,
            devices: !!(perms.devices && state.db.models.Device) || BLOCKED,
          }
        : BLOCKED,
    settings: true,
  }

  // deletes any menus that do not have any items/perms
  Object.keys(ui).forEach((category) => {
    if (category === 'settings') return
    if (!ui[category] || Object.keys(ui[category]).length === 0) {
      delete ui[category]
    }
  })

  // sorts the menus
  const sortedUi = {}
  mapConfig.general.menuOrder.forEach((category) => {
    if (ui[category]) {
      sortedUi[category] = ui[category]
    }
  })
  return { ...sortedUi, ...ui }
}

module.exports = { drawer }
