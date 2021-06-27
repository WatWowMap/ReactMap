/* eslint-disable no-restricted-syntax */
const { database: { settings: { leagues } } } = require('../config')

module.exports = function generateUi(filters, perms) {
  const ui = {}
  const ignoredKeys = ['enabled', 'filter']

  // builds the initial categories
  for (const [key, value] of Object.entries(filters)) {
    let sliders
    if (value) {
      switch (key) {
        default: ui[key] = {}; break
        case 'pokemon':
          ui[key] = {}
          sliders = {
            primary: [
              {
                name: 'iv', label: '%', min: 0, max: 100, perm: 'iv', color: 'secondary',
              },
            ],
            secondary: [
              {
                name: 'level', label: '', min: 1, max: 35, perm: 'stats',
              },
              {
                name: 'atk_iv', label: '', min: 0, max: 15, perm: 'stats',
              },
              {
                name: 'def_iv', label: '', min: 0, max: 15, perm: 'stats',
              },
              {
                name: 'sta_iv', label: '', min: 0, max: 15, perm: 'stats',
              },
            ],
          }
          leagues.forEach(league => sliders.primary.push({
            name: league.name, label: 'rank', min: 1, max: 100, perm: 'pvp', color: 'primary',
          })); break
        case 'submissionCells':
        case 'portals':
          if (!ui.wayfarer) ui.wayfarer = {}
          ui.wayfarer[key] = true; break
        case 'spawnpoints':
        case 's2cells':
        case 'devices':
          if (!ui.admin) ui.admin = {}
          ui.admin[key] = true; break
      }
      // builds each subcategory
      for (const [subKey, subValue] of Object.entries(value)) {
        if ((!ignoredKeys.includes(subKey) && subValue !== undefined)
          || key === 'weather' || key === 'scanAreas') {
          switch (key) {
            default: ui[key][subKey] = true; break
            case 'pokemon':
              ui[key][subKey] = true; break
            case 'pokestops':
              ui[key][subKey] = true; break
            case 'gyms':
              ui[key][subKey] = true; break
            case 'submissionCells':
            case 'portals': ui.wayfarer[key] = true; break
            case 'spawnpoints':
            case 's2cells':
            case 'devices': ui.admin[key] = true; break
            case 'scanAreas':
            case 'weather': ui[key].enabled = true; break
          }
        }
      }
      // adds any sliders present
      if (sliders) {
        ui[key].sliders = sliders
        Object.keys(sliders).forEach(category => {
          sliders[category].forEach(slider => {
            slider.disabled = !perms[slider.perm]
            if (!slider.color) {
              slider.color = category
            }
          })
        })
      }
    }
  }

  // deletes any menus that do not have any items/perms
  Object.keys(ui).forEach(category => {
    if (Object.keys(ui[category]).length === 0) {
      delete ui[category]
    }
  })

  ui.settings = true

  return ui
}
