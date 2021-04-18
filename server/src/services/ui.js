/* eslint-disable no-restricted-syntax */
module.exports = function generateUi(filters, perms) {
  const filterItems = {}

  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      filterItems[key] = {}
      let secondary = []

      switch (key) {
        default: filterItems[key] = true; break
        case 'pokemon':
          secondary = ['iv', 'stats', 'pvp']; break
        case 'pokestops':
          secondary = ['pokestops', 'lures', 'quests', 'invasions']; break
        case 'gyms':
          secondary = ['gyms', 'raids']; break
      }
      secondary.forEach(perm => {
        if (perms[perm]) filterItems[key][perm] = true
      })
    }
  }
  const menuItems = ['areas', 'stats', 'search', 'settings', 'clearCache', 'discord', 'logout']

  return { filterItems, menuItems }
}
