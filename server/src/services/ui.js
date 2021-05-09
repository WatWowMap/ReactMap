/* eslint-disable no-restricted-syntax */
module.exports = function generateUi(filters, perms) {
  const menus = {}
  const text = {
    save: 'Save',
    reset: 'Reset',
    filterSettings: 'Filter Settings',
    resetFilters: 'Reset Filters',
    advanced: 'Advanced',
    help: 'Help',
    applyToAll: 'Apply To All',
    disableAll: 'Disable All',
    enableAll: 'Enable All',
    legacy: 'Legacy',
    sizes: ['sm', 'md', 'lg', 'xl'],
    sliderInputs: ['min', 'max'],
  }
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
                name: 'IV Range', shortName: 'iv', min: 0, max: 100, perm: 'iv',
              },
              {
                name: 'Great League', shortName: 'gl', min: 1, max: 100, perm: 'pvp',
              },
              {
                name: 'Ultra League', shortName: 'ul', min: 1, max: 100, perm: 'pvp',
              },
            ],
            secondary: [
              {
                name: 'Level', shortName: 'level', min: 1, max: 35, perm: 'stats',
              },
              {
                name: 'Attack', shortName: 'atk_iv', min: 0, max: 15, perm: 'stats',
              },
              {
                name: 'Defense', shortName: 'def_iv', min: 0, max: 15, perm: 'stats',
              },
              {
                name: 'Stamina', shortName: 'sta_iv', min: 0, max: 15, perm: 'stats',
              },
            ],
          }; break
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
        if (!ignoredKeys.includes(subKey) && subValue !== undefined) {
          switch (key) {
            default: menus[key] = true; break
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
    if (category !== 'weather') {
      if (Object.keys(menus[category]).length === 0) {
        delete menus[category]
      }
    }
  })

  menus.settings = true

  return {
    menus, text,
  }
}
