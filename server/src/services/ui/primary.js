// @ts-check
const config = require('@rm/config')
const { Db } = require('../initialization')

const nestFilters = config.getSafe('defaultFilters.nests')
const leagues = config.getSafe('api.pvp.leagues')

const SLIDERS = {
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
}

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
            allGyms: true,
            raids: perms.raids,
            exEligible: true,
            inBattle: true,
            arEligible: true,
            gymBadges: perms.gymBadges,
          }
        : undefined,
    nests:
      perms.nests && Db.models.Nest
        ? { pokemon: true, polygons: true, sliders: SLIDERS.nests }
        : undefined,
    pokestops:
      (perms.pokestops || perms.lures || perms.quests || perms.invasions) &&
      Db.models.Pokestop
        ? {
            allPokestops: perms.pokestops,
            lures: perms.lures,
            eventStops: perms.eventStops,
            quests: perms.quests,
            invasions: perms.invasions,
            arEligible: perms.pokestops,
          }
        : undefined,
    pokemon:
      (perms.pokemon || perms.iv || perms.pvp) && Db.models.Pokemon
        ? {
            legacy: mapConfig.misc.enableMapJsFilter,
            iv: perms.iv,
            pvp: perms.pvp,
            standard: true,
            ivOr: true,
            gender: true,
            zeroIv: perms.iv,
            hundoIv: perms.iv,
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
        : undefined,
    routes: perms.routes && Db.models.Route ? { enabled: true } : undefined,
    wayfarer:
      perms.portals || perms.submissionCells
        ? {
            portals: !!(perms.portals && Db.models.Portal) || undefined,
            submissionCells:
              !!(
                perms.submissionCells &&
                Db.models.Pokestop &&
                Db.models.Gym
              ) || undefined,
          }
        : undefined,
    s2cells: perms.s2cells ? { enabled: true, cells: true } : undefined,
    scanAreas: perms.scanAreas
      ? { filterByAreas: true, enabled: true }
      : undefined,
    weather: perms.weather && Db.models.Weather ? { enabled: true } : undefined,
    admin:
      perms.spawnpoints || perms.scanCells || perms.devices
        ? {
            spawnpoints:
              !!(perms.spawnpoints && Db.models.Spawnpoint) || undefined,
            scanCells: !!(perms.scanCells && Db.models.ScanCell) || undefined,
            devices: !!(perms.devices && Db.models.Device) || undefined,
          }
        : undefined,
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
