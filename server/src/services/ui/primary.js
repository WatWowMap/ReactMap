// @ts-check
const config = require('@rm/config')
const { Db } = require('../initialization')

const nestFilters = config.getSafe('defaultFilters.nests')
const leagues = config.getSafe('api.pvp.leagues')

/** @typedef {import('@rm/types').RMSlider} Slider */

const SLIDERS =
  /** @type {{ pokemon: { primary: Slider[], secondary: Slider[] }, nests: { secondary: Slider[] } }} */ ({
    pokemon: {
      primary: [
        {
          name: 'iv',
          label: '%',
          min: 0,
          max: 100,
          perm: 'iv',
          color: 'secondary',
        },
      ],
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
      ],
    },
    nests: {
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
  })

leagues.forEach((league) =>
  SLIDERS.pokemon.primary.push({
    name: league.name,
    label: 'rank',
    min: league.minRank || 1,
    max: league.maxRank || 100,
    perm: 'pvp',
    color: 'primary',
  }),
)

// TODO this will be used later in the config
const BLOCKED = undefined

/**
 *
 * @param {import('express').Request} req
 * @param {import("@rm/types").Permissions} perms
 * @returns
 */
function generateUi(req, perms) {
  const mapConfig = config.getMapConfig(req)
  const ui = {
    gyms:
      (perms.gyms || perms.raids) && Db.models.Gym
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
      perms.nests && Db.models.Nest
        ? {
            pokemon: true,
            polygons: true,
            sliders: SLIDERS.nests,
          }
        : BLOCKED,
    pokestops:
      (perms.pokestops || perms.lures || perms.quests || perms.invasions) &&
      Db.models.Pokestop
        ? {
            allPokestops: perms.pokestops || BLOCKED,
            lures: perms.lures || BLOCKED,
            eventStops: perms.eventStops || BLOCKED,
            quests: perms.quests || BLOCKED,
            invasions: perms.invasions || BLOCKED,
            arEligible: perms.pokestops || BLOCKED,
          }
        : BLOCKED,
    pokemon:
      (perms.pokemon || perms.iv || perms.pvp) && Db.models.Pokemon
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
              primary: SLIDERS.pokemon.primary.map((slider) => ({
                ...slider,
                disabled: !perms[slider.perm],
              })),
              secondary: SLIDERS.pokemon.secondary.map((slider) => ({
                ...slider,
                disabled: !perms[slider.perm],
              })),
            },
          }
        : BLOCKED,
    routes: perms.routes && Db.models.Route ? { enabled: true } : BLOCKED,
    wayfarer:
      perms.portals || perms.submissionCells
        ? {
            portals: !!(perms.portals && Db.models.Portal) || BLOCKED,
            submissionCells:
              !!(
                perms.submissionCells &&
                Db.models.Pokestop &&
                Db.models.Gym
              ) || BLOCKED,
          }
        : undefined,
    s2cells: perms.s2cells ? { enabled: true, cells: true } : BLOCKED,
    scanAreas: perms.scanAreas
      ? { filterByAreas: true, enabled: true }
      : undefined,
    weather: perms.weather && Db.models.Weather ? { enabled: true } : BLOCKED,
    admin:
      perms.spawnpoints || perms.scanCells || perms.devices
        ? {
            spawnpoints:
              !!(perms.spawnpoints && Db.models.Spawnpoint) || BLOCKED,
            scanCells: !!(perms.scanCells && Db.models.ScanCell) || BLOCKED,
            devices: !!(perms.devices && Db.models.Device) || BLOCKED,
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

module.exports = generateUi
