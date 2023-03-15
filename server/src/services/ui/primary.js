const {
  api: {
    pvp: { leagues },
  },
  defaultFilters: {
    nests: { avgSliderStep, avgFilter },
  },
  map: { menuOrder },
} = require('../config')

const refSliders = {
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
      },
      {
        name: 'atk_iv',
        label: '',
        min: 0,
        max: 15,
        perm: 'iv',
      },
      {
        name: 'def_iv',
        label: '',
        min: 0,
        max: 15,
        perm: 'iv',
      },
      {
        name: 'sta_iv',
        label: '',
        min: 0,
        max: 15,
        perm: 'iv',
      },
      {
        name: 'cp',
        label: '',
        min: 10,
        max: 5000,
        perm: 'iv',
      },
    ],
  },
  nests: {
    secondary: [
      {
        name: 'avgFilter',
        i18nKey: 'spawns_per_hour',
        label: '',
        min: avgFilter[0],
        max: avgFilter[1],
        perm: 'nests',
        step: avgSliderStep,
      },
    ],
  },
}

leagues.forEach((league) =>
  refSliders.pokemon.primary.push({
    name: league.name,
    label: 'rank',
    min: league.minRank || 1,
    max: league.maxRank || 100,
    perm: 'pvp',
    color: 'primary',
  }),
)

const ignoredKeys = [
  'enabled',
  'filter',
  'showQuestSet',
  'badge',
  'avgFilter',
  'raidTier',
  'levels',
]

module.exports = function generateUi(filters, perms) {
  const ui = {}

  // builds the initial categories
  Object.entries(filters).forEach(([key, value]) => {
    let sliders
    if (value) {
      switch (key) {
        case 'submissionCells':
        case 'portals':
          if (!ui.wayfarer) ui.wayfarer = {}
          ui.wayfarer[key] = true
          break
        case 'spawnpoints':
        case 'scanCells':
        case 'devices':
          if (!ui.admin) ui.admin = {}
          ui.admin[key] = true
          break
        default:
          ui[key] = {}
          sliders = refSliders[key]
          break
      }
      // builds each subcategory
      Object.entries(value).forEach(([subKey, subValue]) => {
        if (
          (!ignoredKeys.includes(subKey) && subValue !== undefined) ||
          key === 'weather' ||
          key === 'scanAreas' ||
          (key === 's2cells' && subKey !== 'filter')
        ) {
          switch (key) {
            case 'submissionCells':
            case 'portals':
              ui.wayfarer[key] = true
              break
            case 'spawnpoints':
            case 'scanCells':
            case 'devices':
              ui.admin[key] = true
              break
            case 'scanAreas':
            case 'weather':
              ui[key].enabled = true
              break
            default:
              ui[key][subKey] = true
              break
          }
        }
      })
      // adds any sliders present
      if (sliders) {
        ui[key].sliders = sliders
        Object.keys(sliders).forEach((category) => {
          sliders[category].forEach((slider) => {
            slider.disabled = !perms[slider.perm]
            if (!slider.color) {
              slider.color = category
            }
          })
        })
      }
    }
  })

  // deletes any menus that do not have any items/perms
  Object.keys(ui).forEach((category) => {
    if (Object.keys(ui[category]).length === 0) {
      delete ui[category]
    }
  })

  ui.settings = true

  // sorts the menus
  const sortedUi = {}
  menuOrder.forEach((category) => {
    if (ui[category]) {
      sortedUi[category] = ui[category]
    }
  })
  return { ...sortedUi, ...ui }
}
