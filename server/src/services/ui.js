/* eslint-disable no-restricted-syntax */
const { database: { settings: { leagues } } } = require('./config')

module.exports = function generateUi(filters, perms) {
  const menus = {}
  const sizes = ['sm', 'md', 'lg', 'xl']
  const ignoredKeys = ['enabled', 'filter']

  // builds the initial categories
  for (const [key, value] of Object.entries(filters)) {
    let sliders
    if (value) {
      switch (key) {
        default: menus[key] = {}; break
        case 'pokemon':
          menus[key] = {}
          sliders = {
            primary: [
              {
                name: 'iv', label: '%', min: 0, max: 100, perm: 'iv',
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
            name: league, label: 'rank', min: 1, max: 100, perm: 'pvp',
          })); break
        case 'submissionCells':
        case 'portals':
          if (!menus.wayfarer) menus.wayfarer = {}
          menus.wayfarer[key] = true; break
        case 'spawnpoints':
        case 's2cells':
        case 'devices':
          if (!menus.admin) menus.admin = {}
          menus.admin[key] = true; break
      }
      // builds each subcategory
      for (const [subKey, subValue] of Object.entries(value)) {
        if ((!ignoredKeys.includes(subKey) && subValue !== undefined)
          || key === 'weather' || key === 'scanAreas') {
          switch (key) {
            default: menus[key][subKey] = true; break
            case 'pokemon':
              menus[key][subKey] = true; break
            case 'pokestops':
              menus[key][subKey] = true; break
            case 'gyms':
              menus[key][subKey] = true; break
            case 'submissionCells':
            case 'portals': menus.wayfarer[key] = true; break
            case 'spawnpoints':
            case 's2cells':
            case 'devices': menus.admin[key] = true; break
            case 'scanAreas':
            case 'weather': menus[key].enabled = true; break
          }
        }
      }
      // adds any sliders present
      if (sliders) {
        menus[key].sliders = sliders
        Object.keys(sliders).forEach(category => {
          sliders[category].forEach(slider => {
            slider.disabled = !perms[slider.perm]
            slider.color = category
          })
        })
      }
    }
  }

  // deletes any menus that do not have any items/perms
  Object.keys(menus).forEach(category => {
    if (Object.keys(menus[category]).length === 0) {
      delete menus[category]
    }
  })

  menus.settings = true

  return { menus, sizes }
}
