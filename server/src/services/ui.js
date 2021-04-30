/* eslint-disable no-restricted-syntax */
module.exports = function generateUi(filters, perms) {
  const menus = {
    filterItems: {},
    wayfarer: {},
    admin: {},
    settings: {},
  }
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

  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      let sliders
      let secondary = []

      switch (key) {
        default: menus.filterItems[key] = true; break
        case 'pokemon':
          menus.filterItems[key] = {}
          secondary = ['iv', 'stats', 'pvp']
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
                name: 'Attack', shortName: 'atk', min: 0, max: 15, perm: 'stats',
              },
              {
                name: 'Defense', shortName: 'def', min: 0, max: 15, perm: 'stats',
              },
              {
                name: 'Stamina', shortName: 'sta', min: 0, max: 15, perm: 'stats',
              },
            ],
          }; break
        case 'pokestops':
          menus.filterItems[key] = {}
          secondary = ['pokestops', 'lures', 'quests', 'invasions']; break
        case 'gyms':
          menus.filterItems[key] = {}
          secondary = ['gyms', 'raids']; break
        case 'submissionCells':
        case 'portals': menus.wayfarer[key] = true; break
        case 'spawnpoints':
        case 's2Cells':
        case 'devices': menus.admin[key] = true; break
      }
      secondary.forEach(perm => {
        if (perms[perm]) menus.filterItems[key][perm] = true
      })
      if (sliders) {
        menus.filterItems[key].sliders = sliders
        Object.keys(sliders).forEach(category => {
          sliders[category].forEach(slider => {
            slider.disabled = !perms[slider.perm]
            slider.color = category
          })
        })
      }
    }
  }
  menus.filterItems.pokemon.legacy = !Object.values(menus.filterItems.pokemon).length > 0
  // adminItems.enabled = Object.values(adminItems).length > 0
  // wayfarerItems.enabled = Object.values(wayfarerItems).length > 0

  menus.settings = true

  return {
    menus, text,
  }
}
