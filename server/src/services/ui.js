/* eslint-disable no-restricted-syntax */
module.exports = function generateUi(filters, perms) {
  const filterItems = {}
  const sizes = ['sm', 'md', 'lg', 'xl']

  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      filterItems[key] = {}
      let sliders
      let secondary = []

      switch (key) {
        default: filterItems[key] = true; break
        case 'pokemon':
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
          secondary = ['pokestops', 'lures', 'quests', 'invasions']; break
        case 'gyms':
          secondary = ['gyms', 'raids']; break
      }
      secondary.forEach(perm => {
        if (perms[perm]) filterItems[key][perm] = true
      })
      if (sliders) {
        filterItems[key].sliders = sliders
        Object.values(sliders).forEach(category => {
          category.forEach(slider => {
            slider.disabled = !perms[slider.perm]
          })
        })
      }
    }
  }
  filterItems.pokemon.legacy = !Object.values(filterItems.pokemon).length > 0

  const menuItems = ['settings']

  return { filterItems, menuItems, sizes }
}
